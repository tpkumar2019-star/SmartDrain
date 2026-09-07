// ============================================================
// data.js
// Defines what a "manhole sensor reading" looks like, and the
// prototype math that turns a raw distance into a blockage
// percentage and a status. This file has NO knowledge of the UI —
// it only knows about the data shape, so it can later be swapped
// for a real FastAPI/Firebase/WebSocket source without touching
// any component code.
// ============================================================

// Prototype thresholds — deliberately easy to find and tweak.
export const THRESHOLDS = {
  WARNING: 30, // >= 30% estimated blockage => WARNING
  CRITICAL: 60, // >= 60% estimated blockage => CRITICAL
};

// City center used for the prototype's mock geography (Hyderabad).
const CITY_CENTER = { lat: 17.385, lng: 78.4867 };

// Realistic-sounding zone names so the prototype doesn't look like
// randomly scattered pins with no context.
const ZONES = [
  "Central Road",
  "Riverside Park",
  "Market Street",
  "West Zone",
  "Lake View Road",
  "Old City",
  "Banjara Hills",
  "Jubilee Hills",
  "Secunderabad",
  "Tank Bund",
  "Begumpet",
  "Ameerpet",
  "Kukatpally",
  "Madhapur",
  "Gachibowli",
  "Charminar Area",
  "Abids",
  "Himayatnagar",
  "Nampally",
  "Sainikpuri",
];

/**
 * Estimated Blockage % = (1 - measuredDistance / expectedPipeLength) x 100
 * This is a PROTOTYPE estimation, not a validated physical measurement —
 * hence "Estimated Blockage" everywhere in the UI rather than an exact claim.
 */
export function calculateBlockage(expectedPipeLength, measuredDistance) {
  const raw = (1 - measuredDistance / expectedPipeLength) * 100;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function calculateStatus(blockagePercentage) {
  if (blockagePercentage >= THRESHOLDS.CRITICAL) return "CRITICAL";
  if (blockagePercentage >= THRESHOLDS.WARNING) return "WARNING";
  return "CLEAR";
}

function pad(n, width) {
  return String(n).padStart(width, "0");
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function jitterLatLng(center, km) {
  // Rough conversion: 1 degree latitude ~ 111km
  const degLat = km / 111;
  const degLng = km / (111 * Math.cos((center.lat * Math.PI) / 180));
  return {
    lat: center.lat + randomBetween(-degLat, degLat),
    lng: center.lng + randomBetween(-degLng, degLng),
  };
}

/**
 * Builds the initial fleet of manholes. Statuses are seeded so the
 * dashboard opens on a realistic-looking city (mostly clear, some
 * warning, a handful critical) rather than pure random noise.
 */
export function generateManholes(count = 60) {
  const buckets = [
    { status: "CLEAR", n: Math.round(count * 0.7), min: 0, max: 25 },
    { status: "WARNING", n: Math.round(count * 0.2), min: 32, max: 55 },
    {
      status: "CRITICAL",
      n: count - Math.round(count * 0.7) - Math.round(count * 0.2),
      min: 62,
      max: 88,
    },
  ];

  const letters = ["A", "B", "C", "D"];
  const manholes = [];
  let nodeNum = 1;

  buckets.forEach((bucket) => {
    for (let i = 0; i < bucket.n; i++) {
      const expectedPipeLength = Math.round(randomBetween(80, 120));
      const blockagePercentage = Math.round(
        randomBetween(bucket.min, bucket.max),
      );
      const measuredDistance = Math.round(
        expectedPipeLength * (1 - blockagePercentage / 100),
      );
      const { lat, lng } = jitterLatLng(CITY_CENTER, 6);
      const zone = ZONES[nodeNum % ZONES.length];
      const idNum = pad(nodeNum, 2);
      const letter = letters[nodeNum % letters.length];

      manholes.push({
        nodeId: `NODE_${idNum}${letter}`,
        manholeId: `MANHOLE_${idNum}${letter}`,
        area: zone,
        latitude: Number(lat.toFixed(4)),
        longitude: Number(lng.toFixed(4)),
        expectedPipeLength,
        measuredDistance,
        blockagePercentage: calculateBlockage(
          expectedPipeLength,
          measuredDistance,
        ),
        status: calculateStatus(
          calculateBlockage(expectedPipeLength, measuredDistance),
        ),
        lastUpdated: Date.now(),
        sensorId: `US-${idNum}${letter}`,
        history: [],
      });
      nodeNum++;
    }
  });

  // Give every manhole one seed history point for its sparkline.
  manholes.forEach((m) => {
    m.history.push({
      t: Date.now(),
      distance: m.measuredDistance,
      blockage: m.blockagePercentage,
    });
  });

  return manholes;
}
