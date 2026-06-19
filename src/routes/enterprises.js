const express = require("express");
const { z } = require("zod");
const prisma = require("../prisma");
const asyncHandler = require("../utils/asyncHandler");
const { maskEnterprise } = require("../utils/mask");
const { writeAuditLog } = require("../middleware/audit");

const router = express.Router();

const enterpriseSchema = z.object({
  creditCode: z.string().min(6),
  name: z.string().min(1),
  legalRepresentative: z.string().min(1),
  enterpriseType: z.string().min(1),
  address: z.string().min(1),
  region: z.string().min(1),
  foodCategory: z.string().min(1),
  businessStatus: z.enum(["ACTIVE", "SUSPENDED", "REVOKED", "CLOSED"]).optional(),
  regulatoryDepartment: z.string().min(1),
  contactName: z.string().optional(),
  contactPhone: z.string().optional()
});

router.get("/", asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize || 10), 1), 100);
  const { keyword, region, riskLevel, foodCategory, status } = req.query;

  const where = {
    ...(keyword ? {
      OR: [
        { name: { contains: String(keyword) } },
        { creditCode: { contains: String(keyword) } }
      ]
    } : {}),
    ...(region ? { region: String(region) } : {}),
    ...(riskLevel ? { currentRiskLevel: String(riskLevel) } : {}),
    ...(foodCategory ? { foodCategory: String(foodCategory) } : {}),
    ...(status ? { businessStatus: String(status) } : {})
  };

  const [total, rows] = await Promise.all([
    prisma.enterprise.count({ where }),
    prisma.enterprise.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: "desc" }
    })
  ]);

  res.json({ total, page, pageSize, rows: rows.map(maskEnterprise) });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const enterprise = await prisma.enterprise.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      licenses: true,
      inspections: { orderBy: { inspectionDate: "desc" }, take: 10 },
      penalties: { orderBy: { penaltyDate: "desc" }, take: 10 },
      samples: { orderBy: { sampleDate: "desc" }, take: 10 },
      complaints: { orderBy: { acceptedAt: "desc" }, take: 10 },
      repairs: { orderBy: { appliedAt: "desc" }, take: 10 },
      scoreRecords: { orderBy: { createdAt: "desc" }, take: 10 },
      warnings: { orderBy: { triggeredAt: "desc" }, take: 10 },
      tasks: { orderBy: { createdAt: "desc" }, take: 10 },
      changeLogs: { orderBy: { createdAt: "desc" }, take: 20 }
    }
  });

  if (!enterprise) return res.status(404).json({ message: "企业不存在" });
  res.json(maskEnterprise(enterprise));
}));

router.post("/", asyncHandler(async (req, res) => {
  const body = enterpriseSchema.parse(req.body);
  const enterprise = await prisma.enterprise.create({ data: body });
  await writeAuditLog(req, "CREATE", "企业信用档案", enterprise.id, body);
  res.status(201).json(maskEnterprise(enterprise));
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const old = await prisma.enterprise.findUnique({ where: { id: Number(req.params.id) } });
  if (!old) return res.status(404).json({ message: "企业不存在" });

  const body = enterpriseSchema.partial().parse(req.body);
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.enterprise.update({
      where: { id: old.id },
      data: body
    });

    const fields = ["name", "address", "businessStatus", "regulatoryDepartment", "contactPhone"];
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(body, field) && String(old[field] || "") !== String(body[field] || "")) {
        await tx.enterpriseChangeLog.create({
          data: {
            enterpriseId: old.id,
            fieldName: field,
            oldValue: String(old[field] || ""),
            newValue: String(body[field] || ""),
            operator: req.user?.displayName || req.user?.username || "system",
            reason: "档案更新"
          }
        });
      }
    }

    return row;
  });

  await writeAuditLog(req, "UPDATE", "企业信用档案", updated.id, body);
  res.json(maskEnterprise(updated));
}));

module.exports = router;
