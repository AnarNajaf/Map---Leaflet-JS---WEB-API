var selectedFarmId = null;
let sensorMarkers = [];
let motorMarkers = [];
var selectedLayer = null;
const missingSensors = new Set();
const sensorUnsubscribers = {};
const motorUnsubscribers = {};
function buildSensorPopup(sensor) {
  const shortCode = sensor.deviceCode
    ? sensor.deviceCode.slice(0, 10) +
      (sensor.deviceCode.length > 10 ? "…" : "")
    : sensor.id.slice(0, 10) + "…";

  return `
<div class="sensor-popup">
  <div class="popup-header">
    <h4>Sensor Info</h4>
    <div class="popup-actions">
      <button class="action-btn edit" onclick="editSensor('${sensor.id}')" title="Edit">
        <img src="../images/edit.png" alt="Edit">
      </button>
      <button class="action-btn delete" onclick="deleteSensor('${sensor.id}')" title="Delete">
        <img src="../images/delete.png" alt="Delete">
      </button>
    </div>
  </div>

  <div class="sensor-section sensor-details">
    <div class="detail-row"><span>Code</span><span class="detail-value">${shortCode}</span></div>
    <div class="detail-row"><span>Type</span><span class="detail-value">${sensor.type ?? "—"}</span></div>
    <div class="detail-row"><span>Installed</span><span class="detail-value">${new Date(sensor.installationDate).toLocaleDateString()}</span></div>
    <div class="detail-row">
      <span>Status</span>
      <div id="status-${sensor.id}" class="status ${sensor.isActive ? "active" : "inactive"}">
        ${sensor.isActive ? "Active" : "Inactive"}
      </div>
    </div>
  </div>

  <div class="sensor-section sensor-readings">
    <h5>Sensor Readings</h5>
    <div class="reading-grid">
      <div class="reading-item">
        <span class="reading-label">Temperature</span>
        <strong id="temp-${sensor.id}">N/A °C</strong>
      </div>
      <div class="reading-item">
        <span class="reading-label">Soil Moisture</span>
        <strong id="moisture-${sensor.id}">N/A %</strong>
      </div>
      <div class="reading-item">
        <span class="reading-label">pH</span>
        <strong id="ph-${sensor.id}">N/A</strong>
      </div>
      <div class="reading-item">
        <span class="reading-label">Conductivity</span>
        <strong id="cond-${sensor.id}">N/A</strong>
      </div>
      <div class="reading-item">
        <span class="reading-label">Battery</span>
        <strong id="battery-${sensor.id}">N/A %</strong>
      </div>
    </div>
  </div>
</div>
`;
}
function attachRealtimeSensorListener(sensor) {
  if (
    !window.firebaseDb ||
    !window.firestoreDoc ||
    !window.firestoreOnSnapshot
  ) {
    return;
  }

  if (!sensor.deviceCode) return;

  const docRef = window.firestoreDoc(
    window.firebaseDb,
    "Sensors",
    sensor.deviceCode,
  );

  if (sensorUnsubscribers[sensor.id]) {
    sensorUnsubscribers[sensor.id]();
    delete sensorUnsubscribers[sensor.id];
  }

  sensorUnsubscribers[sensor.id] = window.firestoreOnSnapshot(
    docRef,
    (docSnap) => {
      const tempEl = document.getElementById(`temp-${sensor.id}`);
      const moistureEl = document.getElementById(`moisture-${sensor.id}`);
      const phEl = document.getElementById(`ph-${sensor.id}`);
      const condEl = document.getElementById(`cond-${sensor.id}`);
      const batteryEl = document.getElementById(`battery-${sensor.id}`);
      const statusEl = document.getElementById(`status-${sensor.id}`);

      if (!docSnap.exists()) {
        if (tempEl) tempEl.textContent = "N/A °C";
        if (moistureEl) moistureEl.textContent = "N/A %";
        if (phEl) phEl.textContent = "N/A";
        if (condEl) condEl.textContent = "N/A";
        if (batteryEl) batteryEl.textContent = "N/A %";

        if (statusEl) {
          statusEl.textContent = "Inactive";
          statusEl.className = "status inactive";
        }

        return;
      }

      const live = docSnap.data();

      sensor.temperature = live.temperature ?? null;
      sensor.soilMoisture = live.soilMoisture ?? null;
      sensor.ph = live.pH ?? null;
      sensor.conductivity = live.conductivity ?? null;
      sensor.batteryLevel = live.batteryLevel ?? null;

      if (tempEl) tempEl.textContent = `${live.temperature ?? "N/A"} °C`;
      if (moistureEl) {
        moistureEl.textContent = `${live.soilMoisture ?? "N/A"} %`;
      }
      if (phEl) phEl.textContent = `${live.pH ?? "N/A"}`;
      if (condEl) condEl.textContent = `${live.conductivity ?? "N/A"}`;
      if (batteryEl) {
        batteryEl.textContent = `${live.batteryLevel ?? "N/A"} %`;
      }

      const isOnline = live.isOnline ?? false;

      if (statusEl) {
        statusEl.textContent = isOnline ? "Active" : "Inactive";
        statusEl.className = `status ${isOnline ? "active" : "inactive"}`;
      }

      const sensorObj = sensorMarkers.find((s) => s.id === sensor.id);
      if (sensorObj) {
        sensorObj.data.isActive = isOnline;
      }

      renderSensorSidebar?.();
    },
    (error) => console.error("Realtime Firestore error:", error),
  );
}
function attachRealtimeMotorListener(motor) {
  if (
    !window.firebaseDb ||
    !window.firestoreDoc ||
    !window.firestoreOnSnapshot
  ) {
    return;
  }

  if (!motor.deviceCode) return;

  const docRef = window.firestoreDoc(
    window.firebaseDb,
    "Motors",
    motor.deviceCode,
  );

  if (motorUnsubscribers[motor.id]) {
    motorUnsubscribers[motor.id]();
    delete motorUnsubscribers[motor.id];
  }

  motorUnsubscribers[motor.id] = window.firestoreOnSnapshot(
    docRef,
    (docSnap) => {
      const statusEl = document.getElementById(`motor-status-${motor.id}`);
      const hoursEl = document.getElementById(`motor-hours-${motor.id}`);
      const checkingEl = document.getElementById(`motor-checking-${motor.id}`);
      const toggleEl = document.getElementById(`motor-toggle-${motor.id}`);

      if (!docSnap.exists()) {
        if (statusEl) {
          statusEl.textContent = "Inactive";
          statusEl.className = "status inactive";
        }
        if (hoursEl) hoursEl.textContent = "0 h";
        if (checkingEl) checkingEl.textContent = "No";
        if (toggleEl) toggleEl.checked = false;
        return;
      }

      const live = docSnap.data();

      const isActive = live.isActive ?? false;
      const activeTimeHours = live.activeTimeHours ?? 0;
      const checking = live.checking ?? false;

      if (statusEl) {
        statusEl.textContent = isActive ? "Active" : "Inactive";
        statusEl.className = `status ${isActive ? "active" : "inactive"}`;
      }

      if (hoursEl) {
        hoursEl.textContent = `${activeTimeHours} h`;
      }

      if (checkingEl) {
        checkingEl.textContent = checking ? "Yes" : "No";
      }

      if (toggleEl) {
        toggleEl.checked = isActive;
      }

      const motorObj = motorMarkers.find((m) => m.id === motor.id);
      if (motorObj) {
        motorObj.data.isActive = isActive;
        motorObj.data.activeTimeHours = activeTimeHours;
        motorObj.data.checking = checking;
      }
    },
    (error) => console.error("Realtime Motor Firestore error:", error),
  );
}
function attachPolygonClick(layer, farmId) {
  layer.farmId = farmId;
  layer.on("click", function () {
    selectedFarmId = farmId;
    selectedLayer = layer;
    console.log("Selected farm for sensor placement:", selectedFarmId);
  });
}

