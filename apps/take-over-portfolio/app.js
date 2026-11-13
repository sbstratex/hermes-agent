const STORE_KEY = "takeover.portfolio.v1";

const eur0 = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
const num0 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const pct1 = new Intl.NumberFormat("de-DE", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

const $ = (sel) => document.querySelector(sel);

function deepCopy(v) { return JSON.parse(JSON.stringify(v)); }

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.scenarios && parsed.active) return parsed;
    }
  } catch (e) { /* corrupted storage falls through to seed */ }
  return {
    active: "Base",
    scenarios: { Base: { createdAt: new Date().toISOString(), projects: deepCopy(SEED_PROJECTS) } }
  };
}

function persistStore() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state.store));
}

const state = {
  store: loadStore(),
  working: null,
  dirty: false,
  deepId: null
};

state.working = deepCopy(state.store.scenarios[state.store.active].projects);

function markDirty() {
  state.dirty = true;
  $("#dirtyDot").classList.add("on");
}

function markClean() {
  state.dirty = false;
  $("#dirtyDot").classList.remove("on");
}

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add("hidden"), 2200);
}

function findProject(id) {
  return state.working.find((p) => p.id === id);
}

function renderScenarioSelect() {
  const sel = $("#scenarioSelect");
  sel.innerHTML = "";
  Object.keys(state.store.scenarios).forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    if (name === state.store.active) opt.selected = true;
    sel.appendChild(opt);
  });
  $("#deleteScenarioBtn").style.display = Object.keys(state.store.scenarios).length > 1 ? "" : "none";
}

function renderPortfolioBar() {
  const t = computePortfolio(state.working);
  const stats = [
    { k: "Projects", v: num0.format(t.projects) },
    { k: "Units", v: num0.format(t.units) },
    { k: "Area", v: num0.format(t.sqm) + " m²" },
    { k: "Yearly revenue", v: eur0.format(t.yearlyRevenue), accent: true },
    { k: "EBITDA", v: eur0.format(t.ebitda), accent: true },
    { k: "Cash flow", v: eur0.format(t.cashFlow) },
    { k: "Avg. rent / month", v: eur0.format(t.avgRent) },
    { k: "Avg. occupancy", v: pct1.format(t.avgOccupancy / 100) }
  ];
  $("#portfolioBar").innerHTML = stats
    .map((s) => `<div class="pstat"><div class="k">${s.k}</div><div class="v${s.accent ? " accent" : ""}">${s.v}</div></div>`)
    .join("");
}

