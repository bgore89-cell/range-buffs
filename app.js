const STORAGE_KEY = "range-buffs-state-v1";
const BILLY_LAYOUT_PRESET = {
  buff: "496,718,158,42",
  action: "766,920,522,222"
};

const TRACKERS = [
  { id: "deaths-swiftness", name: "Death's Swiftness", group: "Burst", icon: "DS", duration: 30 },
  { id: "split-soul", name: "Split Soul / ECB", group: "Burst", icon: "SS", duration: 15 },
  { id: "imbue-shadows", name: "Imbue Shadows", group: "Burst", icon: "IS", cooldown: 45 },
  { id: "galeshot", name: "Galeshot", group: "Combo", icon: "G", cooldown: 30 },
  { id: "rapid-fire", name: "Rapid Fire", group: "Combo", icon: "RF", cooldown: 20 },
  { id: "bolg", name: "BoLG Equilibrium", group: "Stacks", icon: "B", duration: 8 },
  { id: "deathspore", name: "Deathspore Arrows", group: "Stacks", icon: "DA", duration: 12 },
  { id: "overload", name: "Overload", group: "Upkeep", icon: "OVL", duration: 360 }
];

const defaultState = {
  trackers: Object.fromEntries(TRACKERS.map((tracker) => [
    tracker.id,
    {
      active: false,
      ready: Boolean(tracker.cooldown),
      endsAt: 0,
      readyAt: 0
    }
  ])),
  regions: {
    buff: "",
    action: ""
  }
};

let state = loadState();

const grid = document.getElementById("trackerGrid");
const manualControls = document.getElementById("manualControls");
const comboPrompt = document.getElementById("comboPrompt");
const connectionStatus = document.getElementById("connectionStatus");
const buffRegion = document.getElementById("buffRegion");
const actionRegion = document.getElementById("actionRegion");
const captureHint = document.getElementById("captureHint");
const calibrationList = document.getElementById("calibrationList");
const captureReadout = document.getElementById("captureReadout");
const controlsPanel = document.getElementById("controlsPanel");
const settingsToggle = document.getElementById("settingsToggle");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  try {
    if (!window.localStorage) return clone(defaultState);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      trackers: {
        ...clone(defaultState.trackers),
        ...(stored.trackers || {})
      },
      regions: {
        ...defaultState.regions,
        ...(stored.regions || {})
      }
    };
  } catch {
    return clone(defaultState);
  }
}

