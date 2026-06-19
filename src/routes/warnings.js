const express = require("express");
const { z } = require("zod");
const prisma = require("../prisma");
const asyncHandler = require("../utils/asyncHandler");
const { writeAuditLog } = require("../middleware/audit");

const router = express.Router();

router.get("/", asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize || 10), 1), 100);
  const { status, level, keyword } = req.query;

  const where = {
    ...(status ? { status: String(status) } : {}),
    ...(level ? { level: String(level) } : {}),
    ...(keyword ? {
      enterprise: {
        OR: [
          { name: { contains: String(keyword) } },
          { creditCode: { contains: String(keyword) } }
        ]
      }
    } : {})
  };

  const [total, rows] = await Promise.all([
    prisma.riskWarning.count({ where }),
    prisma.riskWarning.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { triggeredAt: "desc" },
      include: { enterprise: { select: { id: true, name: true, creditCode: true, region: true, currentRiskLevel: true } } }
    })
  ]);

  res.json({ total, page, pageSize, rows });
}));

router.post("/", asyncHandler(async (req, res) => {
  const schema = z.object({
    enterpriseId: z.number(),
    warningType: z.string().min(1),
    level: z.enum(["A", "B", "C", "D"]),
    reason: z.string().min(1),
    suggestion: z.string().min(1),
    handlingDept: z.string().optional()
  });
  const body = schema.parse(req.body);
  const row = await prisma.riskWarning.create({
    data: {
      ...body,
      warningNo: `W${Date.now()}${body.enterpriseId}`,
      triggeredBy: req.user?.displayName || "人工研判"
    }
  });
  await writeAuditLog(req, "CREATE", "风险预警", row.id, body);
  res.status(201).json(row);
}));

router.post("/:id/judgement", asyncHandler(async (req, res) => {
  const schema = z.object({
    judgement: z.string().min(1),
    status: z.enum(["JUDGED", "CLOSED"]).default("JUDGED")
  });
  const body = schema.parse(req.body);
  const row = await prisma.riskWarning.update({
    where: { id: Number(req.params.id) },
    data: body
  });
  await writeAuditLog(req, "REVIEW", "风险预警", row.id, body);
  res.json(row);
}));

module.exports = router;
