const state = {
  token: localStorage.getItem("token"),
  user: JSON.parse(localStorage.getItem("user") || "null"),
  view: "dashboard"
};

const pageTitles = {
  dashboard: "风险看板",
  enterprises: "企业档案",
  warnings: "风险预警",
  tasks: "监管任务",
  indicators: "指标库",
  ledger: "监管台账",
  system: "系统管理"
};

const taskFlow = {
  PENDING: "ASSIGNED",
  ASSIGNED: "PROCESSING",
  ACCEPTED: "PROCESSING",
  PROCESSING: "RECTIFYING",
  RECTIFYING: "REVIEWING",
  REVIEWING: "ARCHIVED"
};

function qs(selector) {
  return document.querySelector(selector);
}

function esc(value) {
  return String(value ?? "-").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);
}

function showToast(message) {
  const toast = qs("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "请求失败");
  return data;
}

function levelBadge(level) {
  return `<span class="badge level-${esc(level)}">${esc(level)} 级</span>`;
}

function statusBadge(status) {
  const names = {
    OPEN: "待处理",
    JUDGED: "已研判",
    DISPATCHED: "已派发",
    CLOSED: "已关闭",
    PENDING: "待派发",
    ASSIGNED: "已派发",
    ACCEPTED: "已接收",
    PROCESSING: "处理中",
    RECTIFYING: "整改中",
    REVIEWING: "复查中",
    ARCHIVED: "已归档",
    OVERDUE: "已逾期"
  };
  return `<span class="status">${names[status] || esc(status)}</span>`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function updateUser() {
  qs("#userPill").textContent = state.user ? `${state.user.displayName} (${state.user.username})` : "未登录";
  qs("#loginHint").textContent = state.user ? "已登录，可访问系统数据。" : "请先登录后查看数据。";
}

async function login() {
  const username = qs("#username").value.trim();
  const password = qs("#password").value;
  const data = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
  state.token = data.token;
  state.user = data.user;
  localStorage.setItem("token", state.token);
  localStorage.setItem("user", JSON.stringify(state.user));
  updateUser();
  showToast("登录成功");
  loadView(state.view);
}

function openDialog(title, html) {
  qs("#dialogTitle").textContent = title;
  qs("#dialogBody").innerHTML = html;
  qs("#detailDialog").showModal();
}

function closeDialog() {
  qs("#detailDialog").close();
}

async function loadDashboard() {
  const data = await api("/api/dashboard");
  const cards = [
    ["企业总量", data.cards.enterpriseCount],
    ["开放预警", data.cards.warningsOpen],
    ["待办任务", data.cards.tasksPending],
    ["较高及高风险", data.cards.highRiskCount]
  ];
  qs("#dashboardCards").innerHTML = cards.map(([name, value]) => `
    <div class="stat-card"><p>${esc(name)}</p><strong>${esc(value)}</strong></div>
  `).join("");

  const maxLevel = Math.max(...Object.values(data.levels), 1);
  qs("#levelBars").innerHTML = Object.entries(data.levels).map(([level, count]) => `
    <div class="level-row">
      <div class="level-title"><span>${levelBadge(level)}</span><span>${count} 家</span></div>
      <div class="bar-track"><div class="bar-fill level-${level}" style="width:${count / maxLevel * 100}%"></div></div>
    </div>
  `).join("");

  const maxRegion = Math.max(...data.regions.map((item) => item.count), 1);
  qs("#regionList").innerHTML = data.regions.map((item) => `
    <div class="region-row">
      <div class="region-title"><span>${esc(item.region)}</span><span>${item.count} 家</span></div>
      <div class="bar-track"><div class="bar-fill level-B" style="width:${item.count / maxRegion * 100}%"></div></div>
    </div>
  `).join("") || "暂无区域数据";

  qs("#recentWarnings").innerHTML = data.recentWarnings.map((item) => `
    <div class="list-item">
      <div class="list-title"><strong>${esc(item.enterprise.name)}</strong>${levelBadge(item.level)}</div>
      <span>${esc(item.warningType)}：${esc(item.reason)}</span>
    </div>
  `).join("") || "暂无预警";

  qs("#recentTasks").innerHTML = data.recentTasks.map((item) => `
    <div class="list-item">
      <div class="list-title"><strong>${esc(item.title)}</strong>${statusBadge(item.status)}</div>
      <span>${esc(item.enterprise.name)}，截止 ${formatDate(item.deadline)}</span>
    </div>
  `).join("") || "暂无任务";
}

async function loadEnterprises() {
  const keyword = encodeURIComponent(qs("#enterpriseKeyword").value.trim());
  const riskLevel = qs("#riskLevelFilter").value;
  const data = await api(`/api/enterprises?keyword=${keyword}&riskLevel=${riskLevel}&pageSize=50`);
  qs("#enterpriseRows").innerHTML = data.rows.map((item) => `
    <tr>
      <td>${esc(item.name)}</td>
      <td>${esc(item.creditCode)}</td>
      <td>${esc(item.region)}</td>
      <td>${esc(item.foodCategory)}</td>
      <td>${levelBadge(item.currentRiskLevel)}</td>
      <td>${Number(item.currentScore).toFixed(1)}</td>
      <td class="row-actions">
        <button class="small-action" data-detail="${item.id}">详情</button>
        <button class="small-action" data-preview="${item.id}">预览</button>
        <button class="small-action" data-score="${item.id}">评分</button>
      </td>
    </tr>
  `).join("");
  bindEnterpriseActions();
}

function bindEnterpriseActions() {
  document.querySelectorAll("[data-detail]").forEach((button) => {
    button.addEventListener("click", () => showEnterpriseDetail(button.dataset.detail));
  });
  document.querySelectorAll("[data-preview]").forEach((button) => {
    button.addEventListener("click", () => previewScore(button.dataset.preview));
  });
  document.querySelectorAll("[data-score]").forEach((button) => {
    button.addEventListener("click", async () => {
      const result = await api(`/api/scoring/${button.dataset.score}`, { method: "POST" });
      showToast(`评分完成：${result.score} 分，${result.level} 级`);
      loadEnterprises();
      loadDashboard();
    });
  });
}

async function showEnterpriseDetail(id) {
  const item = await api(`/api/enterprises/${id}`);
  openDialog(item.name, `
    <div class="detail-grid">
      <div><label>统一社会信用代码</label><strong>${esc(item.creditCode)}</strong></div>
      <div><label>法定代表人</label><strong>${esc(item.legalRepresentative)}</strong></div>
      <div><label>企业类型</label><strong>${esc(item.enterpriseType)}</strong></div>
      <div><label>监管部门</label><strong>${esc(item.regulatoryDepartment)}</strong></div>
      <div><label>当前等级</label><strong>${levelBadge(item.currentRiskLevel)}</strong></div>
      <div><label>当前分数</label><strong>${Number(item.currentScore).toFixed(1)}</strong></div>
    </div>
    <h4>风险标签</h4><p>${esc(item.riskTags || "暂无")}</p>
    <h4>许可证</h4>${miniList(item.licenses, (x) => `${x.licenseNo} / ${x.licenseType} / ${x.status} / 有效期至 ${formatDate(x.validTo)}`)}
    <h4>检查记录</h4>${miniList(item.inspections, (x) => `${formatDate(x.inspectionDate)} / ${x.result} / 问题 ${x.problemCount} 个`)}
    <h4>处罚与抽检</h4>${miniList([...(item.penalties || []), ...(item.samples || [])], (x) => x.decisionNo ? `${x.decisionNo} / ${x.penaltyType}` : `${x.sampleNo} / ${x.sampleName} / ${x.conclusion}`)}
  `);
}

async function previewScore(id) {
  const result = await api(`/api/scoring/${id}/preview`);
  openDialog(`${result.enterprise.name} 评分预览`, `
    <div class="score-hero">${levelBadge(result.level)}<strong>${result.score} 分</strong><span>原等级：${result.previousLevel}</span></div>
    <h4>命中指标</h4>
    ${miniList(result.details, (x) => `${x.name}：扣 ${x.deduct} 分，${x.reason}`)}
    <h4>研判原因</h4><p>${esc(result.reason)}</p>
    <h4>监管建议</h4><p>${esc(result.suggestion)}</p>
  `);
}

function miniList(rows, render) {
  return rows && rows.length
    ? `<div class="mini-list">${rows.map((row) => `<div>${esc(render(row))}</div>`).join("")}</div>`
    : "<p>暂无记录</p>";
}

function showEnterpriseForm() {
  openDialog("新增企业档案", `
    <form id="enterpriseForm" class="form-grid">
      <input name="name" placeholder="企业名称" required />
      <input name="creditCode" placeholder="统一社会信用代码" required />
      <input name="legalRepresentative" placeholder="法定代表人" required />
      <input name="enterpriseType" placeholder="企业类型" value="食品经营企业" required />
      <input name="region" placeholder="所属区域" required />
      <input name="foodCategory" placeholder="食品类别" required />
      <input name="regulatoryDepartment" placeholder="监管部门" required />
      <input name="contactName" placeholder="联系人" />
      <input name="contactPhone" placeholder="联系电话" />
      <textarea name="address" placeholder="经营地址" required></textarea>
      <button type="submit">保存企业</button>
    </form>
  `);
  qs("#enterpriseForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.target).entries());
    await api("/api/enterprises", { method: "POST", body: JSON.stringify(body) });
    closeDialog();
    showToast("企业档案已新增");
    loadEnterprises();
  });
}

async function loadWarnings() {
  const status = qs("#warningStatusFilter").value;
  const data = await api(`/api/warnings?pageSize=50&status=${status}`);
  qs("#warningRows").innerHTML = data.rows.map((item) => `
    <tr>
      <td>${esc(item.warningNo)}</td>
      <td>${esc(item.enterprise.name)}</td>
      <td>${esc(item.warningType)}</td>
      <td>${levelBadge(item.level)}</td>
      <td>${statusBadge(item.status)}</td>
      <td>${esc(item.reason)}</td>
      <td><button class="small-action" data-judge="${item.id}">研判</button></td>
    </tr>
  `).join("");
  document.querySelectorAll("[data-judge]").forEach((button) => {
    button.addEventListener("click", () => showWarningJudge(button.dataset.judge));
  });
}

function showWarningJudge(id) {
  openDialog("预警研判", `
    <form id="judgeForm" class="form-grid">
      <textarea name="judgement" placeholder="请输入研判意见、处置依据和建议措施" required></textarea>
      <select name="status">
        <option value="JUDGED">标记为已研判</option>
        <option value="CLOSED">关闭预警</option>
      </select>
      <button type="submit">提交研判</button>
    </form>
  `);
  qs("#judgeForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    await api(`/api/warnings/${id}/judgement`, {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(new FormData(event.target).entries()))
    });
    closeDialog();
    showToast("预警研判已保存");
    loadWarnings();
  });
}

