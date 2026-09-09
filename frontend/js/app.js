// ============================================================
// app.js — wires everything together. Handles page navigation
// and subscribes UI render functions to simulation events.
// ============================================================

import { state, loadInitialDataFromBackend } from "./simulation.js";
import {
  initMap,
  updateMarker,
  focusManhole,
  invalidateMapSize,
} from "./mapView.js";
import {
  renderDashboard,
  renderSummaryCards,
  renderStatusStrip,
  renderDetailsPanel,
  renderRecentAlerts,
  setDetailsHandler,
  selectManholeForDashboard,
} from "./dashboard.js";
import {
  initManholesPage,
  initManholeModal,
  renderManholesTable,
  openManholeModal,
  setManholeMapHandler,
} from "./manholes.js";
import { initAlertsPage, renderAlertsList } from "./alerts.js";
import { initSimulationPage } from "./simulationPanel.js";
import {
  initManholeDetailsModal,
  openManholeDetailsModal,
  refreshManholeDetailsModal,
} from "./manholeDetailsModal.js";

// ---------------- Navigation ----------------

const pages = document.querySelectorAll(".page");
const navButtons = document.querySelectorAll(".nav__item");

function relocateMap(pageId) {
  const mapEl = document.getElementById("liveMap");
  const target =
    pageId === "map"
      ? document.getElementById("mapHostFull")
      : document.getElementById("mapHostDashboard");
  if (mapEl && target && mapEl.parentElement !== target) {
    target.appendChild(mapEl);
  }
}

function goToPage(pageId) {
  pages.forEach((p) =>
    p.classList.toggle("is-active", p.id === `page-${pageId}`),
  );
  navButtons.forEach((b) =>
    b.classList.toggle(
      "nav__item--active",
      b.getAttribute("data-page") === pageId,
    ),
  );
  if (pageId === "map" || pageId === "dashboard") {
    relocateMap(pageId);
    invalidateMapSize();
  }
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => goToPage(btn.getAttribute("data-page")));
});

// Navigate to a manhole: jump to Map page, fly to it, open popup,
// and also keep the dashboard's detail panel in sync.
function navigateToManhole(selection, opts = {}) {
  const manholeId =
    typeof selection === "string" ? selection : selection?.manholeId;
  const m =
    typeof selection === "object"
      ? state.manholes.find((x) => x.manholeId === manholeId) || selection
      : state.manholes.find((x) => x.manholeId === manholeId);
  if (!m) return;
  selectManholeForDashboard(manholeId);
  if (!opts.keepPage) {
    goToPage("map");
    focusManhole(m);
  }
}
setDetailsHandler(navigateToManhole);
setManholeMapHandler(navigateToManhole);

// ---------------- Boot ----------------

document.addEventListener("DOMContentLoaded", async () => {
  await loadInitialDataFromBackend();

  initMap(state.manholes, {
    onViewDetails: navigateToManhole,
    onOpenDetails: openManholeDetailsModal,
  });
  initManholesPage();
  initManholeModal();
  initAlertsPage({ onViewManhole: navigateToManhole });
  initSimulationPage();
  initManholeDetailsModal({ onViewOnMap: navigateToManhole });

  renderDashboard();
  renderManholesTable();
  renderAlertsList();

  goToPage("dashboard");
});

// ---------------- Live event wiring ----------------

window.addEventListener("manhole:update", (e) => {
  updateMarker(e.detail.manhole);
  renderSummaryCards();
  renderDetailsPanel();
  renderManholesTable();
  refreshManholeDetailsModal(e.detail.manhole.manholeId);
});

window.addEventListener("alerts:new", () => {
  renderRecentAlerts();
  renderAlertsList();
});

window.addEventListener("dashboard:refresh", () => {
  renderStatusStrip();
});

window.addEventListener("simulation:reset", () => {
  // Full data reset: rebuild map markers is out of scope for a light
  // reset, so we simply reload dependent views + re-init the map layer.
  location.reload();
});

// Tick the "x seconds ago" labels once a second even when nothing changed.
setInterval(() => {
  renderStatusStrip();
  renderDetailsPanel();
  renderRecentAlerts();
  renderManholesTable();
}, 1000);
