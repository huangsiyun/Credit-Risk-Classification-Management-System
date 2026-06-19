const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function date(value) {
  return new Date(value);
}

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.sharedRecord.deleteMany();
  await prisma.regulatoryTask.deleteMany();
  await prisma.riskWarning.deleteMany();
  await prisma.warningRule.deleteMany();
  await prisma.scoreRecord.deleteMany();
  await prisma.scoreModel.deleteMany();
  await prisma.indicator.deleteMany();
  await prisma.creditRepair.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.sampleTest.deleteMany();
  await prisma.penalty.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.license.deleteMany();
  await prisma.enterpriseChangeLog.deleteMany();
  await prisma.enterprise.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const city = await prisma.organization.create({
    data: { name: "某市市场监督管理局", code: "ORG-CITY", level: 1 }
  });
  const district = await prisma.organization.create({
    data: { name: "东城区市场监督管理局", code: "ORG-DONG", level: 2, parentId: city.id }
  });
  const office = await prisma.organization.create({
    data: { name: "东城基层监管所", code: "ORG-DONG-01", level: 3, parentId: district.id }
  });

  const permissions = await Promise.all([
    ["enterprise:read", "企业档案查看"],
    ["enterprise:write", "企业档案维护"],
    ["indicator:write", "指标库维护"],
    ["score:run", "评分评级"],
    ["warning:review", "预警研判"],
    ["task:write", "监管任务管理"],
    ["system:manage", "系统管理"]
  ].map(([code, name]) => prisma.permission.create({ data: { code, name } })));

  const adminRole = await prisma.role.create({ data: { code: "ADMIN", name: "系统管理员" } });
  const supervisorRole = await prisma.role.create({ data: { code: "SUPERVISOR", name: "信用监管人员" } });
  const officerRole = await prisma.role.create({ data: { code: "OFFICER", name: "基层执法人员" } });

  await prisma.rolePermission.createMany({
    data: [
      ...permissions.map((item) => ({ roleId: adminRole.id, permissionId: item.id })),
      ...permissions.filter((item) => item.code !== "system:manage").map((item) => ({ roleId: supervisorRole.id, permissionId: item.id })),
      ...permissions.filter((item) => ["enterprise:read", "task:write"].includes(item.code)).map((item) => ({ roleId: officerRole.id, permissionId: item.id }))
    ]
  });

  const passwordHash = await bcrypt.hash("Admin@123456", 10);
  const admin = await prisma.user.create({ data: { username: "admin", passwordHash, displayName: "系统管理员", organizationId: city.id } });
  const supervisor = await prisma.user.create({ data: { username: "supervisor", passwordHash, displayName: "信用监管员", organizationId: district.id } });
  const officer = await prisma.user.create({ data: { username: "officer", passwordHash, displayName: "基层执法员", organizationId: office.id } });

  await prisma.userRole.createMany({
    data: [
      { userId: admin.id, roleId: adminRole.id },
      { userId: supervisor.id, roleId: supervisorRole.id },
      { userId: officer.id, roleId: officerRole.id }
    ]
  });

  await prisma.scoreModel.create({
    data: {
      version: "v1.0",
      name: "食品企业信用风险规则评分模型",
      description: "采用权重扣分与强制规则结合的可解释评分模型。",
      published: true,
      publishedAt: new Date(),
      levelMapping: JSON.stringify({ A: ">=90", B: "75-89", C: "60-74", D: "<60 或强制规则" }),
      forceRules: JSON.stringify(["严重违法失信", "重大食品安全案件", "连续整改不到位"])
    }
  });

  await prisma.indicator.createMany({
    data: [
      {
        code: "LICENSE_ABNORMAL",
        name: "许可资质异常",
        description: "许可证过期、吊销、暂停或许可范围异常。",
        category: "许可风险",
        calculation: "统计当前非有效许可证数量。",
        weight: 15,
        threshold: ">=1",
        dataSource: "许可系统",
        version: "v1.0"
      },
      {
        code: "INSPECTION_PROBLEM",
        name: "监督检查问题",
        description: "近一年检查发现问题数量和严重问题情况。",
        category: "监管检查风险",
        calculation: "问题数量 * 2 + 严重问题 * 6。",
        weight: 20,
        threshold: "problemCount > 0",
        dataSource: "监督检查记录",
        version: "v1.0"
      },
      {
        code: "PENALTY",
        name: "行政处罚与失信",
        description: "行政处罚、重大违法和严重失信情况。",
        category: "处罚失信风险",
        calculation: "一般处罚扣 12 分，重大食品安全案件扣 25 分并触发强制规则。",
        weight: 30,
        threshold: "近一年存在处罚",
        dataSource: "执法办案系统",
        version: "v1.0"
      },
      {
        code: "SAMPLE_FAILED",
        name: "抽查抽检不合格",
        description: "食品抽检结论不合格情况。",
        category: "抽查抽检风险",
        calculation: "近一年每次不合格扣 11 分。",
        weight: 18,
        threshold: "不合格次数 >= 1",
        dataSource: "抽检系统",
        version: "v1.0"
      },
      {
        code: "COMPLAINT_CLUSTER",
        name: "投诉举报集中",
        description: "短期投诉集中或投诉查实。",
        category: "社会监督风险",
        calculation: "投诉数量 * 3 + 查实数量 * 4。",
        weight: 12,
        threshold: "近半年投诉 >= 3 或存在查实投诉",
        dataSource: "投诉举报平台",
        version: "v1.0"
      }
    ]
  });

  const green = await prisma.enterprise.create({
    data: {
      creditCode: "91320000MA1000001A",
      name: "绿源食品有限公司",
      legalRepresentative: "张明",
      enterpriseType: "食品生产企业",
      address: "东城区建设路 18 号",
      region: "东城区",
      foodCategory: "糕点",
      regulatoryDepartment: "东城区市场监督管理局",
      contactName: "王经理",
      contactPhone: "13800138001",
      currentRiskLevel: "A",
      currentScore: 95
    }
  });

  const spicy = await prisma.enterprise.create({
    data: {
      creditCode: "91320000MA1000002B",
      name: "鑫味餐饮管理有限公司",
      legalRepresentative: "李强",
      enterpriseType: "餐饮服务企业",
      address: "东城区人民路 66 号",
      region: "东城区",
      foodCategory: "餐饮服务",
      regulatoryDepartment: "东城区市场监督管理局",
      contactName: "赵店长",
      contactPhone: "13900139002",
      currentRiskLevel: "C",
      currentScore: 68,
      riskTags: "监督检查问题,投诉举报集中"
    }
  });

  const frozen = await prisma.enterprise.create({
    data: {
      creditCode: "91320000MA1000003C",
      name: "海鲜冷链食品批发中心",
      legalRepresentative: "周海",
      enterpriseType: "食品经营企业",
      address: "西城区冷链园区 8 号",
      region: "西城区",
      foodCategory: "冷链食品",
      regulatoryDepartment: "西城区市场监督管理局",
      contactName: "刘主管",
      contactPhone: "13700137003",
      currentRiskLevel: "D",
      currentScore: 45,
      riskTags: "许可资质异常,行政处罚与失信,抽查抽检不合格"
    }
  });

  await prisma.license.createMany({
    data: [
      {
        enterpriseId: green.id,
        licenseNo: "SC202600001",
        licenseType: "食品生产许可证",
        items: "糕点生产",
        issuingAgency: "某市市场监督管理局",
        issueDate: date("2025-01-01"),
        validFrom: date("2025-01-01"),
        validTo: date("2030-01-01"),
        status: "VALID"
      },
      {
        enterpriseId: spicy.id,
        licenseNo: "CY202600002",
        licenseType: "食品经营许可证",
        items: "热食类食品制售",
        issuingAgency: "东城区市场监督管理局",
        issueDate: date("2024-03-01"),
        validFrom: date("2024-03-01"),
        validTo: date("2029-03-01"),
        status: "VALID"
      },
      {
        enterpriseId: frozen.id,
        licenseNo: "JY202300003",
        licenseType: "食品经营许可证",
        items: "预包装食品销售、冷链食品销售",
        issuingAgency: "西城区市场监督管理局",
        issueDate: date("2021-04-01"),
        validFrom: date("2021-04-01"),
        validTo: date("2025-04-01"),
        status: "EXPIRED"
      }
    ]
  });

  await prisma.inspection.createMany({
    data: [
      {
        enterpriseId: spicy.id,
        taskCode: "JC20260001",
        inspectionDate: date("2026-03-18"),
        inspectors: "基层执法员",
        inspectionType: "日常检查",
        items: "后厨卫生、索证索票、人员健康证",
        result: "发现一般问题",
        problemCount: 4,
        problems: "后厨消毒记录不完整，食品留样标签缺失。",
        rectificationRequired: true,
        rectificationDeadline: date("2026-03-28")
      },
      {
        enterpriseId: frozen.id,
        taskCode: "JC20260002",
        inspectionDate: date("2026-04-20"),
        inspectors: "基层执法员",
        inspectionType: "专项检查",
        items: "冷链温控、进货查验、追溯凭证",
        result: "发现严重问题",
        problemCount: 5,
        seriousProblem: true,
        problems: "冷链温控记录缺失，部分批次无法追溯。",
        rectificationRequired: true,
        rectificationDeadline: date("2026-04-30")
      }
    ]
  });

  await prisma.penalty.create({
    data: {
      enterpriseId: frozen.id,
      decisionNo: "罚字〔2026〕第 009 号",
      penaltyType: "罚款",
      illegalFacts: "销售不符合食品安全标准的冷链食品。",
      amount: 50000,
      penaltyDate: date("2026-05-09"),
      executionStatus: "已执行",
      foodSafetyMajorCase: true,
      seriousDishonesty: true
    }
  });

  await prisma.sampleTest.createMany({
    data: [
      {
        enterpriseId: green.id,
        sampleNo: "CY2026001001",
        sampleDate: date("2026-02-20"),
        foodCategory: "糕点",
        sampleName: "蛋糕",
        testItems: "菌落总数、食品添加剂",
        conclusion: "合格",
        disposalStatus: "无需处置",
        publicStatus: "已公示"
      },
      {
        enterpriseId: frozen.id,
        sampleNo: "CY2026001002",
        sampleDate: date("2026-05-20"),
        foodCategory: "冷链食品",
        sampleName: "冷冻虾仁",
        testItems: "微生物、兽药残留",
        conclusion: "不合格",
        unqualifiedItem: "菌落总数超标",
        disposalStatus: "已立案处置",
        publicStatus: "已公示"
      }
    ]
  });

  await prisma.complaint.createMany({
    data: [
      {
        enterpriseId: spicy.id,
        complaintNo: "TS20260001",
        acceptedAt: date("2026-04-01"),
        channel: "12315",
        issueType: "食品变质",
        content: "消费者反映堂食菜品存在异味。",
        status: "已办结",
        result: "部分属实，责令整改。",
        verified: true,
        feedbackAt: date("2026-04-05")
      },
      {
        enterpriseId: spicy.id,
        complaintNo: "TS20260002",
        acceptedAt: date("2026-04-16"),
        channel: "网络平台",
        issueType: "环境卫生",
        content: "投诉后厨卫生较差。",
        status: "处理中",
        verified: false
      },
      {
        enterpriseId: spicy.id,
        complaintNo: "TS20260003",
        acceptedAt: date("2026-05-02"),
        channel: "电话",
        issueType: "服务与食品安全",
        content: "投诉餐具清洁不到位。",
        status: "已办结",
        result: "已督促整改。",
        verified: false,
        feedbackAt: date("2026-05-04")
      }
    ]
  });

  const warning = await prisma.riskWarning.create({
    data: {
      warningNo: "W202600001",
      enterpriseId: frozen.id,
      warningType: "重大食品安全风险",
      triggeredBy: "抽检不合格与行政处罚",
      level: "D",
      reason: "命中行政处罚、严重失信和抽检不合格指标。",
      suggestion: "建议派发专项检查任务，开展整改复查并纳入重点监管。",
      handlingDept: "西城区市场监督管理局",
      status: "DISPATCHED"
    }
  });

  await prisma.regulatoryTask.create({
    data: {
      taskNo: "T202600001",
      enterpriseId: frozen.id,
      warningId: warning.id,
      title: "冷链食品安全专项检查",
      matters: "核查许可证状态、冷链温控记录、进货查验和问题批次处置情况。",
      deadline: date("2026-06-10"),
      executionDepartment: "西城基层监管所",
      assigneeId: officer.id,
      status: "ASSIGNED"
    }
  });

  await prisma.creditRepair.create({
    data: {
      enterpriseId: spicy.id,
      applicationNo: "XF20260001",
      appliedAt: date("2026-05-21"),
      repairItem: "后厨卫生整改记录",
      materials: "整改照片、培训记录、消毒台账",
      status: "APPROVED",
      conclusion: "材料完整，整改基本到位。",
      completedAt: date("2026-05-28"),
      impactScope: "用于后续评分时适当降低同类问题风险影响"
    }
  });

  console.log("Seed data created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