function saveState() {
  try {
    if (window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Alt1/browser privacy modes can deny storage; the app still works in-memory.
  }
}

function formatTime(seconds) {
  if (seconds <= 0) return "--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`;
}

function secondsUntil(timestamp) {
  return Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
}

function trackerClass(model) {
  if (model.active && secondsUntil(model.endsAt) <= 5) return "soon";
  if (model.active) return "active";
  if (model.ready) return "ready";
  if (secondsUntil(model.readyAt) <= 3) return "soon";
  return "danger";
}

function trackerMeta(tracker, model) {
  if (model.active) return `${tracker.group} active`;
  if (model.ready) return `${tracker.group} ready`;
  if (!tracker.cooldown) return `${tracker.group} inactive`;
  return `${tracker.group} cooling down`;
}

function trackerTimer(model) {
  if (model.active) return formatTime(secondsUntil(model.endsAt));
  if (!model.ready) return formatTime(secondsUntil(model.readyAt));
  return "READY";
}

function tickCooldowns() {
  for (const tracker of TRACKERS) {
    const model = state.trackers[tracker.id];
    if (model.active && secondsUntil(model.endsAt) === 0) {
      model.active = false;
      if (tracker.cooldown) {
        model.ready = false;
        model.readyAt = Date.now() + tracker.cooldown * 1000;
      }
    }
    if (tracker.cooldown && !model.ready && secondsUntil(model.readyAt) === 0) {
      model.ready = true;
    }
  }
}

function renderTrackers() {
  grid.innerHTML = "";
  for (const tracker of TRACKERS) {
    const model = state.trackers[tracker.id];
    const card = document.createElement("article");
    card.className = `status-card ${trackerClass(model)}`;
    card.innerHTML = `
      <div class="status-icon">${tracker.icon}</div>
      <div>
        <span class="status-name">${tracker.name}</span>
        <span class="status-meta">${trackerMeta(tracker, model)}</span>
      </div>
      <div class="timer">${trackerTimer(model)}</div>
    `;
    grid.appendChild(card);
  }
}

function renderControls() {
  manualControls.innerHTML = "";
  for (const tracker of TRACKERS) {
    const model = state.trackers[tracker.id];
    const row = document.createElement("div");
    row.className = "toggle-row";
    row.innerHTML = `
      <span>${tracker.name}</span>
      <button type="button" data-action="active" data-id="${tracker.id}" aria-pressed="${model.active}">Active</button>
      <button type="button" data-action="ready" data-id="${tracker.id}" aria-pressed="${model.ready}">Ready</button>
    `;
    manualControls.appendChild(row);
  }
}

function renderPrompt() {
  const galeshot = state.trackers.galeshot;
  const rapidFire = state.trackers["rapid-fire"];
  const shadows = state.trackers["imbue-shadows"];
  const splitSoul = state.trackers["split-soul"];

  comboPrompt.className = "prompt-panel";

  if (galeshot.ready && rapidFire.ready) {
    comboPrompt.classList.add("ready");
    comboPrompt.innerHTML = `
      <p class="section-label">Combo</p>
      <h2>Galeshot &gt; Rapid Fire</h2>
      <p>Both are ready. Send the primer, then channel Rapid Fire.</p>
    `;
    return;
  }

  if (galeshot.active && rapidFire.ready) {
    comboPrompt.classList.add("ready");
    comboPrompt.innerHTML = `
      <p class="section-label">Combo</p>
      <h2>Rapid Fire now</h2>
      <p>Galeshot is active. Cash it in.</p>
    `;
    return;
  }

  if (!shadows.ready && secondsUntil(shadows.readyAt) <= 3) {
    comboPrompt.classList.add("soon");
    comboPrompt.innerHTML = `
      <p class="section-label">Burst</p>
      <h2>Shadows soon</h2>
      <p>Imbue Shadows is nearly ready.</p>
    `;
    return;
  }

  if (splitSoul.active && secondsUntil(splitSoul.endsAt) <= 5) {
    comboPrompt.classList.add("soon");
    comboPrompt.innerHTML = `
      <p class="section-label">Burst</p>
      <h2>Split Soul ending</h2>
      <p>${formatTime(secondsUntil(splitSoul.endsAt))} left. Finish the window cleanly.</p>
    `;
    return;
  }

  comboPrompt.innerHTML = `
    <p class="section-label">Combo</p>
    <h2>Hold or filler</h2>
    <p>Rapid Fire: ${trackerTimer(rapidFire)}. Galeshot: ${trackerTimer(galeshot)}.</p>
  `;
}

function render() {
  tickCooldowns();
  renderTrackers();
  renderControls();
  renderPrompt();
  renderCalibration();
  saveState();
}

function renderCalibration() {
  const regions = [
    ["Buff bar", state.regions.buff],
    ["Action bar", state.regions.action]
  ];
  calibrationList.innerHTML = regions.map(([name, value]) => `
    <div class="calibration-item">
      <strong>${name}</strong>
      <span>${value || "not set"}</span>
    </div>
  `).join("");
}

function parseRegion(value) {
  const parts = String(value || "")
    .split(",")
    .map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  const [x, y, w, h] = parts.map((part) => Math.round(part));
  if (w <= 0 || h <= 0) return null;
  return { x, y, w, h };
}

function inspectRegion(name, value) {
  const region = parseRegion(value);
  if (!region) {
    return { name, ok: false, message: "Region is not set." };
  }
  const raw = alt1.getRegion(region.x, region.y, region.w, region.h);
  const expectedBytes = region.w * region.h * 4;
  const bytes = atob(raw || "");
  let total = 0;
  const stride = Math.max(4, Math.floor(bytes.length / 2000) * 4);
  for (let index = 0; index < bytes.length; index += stride) {
    total += bytes.charCodeAt(index);
  }
  const samples = Math.max(1, Math.ceil(bytes.length / stride));
  return {
    name,
    ok: bytes.length === expectedBytes,
    message: `${region.x},${region.y},${region.w},${region.h} - ${bytes.length}/${expectedBytes} bytes - sample ${Math.round(total / samples)}`
  };
}

function drawRegionBox(region, color) {
  if (!region || !window.alt1 || !alt1.permissionOverlay) return;
  alt1.overLayRect(color, region.x, region.y, region.w, region.h, 1800, 2);
}

function renderCaptureReadout(results) {
  captureReadout.innerHTML = results.map((result) => `
    <div class="capture-line ${result.ok ? "ok" : "bad"}">
      <strong>${result.name}</strong><br>
      ${result.message}
    </div>
  `).join("");
}

function activateTracker(id) {
  const tracker = TRACKERS.find((item) => item.id === id);
  const model = state.trackers[id];
  model.active = true;
  model.ready = false;
  model.endsAt = Date.now() + (tracker.duration || 8) * 1000;
}

function toggleReady(id) {
  const model = state.trackers[id];
  model.ready = !model.ready;
  if (model.ready) {
    model.active = false;
    model.readyAt = 0;
  } else {
    model.readyAt = Date.now() + 10 * 1000;
  }
}

manualControls.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;
  if (button.dataset.action === "active") activateTracker(button.dataset.id);
  if (button.dataset.action === "ready") toggleReady(button.dataset.id);
  render();
});

