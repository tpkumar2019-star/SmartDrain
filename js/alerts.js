// ============================================================
// alerts.js — Alerts page: search/filter list + badge counter.
// Alerts themselves are produced by simulation.js; this file
// only renders state.alerts and reacts to clicks.
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

function filteredAlerts() {
  const q = currentSearch.trim().toLowerCase();
  return state.alerts.filter((a) => {
    const matchesFilter =
      currentFilter === "all" || a.severity === currentFilter;
    const matchesSearch =
      !q ||
      a.manholeId.toLowerCase().includes(q) ||
      a.area.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });
}

export function renderAlertsList() {
  const list = document.getElementById("alertsList");
  const countEl = document.getElementById("alertsCount");
  if (!list) return;

  if (countEl) {
    countEl.textContent = `${state.alerts.length} alert${state.alerts.length === 1 ? "" : "s"}`;
  }

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
