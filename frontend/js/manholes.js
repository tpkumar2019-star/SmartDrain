// ============================================================
// manholes.js — Manholes page (search/filter table) and the
// shared manhole detail modal (also used by alerts.js and the
// map popup's "View Details" button).
// ============================================================

import { state } from "./simulation.js";
import { statusBadge, formatDateTime, timeAgo, sparklineSVG } from "./utils.js";

let currentFilter = "ALL";
let currentSearch = "";
let onViewOnMap = () => {};

export function setManholeMapHandler(fn) {
  onViewOnMap = fn;
}

function filteredManholes() {
  const q = currentSearch.trim().toLowerCase();
  return state.manholes.filter((m) => {
    const matchesFilter = currentFilter === "ALL" || m.status === currentFilter;
    const matchesSearch =
      !q ||
      m.manholeId.toLowerCase().includes(q) ||
      m.nodeId.toLowerCase().includes(q) ||
      m.area.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });
}

export function renderManholesTable() {
  const tbody = document.getElementById("manholesTableBody");
  const countEl = document.getElementById("manholeCount");
  if (!tbody) return;

  const list = filteredManholes();
  if (countEl)
    countEl.textContent = `${list.length} of ${state.manholes.length} nodes`;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row">No manholes match your search/filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = list
    .map(
      (m) => `
    <tr>
      <td>${m.manholeId.replace("MANHOLE_", "")}</td>
      <td>${m.nodeId}</td>
      <td>${statusBadge(m.status)}</td>
      <td>~${m.blockagePercentage}%</td>
      <td>${m.measuredDistance} m</td>
      <td>${m.sensorId}</td>
      <td>${timeAgo(m.lastUpdated)}</td>
      <td><button class="link-cell" data-details="${m.manholeId}">View Details</button></td>
    </tr>`,
    )
    .join("");

  tbody.querySelectorAll("[data-details]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openManholeModal(btn.getAttribute("data-details"));
    });
  });
}

export function initManholesPage() {
  const searchInput = document.getElementById("manholeSearch");
  const chips = document.querySelectorAll("[data-filter]");

  searchInput?.addEventListener("input", (e) => {
    currentSearch = e.target.value;
    renderManholesTable();
  });

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("chip--active"));
      chip.classList.add("chip--active");
      currentFilter = chip.getAttribute("data-filter");
      renderManholesTable();
    });
  });
}

// ---------------- Manhole detail modal ----------------

export function openManholeModal(manholeId) {
  const m = state.manholes.find((x) => x.manholeId === manholeId);
  if (!m) return;

  const backdrop = document.getElementById("manholeModalBackdrop");
  const body = document.getElementById("manholeModalBody");
  if (!backdrop || !body) return;

  const zone = m.zone ?? m.area ?? "Unknown Zone";
  const location = `${Number(m.latitude ?? 0).toFixed(4)}°N, ${Number(m.longitude ?? 0).toFixed(4)}°E`;
  const expectedPipeLength = Number(m.expectedPipeLength ?? m.pipeLength ?? 0);
  const measuredDistance = Number(m.measuredDistance ?? 0);
  const waterLevel = Number(m.waterLevelPercentage ?? m.waterLevel ?? 0);
  const riskScore = Number(m.riskScore ?? 0);
  const blockageSeverity = String(
    m.blockageSeverity ??
      (riskScore >= 61 ? "High" : riskScore >= 31 ? "Moderate" : "Low"),
  );
  const status = String(m.status ?? "CLEAR").toUpperCase();
  const riskScoreDisplay = Number.isInteger(riskScore)
    ? String(riskScore)
    : Number(riskScore).toFixed(1);

  body.innerHTML = `
    <div class="modal-head">
      <h3>${m.manholeId.replace("MANHOLE_", "Manhole ")}</h3>
      ${statusBadge(status)}
    </div>
    <div class="modal-grid">
      <div><span>Node ID</span><b>${m.nodeId}</b></div>
      <div><span>Sensor ID</span><b>${m.sensorId}</b></div>
      <div><span>Zone</span><b>${zone}</b></div>
      <div><span>Location</span><b>${location}</b></div>
      <div><span>Expected Pipe Length</span><b>${expectedPipeLength} m</b></div>
      <div><span>Measured Distance</span><b>${measuredDistance} m</b></div>
      <div><span>Water Level Percentage</span><b>${Math.round(waterLevel)}%</b></div>
      <div><span>Risk Score</span><b>${riskScoreDisplay}</b></div>
      <div><span>Blockage Severity</span><b>${blockageSeverity}</b></div>
      <div><span>Status</span><b>${status}</b></div>
      <div><span>Last Updated</span><b>${formatDateTime(m.lastUpdated)}</b></div>
    </div>
    <button class="btn btn--primary btn--block" data-modal-view-map="${m.manholeId}">View on Map</button>
  `;

  body.querySelector("[data-modal-view-map]")?.addEventListener("click", () => {
    closeManholeModal();
    onViewOnMap(m);
  });

  backdrop.classList.add("is-open");
}

export function closeManholeModal() {
  document.getElementById("manholeModalBackdrop")?.classList.remove("is-open");
}

export function initManholeModal() {
  document
    .getElementById("manholeModalClose")
    ?.addEventListener("click", closeManholeModal);
  document
    .getElementById("manholeModalBackdrop")
    ?.addEventListener("click", (e) => {
      if (e.target.id === "manholeModalBackdrop") closeManholeModal();
    });
}
