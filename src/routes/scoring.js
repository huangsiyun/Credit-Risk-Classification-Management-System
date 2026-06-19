const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { scoreEnterprise, calculateEnterpriseScore } = require("../services/scoringService");

const router = express.Router();

router.get("/:enterpriseId/preview", asyncHandler(async (req, res) => {
  const result = await calculateEnterpriseScore(req.params.enterpriseId);
  res.json({
    enterprise: { id: result.enterprise.id, name: result.enterprise.name },
    score: result.score,
    level: result.level,
    previousLevel: result.previousLevel,
    details: result.details,
    reason: result.reason,
    suggestion: result.suggestion
  });
}));

router.post("/:enterpriseId", asyncHandler(async (req, res) => {
  const result = await scoreEnterprise(req.params.enterpriseId, req.user?.username || "system");
  res.json({
    recordId: result.record.id,
    score: result.score,
    level: result.level,
    previousLevel: result.previousLevel,
    details: result.details,
    reason: result.reason,
    suggestion: result.suggestion
  });
}));

module.exports = router;
