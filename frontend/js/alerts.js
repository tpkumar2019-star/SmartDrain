// ============================================================
// alerts.js — Alerts page: search/filter list + badge counter.
// Active alerts are derived from current manhole status. Historical
// recovery entries continue to come from simulation.js.
// ============================================================

import { state } from "./simulation.js";
import { timeAgo } from "./utils.js";

let currentFilter = "all";
let currentSearch = "";
let onOpenDetails = () => {};

export function setAlertDetailsHandler(fn) {
  onOpenDetails = fn;
}

const ICONS = { critical: "⚠", warning: "⚠", info: "✓" };
const TITLES = {
  critical: "Critical Blockage Detected",
  warning: "Blockage Warning",
  info: "Reading Recovered",
};

function activeAlerts() {
  return state.manholes
    .filter((m) => m.status === "CRITICAL" || m.status === "WARNING")
    .map((m) => ({
      id: `active-${m.manholeId}`,
      severity: m.status.toLowerCase(),
      manholeId: m.manholeId,
      nodeId: m.nodeId,
      area: m.area,
      blockagePercentage: m.blockagePercentage,
      distanceMeters: m.measuredDistance,
      message:
        m.status === "CRITICAL"
          ? `Estimated blockage is ${m.blockagePercentage}%. Immediate inspection recommended.`
          : `Estimated blockage is ${m.blockagePercentage}%. Monitoring advised.`,
      timestamp: m.lastUpdated,
    }))
    .sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
}

function filteredAlerts() {
  const q = currentSearch.trim().toLowerCase();
  const alerts =
    currentFilter === "info"
      ? state.alerts.filter((a) => a.severity === "info")
      : activeAlerts().filter((a) => {
          const matchesFilter =
            currentFilter === "all" || a.severity === currentFilter;
          return matchesFilter;
        });

  return alerts.filter((a) => {
    const matchesSearch =
      !q ||
      a.manholeId.toLowerCase().includes(q) ||
      a.area.toLowerCase().includes(q);
    return matchesSearch;
  });
}

export function renderAlertsList() {
  const list = document.getElementById("alertsList");
  const countEl = document.getElementById("alertsCount");
  if (!list) return;

  const active = activeAlerts();
  if (countEl)
    countEl.textContent = `${active.length} alert${active.length === 1 ? "" : "s"}`;

  const alerts = filteredAlerts();
  if (!alerts.length) {
    list.innerHTML = `<div class="empty-state">No alerts match your search/filter yet.</div>`;
    return;
  }

  list.innerHTML = alerts
    .map(
      (a) => `
    <div class="alert-card alert-card--${a.severity}" data-alert-id="${a.manholeId}">
      <div class="alert-card__icon">${ICONS[a.severity]}</div>
      <div style="flex:1">
        <div class="alert-card__top">
          <span class="alert-card__severity">${a.severity.toUpperCase()}</span>
          <span>${timeAgo(a.timestamp)}</span>
        </div>
        <div class="alert-card__title">${TITLES[a.severity]} — ${a.manholeId.replace("MANHOLE_", "Manhole ")}</div>
        <div class="alert-card__msg">${a.message} · ${a.area}</div>
      </div>
    </div>`,
    )
    .join("");

  list.querySelectorAll("[data-alert-id]").forEach((card) => {
    card.addEventListener("click", () => {
      onOpenDetails(card.getAttribute("data-alert-id"));
    });
  });
}

export function initAlertsPage() {
  const searchInput = document.getElementById("alertSearch");
  const chips = document.querySelectorAll("[data-alert-filter]");

  searchInput?.addEventListener("input", (e) => {
    currentSearch = e.target.value;
    renderAlertsList();
  });

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("chip--active"));
      chip.classList.add("chip--active");
      currentFilter = chip.getAttribute("data-alert-filter");
      renderAlertsList();
    });
  });
}

export function updateAlertBadge() {
  const badge = document.getElementById("alertBadge");
  if (!badge) return;
  const activeIssues = state.manholes.filter(
    (m) => m.status !== "CLEAR",
  ).length;
  badge.textContent = activeIssues;
  badge.style.display = activeIssues > 0 ? "inline-flex" : "none";
}
