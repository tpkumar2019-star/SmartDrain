// ============================================================
// dashboard.js — renders the Dashboard page from current state.
// Pure render functions: given data, produce HTML. No polling
// logic lives here; app.js wires these to events.
//
// Note: every DOM write below uses optional chaining (?.) so a
// missing/mismatched element id logs nothing crash-worthy and
// simply skips that one update, instead of throwing and halting
// the rest of app.js's boot sequence (which is what happens with
// a plain document.getElementById(...).textContent = ... call).
// ============================================================

import { updateDashboard, state, mostUrgentManhole } from "./simulation.js";
import { timeAgo, formatDateTime, statusBadge } from "./utils.js";

let selectedManholeId = null;
let onNavigateToManhole = () => {};

export function setDetailsHandler(fn) {
  onNavigateToManhole = fn;
}

export function selectManholeForDashboard(id) {
  selectedManholeId = id;
  renderDetailsPanel();
}

export function renderSummaryCards() {
  const stats = updateDashboard();

  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
    else
      console.warn(`[dashboard.js] Missing element #${id} — check index.html`);
  };

  // Total is a plain number
  set("statTotal", stats.total);

  // Clear / Warning / Critical contain a nested <small> for the percentage.
  // Using textContent on the parent would destroy the <small>, so we rebuild
  // the whole content with innerHTML and keep the original id on the <small>.
  const setWithPct = (id, value, pct) => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = `${value}<small id="${id}Pct">(${pct}%)</small>`;
    } else {
      console.warn(`[dashboard.js] Missing element #${id} — check index.html`);
    }
  };

  setWithPct("statClear", stats.clear, stats.clearPct);
  setWithPct("statWarning", stats.warning, stats.warningPct);
  setWithPct("statCritical", stats.critical, stats.criticalPct);
}

export function renderStatusStrip() {
  const strip = document.getElementById("syncStatus");
  if (strip)
    strip.textContent = `Last synchronized: ${timeAgo(state.lastSyncedAt)}`;
  const activeSensors = document.getElementById("activeSensors");
  if (activeSensors)
    activeSensors.textContent = `${state.manholes.length}/${state.manholes.length}`;
  const liveDot = document.getElementById("liveDot");
  if (liveDot) liveDot.classList.toggle("dot--paused", !state.running);
  const liveLabel = document.getElementById("liveLabel");
  if (liveLabel)
    liveLabel.textContent = state.running ? "LIVE SYSTEM" : "SYSTEM PAUSED";
}

export function renderDetailsPanel() {
  const panel = document.getElementById("manholeDetailsPanel");
  if (!panel) return;
  const m = selectedManholeId
    ? state.manholes.find((x) => x.manholeId === selectedManholeId)
    : mostUrgentManhole();
  if (!m) return;
  selectedManholeId = m.manholeId;

  panel.innerHTML = `
    <div class="details-panel__head">
      <div class="details-panel__title">
        <span class="status-dot status-dot--${m.status.toLowerCase()}"></span>
        <strong>${m.manholeId.replace("MANHOLE_", "Manhole ")}</strong>
      </div>
      ${statusBadge(m.status)}
    </div>
    <dl class="details-list">
      <div><dt>Status</dt><dd class="text-${m.status.toLowerCase()}">${m.status[0]}${m.status.slice(1).toLowerCase()}</dd></div>
      <div><dt>Estimated obstruction</dt><dd>${m.expectedPipeLength - m.measuredDistance} meters</dd></div>
      <div><dt>Estimated blockage</dt><dd>~${m.blockagePercentage}%</dd></div>
      <div><dt>Last reading</dt><dd>${formatDateTime(m.lastUpdated)}</dd></div>
      <div><dt>Sensor ID</dt><dd>${m.sensorId}</dd></div>
      <div><dt>Location</dt><dd>${m.latitude.toFixed(4)}°N, ${m.longitude.toFixed(4)}°E</dd></div>
    </dl>
    <button class="btn btn--primary btn--block" data-action="maintain">Mark for Maintenance</button>
    <button class="btn btn--ghost btn--block" data-action="view-on-map">View on Map</button>
  `;

  panel
    .querySelector('[data-action="view-on-map"]')
    ?.addEventListener("click", () => {
      onNavigateToManhole(m.manholeId);
    });
  panel
    .querySelector('[data-action="maintain"]')
    ?.addEventListener("click", (e) => {
      e.target.textContent = "Maintenance Requested ✓";
      e.target.disabled = true;
    });
}

export function renderRecentAlerts() {
  const tbody = document.getElementById("recentAlertsBody");
  if (!tbody) return;
  const recent = state.alerts.slice(0, 5);

  if (!recent.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">No alerts yet — start the simulation to see live activity.</td></tr>`;
    return;
  }

  tbody.innerHTML = recent
    .map(
      (a) => `
    <tr data-alert-manhole="${a.manholeId}">
      <td>${new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
      <td>${a.manholeId.replace("MANHOLE_", "")}</td>
      <td>${a.area}</td>
      <td>${statusBadge(a.newStatus)}</td>
      <td>${a.newStatus === "CLEAR" ? "-" : `${a.distanceMeters} m`}</td>
      <td><a href="#" class="link" data-view="${a.manholeId}">View</a></td>
    </tr>`,
    )
    .join("");

  tbody.querySelectorAll("[data-view]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      onNavigateToManhole(link.getAttribute("data-view"));
    });
  });
}

export function renderDashboard() {
  renderSummaryCards();
  renderStatusStrip();
  renderDetailsPanel();
  renderRecentAlerts();
}
