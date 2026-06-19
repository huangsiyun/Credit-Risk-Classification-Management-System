const express = require("express");
const { z } = require("zod");
const prisma = require("../prisma");
const asyncHandler = require("../utils/asyncHandler");
const { writeAuditLog } = require("../middleware/audit");

const router = express.Router();

router.get("/", asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize || 10), 1), 100);
  const { status, keyword, mine } = req.query;
  const where = {
    ...(status ? { status: String(status) } : {}),
    ...(mine === "true" ? { assigneeId: req.user.id } : {}),
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
    prisma.regulatoryTask.count({ where }),
    prisma.regulatoryTask.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        enterprise: { select: { id: true, name: true, address: true, currentRiskLevel: true } },
        warning: true,
        assignee: { select: { id: true, displayName: true, username: true } }
      }
    })
  ]);

  res.json({ total, page, pageSize, rows });
}));

router.post("/", asyncHandler(async (req, res) => {
  const schema = z.object({
    enterpriseId: z.number(),
    warningId: z.number().optional(),
    title: z.string().min(1),
    matters: z.string().min(1),
    deadline: z.string().datetime(),
    executionDepartment: z.string().min(1),
    assigneeId: z.number().optional()
  });
  const body = schema.parse(req.body);
  const row = await prisma.$transaction(async (tx) => {
    const task = await tx.regulatoryTask.create({
      data: {
        ...body,
        deadline: new Date(body.deadline),
        taskNo: `T${Date.now()}${body.enterpriseId}`,
        status: body.assigneeId ? "ASSIGNED" : "PENDING"
      }
    });

    if (body.warningId) {
      await tx.riskWarning.update({
        where: { id: body.warningId },
        data: { status: "DISPATCHED" }
      });
    }

    return task;
  });

  await writeAuditLog(req, "CREATE", "监管任务", row.id, body);
  res.status(201).json(row);
}));

router.patch("/:id/status", asyncHandler(async (req, res) => {
  const schema = z.object({
    status: z.enum(["PENDING", "ASSIGNED", "ACCEPTED", "PROCESSING", "RECTIFYING", "REVIEWING", "ARCHIVED", "OVERDUE"]),
    result: z.string().optional(),
    rectificationRequest: z.string().optional(),
    reviewConclusion: z.string().optional()
  });
  const body = schema.parse(req.body);
  const row = await prisma.regulatoryTask.update({
    where: { id: Number(req.params.id) },
    data: {
      ...body,
      archivedAt: body.status === "ARCHIVED" ? new Date() : undefined
    }
  });
  await writeAuditLog(req, "UPDATE", "监管任务", row.id, body);
  res.json(row);
}));

module.exports = router;
