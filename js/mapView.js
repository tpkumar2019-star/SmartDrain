// ============================================================
// mapView.js — Leaflet + OpenStreetMap live map.
// Owns the map instance and marker layer; exposes selectOnMap()
// so other modules (alerts list, table rows) can focus a marker.
// ============================================================

import { timeAgo } from "./utils.js";

let map = null;
const markers = new Map(); // manholeId -> L.Marker
let selectedManholeId = null;
let onViewDetails = () => {};
let onOpenDetails = () => {}; // fired by the popup's "View Details" button -> opens the details modal

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

function refreshMarkerIcons() {
  markers.forEach((marker, manholeId) => {
    const manhole = marker.manhole;
    marker.setIcon(
      pinIcon(
        manhole.status,
        manhole.status === "CRITICAL" || manholeId === selectedManholeId,
      ),
    );
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
  onOpenDetails = opts.onOpenDetails || onOpenDetails;

  map = L.map("liveMap", {
    zoomControl: true,
    attributionControl: true,
  }).setView([17.385, 78.4867], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  manholes.forEach((m) => addMarker(m));

  map.on("popupopen", (e) => {
    const button = e.popup.getElement()?.querySelector("[data-view-details]");
    const manhole = markers.get(
      button?.getAttribute("data-view-details"),
    )?.manhole;
    button?.addEventListener("click", () => {
      if (manhole) onOpenDetails(manhole);
    });
  });

  return map;
}

function addMarker(m) {
  const marker = L.marker([m.latitude, m.longitude], {
    icon: pinIcon(m.status, m.status === "CRITICAL"),
  }).bindPopup(popupHTML(m));
  marker.manhole = m;
  marker.on("click", () => onOpenDetails(m));
  marker.addTo(map);
  markers.set(m.manholeId, marker);
}

export function updateMarker(m) {
  const marker = markers.get(m.manholeId);
  if (!marker) return;
  marker.manhole = m;
  marker.setIcon(
    pinIcon(
      m.status,
      m.status === "CRITICAL" || m.manholeId === selectedManholeId,
    ),
  );
  marker.setPopupContent(popupHTML(m));
}

export function focusManhole(m, { openPopup = true } = {}) {
  if (!map) return;
  selectedManholeId = m.manholeId;
  refreshMarkerIcons();
  map.flyTo([m.latitude, m.longitude], 15, { duration: 0.6 });
  const marker = markers.get(m.manholeId);
  if (marker && openPopup) setTimeout(() => marker.openPopup(), 650);
}

export function invalidateMapSize() {
  if (map) setTimeout(() => map.invalidateSize(), 50);
}
