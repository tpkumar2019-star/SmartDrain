import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeBackendManhole,
  normalizeBackendAlert,
} from "./backendAdapter.js";

test("normalizeBackendManhole maps backend payload to the existing frontend shape", () => {
  const manhole = normalizeBackendManhole({
    manholeId: "59D",
    nodeId: "NODE_59D",
    sensorId: "US-59D",
    location: "Sainikpuri, Hyderabad",
    latitude: 17.4078,
    longitude: 78.4665,
    pipeLength: 100,
    distance: 32,
    estimatedBlockage: 68,
    waterLevel: 44.9,
    blockageSeverity: "High",
    status: "CRITICAL",
    lastUpdated: "2026-09-09T08:32:31.576274+00:00",
  });

  assert.equal(manhole.manholeId, "MANHOLE_59D");
  assert.equal(manhole.nodeId, "NODE_59D");
  assert.equal(manhole.area, "Sainikpuri, Hyderabad");
  assert.equal(manhole.expectedPipeLength, 100);
  assert.equal(manhole.measuredDistance, 32);
  assert.equal(manhole.blockagePercentage, 68);
  assert.equal(manhole.status, "CRITICAL");
  assert.equal(manhole.history.length, 1);
});

test("normalizeBackendAlert converts backend alert data to the UI format", () => {
  const alert = normalizeBackendAlert({
    manholeId: "59D",
    location: "Sainikpuri, Hyderabad",
    status: "CRITICAL",
    estimatedBlockage: 68,
    obstructionDistance: 32,
    waterLevel: 44.9,
    lastUpdated: "2026-09-09T08:32:31.576274+00:00",
    severity: "High",
  });

  assert.equal(alert.manholeId, "MANHOLE_59D");
  assert.equal(alert.newStatus, "CRITICAL");
  assert.equal(alert.area, "Sainikpuri, Hyderabad");
  assert.equal(alert.distanceMeters, 32);
  assert.equal(alert.severity, "critical");
});
