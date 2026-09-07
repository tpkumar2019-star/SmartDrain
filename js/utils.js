// ============================================================
// utils.js — small shared helpers, no state of its own.
// ============================================================

export const STATUS_META = {
  CLEAR: { label: "Clear", color: "#1e9e5a", bg: "#e7f7ee", icon: "check" },
  WARNING: { label: "Warning", color: "#b8790a", bg: "#fdf1dc", icon: "alert" },
  CRITICAL: {
    label: "Critical",
    color: "#c22a2a",
    bg: "#fce7e7",
    icon: "alert-triangle",
  },
};

export function timeAgo(ts) {
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatClock(ts) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatDateTime(ts) {
  return new Date(ts).toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusBadge(status) {
  const meta = STATUS_META[status];
  return `<span class="badge badge--${status.toLowerCase()}">${meta.label}</span>`;
}

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (typeof c === "string") node.appendChild(document.createTextNode(c));
    else if (c) node.appendChild(c);
  });
  return node;
}

/** Tiny inline SVG sparkline — no chart library needed. */
export function sparklineSVG(
  points,
  { width = 100, height = 100, key = "distance", stroke = "#2f6fed" } = {},
) {
  if (!points.length) return "";
  const values = points.map((p) => p[key]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / Math.max(1, points.length - 1);
  const coords = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = coords.join(" ");
  const last = coords[coords.length - 1].split(",");
  return `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="sparkline">
      <polyline points="${path}" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
      <circle cx="${last[0]}" cy="${last[1]}" r="3.5" fill="${stroke}" />
    </svg>`;
}
