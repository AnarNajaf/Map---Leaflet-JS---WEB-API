var selectedFarmId = null;
let sensorMarkers = [];
let motorMarkers = [];
var selectedLayer = null;

function attachPolygonClick(layer, farmId) {
  layer.farmId = farmId;
  layer.on("click", function () {
    selectedFarmId = farmId;
    selectedLayer = layer;
    console.log("Selected farm for sensor placement:", selectedFarmId);
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
  try {
    const response = await fetch("http://localhost:5212/api/sensor", {
      headers: authHeaders(),
    });

    if (!response.ok) throw new Error("Failed to load sensors");

    const sensors = await response.json();

    sensors.forEach((sensor) => {
      const marker = L.marker([sensor.lat, sensor.lng], {
        icon: sensorIcon,
      }).addTo(map).bindPopup(`
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
    <div class="detail-row"><span>Code:</span>${sensor.deviceCode ?? sensor.id}</div>
    <div class="detail-row"><span>Type:</span> ${sensor.type}</div>
    <div class="detail-row"><span>Farm:</span> ${sensor.farmId}</div>
    <div class="detail-row"><span>Installed:</span> ${new Date(sensor.installationDate).toLocaleDateString()}</div>
    <div class="detail-row"><span>Status:</span> 
      <div class="status ${sensor.isActive ? "active" : "inactive"}">
        ${sensor.isActive ? "Active" : "Inactive"}
      </div>
    </div>
    <div class="detail-row switch-row">
      <span class="switch-label">Turn On/Off</span>
      <label class="switch">
        <input type="checkbox"
          ${sensor.isActive ? "checked" : ""}
          onchange="toggleSensor('${sensor.id}', this.checked, this)">
        <span class="slider round"></span>
      </label>
    </div>
  </div>

  <div class="sensor-section sensor-readings">
    <h5>Sensor Readings</h5>
    <div class="reading-grid">
      <div class="reading-item"><span>🌡 Temperature</span><strong>${sensor.temperature ?? "N/A"} °C</strong></div>
      <div class="reading-item"><span>💧 Soil Moisture</span><strong>${sensor.soilMoisture ?? "N/A"} %</strong></div>
      <div class="reading-item"><span>⚗️ pH</span><strong>${sensor.ph ?? "N/A"}</strong></div>
      <div class="reading-item"><span>⚡ Conductivity</span><strong>${sensor.conductivity ?? "N/A"}</strong></div>
      <div class="reading-item"><span>🪫 Battery</span><strong>${sensor.batteryLevel ?? "N/A"}%</strong></div>
    </div>
  </div>
</div>
`);

      sensorMarkers.push({
        id: sensor.id,
        marker: marker,
        data: sensor,
      });
    });

    console.log("Loaded sensors:", sensors);
  } catch (err) {
    console.error("Error loading sensors:", err);
  }
}

async function loadMotorsFromDB() {
  try {
    const response = await fetch("http://localhost:5212/api/motor", {
      headers: authHeaders(),
    });

    if (!response.ok) throw new Error("Failed to load motors");

    const motors = await response.json();

    motors.forEach((motor) => {
      const marker = L.marker([motor.lat, motor.lng], {
        icon: motorIcon,
      }).addTo(map).bindPopup(`
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
    <div class="detail-row"><span>Code:</span> ${motor.deviceCode ?? motor.id}</div>
    <div class="detail-row"><span>Type:</span> ${motor.type}</div>
    <div class="detail-row"><span>Farm:</span> ${motor.farmId}</div>
    <div class="detail-row"><span>Installed:</span> ${new Date(motor.installationDate).toLocaleDateString()}</div>
    <div class="detail-row"><span>Status:</span> 
      <div class="status ${motor.isActive ? "active" : "inactive"}">
        ${motor.isActive ? "Active" : "Inactive"}
      </div>
    </div>
  </div>
</div>
`);

      motorMarkers.push({ id: motor.id, marker: marker, data: motor });
    });

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
      map.removeLayer(sensorObj.marker);
      sensorMarkers = sensorMarkers.filter((s) => s.id !== sensorId);
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
  selectedFarmId = sensor.farmId;

  submitBtn.onclick = async () => {
    const sensorData = {
      type: sensorType.value,
      lat: Number(sensorLat.value),
      lng: Number(sensorLng.value),
      installationDate: sensor.installationDate,
      isActive: sensor.isActive,
    };

    await updateSensor(sensorId, sensorData);
    sensorCard.style.display = "none";
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
  selectedFarmId = motor.farmId;

  motorSubmitBtn.onclick = async () => {
    const motorData = {
      type: motorType.value,
      lat: Number(motorLat.value),
      lng: Number(motorLng.value),
      installationDate: motor.installationDate,
      isActive: motor.isActive,
    };

    await updateMotor(motorId, motorData);
    motorCard.style.display = "none";
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

    showActionMessage("Motor updated successfully!");
  } catch (err) {
    console.error("Error updating motor:", err);
    showActionMessage("Error updating motor ❌");
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

    showActionMessage("Sensor updated successfully!");
  } catch (err) {
    console.error("Error updating sensor:", err);
    showActionMessage("Error updating sensor ❌");
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
