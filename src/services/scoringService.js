const prisma = require("../prisma");

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function scoreToLevel(score, forceD) {
  if (forceD) return "D";
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  return "D";
}

function suggestionByLevel(level) {
  const suggestions = {
    A: "常规监管，减少重复检查，保持信用激励。",
    B: "正常抽查，关注许可状态和近期投诉变化。",
    C: "提高检查频次，关注整改闭环和重复问题。",
    D: "重点监管，建议专项检查、约谈提醒或联合处置。"
  };
  return suggestions[level];
}

async function calculateEnterpriseScore(enterpriseId) {
  const enterprise = await prisma.enterprise.findUnique({
    where: { id: Number(enterpriseId) },
    include: {
      licenses: true,
      inspections: { orderBy: { inspectionDate: "desc" } },
      penalties: { orderBy: { penaltyDate: "desc" } },
      samples: { orderBy: { sampleDate: "desc" } },
      complaints: { orderBy: { acceptedAt: "desc" } },
      repairs: { orderBy: { appliedAt: "desc" } }
    }
  });

  if (!enterprise) {
    const error = new Error("企业不存在");
    error.status = 404;
    throw error;
  }

  const now = new Date();
  const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const recentInspections = enterprise.inspections.filter((item) => item.inspectionDate >= daysAgo(365));
  const recentPenalties = enterprise.penalties.filter((item) => item.penaltyDate >= daysAgo(365));
  const recentComplaints = enterprise.complaints.filter((item) => item.acceptedAt >= daysAgo(180));
  const recentSamples = enterprise.samples.filter((item) => item.sampleDate >= daysAgo(365));

  const details = [];
  let score = 100;
  let forceD = false;

  const expiredLicenseCount = enterprise.licenses.filter((item) => item.status !== "VALID" || item.validTo < now).length;
  if (expiredLicenseCount > 0) {
    const deduct = Math.min(20, expiredLicenseCount * 10);
    score -= deduct;
    details.push({ code: "LICENSE_ABNORMAL", name: "许可资质异常", deduct, reason: `${expiredLicenseCount} 条许可非有效状态或已过期` });
  }

  const seriousInspectionCount = recentInspections.filter((item) => item.seriousProblem).length;
  const problemCount = recentInspections.reduce((sum, item) => sum + item.problemCount, 0);
  if (problemCount > 0) {
    const deduct = Math.min(18, problemCount * 2 + seriousInspectionCount * 6);
    score -= deduct;
    details.push({ code: "INSPECTION_PROBLEM", name: "监督检查问题", deduct, reason: `近一年发现 ${problemCount} 个问题，重大问题 ${seriousInspectionCount} 个` });
  }

  const penaltyDeduct = recentPenalties.reduce((sum, item) => {
    if (item.seriousDishonesty || item.foodSafetyMajorCase) forceD = true;
    return sum + (item.foodSafetyMajorCase ? 25 : 12);
  }, 0);
  if (penaltyDeduct > 0) {
    score -= Math.min(35, penaltyDeduct);
    details.push({ code: "PENALTY", name: "行政处罚与失信", deduct: Math.min(35, penaltyDeduct), reason: `近一年行政处罚 ${recentPenalties.length} 条` });
  }

  const failedSamples = recentSamples.filter((item) => item.conclusion.includes("不合格"));
  if (failedSamples.length > 0) {
    const deduct = Math.min(22, failedSamples.length * 11);
    score -= deduct;
    details.push({ code: "SAMPLE_FAILED", name: "抽查抽检不合格", deduct, reason: `近一年抽检不合格 ${failedSamples.length} 次` });
  }

  const verifiedComplaints = recentComplaints.filter((item) => item.verified);
  if (recentComplaints.length >= 3 || verifiedComplaints.length > 0) {
    const deduct = Math.min(16, recentComplaints.length * 3 + verifiedComplaints.length * 4);
    score -= deduct;
    details.push({ code: "COMPLAINT_CLUSTER", name: "投诉举报集中", deduct, reason: `近半年投诉 ${recentComplaints.length} 条，查实 ${verifiedComplaints.length} 条` });
  }

  const approvedRepair = enterprise.repairs.find((item) => item.status === "APPROVED" || item.status === "COMPLETED");
  if (approvedRepair) {
    score += 5;
    details.push({ code: "CREDIT_REPAIR", name: "信用修复", deduct: -5, reason: "存在已通过或已完成信用修复记录" });
  }

  score = Math.max(0, Math.min(100, score));
  const level = scoreToLevel(score, forceD);
  const reason = details.length ? details.map((item) => item.reason).join("；") : "未命中明显风险指标";

  return {
    enterprise,
    score,
    level,
    previousLevel: enterprise.currentRiskLevel,
    details,
    reason,
    suggestion: suggestionByLevel(level),
    forceD
  };
}

async function scoreEnterprise(enterpriseId, operator = "system") {
  const result = await calculateEnterpriseScore(enterpriseId);
  const model = await prisma.scoreModel.findFirst({
    where: { published: true },
    orderBy: { publishedAt: "desc" }
  });

  if (!model) {
    throw new Error("未找到已发布评分模型");
  }

  const record = await prisma.$transaction(async (tx) => {
    const created = await tx.scoreRecord.create({
      data: {
        enterpriseId: result.enterprise.id,
        modelId: model.id,
        indicatorVersion: "v1.0",
        score: result.score,
        level: result.level,
        previousLevel: result.previousLevel,
        details: JSON.stringify(result.details),
        reason: result.reason
      }
    });

    await tx.enterprise.update({
      where: { id: result.enterprise.id },
      data: {
        currentScore: result.score,
        currentRiskLevel: result.level,
        riskTags: result.details.map((item) => item.name).join(",")
      }
    });

    if (result.level === "C" || result.level === "D" || result.forceD) {
      await tx.riskWarning.create({
        data: {
          warningNo: `W${Date.now()}${result.enterprise.id}`,
          enterpriseId: result.enterprise.id,
          warningType: result.forceD ? "严重失信或重大食品安全风险" : "等级下降预警",
          triggeredBy: "评分模型",
          level: result.level,
          reason: result.reason,
          suggestion: result.suggestion,
          handlingDept: result.enterprise.regulatoryDepartment
        }
      });
    }

    await tx.auditLog.create({
      data: {
        action: "SCORE",
        module: "评分评级",
        targetId: String(result.enterprise.id),
        detail: JSON.stringify({ operator, score: result.score, level: result.level })
      }
    });

    return created;
  });

  return { ...result, record };
}

module.exports = { calculateEnterpriseScore, scoreEnterprise, suggestionByLevel, toNumber };
