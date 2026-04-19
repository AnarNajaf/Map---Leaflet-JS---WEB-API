// ====================== AUTH ======================
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "login.html";
}

function authHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// ====================== MAP ======================
var map = L.map("map", {
  center: [40.505, 49],
  zoom: 16,
  maxZoom: 18,
  minZoom: 10,
});

document.getElementById("useTodayDate").addEventListener("change", function () {
  const dateInput = document.getElementById("installationDate");
  if (this.checked) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.value = today;
  } else {
    dateInput.value = "";
  }
});

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    if (isSelectingSensorForAuto) {
      stopSensorSelection();
      return;
    }

    if (colorPickerInput) {
      colorPickerInput.remove();
      colorPickerInput = null;
    }

    isColoring = false;
    selectedColor = null;

    map.getContainer().style.cursor = "";
    hideMapMessage();
    resetToolSelection();
  }
});

document
  .getElementById("useTodayDateMotor")
  .addEventListener("change", function () {
    const dateInput = document.getElementById("installationDateMotor");
    if (this.checked) {
      const today = new Date().toISOString().split("T")[0];
      dateInput.value = today;
    } else {
      dateInput.value = "";
    }
  });

// Sensor UI
const sensorCard = document.getElementById("sensorCard");
const sensorID = document.getElementById("sensorId");
const sensorType = document.getElementById("sensorType");
const sensorLat = document.getElementById("sensorLat");
const sensorLng = document.getElementById("sensorLng");
const installationDate = document.getElementById("installationDate");
const useTodayDate = document.getElementById("useTodayDate");
const submitBtn = document.getElementById("submitBtn");

// Motor UI
const motorCard = document.getElementById("motorCard");
const motorID = document.getElementById("motorId");
const motorType = document.getElementById("motorType");
const motorLat = document.getElementById("motorLat");
const motorLng = document.getElementById("motorLng");
const motorSubmitBtn = document.getElementById("MotorSubmitBtn");
const installationDateMotor = document.getElementById("installationDateMotor");
const useTodayDateMotor = document.getElementById("useTodayDateMotor");

L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 20,
    attribution: "Tiles © Esri",
  },
).addTo(map);

loadFarmsFromDB();
loadSensorsFromDB();
loadMotorsFromDB().then(() => loadSchedules());

let userMarker = null;
let selectedTool = null;
var isPlacingSensor = false;
var isPlacingMotor = false;
let isColoring = false;
let colorPickerInput = null;
let isSelectingSensorForAuto = false;
let _autoSelectMotorId = null;
let _autoSelectFarmId = null;

function resetToolSelection() {
  selectedTool = null;
  isPlacingSensor = false;
  isPlacingMotor = false;

  map.getContainer().style.cursor = "";
  hideMapMessage();

  sensorCard.style.display = "none";
  motorCard.style.display = "none";

  console.log("Tool selection reset.");
}

function LocationFunction() {
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        map.setView([lat, lng], 16);

        if (!userMarker) {
          userMarker = L.marker([lat, lng]).addTo(map);
        } else {
          userMarker.setLatLng([lat, lng]);
        }
      },
      (err) => showErrorMessage("Error getting location: " + err.message),
      { enableHighAccuracy: false, maximumAge: 0, timeout: 5000 },
    );
  } else {
    showErrorMessage("Geolocation is not supported by this browser.");
  }
}

function showMapMessage(message) {
  const messageDiv = document.getElementById("mapMessage");
  messageDiv.innerText = message;
  messageDiv.classList.remove("hidden");
}

function hideMapMessage() {
  const messageDiv = document.getElementById("mapMessage");
  messageDiv.classList.add("hidden");
}

var OpenSensorInformationForm = (latt, lngg) => {
  sensorCard.style.display = "block";
  sensorLat.value = latt;
  sensorLng.value = lngg;

  submitBtn.onclick = async () => {
    let dateValue = installationDate.value;
    const isoDate = new Date(dateValue + "T00:00:00").toISOString();

    const sensorData = {
      deviceCode: sensorID.value.trim(),
      type: sensorType.value,
      lat: Number(latt),
      lng: Number(lngg),
      installationDate: isoDate,
      farmId: selectedFarmId,
    };
    submitBtn.disabled = true;
    submitBtn.textContent = "Checking Firestore...";

    console.log("Sending sensor:", sensorData);

    const saved = await saveSensor(sensorData);
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
    if (saved) {
      sensorCard.style.display = "none";
      hideMapMessage();
    }
  };
};
var ColorPickerFunction = () => {
  if (colorPickerInput) {
    colorPickerInput.remove();
    colorPickerInput = null;
  }

  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = "#ff0000";
  colorInput.style.position = "fixed";
  colorInput.style.top = "16%";
  colorInput.style.right = "2%";
  colorInput.style.transform = "translate(-50%, -50%)";
  colorInput.style.zIndex = "10000";

  document.body.appendChild(colorInput);
  colorPickerInput = colorInput;

  showMapMessage("🎨 Click on a polygon to color it.");

  colorInput.addEventListener("input", (e) => {
    selectedColor = e.target.value;
    isColoring = true;
    map.getContainer().style.cursor = "url('./images/color.png'), auto";
  });
};
// Check if sensor exists in Firestore before saving to backend
async function waitForFirebase(maxWaitMs = 5000) {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    if (window.firebaseDb && window.firestoreDoc && window.firestoreGetDoc) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return false;
}

