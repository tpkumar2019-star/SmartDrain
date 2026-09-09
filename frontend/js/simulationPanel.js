// ============================================================
// simulationPanel.js — Simulation page controls: start/pause/
// reset, speed, manual reading, and the scripted demo lifecycle.
// Talks only to simulation.js; never touches other pages' DOM.
// ============================================================

import {
  state,
  getSensorData,
  startSimulation,
  pauseSimulation,
  resetSimulation,
  setSpeed,
  updateSensorReading,
  runDemoSequence,
} from "./simulation.js";

let selectedManholeId = null;

function updateSimulationScene(manhole) {
  if (!manhole) return;

  const scene = document.getElementById("simPipeScene");
  if (scene) {
    const pipeFillRatio = Math.max(
      18,
      Math.min(
        100,
        (manhole.measuredDistance / manhole.expectedPipeLength) * 100,
      ),
    );
    const obstructionRatio = Math.max(
      12,
      Math.min(
        88,
        ((manhole.expectedPipeLength - manhole.measuredDistance) /
          manhole.expectedPipeLength) *
          100,
      ),
    );
    scene.style.setProperty("--pipe-fill-ratio", `${pipeFillRatio}%`);
    scene.style.setProperty("--obstruction-ratio", `${obstructionRatio}%`);
    const obstruction = document.querySelector(".sim-obstruction");
    if (obstruction) {
      obstruction.style.left = `${obstructionRatio}%`;
    }
  }

  const nodeId = document.getElementById("simNodeId");
  const sensorId = document.getElementById("simSensorId");
  const location = document.getElementById("simLocation");
  const pipeLength = document.getElementById("simPipeLength");
  const obstructionDistance = document.getElementById("simObstructionDistance");
  const blockageValue = document.getElementById("simBlockageValue");
  const waterLevel = document.getElementById("simWaterLevel");
  const severity = document.getElementById("simSeverity");
  const statusText = document.getElementById("simStatusText");
  const lastUpdated = document.getElementById("simLastUpdated");
  const currentCalculation = document.getElementById("simCurrentCalculation");

  const obstructionMeters = Math.max(
    0,
    manhole.expectedPipeLength - manhole.measuredDistance,
  );
  const waterPercent = Math.max(
    0,
    Math.min(100, 100 - manhole.blockagePercentage),
  );

  if (nodeId) nodeId.textContent = manhole.nodeId;
  if (sensorId) sensorId.textContent = manhole.sensorId;
  if (location)
    location.textContent = `${manhole.latitude.toFixed(4)}°N, ${manhole.longitude.toFixed(4)}°E`;
  if (pipeLength) pipeLength.textContent = `${manhole.expectedPipeLength} m`;
  if (obstructionDistance)
    obstructionDistance.textContent = `${obstructionMeters} m`;
  if (blockageValue)
    blockageValue.textContent = `${manhole.blockagePercentage}%`;
  if (waterLevel) waterLevel.textContent = `${waterPercent}%`;
  if (severity) {
    severity.textContent =
      manhole.status === "CRITICAL"
        ? "High"
        : manhole.status === "WARNING"
          ? "Moderate"
          : "Low";
    severity.className =
      "status-chip " +
      (manhole.status === "CRITICAL"
        ? "status-chip--critical"
        : manhole.status === "WARNING"
          ? "status-chip--warning"
          : "status-chip--clear");
  }
  if (statusText) {
    statusText.textContent = manhole.status;
    statusText.className =
      "status-chip " +
      (manhole.status === "CRITICAL"
        ? "status-chip--critical"
        : manhole.status === "WARNING"
          ? "status-chip--warning"
          : "status-chip--clear");
  }
  if (lastUpdated) {
    const formatted = new Date(manhole.lastUpdated).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    lastUpdated.textContent = formatted;
  }
  if (currentCalculation) {
    const echoTime = ((manhole.measuredDistance * 2) / 1480).toFixed(2);
    currentCalculation.textContent = `${echoTime} ms × 1480 m/s ÷ 2 = ${manhole.measuredDistance} m`;
  }
}

function populateManholeSelect() {
  const select = document.getElementById("simManholeSelect");
  if (!select) return;
  const manholes = getSensorData();

  select.innerHTML = manholes
    .map(
      (m) =>
        `<option value="${m.manholeId}">${m.manholeId.replace("MANHOLE_", "Manhole ")} — ${m.area}</option>`,
    )
    .join("");

  if (
    !selectedManholeId ||
    !manholes.find((m) => m.manholeId === selectedManholeId)
  ) {
    selectedManholeId = manholes[0]?.manholeId || null;
  }
  select.value = selectedManholeId;
  syncDistanceInputToSelected();
  const selected = getSensorData().find(
    (m) => m.manholeId === selectedManholeId,
  );
  updateSimulationScene(selected);
}

