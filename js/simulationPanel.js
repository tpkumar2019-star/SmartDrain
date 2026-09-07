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
  });

  document.getElementById("simPause")?.addEventListener("click", () => {
    pauseSimulation();
  });

  document.getElementById("simReset")?.addEventListener("click", () => {
    resetSimulation();
    populateManholeSelect();
  });

  document.querySelectorAll("[data-speed]").forEach((chip) => {
    chip.addEventListener("click", () => {
      document
        .querySelectorAll("[data-speed]")
        .forEach((c) => c.classList.remove("chip--active"));
      chip.classList.add("chip--active");
      setSpeed(Number(chip.getAttribute("data-speed")));
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
  });

  document.getElementById("simApply")?.addEventListener("click", () => {
    if (!selectedManholeId || !distanceInput) return;
    updateSensorReading(selectedManholeId, Number(distanceInput.value));
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
}
