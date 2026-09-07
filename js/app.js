// ============================================================
// app.js  application entry point. Wires simulation events to
// the render layer, handles page navigation, and owns the single
// shared Leaflet map instance (moved between the dashboard's mini
// map slot and the full Map page slot so there is only ever one
// L.map() instance alive at a time).
// ============================================================

import { state, getSensorData, startSimulation } from "./simulation.js";
import {
  initMap,
  updateMarker,
  focusManhole,
  invalidateMapSize,
  resetMap,
} from "./mapView.js";
import {
  renderDashboard,
  setDetailsHandler,
  selectManholeForDashboard,
} from "./dashboard.js";
import {
  renderManholesTable,
  initManholesPage,
  setManholeMapHandler,
  openManholeModal,
  initManholeModal,
} from "./manholes.js";
import {
  renderAlertsList,
  initAlertsPage,
  setAlertDetailsHandler,
  updateAlertBadge,
} from "./alerts.js";
import {
  initSimulationPage,
  refreshSimulationPanel,
} from "./simulationPanel.js";

let activePage = "dashboard";

// ---------------- Navigation ----------------

function goToPage(pageId) {
  if (pageId === activePage) return;
  const prevPage = activePage;
  activePage = pageId;

  document.querySelectorAll(".nav__item").forEach((btn) => {
    btn.classList.toggle(
      "nav__item--active",
      btn.getAttribute("data-page") === pageId,
    );
  });
  document.querySelectorAll(".page").forEach((section) => {
    section.classList.toggle("is-active", section.id === `page-${pageId}`);
  });

  handleMapHostSwap(prevPage, pageId);

  if (pageId === "manholes") renderManholesTable();
  if (pageId === "alerts") renderAlertsList();
  if (pageId === "dashboard") renderDashboard();
}

function handleMapHostSwap(prevPage, nextPage) {
  const liveMapEl = document.getElementById("liveMap");
  if (!liveMapEl) return;
  if (nextPage === "map") {
    document.getElementById("mapHostFull")?.appendChild(liveMapEl);
    invalidateMapSize();
  } else if (prevPage === "map") {
    document.getElementById("mapHostDashboard")?.appendChild(liveMapEl);
    invalidateMapSize();
  }
}

function initNav() {
  document.querySelectorAll(".nav__item").forEach((btn) => {
    btn.addEventListener("click", () =>
      goToPage(btn.getAttribute("data-page")),
    );
  });
}

// ---------------- Cross-module navigation handlers ----------------

function viewManholeOnMap(manholeId) {
  const manhole = getSensorData().find((m) => m.manholeId === manholeId);
  if (!manhole) return;
  goToPage("map");
  focusManhole(manhole);
}

function handleMapMarkerClick(manholeId, opts = {}) {
  if (opts.keepPage) {
    // Direct pin click: sync the dashboard details panel, Leaflet's
    // own bindPopup already shows the quick-glance info.
    selectManholeForDashboard(manholeId);
    if (activePage === "dashboard") renderDashboard();
    return;
  }
  // Popup's "View Details" button: open the full detail modal.
  openManholeModal(manholeId);
}

// ---------------- Central refresh ----------------

function refreshEverything() {
  if (activePage === "dashboard") renderDashboard();
  if (activePage === "manholes") renderManholesTable();
  if (activePage === "alerts") renderAlertsList();
  updateAlertBadge();
  refreshSimulationPanel();
}

// ---------------- Simulation event wiring ----------------

function initSimulationEvents() {
  window.addEventListener("manhole:update", (e) => {
    updateMarker(e.detail.manhole);
    if (activePage === "dashboard") renderDashboard();
    if (activePage === "manholes") renderManholesTable();
    updateAlertBadge();
  });

  window.addEventListener("alerts:new", () => {
    if (activePage === "alerts") renderAlertsList();
    if (activePage === "dashboard") renderDashboard();
    updateAlertBadge();
  });

  window.addEventListener("dashboard:refresh", () => {
    refreshEverything();
  });

  window.addEventListener("simulation:statechange", () => {
    refreshSimulationPanel();
    if (activePage === "dashboard") renderDashboard();
  });

  window.addEventListener("simulation:reset", () => {
    resetMap(getSensorData());
    refreshEverything();
  });

  window.addEventListener("demo:step", () => {
    refreshSimulationPanel();
  });

  window.addEventListener("demo:end", () => {
    refreshEverything();
  });
}

// ---------------- Boot ----------------

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initManholeModal();
  initManholesPage();
  initAlertsPage();
  initSimulationPage();

  setDetailsHandler(viewManholeOnMap);
  setManholeMapHandler(viewManholeOnMap);
  setAlertDetailsHandler(openManholeModal);

  initMap(getSensorData(), { onViewDetails: handleMapMarkerClick });
  initSimulationEvents();

  renderDashboard();
  renderManholesTable();
  renderAlertsList();
  updateAlertBadge();
  refreshSimulationPanel();

  // Auto-start so the dashboard feels alive immediately on load.
  startSimulation();
});