async function checkSensorExistsInFirestore(deviceCode) {
  const firebaseReady = await waitForFirebase();

  if (!firebaseReady) {
    throw new Error("Firebase is not initialized.");
  }

  const cleanCode = deviceCode.trim();

  if (!cleanCode) {
    throw new Error("Sensor ID is required.");
  }

  const docRef = window.firestoreDoc(window.firebaseDb, "Sensors", cleanCode);
  const docSnap = await window.firestoreGetDoc(docRef);

  return docSnap.exists();
}
async function checkMotorExistsInFirestore(deviceCode) {
  const firebaseReady = await waitForFirebase();

  if (!firebaseReady) {
    throw new Error("Firebase is not initialized.");
  }

  const cleanCode = deviceCode.trim();

  if (!cleanCode) {
    throw new Error("Motor ID is required.");
  }

  const docRef = window.firestoreDoc(window.firebaseDb, "Motors", cleanCode);
  const docSnap = await window.firestoreGetDoc(docRef);

  return docSnap.exists();
}

async function saveSensor(sensorData) {
  try {
    const cleanCode = sensorData.deviceCode?.trim();

    if (!cleanCode) {
      throw new Error("Sensor ID is required.");
    }

    const existsInFirestore = await checkSensorExistsInFirestore(cleanCode);

    if (!existsInFirestore) {
      throw new Error(`Sensor ${cleanCode} not found in Firestore.`);
    }

    sensorData.deviceCode = cleanCode;

    const response = await fetch("http://localhost:5212/api/sensor", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(sensorData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to save sensor");
    }

    const createdSensor = await response.json();

    addSensorMarker(createdSensor);
    renderSensorSidebar?.();

    showActionMessage("Sensor saved successfully!");
    resetToolSelection();
    return true;
  } catch (err) {
    console.error("Error saving sensor:", err);
    showErrorMessage(err.message || "Error saving sensor");
    return false;
  }
}
var OpenMotorInformationForm = (latt, lngg) => {
  motorCard.style.display = "block";
  motorLat.value = latt;
  motorLng.value = lngg;

  motorSubmitBtn.onclick = async () => {
    let dateValue = installationDateMotor.value;
    const isoDate = new Date(dateValue + "T00:00:00").toISOString();

    const motorData = {
      deviceCode: motorID.value.trim(),
      type: motorType.value,
      lat: Number(latt),
      lng: Number(lngg),
      installationDate: isoDate,
      farmId: selectedFarmId,
    };

    motorSubmitBtn.disabled = true;
    motorSubmitBtn.textContent = "Checking Firestore...";

    console.log("Sending motor:", motorData);

    const saved = await saveMotor(motorData);

    motorSubmitBtn.disabled = false;
    motorSubmitBtn.textContent = "Submit";

    if (saved) {
      motorCard.style.display = "none";
      hideMapMessage();
    }
  };
};

async function saveMotor(motorData) {
  try {
    const cleanCode = motorData.deviceCode?.trim();

    if (!cleanCode) {
      throw new Error("Motor ID is required.");
    }

    const existsInFirestore = await checkMotorExistsInFirestore(cleanCode);

    if (!existsInFirestore) {
      throw new Error(`Motor ${cleanCode} not found in Firestore.`);
    }

    motorData.deviceCode = cleanCode;

    const response = await fetch("http://localhost:5212/api/motor", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(motorData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to save motor");
    }

    const createdMotor = await response.json();

    addMotorMarker(createdMotor);

    showActionMessage("Motor saved successfully!");
    resetToolSelection();
    return true;
  } catch (err) {
    console.error("Error saving motor:", err);
    showErrorMessage(err.message || "Error saving motor");
    return false;
  }
}
function isPointOnSegment(px, py, x1, y1, x2, y2) {
  const cross = (py - y1) * (x2 - x1) - (px - x1) * (y2 - y1);
  if (Math.abs(cross) > 1e-10) return false;

  const dot = (px - x1) * (px - x2) + (py - y1) * (py - y2);
  return dot <= 0;
}

function isPointInsidePolygon(latlng, polygonLatLngs) {
  const x = latlng.lng;
  const y = latlng.lat;
  let inside = false;

  for (
    let i = 0, j = polygonLatLngs.length - 1;
    i < polygonLatLngs.length;
    j = i++
  ) {
    const xi = polygonLatLngs[i].lng;
    const yi = polygonLatLngs[i].lat;
    const xj = polygonLatLngs[j].lng;
    const yj = polygonLatLngs[j].lat;

    if (isPointOnSegment(x, y, xi, yi, xj, yj)) {
      return true;
    }

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

function getFarmIdFromLatLng(latlng) {
  let foundFarmId = null;

  drawnItems.eachLayer((layer) => {
    if (!(layer instanceof L.Polygon)) return;
    if (!layer.farmId) return;

    const latlngSets = layer.getLatLngs();
    if (!latlngSets || !latlngSets.length) return;

    const outerRing = Array.isArray(latlngSets[0]) ? latlngSets[0] : latlngSets;

    if (isPointInsidePolygon(latlng, outerRing)) {
      foundFarmId = layer.farmId;
    }
  });

  return foundFarmId;
}
function placeSensor(latlng) {
  const farmId = getFarmIdFromLatLng(latlng);

  if (!farmId) {
    showErrorMessage("Please click inside one of your farms.");
    resetToolSelection();
    hideMapMessage();
    return;
  }

  selectedFarmId = farmId;
  OpenSensorInformationForm(latlng.lat, latlng.lng);
  hideMapMessage();
}

function placeMotor(latlng) {
  const farmId = getFarmIdFromLatLng(latlng);

  if (!farmId) {
    showErrorMessage("Please click inside one of your farms.");
    resetToolSelection();
    hideMapMessage();
    return;
  }

  selectedFarmId = farmId;
  OpenMotorInformationForm(latlng.lat, latlng.lng);
  hideMapMessage();
}

function colorPolygon(latlng) {
  let colored = false;

  drawnItems.eachLayer((layer) => {
    if (layer instanceof L.Polygon && layer.getBounds().contains(latlng)) {
      layer.setStyle({ color: selectedColor });
      colored = true;

      if (layer.farmId) {
        fetch(`http://localhost:5212/api/farm/${layer.farmId}/color`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ color: selectedColor }),
        }).catch((err) => console.error("Color update failed:", err));
      }
    }
  });

  if (colored) {
    isColoring = false;
    selectedColor = null;
    map.getContainer().style.cursor = "";
    hideMapMessage();
  }
}

map.on("click", function (e) {
  if (isPlacingSensor) {
    placeSensor(e.latlng);
    return;
  }

  if (isPlacingMotor) {
    placeMotor(e.latlng);
    return;
  }

  if (isColoring && selectedColor) {
    colorPolygon(e.latlng);
    return;
  }

  hideMapMessage();
});

function Sensor() {
  if (
    sensorCard.style.display === "block" ||
    motorCard.style.display === "block"
  ) {
    showErrorMessage("Please finish or close the current form first.");
    return;
  }

  resetToolSelection();
  isPlacingSensor = true;
  map.getContainer().style.cursor = "crosshair";
  showMapMessage("📍 Click inside one of your farms to place a sensor.");
}

function Motor() {
  if (
    sensorCard.style.display === "block" ||
    motorCard.style.display === "block"
  ) {
    showErrorMessage("Please finish or close the current form first.");
    return;
  }

  resetToolSelection();
  isPlacingMotor = true;
  map.getContainer().style.cursor = "crosshair";
  showMapMessage("⚙️ Click inside one of your farms to place a motor.");
}

function Cursor() {
  resetToolSelection();
  map.getContainer().style.cursor = "default";
}

function createMapButton(options) {
  L.Control.GenericBtn = L.Control.extend({
    onAdd: function () {
      const btn = L.DomUtil.create("button", options.className);
      btn.style.backgroundColor = "white";
      btn.style.padding = "5px";
      btn.style.cursor = "pointer";

      const img = document.createElement("img");
      img.src = options.imgSrc;
      img.style.width = options.imgWidth || "20px";
      img.style.height = options.imgHeight || "20px";
      img.style.verticalAlign = "middle";
      btn.appendChild(img);

      L.DomEvent.disableClickPropagation(btn);
      btn.onclick = options.onClick;
      return btn;
    },
  });

  return function (opts) {
    return new L.Control.GenericBtn(opts);
  };
}