function renderSensorSidebar() {
  const sensorList = document.getElementById("sensorList");
  const badge = document.getElementById("sensorCount");
  if (!sensorList) return;

  sensorList.innerHTML = "";
  if (badge) badge.textContent = sensorMarkers.length;

  if (sensorMarkers.length === 0) {
    sensorList.innerHTML = `<div style="font-size:12px; color:#9ca3af; padding:6px 2px;">No sensors added</div>`;
    return;
  }

  sensorMarkers.forEach((sensorObj) => {
    const sensor = sensorObj.data;
    const shortCode = sensor.deviceCode
      ? sensor.deviceCode.slice(0, 9)
      : sensor.id.slice(0, 9);
    const bat = sensor.batteryLevel;
    const batHtml = bat != null
      ? `<span class="sensor-battery${bat < 20 ? " low" : ""}">${bat}%</span>`
      : "";

    const item = document.createElement("div");
    item.className = "sensor-item";
    item.innerHTML = `
      <div class="sensor-dot ${sensor.isActive ? "active" : "inactive"}"></div>
      <div class="sensor-info">
        <div class="sensor-code">${shortCode}</div>
        <div class="sensor-type">${sensor.type ?? "Unknown"}</div>
      </div>
      ${batHtml}
    `;
    item.onclick = () => {
      map.setView([sensor.lat, sensor.lng], 18);
      sensorObj.marker.openPopup();
    };
    sensorList.appendChild(item);
  });
}

