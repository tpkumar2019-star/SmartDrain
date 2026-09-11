// ============================================================
// manholeDetailsModal.js
// The large "Manhole Details" modal that appears OVER the map
// when a user clicks "View Details" inside a marker popup.
//
// It reads directly from the same `state.manholes` array used by
// every other page (dashboard, table, alerts) — there is no
// separate/hardcoded data here. When the simulation updates a
// manhole that is currently open in this modal, call
// refreshManholeDetailsModal() to redraw it with the new reading.
// ============================================================

import { state } from "./simulation.js";
import { formatDateTime } from "./utils.js";

let currentManholeId = null;
let onViewOnMap = () => {};

const STATUS_COPY = {
  CRITICAL: "Blockage level is high. Maintenance required at the earliest.",
  WARNING: "Blockage level is rising. Inspection is recommended soon.",
  CLEAR: "Drainage flow is normal. No action required.",
};

const ICONS = {
  hash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/></svg>`,
  chip: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
  pulse: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h4l2 8 4-16 2 8h6"/></svg>`,
  ruler: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="8" width="20" height="8" rx="1"/><path d="M6 8v3M10 8v3M14 8v3M18 8v3"/></svg>`,
  percent: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/><path d="M19 5L5 19"/></svg>`,
  pipe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M6 8v8M18 8v8"/></svg>`,
};

function statusIconSVG(status) {
  if (status === "CLEAR")
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>`;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L1 21h22L12 2z"/><path d="M12 9v5M12 17h.01"/></svg>`;
}

function row(iconKey, label, value) {
  return `
    <div class="dm-row">
      <span class="dm-row__icon">${ICONS[iconKey]}</span>
      <span class="dm-row__label">${label}</span>
      <span class="dm-row__value">${value}</span>
    </div>`;
}

function renderContent(manhole) {
  const status = String(manhole.status ?? "CLEAR").toUpperCase();
  const severity = String(
    manhole.blockageSeverity ??
      (Number(manhole.riskScore ?? 0) >= 61
        ? "High"
        : Number(manhole.riskScore ?? 0) >= 31
          ? "Moderate"
          : "Low"),
  );
  const sLower = status.toLowerCase();
  const zone = manhole.zone ?? manhole.area ?? "Unknown Zone";
  const expectedPipeLength = Number(
    manhole.expectedPipeLength ?? manhole.pipeLength ?? 0,
  );
  const measuredDistance = Number(manhole.measuredDistance ?? 0);
  const waterLevelPercentage = Number(
    manhole.waterLevelPercentage ?? manhole.waterLevel ?? 0,
  );
  const riskScore = Number(manhole.riskScore ?? 0);
  const locationText = `${Number(manhole.latitude ?? 0).toFixed(4)}°N, ${Number(manhole.longitude ?? 0).toFixed(4)}°E`;

  document.getElementById("dmTitle").textContent = manhole.manholeId.replace(
    "MANHOLE_",
    "Manhole ",
  );
  document.getElementById("dmSubtitle").textContent = `${zone}, Hyderabad`;

  const badge = document.getElementById("dmStatusBadge");
  badge.textContent = status[0] + status.slice(1).toLowerCase();
  badge.className = `badge badge--${sLower}`;

  document.getElementById("dmLeftCol").innerHTML = [
    row("hash", "Node ID", manhole.nodeId),
    row("chip", "Sensor ID", manhole.sensorId),
    row("pin", "Zone", zone),
    row("pin", "Location", locationText),
    row("pipe", "Expected Pipe Length", `${expectedPipeLength} m`),
    row("ruler", "Measured Distance", `${measuredDistance} m`),
    row(
      "percent",
      "Water Level Percentage",
      `${Math.round(waterLevelPercentage)}%`,
    ),
    row(
      "percent",
      "Risk Score",
      `${Number.isInteger(riskScore) ? riskScore : riskScore.toFixed(1)}`,
    ),
    row("pulse", "Blockage Severity", severity),
    row(
      "pulse",
      "Status",
      `<span class="text-${sLower}">${status[0]}${status.slice(1).toLowerCase()}</span>`,
    ),
    row("clock", "Last Updated", formatDateTime(manhole.lastUpdated)),
  ].join("");

  document.getElementById("dmSeverityBox").className =
    `dm-severity dm-severity--${sLower}`;
  document.getElementById("dmSeverityIcon").innerHTML = statusIconSVG(status);
  document.getElementById("dmSeverityTitle").textContent = status;
  document.getElementById("dmSeverityMsg").textContent =
    STATUS_COPY[status] || STATUS_COPY.CLEAR;
}

export function initManholeDetailsModal(handlers = {}) {
  onViewOnMap = handlers.onViewOnMap || onViewOnMap;

  document
    .getElementById("dmClose")
    .addEventListener("click", closeManholeDetailsModal);
  document
    .getElementById("dmCloseFooter")
    .addEventListener("click", closeManholeDetailsModal);
  document.getElementById("dmBackdrop").addEventListener("click", (e) => {
    if (e.target.id === "dmBackdrop") closeManholeDetailsModal();
  });
  document.getElementById("dmViewOnMap").addEventListener("click", () => {
    const manhole = state.manholes.find(
      (m) => m.manholeId === currentManholeId,
    );
    closeManholeDetailsModal();
    if (manhole) onViewOnMap(manhole);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeManholeDetailsModal();
  });
}

export function openManholeDetailsModal(manhole) {
  if (!manhole) return;
  currentManholeId = manhole.manholeId;
  renderContent(manhole);
  document.getElementById("dmBackdrop").classList.add("is-open");
}

export function closeManholeDetailsModal() {
  currentManholeId = null;
  document.getElementById("dmBackdrop").classList.remove("is-open");
}

/** Called whenever the simulation updates a manhole, so the modal
 *  reflects live data if it happens to be open on that manhole. */
export function refreshManholeDetailsModal(updatedManholeId) {
  if (!currentManholeId || currentManholeId !== updatedManholeId) return;
  const manhole = state.manholes.find((m) => m.manholeId === currentManholeId);
  if (manhole) renderContent(manhole);
}
