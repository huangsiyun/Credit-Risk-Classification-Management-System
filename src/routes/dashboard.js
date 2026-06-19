const express = require("express");
const prisma = require("../prisma");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(async (req, res) => {
  const [enterpriseCount, warningsOpen, tasksPending, levelGroups, regionGroups, recentWarnings, recentTasks] =
    await Promise.all([
      prisma.enterprise.count(),
      prisma.riskWarning.count({ where: { status: { in: ["OPEN", "JUDGED", "DISPATCHED"] } } }),
      prisma.regulatoryTask.count({ where: { status: { in: ["PENDING", "ASSIGNED", "ACCEPTED", "PROCESSING", "RECTIFYING"] } } }),
      prisma.enterprise.groupBy({ by: ["currentRiskLevel"], _count: { _all: true } }),
      prisma.enterprise.groupBy({ by: ["region"], _count: { _all: true }, orderBy: { _count: { region: "desc" } }, take: 8 }),
      prisma.riskWarning.findMany({
        take: 6,
        orderBy: { triggeredAt: "desc" },
        include: { enterprise: { select: { id: true, name: true, currentRiskLevel: true } } }
      }),
      prisma.regulatoryTask.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: { enterprise: { select: { id: true, name: true, currentRiskLevel: true } } }
      })
    ]);

  const levels = { A: 0, B: 0, C: 0, D: 0 };
  levelGroups.forEach((item) => {
    levels[item.currentRiskLevel] = item._count._all;
  });

  res.json({
    cards: {
      enterpriseCount,
      warningsOpen,
      tasksPending,
      highRiskCount: levels.C + levels.D
    },
    levels,
    regions: regionGroups.map((item) => ({ region: item.region, count: item._count._all })),
    recentWarnings,
    recentTasks
  });
}));

module.exports = router;
