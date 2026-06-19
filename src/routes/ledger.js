const express = require("express");
const prisma = require("../prisma");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(async (req, res) => {
  const { enterpriseId } = req.query;
  const where = enterpriseId ? { enterpriseId: Number(enterpriseId) } : {};

  const [scoreRecords, warnings, tasks, repairs, sharedRecords] = await Promise.all([
    prisma.scoreRecord.findMany({
      where,
      take: 30,
      orderBy: { createdAt: "desc" },
      include: { enterprise: { select: { name: true, creditCode: true } } }
    }),
    prisma.riskWarning.findMany({
      where,
      take: 30,
      orderBy: { triggeredAt: "desc" },
      include: { enterprise: { select: { name: true, creditCode: true } } }
    }),
    prisma.regulatoryTask.findMany({
      where,
      take: 30,
      orderBy: { createdAt: "desc" },
      include: { enterprise: { select: { name: true, creditCode: true } } }
    }),
    prisma.creditRepair.findMany({
      where,
      take: 30,
      orderBy: { appliedAt: "desc" },
      include: { enterprise: { select: { name: true, creditCode: true } } }
    }),
    prisma.sharedRecord.findMany({ take: 30, orderBy: { createdAt: "desc" } })
  ]);

  res.json({ scoreRecords, warnings, tasks, repairs, sharedRecords });
}));

module.exports = router;
