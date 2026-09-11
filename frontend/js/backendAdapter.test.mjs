import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeBackendManhole,
  normalizeBackendAlert,
} from "./backendAdapter.js";
import {
  calculateBlockage,
  calculateRiskScore,
  calculateStatus,
} from "./data.js";

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
    obstructionDistance: 32,
    estimatedBlockage: 68,
    obstructionScore: 68,
    waterLevel: 44.9,
    waterLevelPercentage: 44.9,
    riskScore: 50.6,
    blockageSeverity: "High",
    status: "CRITICAL",
    lastUpdated: "2026-09-09T08:32:31.576274+00:00",
  });

  assert.equal(manhole.manholeId, "MANHOLE_59D");
  assert.equal(manhole.nodeId, "NODE_59D");
  assert.equal(manhole.area, "Sainikpuri, Hyderabad");
  assert.equal(manhole.expectedPipeLength, 100);
  assert.equal(manhole.measuredDistance, 32);
  assert.equal(manhole.obstructionDistance, 32);
  assert.equal(manhole.obstructionScore, 68);
  assert.equal(manhole.waterLevelPercentage, 44.9);
  assert.equal(manhole.riskScore, 50.6);
  assert.equal(manhole.blockageSeverity, "High");
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

test("distance-to-obstruction logic matches the required risk-score severity thresholds", () => {
  assert.equal(calculateBlockage(100, 90), 10);
  assert.equal(calculateBlockage(100, 70), 30);
  assert.equal(calculateBlockage(100, 50), 50);
  assert.equal(calculateBlockage(100, 30), 70);
  assert.equal(calculateBlockage(100, 10), 90);

  assert.equal(calculateRiskScore(20, 10), 14);
  assert.equal(calculateRiskScore(80, 10), 38);
  assert.equal(calculateRiskScore(80, 80), 80);
  assert.equal(calculateRiskScore(20, 80), 56);

  assert.equal(calculateStatus(14), "CLEAR");
  assert.equal(calculateStatus(38), "WARNING");
  assert.equal(calculateStatus(80), "CRITICAL");
  assert.equal(calculateStatus(56), "WARNING");
});
