require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { authenticate } = require("./middleware/auth");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60 * 1000, max: 300 }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", name: "食品企业信用风险分类管理系统" });
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/dashboard", authenticate, require("./routes/dashboard"));
app.use("/api/enterprises", authenticate, require("./routes/enterprises"));
app.use("/api/indicators", authenticate, require("./routes/indicators"));
app.use("/api/scoring", authenticate, require("./routes/scoring"));
app.use("/api/warnings", authenticate, require("./routes/warnings"));
app.use("/api/tasks", authenticate, require("./routes/tasks"));
app.use("/api/ledger", authenticate, require("./routes/ledger"));
app.use("/api/system", authenticate, require("./routes/system"));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