function categoryChips(p) {
  const entries = Object.entries(p.categories || {}).filter(([, c]) => Number(c) > 0);
  if (!entries.length) return '<span class="cat-chip">no categories</span>';
  return entries.map(([name, count]) => `<span class="cat-chip">${escapeHtml(name)} <b>×${count}</b></span>`).join("");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderGrid() {
  const grid = $("#grid");
  if (!state.working.length) {
    grid.innerHTML = '<div class="empty">No projects yet. Click “+ Add project” to create your first one.</div>';
    return;
  }
  grid.innerHTML = "";
  state.working.forEach((p) => {
    const k = computeProject(p);
    const tile = document.createElement("button");
    tile.className = "tile";
    tile.innerHTML = `
      <div class="tile-head">
        <div>
          <div class="tile-name">${escapeHtml(p.name)}</div>
          <div class="tile-addr">${escapeHtml(p.street)}, ${escapeHtml(p.zip)} ${escapeHtml(p.city)}, ${escapeHtml(p.land)}</div>
        </div>
        <span class="tile-occupancy">${pct1.format(k.occupancy / 100)} occ.</span>
      </div>
      <div class="tile-kpis">
        <div class="tkpi"><div class="k">Units</div><div class="v">${k.units}</div></div>
        <div class="tkpi"><div class="k">Rent / mo</div><div class="v">${eur0.format(k.rentPerMonth)}</div></div>
        <div class="tkpi"><div class="k">Revenue / yr</div><div class="v">${eur0.format(p.yearlyRevenue)}</div></div>
        <div class="tkpi"><div class="k">Mgmt fee</div><div class="v">${eur0.format(p.managementFee)}</div></div>
        <div class="tkpi"><div class="k">Perf. fee</div><div class="v">${eur0.format(p.performanceFee)}</div></div>
        <div class="tkpi"><div class="k">EBITDA</div><div class="v accent">${eur0.format(k.ebitda)}</div></div>
      </div>
      <div class="tile-cats">${categoryChips(p)}</div>
      <div class="tile-foot"><span>${num0.format(p.sqm)} m² · yield on cost ${pct1.format(k.yieldOnCost)}</span><span class="go">Deep dive →</span></div>
    `;
    tile.addEventListener("click", () => openDeep(p.id));
    grid.appendChild(tile);
  });
}

function field(label, inner) {
  return `<div class="field"><label>${label}</label>${inner}</div>`;
}

function numInput(value, step) {
  return `<input type="number" step="${step || "1"}" value="${Number(value) || 0}" />`;
}

function textInput(value) {
  return `<input type="text" value="${escapeHtml(value || "")}" />`;
}

function openDeep(id) {
  state.deepId = id;
  renderDeep();
  $("#deepOverlay").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeDeep() {
  state.deepId = null;
  $("#deepOverlay").classList.add("hidden");
  document.body.style.overflow = "";
}

function renderDeep() {
  const p = findProject(state.deepId);
  if (!p) { closeDeep(); return; }
  const k = computeProject(p);
  $("#deepTitle").textContent = p.name;
  $("#deepAddress").textContent = `${p.street}, ${p.zip} ${p.city}, ${p.land}`;

  const cats = Object.entries(p.categories || {});
  const catRows = cats.length
    ? cats.map(([name, count], i) => `
      <div class="cat-row" data-i="${i}">
        <input type="text" class="cat-name" value="${escapeHtml(name)}" />
        <input type="number" min="0" step="1" class="cat-count" value="${Number(count) || 0}" />
        <button type="button" class="remove-cat" title="Remove category">×</button>
      </div>`).join("")
    : '<div class="cat-row"><input type="text" class="cat-name" placeholder="Category name" /><input type="number" min="0" class="cat-count" value="1" /><button type="button" class="remove-cat">×</button></div>';

  $("#deepBody").innerHTML = `
    <section>
      <h3 class="section-title">Location</h3>
      <div class="field-grid">
        ${field("Project name", textInput(p.name).replace("<input", '<input data-f="name"'))}
        ${field("Land", textInput(p.land).replace("<input", '<input data-f="land"'))}
        ${field("City", textInput(p.city).replace("<input", '<input data-f="city"'))}
        ${field("ZIP", textInput(p.zip).replace("<input", '<input data-f="zip"'))}
        ${field("Street", textInput(p.street).replace("<input", '<input data-f="street"'))}
      </div>
    </section>
    <section>
      <h3 class="section-title">Units &amp; categories — total units: <span id="deepUnits">${k.units}</span></h3>
      <div class="cat-rows" id="deepCats">${catRows}</div>
      <div style="margin-top:10px"><button type="button" class="btn btn-ghost" id="addCatBtn">+ Add category</button></div>
    </section>
    <section>
      <h3 class="section-title">Financials (editable)</h3>
      <div class="field-grid">
        ${field("Area (m²)", numInput(p.sqm).replace("<input", '<input data-f="sqm"'))}
        ${field("Purchase price (€)", numInput(p.purchasePrice).replace("<input", '<input data-f="purchasePrice"'))}
        ${field("Yearly revenue (€)", numInput(p.yearlyRevenue).replace("<input", '<input data-f="yearlyRevenue"'))}
        ${field("Rent per month / unit (€)", numInput(p.rentPerMonth).replace("<input", '<input data-f="rentPerMonth"'))}
        ${field("Occupancy (%)", numInput(p.occupancy).replace("<input", '<input data-f="occupancy" min="0" max="100"'))}
        ${field("Opex / yr (€)", numInput(p.opex).replace("<input", '<input data-f="opex"'))}
        ${field("Management fee / yr (€)", numInput(p.managementFee).replace("<input", '<input data-f="managementFee"'))}
        ${field("Performance fee / yr (€)", numInput(p.performanceFee).replace("<input", '<input data-f="performanceFee"'))}
      </div>
    </section>
    <section>
      <h3 class="section-title">KPIs (derived)</h3>
      <div class="kpi-grid">
        <div class="dkpi hot"><div class="k">EBITDA</div><div class="v accent">${eur0.format(k.ebitda)}</div></div>
        <div class="dkpi"><div class="k">EBITDA margin</div><div class="v">${pct1.format(k.ebitdaMargin)}</div></div>
        <div class="dkpi"><div class="k">NOI</div><div class="v">${eur0.format(k.noi)}</div></div>
        <div class="dkpi"><div class="k">Cash flow after perf. fee</div><div class="v">${eur0.format(k.cashFlow)}</div></div>
        <div class="dkpi"><div class="k">Monthly revenue</div><div class="v">${eur0.format(k.monthlyRevenue)}</div></div>
        <div class="dkpi"><div class="k">Yield on cost</div><div class="v">${pct1.format(k.yieldOnCost)}</div></div>
        <div class="dkpi"><div class="k">Revenue / m² / yr</div><div class="v">${eur2.format(k.rentPerSqmYear)}</div></div>
        <div class="dkpi"><div class="k">Revenue / unit / yr</div><div class="v">${eur0.format(k.revenuePerUnitYear)}</div></div>
        <div class="dkpi"><div class="k">Vacancy</div><div class="v">${pct1.format(k.vacancy / 100)}</div></div>
        <div class="dkpi"><div class="k">Units</div><div class="v">${k.units}</div></div>
      </div>
    </section>
  `;

  $("#deepBody").querySelectorAll("[data-f]").forEach((input) => {
    input.addEventListener("input", () => {
      const f = input.dataset.f;
      const numeric = ["sqm", "purchasePrice", "yearlyRevenue", "rentPerMonth", "occupancy", "opex", "managementFee", "performanceFee"];
      p[f] = numeric.includes(f) ? Number(input.value) || 0 : input.value;
      markDirty();
      const kk = computeProject(p);
      const eb = $("#deepBody").querySelector(".kpi-grid");
      if (eb) {
        eb.children[0].querySelector(".v").textContent = eur0.format(kk.ebitda);
        eb.children[1].querySelector(".v").textContent = pct1.format(kk.ebitdaMargin);
        eb.children[2].querySelector(".v").textContent = eur0.format(kk.noi);
        eb.children[3].querySelector(".v").textContent = eur0.format(kk.cashFlow);
        eb.children[4].querySelector(".v").textContent = eur0.format(kk.monthlyRevenue);
        eb.children[5].querySelector(".v").textContent = pct1.format(kk.yieldOnCost);
        eb.children[6].querySelector(".v").textContent = eur2.format(kk.rentPerSqmYear);
        eb.children[7].querySelector(".v").textContent = eur0.format(kk.revenuePerUnitYear);
        eb.children[8].querySelector(".v").textContent = pct1.format(kk.vacancy / 100);
        eb.children[9].querySelector(".v").textContent = kk.units;
      }
      const du = $("#deepUnits");
      if (du) du.textContent = kk.units;
      renderPortfolioBar();
      renderGrid();
    });
  });

  $("#deepBody").querySelectorAll(".cat-row").forEach((row) => {
    row.querySelector(".cat-name").addEventListener("input", () => { syncCatsFromDom(); markDirty(); });
    row.querySelector(".cat-count").addEventListener("input", () => { syncCatsFromDom(); markDirty(); });
    row.querySelector(".remove-cat").addEventListener("click", () => { row.remove(); syncCatsFromDom(); markDirty(); renderDeep(); });
  });

  $("#addCatBtn").addEventListener("click", () => {
    const wrap = $("#deepCats");
    const row = document.createElement("div");
    row.className = "cat-row";
    row.innerHTML = `<input type="text" class="cat-name" placeholder="Category name" /><input type="number" min="0" step="1" class="cat-count" value="1" /><button type="button" class="remove-cat">×</button>`;
    row.querySelector(".cat-name").addEventListener("input", () => { syncCatsFromDom(); markDirty(); });
    row.querySelector(".cat-count").addEventListener("input", () => { syncCatsFromDom(); markDirty(); });
    row.querySelector(".remove-cat").addEventListener("click", () => { row.remove(); syncCatsFromDom(); markDirty(); renderDeep(); });
    wrap.appendChild(row);
    row.querySelector(".cat-name").focus();
  });
}

function syncCatsFromDom() {
  const p = findProject(state.deepId);
  if (!p) return;
  const wrap = $("#deepCats");
  if (!wrap) return;
  const cats = {};
  wrap.querySelectorAll(".cat-row").forEach((row) => {
    const name = row.querySelector(".cat-name").value.trim();
    const count = Number(row.querySelector(".cat-count").value) || 0;
    if (name) cats[name] = (cats[name] || 0) + count;
  });
  p.categories = cats;
  const kk = computeProject(p);
  const du = $("#deepUnits");
  if (du) du.textContent = kk.units;
  renderPortfolioBar();
  renderGrid();
}

function saveWorkingToActive() {
  state.store.scenarios[state.store.active].projects = deepCopy(state.working);
  persistStore();
  markClean();
  toast(`Saved to scenario “${state.store.active}”`);
}

function saveAsScenario() {
  const name = prompt("Name of the new scenario:", `${state.store.active} — copy ${new Date().toLocaleDateString("de-DE")}`);
  if (!name || !name.trim()) return;
  const clean = name.trim();
  state.store.scenarios[clean] = { createdAt: new Date().toISOString(), projects: deepCopy(state.working) };
  state.store.active = clean;
  persistStore();
  markClean();
  renderScenarioSelect();
  renderPortfolioBar();
  renderGrid();
  toast(`Scenario “${clean}” saved`);
}

function deleteActiveScenario() {
  const names = Object.keys(state.store.scenarios);
  if (names.length <= 1) return;
  if (!confirm(`Delete scenario “${state.store.active}”? This cannot be undone.`)) return;
  delete state.store.scenarios[state.store.active];
  state.store.active = names.find((n) => n !== state.store.active) || "Base";
  state.working = deepCopy(state.store.scenarios[state.store.active].projects);
  persistStore();
  markClean();
  renderScenarioSelect();
  renderPortfolioBar();
  renderGrid();
  toast(`Scenario deleted — now on “${state.store.active}”`);
}

function switchScenario(name) {
  if (name === state.store.active) return;
  state.store.active = name;
  state.working = deepCopy(state.store.scenarios[name].projects);
  persistStore();
  markClean();
  renderScenarioSelect();
  renderPortfolioBar();
  renderGrid();
  if (state.deepId) renderDeep();
}

const ADD_FIELDS = [
  { f: "name", label: "Project name", type: "text", required: true },
  { f: "land", label: "Land", type: "text", value: "Germany" },
  { f: "city", label: "City", type: "text", required: true },
  { f: "zip", label: "ZIP", type: "text" },
  { f: "street", label: "Street", type: "text", required: true },
  { f: "sqm", label: "Area (m²)", type: "number", value: 1000 },
  { f: "purchasePrice", label: "Purchase price (€)", type: "number", value: 3000000 },
  { f: "rentPerMonth", label: "Rent per month / unit (€)", type: "number", value: 595 },
  { f: "occupancy", label: "Occupancy (%)", type: "number", value: 95 },
  { f: "yearlyRevenue", label: "Yearly revenue (€)", type: "number", value: 100000 },
  { f: "opex", label: "Opex / yr (€)", type: "number", value: 40000 },
  { f: "managementFee", label: "Management fee / yr (€)", type: "number", value: 6000 },
  { f: "performanceFee", label: "Performance fee / yr (€)", type: "number", value: 0 }
];

function renderAddForm() {
  const form = $("#addProjectForm");
  form.innerHTML = `
    <div class="field-grid">
      ${ADD_FIELDS.map((fl) => field(fl.label + (fl.required ? " *" : ""), `<input data-af="${fl.f}" type="${fl.type}" value="${fl.value !== undefined ? fl.value : ""}" ${fl.required ? "required" : ""} />`)).join("")}
    </div>
    <div>
      <h3 class="section-title">Categories (name + count)</h3>
      <div class="cat-rows" id="modalCats">
        <div class="cat-row"><input type="text" class="cat-name" placeholder="e.g. WG room 12-14 m²" value="WG room 12-14 m²" /><input type="number" min="0" step="1" class="cat-count" value="6" /><button type="button" class="remove-cat">×</button></div>
        <div class="cat-row"><input type="text" class="cat-name" placeholder="e.g. Single apartment" value="Single apartment" /><input type="number" min="0" step="1" class="cat-count" value="2" /><button type="button" class="remove-cat">×</button></div>
      </div>
      <div style="margin-top:10px"><button type="button" class="btn btn-ghost" id="modalAddCatBtn">+ Add category</button></div>
    </div>
  `;
  form.querySelectorAll(".remove-cat").forEach((btn) => {
    btn.addEventListener("click", () => btn.closest(".cat-row").remove());
  });
  $("#modalAddCatBtn").addEventListener("click", () => {
    const wrap = $("#modalCats");
    const row = document.createElement("div");
    row.className = "cat-row";
    row.innerHTML = `<input type="text" class="cat-name" placeholder="Category name" /><input type="number" min="0" step="1" class="cat-count" value="1" /><button type="button" class="remove-cat">×</button>`;
    row.querySelector(".remove-cat").addEventListener("click", () => row.remove());
    wrap.appendChild(row);
  });
}

function createProjectFromForm() {
  const data = {};
  $("#addProjectForm").querySelectorAll("[data-af]").forEach((input) => {
    const f = input.dataset.af;
    const numeric = ADD_FIELDS.find((x) => x.f === f).type === "number";
    data[f] = numeric ? Number(input.value) || 0 : input.value.trim();
  });
  if (!data.name || !data.city || !data.street) {
    toast("Name, city and street are required");
    return;
  }
  const categories = {};
  $("#modalCats").querySelectorAll(".cat-row").forEach((row) => {
    const name = row.querySelector(".cat-name").value.trim();
    const count = Number(row.querySelector(".cat-count").value) || 0;
    if (name && count > 0) categories[name] = count;
  });
  const project = {
    id: "p-" + Date.now().toString(36),
    name: data.name,
    land: data.land || "Germany",
    city: data.city,
    zip: data.zip || "",
    street: data.street,
    sqm: data.sqm,
    purchasePrice: data.purchasePrice,
    occupancy: clamp(data.occupancy, 0, 100),
    rentPerMonth: data.rentPerMonth,
    yearlyRevenue: data.yearlyRevenue,
    opex: data.opex,
    managementFee: data.managementFee,
    performanceFee: data.performanceFee,
    categories
  };
  state.working.push(project);
  markDirty();
  $("#modalOverlay").classList.add("hidden");
  renderPortfolioBar();
  renderGrid();
  toast(`Project “${project.name}” added — remember to Save`);
}

function init() {
  renderScenarioSelect();
  renderPortfolioBar();
  renderGrid();

  $("#scenarioSelect").addEventListener("change", (e) => switchScenario(e.target.value));
  $("#saveScenarioBtn").addEventListener("click", saveWorkingToActive);
  $("#saveAsBtn").addEventListener("click", saveAsScenario);
  $("#deleteScenarioBtn").addEventListener("click", deleteActiveScenario);

  $("#addProjectBtn").addEventListener("click", () => {
    renderAddForm();
    $("#modalOverlay").classList.remove("hidden");
  });
  $("#modalCancelBtn").addEventListener("click", () => $("#modalOverlay").classList.add("hidden"));
  $("#modalCreateBtn").addEventListener("click", createProjectFromForm);

  $("#deepCloseBtn").addEventListener("click", closeDeep);
  $("#deepSaveBtn").addEventListener("click", () => { saveWorkingToActive(); renderGrid(); });
  $("#deepSaveAsBtn").addEventListener("click", () => { saveAsScenario(); if (state.deepId) renderDeep(); });
  $("#deepDeleteBtn").addEventListener("click", () => {
    const p = findProject(state.deepId);
    if (!p) return;
    if (!confirm(`Delete project “${p.name}” from the working state?`)) return;
    state.working = state.working.filter((x) => x.id !== p.id);
    markDirty();
    closeDeep();
    renderPortfolioBar();
    renderGrid();
    toast(`Project “${p.name}” deleted — remember to Save`);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDeep();
      $("#modalOverlay").classList.add("hidden");
    }
  });
}

init();
