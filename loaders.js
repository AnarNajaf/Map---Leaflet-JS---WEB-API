var selectedFarmId = null;
let sensorMarkers = [];
let motorMarkers = [];
var selectedLayer = null;
const missingSensors = new Set();
const sensorUnsubscribers = {};
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
      <div class="status ${sensor.isActive ? "active" : "inactive"}">${sensor.isActive ? "Active" : "Inactive"}</div>
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
function attachOnlineStatusListener(sensor) {
  if (!window.firebaseDb || !window.firestoreDoc || !window.firestoreOnSnapshot)
    return;

  if (!sensor.deviceCode) return;

  const docRef = window.firestoreDoc(
    window.firebaseDb,
    "Sensors",
    sensor.deviceCode,
  );

  // Store under a different key so it doesn't conflict with reading listener
  const listenerKey = `online_${sensor.id}`;

  if (sensorUnsubscribers[listenerKey]) {
    sensorUnsubscribers[listenerKey]();
    delete sensorUnsubscribers[listenerKey];
  }

  let initialized = false;

  sensorUnsubscribers[listenerKey] = window.firestoreOnSnapshot(
    docRef,
    async (docSnap) => {
      if (!docSnap.exists()) return;

      const data = docSnap.data();
      const isOnline = data.isOnline ?? false;

      // Skip the first snapshot to avoid triggering on popup open
      if (!initialized) {
        initialized = true;
        return;
      }

      // Only call backend if state actually differs
      const sensorObj = sensorMarkers.find((s) => s.id === sensor.id);
      if (!sensorObj) return;

      if (sensorObj.data.isActive === isOnline) return;

      try {
        const response = await fetch(
          `http://localhost:5212/api/sensor/${sensor.id}/status`,
          {
            method: "PATCH",
            headers: authHeaders(),
            body: JSON.stringify({ isActive: isOnline }),
          },
        );

        if (!response.ok) {
          const err = await response.text();
          console.error("Failed to sync isOnline to backend:", err);
          return;
        }

        // Update local state so UI reflects change
        sensorObj.data.isActive = isOnline;
        sensorObj.marker.setPopupContent(buildSensorPopup(sensorObj.data));
        renderSensorSidebar?.();

        console.log(`Sensor ${sensor.deviceCode} synced: isOnline=${isOnline}`);
      } catch (err) {
        console.error("Error syncing sensor status:", err);
      }
    },
    (error) => console.error("isOnline listener error:", error),
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
  if (!sensorList) return;

  sensorList.innerHTML = "";

  if (sensorMarkers.length === 0) {
    sensorList.innerHTML = `<div style="font-size:12px; color:#9ca3af;">No sensors</div>`;
    return;
  }

  sensorMarkers.forEach((sensorObj) => {
    const sensor = sensorObj.data;
    const shortCode = sensor.deviceCode
      ? sensor.deviceCode.slice(0, 8)
      : sensor.id.slice(0, 8);

    const item = document.createElement("div");
    item.className = "sensor-item";

    item.innerHTML = `
      <div class="sensor-dot ${sensor.isActive ? "active" : "inactive"}"></div>
      <div>
        <div class="sensor-code">${shortCode}</div>
        <div class="sensor-type">${sensor.type ?? "Unknown"}</div>
      </div>
    `;

    item.onclick = () => {
      map.setView([sensor.lat, sensor.lng], 18);
      sensorObj.marker.openPopup();
    };

    sensorList.appendChild(item);
  });
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

      if (!docSnap.exists()) {
        if (tempEl) tempEl.textContent = "N/A °C";
        if (moistureEl) moistureEl.textContent = "N/A %";
        if (phEl) phEl.textContent = "N/A";
        if (condEl) condEl.textContent = "N/A";
        if (batteryEl) batteryEl.textContent = "N/A %";
        return;
      }

      const live = docSnap.data();

      sensor.temperature = live.temperature ?? null;
      sensor.soilMoisture = live.soilMoisture ?? null;
      sensor.ph = live.pH ?? null;
      sensor.conductivity = live.conductivity ?? null;
      sensor.batteryLevel = live.batteryLevel ?? null;

      if (tempEl) tempEl.textContent = `${live.temperature ?? "N/A"} °C`;
      if (moistureEl)
        moistureEl.textContent = `${live.soilMoisture ?? "N/A"} %`;
      if (phEl) phEl.textContent = `${live.pH ?? "N/A"}`;
      if (condEl) condEl.textContent = `${live.conductivity ?? "N/A"}`;
      if (batteryEl) batteryEl.textContent = `${live.batteryLevel ?? "N/A"} %`;
    },
    (error) => console.error("Realtime Firestore error:", error),
  );
}
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
    <div class="detail-row switch-row">
      <span>Turn On/Off</span>
      <label class="switch">
        <input type="checkbox"
          ${motor.isActive ? "checked" : ""}
          onchange="toggleMotor('${motor.id}', this.checked, this)">
        <span class="slider round"></span>
      </label>
    </div>
  </div>
</div>
`;
}
function addMotorMarker(motor) {
  const marker = L.marker([motor.lat, motor.lng], {
    icon: motorIcon,
  }).addTo(map);

  marker.bindPopup(buildMotorPopup(motor));

  const motorObj = {
    id: motor.id,
    marker,
    data: motor,
  };

  motorMarkers.push(motorObj);
  return motorObj;
}

function updateMotorMarkerLocally(motorId, patch) {
  const motorObj = motorMarkers.find((m) => m.id === motorId);
  if (!motorObj) return;

  motorObj.data = { ...motorObj.data, ...patch };

  motorObj.marker.setLatLng([motorObj.data.lat, motorObj.data.lng]);
  motorObj.marker.setPopupContent(buildMotorPopup(motorObj.data));
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
  } catch (err) {
    console.error("Error loading motors:", err);
  }
}

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
