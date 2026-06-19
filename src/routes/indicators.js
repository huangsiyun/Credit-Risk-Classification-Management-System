const express = require("express");
const { z } = require("zod");
const prisma = require("../prisma");
const asyncHandler = require("../utils/asyncHandler");
const { writeAuditLog } = require("../middleware/audit");

const router = express.Router();

const schema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  calculation: z.string().min(1),
  weight: z.number(),
  threshold: z.string().min(1),
  enabled: z.boolean().optional(),
  enterpriseType: z.string().optional(),
  dataSource: z.string().min(1),
  version: z.string().optional()
});

router.get("/", asyncHandler(async (req, res) => {
  const rows = await prisma.indicator.findMany({
    where: req.query.enabled === "true" ? { enabled: true } : {},
    orderBy: [{ category: "asc" }, { code: "asc" }]
  });
  res.json(rows);
}));

router.post("/", asyncHandler(async (req, res) => {
  const body = schema.parse(req.body);
  const row = await prisma.indicator.create({ data: body });
  await writeAuditLog(req, "CREATE", "指标库", row.id, body);
  res.status(201).json(row);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const body = schema.partial().parse(req.body);
  const row = await prisma.indicator.update({ where: { id: Number(req.params.id) }, data: body });
  await writeAuditLog(req, "UPDATE", "指标库", row.id, body);
  res.json(row);
}));

module.exports = router;