function syncDistanceInputToSelected() {
  const manhole = getSensorData().find(
    (m) => m.manholeId === selectedManholeId,
  );
  const input = document.getElementById("simDistanceInput");
  const output = document.getElementById("simDistanceValue");
  if (!manhole || !input || !output) return;
  input.max = manhole.expectedPipeLength;
  input.value = manhole.measuredDistance;
  output.textContent = `${manhole.measuredDistance} m`;
  updateSimulationScene(manhole);
}

export function renderSimulationStatus() {
  const dot = document.getElementById("simStatusDot");
  const label = document.getElementById("simStatusLabel");
  const autoLabel = document.getElementById("simAutoLabel");

  if (dot) dot.classList.toggle("dot--paused", !state.running);
  if (label) label.textContent = state.running ? "RUNNING" : "PAUSED";
  if (autoLabel) {
    autoLabel.textContent = state.running
      ? `Simulation running at ${state.speed}x — new readings arriving automatically`
      : "Simulation paused — no new readings incoming";
  }
}

export function refreshSimulationPanel() {
  renderSimulationStatus();
  syncDistanceInputToSelected();
}

export function initSimulationPage() {
  populateManholeSelect();
  renderSimulationStatus();

  document.getElementById("simStart")?.addEventListener("click", () => {
    startSimulation();
    renderSimulationStatus();
  });

  document.getElementById("simPause")?.addEventListener("click", () => {
    pauseSimulation();
    renderSimulationStatus();
  });

  document.getElementById("simReset")?.addEventListener("click", () => {
    resetSimulation();
    populateManholeSelect();
    renderSimulationStatus();
  });

  document.querySelectorAll("[data-speed]").forEach((chip) => {
    chip.addEventListener("click", () => {
      document
        .querySelectorAll("[data-speed]")
        .forEach((c) => c.classList.remove("chip--active"));
      chip.classList.add("chip--active");
      setSpeed(Number(chip.getAttribute("data-speed")));
      renderSimulationStatus();
    });
  });

  document
    .getElementById("simManholeSelect")
    ?.addEventListener("change", (e) => {
      selectedManholeId = e.target.value;
      syncDistanceInputToSelected();
    });

  const distanceInput = document.getElementById("simDistanceInput");
  const distanceOutput = document.getElementById("simDistanceValue");
  distanceInput?.addEventListener("input", (e) => {
    if (distanceOutput) distanceOutput.textContent = `${e.target.value} m`;
    const selected = getSensorData().find(
      (m) => m.manholeId === selectedManholeId,
    );
    if (selected) {
      const nextDistance = Number(e.target.value);
      selected.measuredDistance = Number(nextDistance);
      selected.blockagePercentage = Math.max(
        0,
        Math.min(
          100,
          Math.round((1 - nextDistance / selected.expectedPipeLength) * 100),
        ),
      );
      selected.status =
        selected.blockagePercentage >= 60
          ? "CRITICAL"
          : selected.blockagePercentage >= 30
            ? "WARNING"
            : "CLEAR";
      updateSimulationScene(selected);
    }
  });

  document.getElementById("simApply")?.addEventListener("click", () => {
    if (!selectedManholeId || !distanceInput) return;
    updateSensorReading(selectedManholeId, Number(distanceInput.value));
    const selected = getSensorData().find(
      (m) => m.manholeId === selectedManholeId,
    );
    updateSimulationScene(selected);
  });

  document.getElementById("simDemoRun")?.addEventListener("click", (e) => {
    if (!selectedManholeId) return;
    const btn = e.target;
    btn.disabled = true;
    btn.textContent = "Running Demo…";
    runDemoSequence(selectedManholeId, () => {
      btn.disabled = false;
      btn.textContent = "Run Demo Lifecycle";
      syncDistanceInputToSelected();
    });
  });

  window.addEventListener("manhole:update", (event) => {
    const selected = getSensorData().find(
      (m) => m.manholeId === selectedManholeId,
    );
    if (selected && event.detail?.manhole?.manholeId === selectedManholeId) {
      updateSimulationScene(selected);
      syncDistanceInputToSelected();
    }
  });
}
