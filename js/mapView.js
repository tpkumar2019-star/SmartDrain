// ============================================================
// mapView.js — Leaflet + OpenStreetMap live map.
// Owns the map instance and marker layer; exposes selectOnMap()
// so other modules (alerts list, table rows) can focus a marker.
// ============================================================

import { timeAgo } from "./utils.js";

let map = null;
const markers = new Map(); // manholeId -> L.Marker
let onViewDetails = () => {};

const PIN_COLORS = {
  CLEAR: "#1e9e5a",
  WARNING: "#e0a015",
  CRITICAL: "#e0362f",
};

function pinIcon(status, pulse = false) {
  const color = PIN_COLORS[status];
  return L.divIcon({
    className: "",
    html: `<div class="pin ${pulse ? "pin--pulse" : ""}" style="--pin-color:${color}">
             <div class="pin__dot"></div>
           </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });
}

function popupHTML(m) {
  return `
    <div class="map-popup">
      <div class="map-popup__head">
        <strong>${m.manholeId.replace("MANHOLE_", "Manhole ")}</strong>
        <span class="badge badge--${m.status.toLowerCase()}">${m.status[0]}${m.status.slice(1).toLowerCase()}</span>
      </div>
      <div class="map-popup__row"><span>Obstruction</span><b>${m.expectedPipeLength - m.measuredDistance} m from manhole</b></div>
      <div class="map-popup__row"><span>Estimated blockage</span><b>${m.blockagePercentage}%</b></div>
      <div class="map-popup__row"><span>Last updated</span><b>${timeAgo(m.lastUpdated)}</b></div>
      <button class="btn btn--primary btn--sm" data-view-details="${m.manholeId}">View Details</button>
    </div>`;
}

export function initMap(manholes, opts = {}) {
  onViewDetails = opts.onViewDetails || onViewDetails;

  map = L.map("liveMap", {
    zoomControl: true,
    attributionControl: true,
  }).setView([17.385, 78.4867], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  manholes.forEach((m) => addMarker(m));

  // Delegate clicks on the "View Details" button inside popups.
  map.on("popupopen", (e) => {
    const btn = e.popup.getElement()?.querySelector("[data-view-details]");
    if (btn) {
      btn.addEventListener("click", () =>
        onViewDetails(btn.getAttribute("data-view-details")),
      );
    }
  });

  return map;
}

function addMarker(m) {
  const marker = L.marker([m.latitude, m.longitude], {
    icon: pinIcon(m.status, m.status === "CRITICAL"),
  }).bindPopup(popupHTML(m));
  marker.on("click", () => onViewDetails(m.manholeId, { keepPage: true }));
  marker.addTo(map);
  markers.set(m.manholeId, marker);
}

export function updateMarker(m) {
  const marker = markers.get(m.manholeId);
  if (!marker) return;
  marker.setIcon(pinIcon(m.status, m.status === "CRITICAL"));
  marker.setPopupContent(popupHTML(m));
}

export function focusManhole(m, { openPopup = true } = {}) {
  if (!map) return;
  map.flyTo([m.latitude, m.longitude], 15, { duration: 0.6 });
  const marker = markers.get(m.manholeId);
  if (marker && openPopup) setTimeout(() => marker.openPopup(), 650);
}

export function invalidateMapSize() {
  if (map) setTimeout(() => map.invalidateSize(), 50);
}

/**
 * Rebuilds the marker layer in place after a simulation reset
 * (new manhole fleet, same map/tile instance — no need to tear
 * down and recreate the Leaflet map itself).
 */
export function resetMap(manholes) {
  if (!map) return;
  markers.forEach((marker) => map.removeLayer(marker));
  markers.clear();
  manholes.forEach((m) => addMarker(m));
}
