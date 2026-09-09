const API_BASE_URL = "http://127.0.0.1:8000";

function mapStatus(value) {
  const normalized = String(value || "CLEAR").toUpperCase();
  if (normalized === "WARNING") return "WARNING";
  if (normalized === "CRITICAL") return "CRITICAL";
  return "CLEAR";
}

function mapSeverity(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "critical" || normalized === "high") return "critical";
  if (normalized === "warning" || normalized === "medium") return "warning";
  return "info";
}

export function normalizeBackendManhole(item = {}) {
  const rawManholeId = String(item.manholeId || "000");
  const suffix = rawManholeId.startsWith("MANHOLE_")
    ? rawManholeId.replace(/^MANHOLE_/, "")
    : rawManholeId;
  const normalizedId = `MANHOLE_${suffix}`;
  const expectedPipeLength = Number(item.pipeLength || 100);
  const measuredDistance = Number(item.distance || 0);
  const blockagePercentage = Number(item.estimatedBlockage || 0);
  const status = mapStatus(item.status);
  const now = Date.now();

  return {
    id: `MH${suffix.replace(/\D/g, "") || "000"}`,
    nodeId: item.nodeId || `NODE_${suffix}`,
    manholeId: normalizedId,
    name: item.location || "Unknown Zone",
    area: item.location || "Unknown Zone",
    latitude: Number(item.latitude || 17.385),
    longitude: Number(item.longitude || 78.4867),
    expectedPipeLength,
    measuredDistance,
    blockagePercentage,
    status,
    lastUpdated: item.lastUpdated
      ? new Date(item.lastUpdated).getTime() || now
      : now,
    sensorId: item.sensorId || `US-${suffix}`,
    history: [
      {
        t: now,
        distance: measuredDistance,
        blockage: blockagePercentage,
      },
    ],
  };
}

export function normalizeBackendAlert(item = {}) {
  const status = mapStatus(item.status);
  const percentage = Number(item.estimatedBlockage || 0);
  const rawManholeId = String(item.manholeId || "000");
  const suffix = rawManholeId.startsWith("MANHOLE_")
    ? rawManholeId.replace(/^MANHOLE_/, "")
    : rawManholeId;
  const manholeId = `MANHOLE_${suffix}`;

  return {
    id: `${rawManholeId}-${Date.now()}`,
    severity: mapSeverity(item.severity || status),
    manholeId,
    nodeId: item.nodeId || `NODE_${suffix}`,
    area: item.location || "Unknown Zone",
    blockagePercentage: percentage,
    distanceMeters: Number(item.obstructionDistance ?? item.distance ?? 0),
    prevStatus: "CLEAR",
    newStatus: status,
    message:
      status === "CRITICAL"
        ? `Estimated blockage increased to ${percentage}%. Immediate inspection recommended.`
        : status === "WARNING"
          ? `Estimated blockage increased to ${percentage}%. Monitoring advised.`
          : `Reading returned to normal. Estimated blockage now ${percentage}%.`,
    timestamp: item.lastUpdated
      ? new Date(item.lastUpdated).getTime()
      : Date.now(),
  };
}

export async function fetchAllManholes() {
  const response = await fetch(`${API_BASE_URL}/manholes`);
  if (!response.ok) {
    throw new Error(`Failed to load manholes: ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data.map(normalizeBackendManhole) : [];
}

export async function fetchAlerts() {
  const response = await fetch(`${API_BASE_URL}/alerts`);
  if (!response.ok) {
    throw new Error(`Failed to load alerts: ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data.map(normalizeBackendAlert) : [];
}

export async function fetchDashboardSummary() {
  const response = await fetch(`${API_BASE_URL}/dashboard/summary`);
  if (!response.ok) {
    throw new Error(`Failed to load dashboard summary: ${response.status}`);
  }
  return response.json();
}

export async function submitSensorReading(nodeId, sensorId, distance) {
  const response = await fetch(`${API_BASE_URL}/sensor-data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nodeId,
      sensorId,
      distance,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit sensor reading: ${response.status}`);
  }

  return response.json();
}