document.getElementById("resetButton").addEventListener("click", () => {
  state = clone(defaultState);
  buffRegion.value = "";
  actionRegion.value = "";
  render();
});

document.getElementById("presetButton").addEventListener("click", () => {
  state.regions = { ...BILLY_LAYOUT_PRESET };
  buffRegion.value = state.regions.buff;
  actionRegion.value = state.regions.action;
  captureHint.textContent = "Billy layout preset applied for a 2048x1152 RS client.";
  render();
});

document.getElementById("captureButton").addEventListener("click", () => {
  if (!window.alt1) {
    captureHint.textContent = "Open this in Alt1 to use screen capture. Browser preview keeps manual controls enabled.";
    return;
  }
  if (!alt1.permissionPixel) {
    captureHint.textContent = "Alt1 is open, but pixel permission is missing. Re-add the app and allow pixel permission.";
    return;
  }
  try {
    const buff = parseRegion(state.regions.buff);
    const action = parseRegion(state.regions.action);
    drawRegionBox(buff, 0x66ff00ff);
    drawRegionBox(action, 0x33aaffff);
    const results = [
      inspectRegion("Buff bar capture", state.regions.buff),
      inspectRegion("Action bar capture", state.regions.action)
    ];
    renderCaptureReadout(results);
    captureHint.textContent = results.every((result) => result.ok)
      ? "Capture works. The boxes should flash over your buff/action regions."
      : "Capture ran, but one region did not return the expected pixels.";
  } catch (error) {
    captureHint.textContent = `Capture failed: ${error.message || error}`;
  }
});

buffRegion.addEventListener("input", () => {
  state.regions.buff = buffRegion.value;
  saveState();
});

actionRegion.addEventListener("input", () => {
  state.regions.action = actionRegion.value;
  saveState();
});

settingsToggle.addEventListener("click", () => {
  const isOpen = !controlsPanel.hidden;
  controlsPanel.hidden = isOpen;
  settingsToggle.setAttribute("aria-expanded", String(!isOpen));
  document.querySelector(".app-shell").classList.toggle("setup-open", !isOpen);
});

function boot() {
  connectionStatus.textContent = window.alt1 ? "Alt1 detected" : "Browser preview";
  buffRegion.value = state.regions.buff;
  actionRegion.value = state.regions.action;
  render();
  setInterval(render, 1000);
}

boot();
