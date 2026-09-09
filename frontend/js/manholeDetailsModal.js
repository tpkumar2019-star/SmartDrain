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
import { timeAgo, formatDateTime } from "./utils.js";

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

/** Small line chart built with plain SVG — no chart library. */
function historyChartSVG(manhole) {
  const points = manhole.history;
  const W = 320,
    H = 140,
    padL = 30,
    padR = 12,
    padT = 10,
    padB = 24;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  if (points.length < 2) {
    return `<div class="dm-chart__empty">Collecting sensor history…</div>`;
  }

  const yMax = Math.max(50, Math.ceil(manhole.expectedPipeLength / 50) * 50);
  const stepX = innerW / (points.length - 1);
  const color =
    manhole.status === "CRITICAL"
      ? "#e0362f"
      : manhole.status === "WARNING"
        ? "#e0a015"
        : "#1e9e5a";

  const coords = points.map((p, i) => {
    const x = padL + i * stepX;
    const y = padT + innerH - (Math.min(p.distance, yMax) / yMax) * innerH;
    return { x, y };
  });
  const path = coords
    .map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");

  // Show at most 5 evenly spaced x-axis time labels.
  const labelCount = Math.min(5, points.length);
  const labelStep = Math.max(
    1,
    Math.floor((points.length - 1) / (labelCount - 1 || 1)),
  );
  const xLabels = [];
  for (let i = 0; i < points.length; i += labelStep) {
    xLabels.push({
      x: coords[i].x,
      text: new Date(points[i].t).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  }
  if (xLabels[xLabels.length - 1]?.x !== coords[coords.length - 1].x) {
    xLabels.push({
      x: coords[coords.length - 1].x,
      text: new Date(points[points.length - 1].t).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  }

  const gridLines = [0, 0.5, 1]
    .map((frac) => {
      const y = padT + innerH * frac;
      const label = Math.round(yMax * (1 - frac));
      return `
      <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#eef1f6" stroke-width="1" />
      <text x="${padL - 6}" y="${y + 3}" font-size="9" fill="#8a94a6" text-anchor="end">${label}</text>`;
    })
    .join("");

  const dots = coords
    .map((c) => `<circle cx="${c.x}" cy="${c.y}" r="2.6" fill="${color}" />`)
    .join("");
  const xAxisLabels = xLabels
    .map(
      (l) =>
        `<text x="${l.x}" y="${H - 6}" font-size="9" fill="#8a94a6" text-anchor="middle">${l.text}</text>`,
    )
    .join("");

  return `
    <svg viewBox="0 0 ${W} ${H}" class="dm-chart-svg" preserveAspectRatio="none">
      ${gridLines}
      <polyline points="${path}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
      ${dots}
      ${xAxisLabels}
    </svg>`;
}

function renderContent(manhole) {
  const s = manhole.status;
  const sLower = s.toLowerCase();
  const obstruction = manhole.expectedPipeLength - manhole.measuredDistance;

  document.getElementById("dmTitle").textContent = manhole.manholeId.replace(
    "MANHOLE_",
    "Manhole ",
  );
  document.getElementById("dmSubtitle").textContent =
    `${manhole.area}, Hyderabad`;

  const badge = document.getElementById("dmStatusBadge");
  badge.textContent = s[0] + s.slice(1).toLowerCase();
  badge.className = `badge badge--${sLower}`;

  document.getElementById("dmLeftCol").innerHTML = [
    row("hash", "Node ID", manhole.nodeId),
    row("chip", "Sensor ID", manhole.sensorId),
    row(
      "pin",
      "Location",
      `${manhole.latitude.toFixed(4)}°N, ${manhole.longitude.toFixed(4)}°E`,
    ),
    row("clock", "Last updated", formatDateTime(manhole.lastUpdated)),
    row(
      "pulse",
      "Status",
      `<span class="text-${sLower}">${s[0]}${s.slice(1).toLowerCase()}</span>`,
    ),
    row("ruler", "Obstruction distance", `${obstruction} meters`),
    row("percent", "Estimated blockage", `~${manhole.blockagePercentage}%`),
    row("pipe", "Expected pipe length", `${manhole.expectedPipeLength} meters`),
  ].join("");

  document.getElementById("dmSeverityBox").className =
    `dm-severity dm-severity--${sLower}`;
  document.getElementById("dmSeverityIcon").innerHTML = statusIconSVG(s);
  document.getElementById("dmSeverityTitle").textContent = s;
  document.getElementById("dmSeverityMsg").textContent = STATUS_COPY[s];

  const fill = document.getElementById("dmProgressFill");
  fill.style.width = `${manhole.blockagePercentage}%`;
  fill.className = `dm-progress__fill dm-progress__fill--${sLower}`;

  document.getElementById("dmObstructionValue").textContent =
    `${obstruction} m`;
  document.getElementById("dmBlockageValue").textContent =
    `${manhole.blockagePercentage}%`;

  document.getElementById("dmChartHost").innerHTML = historyChartSVG(manhole);
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