function renderMotorSidebar() {
  const motorList = document.getElementById("motorList");
  const badge = document.getElementById("motorCount");
  if (!motorList) return;

  motorList.innerHTML = "";
  if (badge) badge.textContent = motorMarkers.length;

  if (motorMarkers.length === 0) {
    motorList.innerHTML = `<div style="font-size:12px; color:#9ca3af; padding:6px 2px;">No motors added</div>`;
    return;
  }

  motorMarkers.forEach((motorObj) => {
    const motor = motorObj.data;
    const shortCode = motor.deviceCode
      ? motor.deviceCode.slice(0, 9)
      : motor.id.slice(0, 9);
    const isScheduled = motor.mode === "scheduled";

    const item = document.createElement("div");
    item.className = "sensor-item";
    item.innerHTML = `
      <div class="sensor-dot ${motor.isActive ? "active" : "inactive"}"></div>
      <div class="sensor-info">
        <div class="sensor-code">${shortCode}</div>
        <div class="sensor-type">${motor.type ?? "Unknown"}</div>
      </div>
      ${isScheduled ? `<span class="motor-scheduled-badge">Scheduled</span>` : ""}
    `;
    item.onclick = () => {
      map.setView([motor.lat, motor.lng], 18);
      motorObj.marker.openPopup();
    };
    motorList.appendChild(item);
  });
}

function toggleSensorPanel() {
  const panel = document.getElementById("sensorPanel");
  const btn = document.getElementById("sensorToggle");
  if (!panel || !btn) return;
  panel.classList.toggle("collapsed");
  btn.textContent = panel.classList.contains("collapsed") ? "+" : "−";
  btn.title = panel.classList.contains("collapsed") ? "Expand" : "Collapse";
}

function toggleMotorPanel() {
  const panel = document.getElementById("motorPanel");
  const btn = document.getElementById("motorToggle");
  if (!panel || !btn) return;
  panel.classList.toggle("collapsed");
  btn.textContent = panel.classList.contains("collapsed") ? "+" : "−";
  btn.title = panel.classList.contains("collapsed") ? "Expand" : "Collapse";
}
function showConfirm({ title, message, onConfirm }) {
  const modal = document.getElementById("confirmModal");
  const titleEl = document.getElementById("confirmTitle");
  const messageEl = document.getElementById("confirmMessage");
  const okBtn = document.getElementById("confirmOk");
  const cancelBtn = document.getElementById("confirmCancel");

  titleEl.innerText = title;
  messageEl.innerText = message;
  modal.classList.remove("hidden");

  const close = () => {
    modal.classList.add("hidden");
    okBtn.onclick = null;
    cancelBtn.onclick = null;
  };

  okBtn.onclick = () => {
    close();
    onConfirm();
  };

  cancelBtn.onclick = close;
}

