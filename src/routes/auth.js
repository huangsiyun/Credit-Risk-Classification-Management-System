const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const prisma = require("../prisma");
const asyncHandler = require("../utils/asyncHandler");
const { writeAuditLog } = require("../middleware/audit");

const router = express.Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

router.post("/login", asyncHandler(async (req, res) => {
  const body = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({
    where: { username: body.username },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } }
            }
          }
        }
      }
    }
  });

  if (!user || !user.enabled) {
    return res.status(401).json({ message: "账号或密码错误" });
  }

  const valid = await bcrypt.compare(body.password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: "账号或密码错误" });
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "8h" }
  );

  req.user = { id: user.id };
  await writeAuditLog(req, "LOGIN", "登录认证", user.id, { username: user.username });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      roles: user.roles.map((item) => item.role.code),
      permissions: user.roles.flatMap((item) =>
        item.role.permissions.map((permission) => permission.permission.code)
      )
    }
  });
}));

module.exports = router;