async function loadTasks() {
  const status = qs("#taskStatusFilter").value;
  const data = await api(`/api/tasks?pageSize=50&status=${status}`);
  qs("#taskRows").innerHTML = data.rows.map((item) => `
    <tr>
      <td>${esc(item.taskNo)}</td>
      <td>${esc(item.title)}</td>
      <td>${esc(item.enterprise.name)}</td>
      <td>${statusBadge(item.status)}</td>
      <td>${esc(item.executionDepartment)}</td>
      <td>${formatDate(item.deadline)}</td>
      <td><button class="small-action" data-task="${item.id}" data-status="${item.status}">流转</button></td>
    </tr>
  `).join("");
  document.querySelectorAll("[data-task]").forEach((button) => {
    button.addEventListener("click", () => advanceTask(button.dataset.task, button.dataset.status));
  });
}

async function advanceTask(id, status) {
  const next = taskFlow[status];
  if (!next) return showToast("该任务已无需继续流转");
  await api(`/api/tasks/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: next, result: next === "ARCHIVED" ? "监管任务已完成并归档" : undefined })
  });
  showToast("任务状态已更新");
  loadTasks();
}

async function loadIndicators() {
  const rows = await api("/api/indicators");
  qs("#indicatorRows").innerHTML = rows.map((item) => `
    <tr>
      <td>${esc(item.code)}</td>
      <td>${esc(item.name)}</td>
      <td>${esc(item.category)}</td>
      <td>${Number(item.weight).toFixed(1)}</td>
      <td>${esc(item.threshold)}</td>
      <td>${esc(item.version)}</td>
    </tr>
  `).join("");
}

async function loadLedger() {
  const data = await api("/api/ledger");
  qs("#scoreLedger").innerHTML = miniList(data.scoreRecords, (x) => `${x.enterprise.name} / ${x.score} 分 / ${x.level} 级 / ${formatDate(x.createdAt)}`);
  qs("#repairLedger").innerHTML = miniList(data.repairs, (x) => `${x.enterprise.name} / ${x.repairItem} / ${x.status}`);
  qs("#warningLedger").innerHTML = miniList(data.warnings, (x) => `${x.enterprise.name} / ${x.warningType} / ${x.level} 级 / ${x.status}`);
  qs("#taskLedger").innerHTML = miniList(data.tasks, (x) => `${x.enterprise.name} / ${x.title} / ${x.status}`);
}

async function loadSystem() {
  const [users, logs] = await Promise.all([api("/api/system/users"), api("/api/system/logs")]);
  qs("#systemUsers").innerHTML = miniList(users, (x) => `${x.displayName} (${x.username}) / ${x.roles.map((r) => r.role.name).join("、")} / ${x.enabled ? "启用" : "停用"}`);
  qs("#systemLogs").innerHTML = miniList(logs, (x) => `${formatDate(x.createdAt)} / ${x.module} / ${x.action} / ${x.user?.displayName || "system"}`);
}

async function loadView(view) {
  if (!state.token) {
    updateUser();
    return;
  }
  state.view = view;
  qs("#pageTitle").textContent = pageTitles[view];
  document.querySelectorAll(".nav button").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  document.querySelectorAll(".view").forEach((panel) => panel.classList.remove("active"));
  qs(`#${view}View`).classList.add("active");

  try {
    if (view === "dashboard") await loadDashboard();
    if (view === "enterprises") await loadEnterprises();
    if (view === "warnings") await loadWarnings();
    if (view === "tasks") await loadTasks();
    if (view === "indicators") await loadIndicators();
    if (view === "ledger") await loadLedger();
    if (view === "system") await loadSystem();
  } catch (error) {
    showToast(error.message);
  }
}

qs("#loginBtn").addEventListener("click", () => login().catch((error) => showToast(error.message)));
qs("#refreshBtn").addEventListener("click", () => loadView(state.view));
qs("#searchEnterpriseBtn").addEventListener("click", () => loadEnterprises().catch((error) => showToast(error.message)));
qs("#newEnterpriseBtn").addEventListener("click", showEnterpriseForm);
qs("#searchWarningBtn").addEventListener("click", () => loadWarnings().catch((error) => showToast(error.message)));
qs("#searchTaskBtn").addEventListener("click", () => loadTasks().catch((error) => showToast(error.message)));
qs("#closeDialogBtn").addEventListener("click", closeDialog);

document.querySelectorAll(".nav button").forEach((button) => {
  button.addEventListener("click", () => loadView(button.dataset.view));
});

updateUser();
loadView(state.view);