function showActionMessage(message) {
  const messageDiv = document.getElementById("actionMessage");
  messageDiv.innerText = message;
  messageDiv.classList.remove("hidden");
  setTimeout(() => {
    messageDiv.classList.add("hidden");
  }, 3000);
}

function showErrorMessage(message) {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.innerText = message;
  errorDiv.classList.remove("hidden");
  setTimeout(() => {
    errorDiv.classList.add("hidden");
  }, 5000);
}

// ====================== LOADERS ======================

function addSensorMarker(sensor) {
  const marker = L.marker([sensor.lat, sensor.lng], {
    icon: sensorIcon,
  }).addTo(map);

  marker.bindPopup(buildSensorPopup(sensor));

  marker.on("popupopen", () => {
    attachRealtimeSensorListener(sensor);
  });

  marker.on("popupclose", () => {
    if (sensorUnsubscribers[sensor.id]) {
      sensorUnsubscribers[sensor.id]();
      delete sensorUnsubscribers[sensor.id];
    }
  });

  const sensorObj = {
    id: sensor.id,
    marker,
    data: sensor,
  };

  sensorMarkers.push(sensorObj);
  return sensorObj;
}
function updateSensorMarkerLocally(sensorId, patch) {
  const sensorObj = sensorMarkers.find((s) => s.id === sensorId);
  if (!sensorObj) return;

  sensorObj.data = { ...sensorObj.data, ...patch };

  sensorObj.marker.setLatLng([sensorObj.data.lat, sensorObj.data.lng]);
  sensorObj.marker.setPopupContent(buildSensorPopup(sensorObj.data));

  renderSensorSidebar?.();
}
function removeSensorListener(sensorId) {
  if (sensorUnsubscribers[sensorId]) {
    sensorUnsubscribers[sensorId]();
    delete sensorUnsubscribers[sensorId];
  }
}
function buildMotorPopup(motor) {
  const shortCode = motor.deviceCode
    ? motor.deviceCode.slice(0, 10) + (motor.deviceCode.length > 10 ? "…" : "")
    : motor.id.slice(0, 10) + "…";

  const mode = motor.mode ?? "manual";
  const isManual = mode === "manual";
  const isScheduled = mode === "scheduled";
  const isAuto = mode === "auto";

  return `
<div class="sensor-popup">
  <div class="popup-header">
    <h4>Motor Info</h4>
    <div class="popup-actions">
      <button class="action-btn edit" onclick="editMotor('${motor.id}')" title="Edit">
        <img src="../images/edit.png" alt="Edit">
      </button>
      <button class="action-btn delete" onclick="deleteMotor('${motor.id}')" title="Delete">
        <img src="../images/delete.png" alt="Delete">
      </button>
    </div>
  </div>

  <div class="sensor-section motor-details">
    <div class="detail-row"><span>Code</span><span class="detail-value">${shortCode}</span></div>
    <div class="detail-row"><span>Type</span><span class="detail-value">${motor.type ?? "—"}</span></div>
    <div class="detail-row"><span>Installed</span><span class="detail-value">${new Date(motor.installationDate).toLocaleDateString()}</span></div>
    <div class="detail-row">
      <span>Status</span>
      <div class="status ${motor.isActive ? "active" : "inactive"}">${motor.isActive ? "Active" : "Inactive"}</div>
    </div>
  </div>

  <div class="sensor-section">
    <div class="mode-label">Control Mode</div>
    <div class="mode-selector">
      <button class="mode-btn ${isManual ? "active" : ""}" onclick="setMotorMode('${motor.id}', 'manual')">
        Manual
      </button>
      <button class="mode-btn ${isScheduled ? "active" : ""}" onclick="setMotorMode('${motor.id}', 'scheduled')">
        Scheduler
      </button>
      <button class="mode-btn auto ${isAuto ? "active" : ""}" onclick="setMotorMode('${motor.id}', 'auto')" disabled>
        Auto
      </button>
    </div>
  </div>

  <div class="sensor-section" id="mode-content-${motor.id}">
    ${
      isManual
        ? `
      <div class="detail-row switch-row">
        <span>Turn On/Off</span>
        <label class="switch">
          <input type="checkbox"
            ${motor.isActive ? "checked" : ""}
            onchange="toggleMotor('${motor.id}', this.checked, this)">
          <span class="slider round"></span>
        </label>
      </div>
    `
        : isScheduled
          ? `
<button class="schedule-popup-btn ${motor.schedule ? "schedule-set" : ""}"
  onclick="openSchedulePanel('${motor.id}')">
  ${
    motor.schedule
      ? motor.schedule.scheduleType === "time"
        ? `Edit Schedule · ${motor.schedule.timeWindows?.length ?? 0} time window(s)`
        : `Edit Schedule · Every ${motor.schedule.intervalHours}h · ${motor.schedule.durationMinutes}min`
      : "Set Schedule"
  }
</button>
`
          : `
      <div class="auto-coming-soon">
        Fully automated mode coming soon
      </div>
    `
    }
  </div>
</div>
`;
}
function addMotorMarker(motor) {
  // fetch schedule and store on motor object
  fetch(`http://localhost:5212/api/schedule/motor/${motor.id}`, {
    headers: authHeaders(),
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((schedule) => {
      motor.schedule = schedule;
    })
    .catch(() => {});

  const marker = L.marker([motor.lat, motor.lng], {
    icon: motorIcon,
  }).addTo(map);

  marker.bindPopup(() => buildMotorPopup(motor));

  const motorObj = { id: motor.id, marker, data: motor };
  motorMarkers.push(motorObj);
  return motorObj;
}

function updateMotorMarkerLocally(motorId, patch) {
  const motorObj = motorMarkers.find((m) => m.id === motorId);
  if (!motorObj) return;

  motorObj.data = { ...motorObj.data, ...patch };

  motorObj.marker.setLatLng([motorObj.data.lat, motorObj.data.lng]);
  motorObj.marker.setPopupContent(buildMotorPopup(motorObj.data));
  renderMotorSidebar?.();
}
async function loadFarmsFromDB() {
  try {
    const response = await fetch("http://localhost:5212/api/farm/my", {
      headers: authHeaders(),
    });

    if (!response.ok) throw new Error("Failed to load farms");

    const farms = await response.json();

    farms.forEach((farm) => {
      if (!farm.polygon || farm.polygon.length === 0) return;

      const latlngs = farm.polygon.map((p) => {
        if (p.lat !== undefined && p.lng !== undefined) {
          return L.latLng(p.lat, p.lng);
        }

        if (p.latitude !== undefined && p.longitude !== undefined) {
          return L.latLng(p.latitude, p.longitude);
        }

        if (p.Latitude !== undefined && p.Longitude !== undefined) {
          return L.latLng(p.Latitude, p.Longitude);
        }

        return L.latLng(p[0], p[1]);
      });

      const polygon = L.polygon(latlngs, {
        color: farm.color || "green",
        fillColor: farm.color || "green",
        fillOpacity: 0.5,
        weight: 2,
      });

      polygon.farmId = farm.id;
      drawnItems.addLayer(polygon);
      attachPolygonClick(polygon, farm.id);
    });

    console.log("Loaded farms:", farms);
  } catch (err) {
    console.error("Error loading farms:", err);
  }
}

async function loadSensorsFromDB() {
  sensorMarkers.forEach((s) => {
    removeSensorListener(s.id);
    if (s.marker) map.removeLayer(s.marker);
  });
  sensorMarkers = [];

  try {
    const response = await fetch("http://localhost:5212/api/sensor", {
      headers: authHeaders(),
    });

    if (!response.ok) throw new Error("Failed to load sensors");

    const sensors = await response.json();
    sensors.forEach(addSensorMarker);

    console.log("Loaded sensors:", sensors);
    renderSensorSidebar?.();
  } catch (err) {
    console.error("Error loading sensors:", err);
  }
}

async function loadMotorsFromDB() {
  motorMarkers.forEach((m) => {
    if (m.marker) map.removeLayer(m.marker);
  });
  motorMarkers = [];

  try {
    const response = await fetch("http://localhost:5212/api/motor", {
      headers: authHeaders(),
    });

    if (!response.ok) throw new Error("Failed to load motors");

    const motors = await response.json();
    motors.forEach(addMotorMarker);

    console.log("Loaded motors:", motors);
    renderMotorSidebar?.();
  } catch (err) {
    console.error("Error loading motors:", err);
  }
}
// NOTE: loadMotorsFromDB() is called in script.js after map init — not here
// ====================== SCHEDULE SIDEBAR TOGGLE ======================

function toggleScheduleSidebar() {
  const panel = document.getElementById("scheduleSidebar");
  const btn = document.getElementById("scheduleSidebarToggle");
  if (!panel || !btn) return;
  panel.classList.toggle("collapsed");
  const isCollapsed = panel.classList.contains("collapsed");
  btn.textContent = isCollapsed ? "‹" : "›";
  btn.title = isCollapsed ? "Expand" : "Collapse";
}

// ====================== SYSTEM STATUS BAR =======================

let _statusUnsubscribe = null;

function listenToSystemStatus() {
  if (!window.firebaseDb || !window.firestoreDoc || !window.firestoreOnSnapshot) {
    setTimeout(listenToSystemStatus, 600);
    return;
  }
  if (_statusUnsubscribe) _statusUnsubscribe();
  const ref = window.firestoreDoc(window.firebaseDb, "SystemStatus", "global");
  _statusUnsubscribe = window.firestoreOnSnapshot(
    ref,
    (snap) => updateStatusBar(snap.exists() ? snap.data() : {}),
    () => {}
  );
}

function updateStatusBar(status) {
  const bar = document.getElementById("systemStatusBar");
  if (!bar) return;
  bar.innerHTML = "";

  if (status.rainMode) {
    const ic = document.createElement("span");
    ic.className = "status-icon rain";
    ic.title = "Rain detected — irrigation blocked";
    ic.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 17.58A5 5 0 0018 8h-1.26A8 8 0 104 16.25"/>
      <line x1="8" y1="19" x2="8" y2="21"/><line x1="8" y1="13" x2="8" y2="15"/>
      <line x1="12" y1="15" x2="12" y2="17"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="16" y1="17" x2="16" y2="19"/>
    </svg>&nbsp;Rain Mode`;
    bar.appendChild(ic);
  }

  if (status.tankLow) {
    const ic = document.createElement("span");
    ic.className = "status-icon tank-low";
    ic.title = "Water tank level low";
    ic.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>&nbsp;Low Tank`;
    bar.appendChild(ic);
  }

  if (status.irrigationBlocked) {
    const ic = document.createElement("span");
    ic.className = "status-icon blocked";
    ic.title = "Irrigation manually blocked";
    ic.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    </svg>&nbsp;Blocked`;
    bar.appendChild(ic);
  }

  bar.classList.toggle("hidden", bar.children.length === 0);
}

listenToSystemStatus();

// ====================== SENSOR / MOTOR MANAGEMENT ======================

async function deleteSensor(sensorId) {
  showConfirm({
    title: "Delete Sensor",
    message: "Are you sure you want to delete this sensor?",
    onConfirm: () => performDeleteSensor(sensorId),
  });
}

async function performDeleteSensor(sensorId) {
  try {
    const response = await fetch(
      `http://localhost:5212/api/sensor/${sensorId}`,
      {
        method: "DELETE",
        headers: authHeaders(),
      },
    );

    if (!response.ok) throw new Error("Delete failed");

    const sensorObj = sensorMarkers.find((s) => s.id === sensorId);
    if (sensorObj) {
      removeSensorListener(sensorId);
      map.removeLayer(sensorObj.marker);
      sensorMarkers = sensorMarkers.filter((s) => s.id !== sensorId);
      renderSensorSidebar?.();
    }

    showActionMessage("Sensor deleted successfully!");
  } catch (err) {
    console.error("Error deleting sensor:", err);
    showActionMessage("Error deleting sensor ❌");
  }
}

async function deleteMotor(motorId) {
  showConfirm({
    title: "Delete Motor",
    message: "Are you sure you want to delete this motor?",
    onConfirm: () => performDeleteMotor(motorId),
  });
}

async function performDeleteMotor(motorId) {
  try {
    const response = await fetch(`http://localhost:5212/api/motor/${motorId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (!response.ok) throw new Error("Delete failed");

    const motorObj = motorMarkers.find((m) => m.id === motorId);
    if (motorObj) {
      map.removeLayer(motorObj.marker);
      motorMarkers = motorMarkers.filter((m) => m.id !== motorId);
      renderMotorSidebar?.();
    }

    showActionMessage("Motor deleted successfully!");
  } catch (err) {
    console.error("Error deleting motor:", err);
    showActionMessage("Error deleting motor ❌");
  }
}

async function editSensor(sensorId) {
  const sensorObj = sensorMarkers.find((s) => s.id === sensorId);
  if (!sensorObj) return showErrorMessage("Sensor not found");

  sensorObj.marker.closePopup();
  const sensor = sensorObj.data;

  sensorCard.style.display = "block";
  sensorID.value = sensor.deviceCode ?? "";
  sensorType.value = sensor.type;
  sensorLat.value = sensor.lat;
  sensorLng.value = sensor.lng;
  installationDate.value = sensor.installationDate
    ? new Date(sensor.installationDate).toISOString().split("T")[0]
    : "";
  selectedFarmId = sensor.farmId;

  submitBtn.onclick = async () => {
    let isoDate = sensor.installationDate;

    if (installationDate.value) {
      isoDate = new Date(installationDate.value + "T00:00:00").toISOString();
    }

    const sensorData = {
      deviceCode: sensorID.value.trim(),
      type: sensorType.value,
      lat: Number(sensorLat.value),
      lng: Number(sensorLng.value),
      installationDate: isoDate,
      isActive: sensor.isActive,
      farmId: selectedFarmId,
    };

    const updated = await updateSensor(sensorId, sensorData);

    if (updated) {
      sensorCard.style.display = "none";
    }
  };
}

async function editMotor(motorId) {
  const motorObj = motorMarkers.find((m) => m.id === motorId);
  if (!motorObj) return showErrorMessage("Motor not found");

  motorObj.marker.closePopup();
  const motor = motorObj.data;

  motorCard.style.display = "block";
  motorID.value = motor.deviceCode ?? "";
  motorType.value = motor.type;
  motorLat.value = motor.lat;
  motorLng.value = motor.lng;
  installationDateMotor.value = motor.installationDate
    ? new Date(motor.installationDate).toISOString().split("T")[0]
    : "";
  selectedFarmId = motor.farmId;

  motorSubmitBtn.onclick = async () => {
    let isoDate = motor.installationDate;

    if (installationDateMotor.value) {
      isoDate = new Date(
        installationDateMotor.value + "T00:00:00",
      ).toISOString();
    }

    const motorData = {
      deviceCode: motorID.value.trim(),
      type: motorType.value,
      lat: Number(motorLat.value),
      lng: Number(motorLng.value),
      installationDate: isoDate,
      isActive: motor.isActive,
      farmId: selectedFarmId,
    };

    const updated = await updateMotor(motorId, motorData);

    if (updated) {
      motorCard.style.display = "none";
    }
  };
}
async function updateMotor(motorId, motorData) {
  try {
    const response = await fetch(`http://localhost:5212/api/motor/${motorId}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(motorData),
    });

    if (!response.ok) throw new Error("Failed to update");

    updateMotorMarkerLocally(motorId, motorData);

    showActionMessage("Motor updated successfully!");
    return true;
  } catch (err) {
    console.error("Error updating motor:", err);
    showErrorMessage("Error updating motor ❌");
    return false;
  }
}

