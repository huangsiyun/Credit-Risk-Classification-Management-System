const express = require("express");
const prisma = require("../prisma");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get("/logs", asyncHandler(async (req, res) => {
  const rows = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { username: true, displayName: true } } }
  });
  res.json(rows);
}));

router.get("/users", asyncHandler(async (req, res) => {
  const rows = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
      enabled: true,
      organization: true,
      roles: { include: { role: true } }
    },
    orderBy: { id: "asc" }
  });
  res.json(rows);
}));

module.exports = router;