async function updateSensor(sensorId, sensorData) {
  try {
    const response = await fetch(
      `http://localhost:5212/api/sensor/${sensorId}`,
      {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(sensorData),
      },
    );

    if (!response.ok) throw new Error("Failed to update");

    updateSensorMarkerLocally(sensorId, sensorData);

    showActionMessage("Sensor updated successfully!");
    return true;
  } catch (err) {
    console.error("Error updating sensor:", err);
    showErrorMessage("Error updating sensor ❌");
    return false;
  }
}

function toggleSensor(sensorId, isActive, checkbox) {
  checkbox.disabled = true;

  fetch(`http://localhost:5212/api/sensor/${sensorId}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ isActive }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      return res.json();
    })
    .then((data) => {
      checkbox.checked = data.isActive;
      showActionMessage("Sensor status updated ✅");
    })
    .catch((err) => {
      checkbox.checked = !isActive;
      showErrorMessage(err.message || "Cannot change sensor state ❌");
    })
    .finally(() => {
      checkbox.disabled = false;
    });
}
async function toggleMotor(motorId, isActive, checkbox) {
  checkbox.checked = !isActive;

  showConfirm({
    title: isActive ? "Turn On Motor" : "Turn Off Motor",
    message: isActive
      ? "Do you want to turn on this motor?"
      : "Do you want to turn off this motor?",
    onConfirm: async () => {
      checkbox.disabled = true;

      try {
        const motorObj = motorMarkers.find((m) => m.id === motorId);
        if (!motorObj) {
          throw new Error("Motor not found");
        }

        const response = await fetch(
          `http://localhost:5212/api/motor/${motorId}/status`,
          {
            method: "PATCH",
            headers: authHeaders(),
            body: JSON.stringify({ isActive }),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to update motor status");
        }

        const result = await response.json();

        if (
          !window.firebaseDb ||
          !window.firestoreDoc ||
          !window.firestoreUpdateDoc
        ) {
          throw new Error("Firebase updateDoc is not initialized.");
        }

        if (!motorObj.data.deviceCode) {
          throw new Error("Motor device code is missing.");
        }

        const motorDocRef = window.firestoreDoc(
          window.firebaseDb,
          "Motors",
          motorObj.data.deviceCode,
        );

        await window.firestoreUpdateDoc(motorDocRef, {
          isActive: result.isActive,
        });

        motorObj.data.isActive = result.isActive;

        const statusEl = document.getElementById(`motor-status-${motorId}`);
        if (statusEl) {
          statusEl.textContent = result.isActive ? "Active" : "Inactive";
          statusEl.className = `status ${result.isActive ? "active" : "inactive"}`;
        }

        checkbox.checked = result.isActive;
        renderMotorSidebar?.();

        showActionMessage(
          result.isActive ? "Motor turned on ✅" : "Motor turned off ✅",
        );
      } catch (err) {
        checkbox.checked = !isActive;
        showErrorMessage(err.message || "Cannot change motor state ❌");
      } finally {
        checkbox.disabled = false;
      }
    },
  });
}
async function setMotorMode(motorId, mode) {
  try {
    const res = await fetch(`http://localhost:5212/api/motor/${motorId}/mode`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ mode }),
    });
    if (!res.ok) throw new Error(await res.text());

    const motorObj = motorMarkers.find((m) => m.id === motorId);
    if (motorObj) {
      motorObj.data.mode = mode;

      // Entering scheduled/auto mode: turn the motor off so the automation owns it
      if (mode !== "manual" && motorObj.data.isActive) {
        await fetch(`http://localhost:5212/api/motor/${motorId}/status`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ isActive: false }),
        });
        if (motorObj.data.deviceCode && window.firebaseDb) {
          const ref = window.firestoreDoc(window.firebaseDb, "Motors", motorObj.data.deviceCode);
          await window.firestoreUpdateDoc(ref, { isActive: false }).catch(() => {});
        }
        motorObj.data.isActive = false;
      }

      motorObj.marker.setPopupContent(buildMotorPopup(motorObj.data));
      renderMotorSidebar?.();
    }

    showActionMessage(`Mode set to ${mode}.`);
    loadSchedules();
  } catch (err) {
    showErrorMessage(err.message || "Failed to set mode.");
  }
}
