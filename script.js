var map = L.map("map", {
  center: [40.505, 49],
  zoom: 16,
  maxZoom: 18,
  minZoom: 10,
});
// L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
//   attribution:
//     '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
// }).addTo(map);

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
    // Close color picker
    if (colorPickerInput) {
      colorPickerInput.remove();
      colorPickerInput = null;
    }

    // Reset coloring mode
    isColoring = false;
    selectedColor = null;

    // Reset cursor & UI
    map.getContainer().style.cursor = "";
    hideMapMessage();
    resetToolSelection();
  }
});

// Motor form
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

//Sensor UI
const sensorCard = document.getElementById("sensorCard");
const sensorID = document.getElementById("sensorId");
const sensorType = document.getElementById("sensorType");
const sensorLat = document.getElementById("sensorLat");
const sensorLng = document.getElementById("sensorLng");
const installationDate = document.getElementById("installationDate");
const useTodayDate = document.getElementById("useTodayDate");
const submitBtn = document.getElementById("submitBtn");

//Motor UI
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
  }
).addTo(map);

loadFarmsFromDB();
loadSensorsFromDB();
loadMotorsFromDB();
let userMarker = null;
let selectedTool = null;
var isPlacingSensor = false;
var isPlacingMotor = false;
let isColoring = false;
let colorPickerInput = null;

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
          userMarker = L.marker([lat, lng]);
        } else {
          userMarker.setLatLng([lat, lng]);
        }
      },
      (err) => showErrorMessage("Error getting location: " + err.message),
      { enableHighAccuracy: false, maximumAge: 0, timeout: 5000 }
    );
  } else {
    showErrorMessage("Geolocation is not supported by this browser.");
  }
}

//Fundamental Functions
//Show Map Message
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
    let dateValue = installationDate.value; // "2025-12-04"
    const isoDate = new Date(dateValue + "T00:00:00").toISOString();
    const sensorData = {
      sensorId: sensorID.value,
      type: sensorType.value,
      lat: latt,
      lng: lngg,
      installationDate: isoDate,
      farmId: selectedFarmId,
    };

    console.log("Sending sensor:", sensorData);

    await saveSensor(sensorData);
    sensorCard.style.display = "none";
    hideMapMessage();
    ////location.reload();
  };
};
var ColorPickerFunction = () => {
  // Clean previous picker if exists
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

async function saveSensor(sensorData) {
  try {
    const response = await fetch("http://localhost:5212/api/sensor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sensorData),
    });

    if (!response.ok) throw new Error("Failed to save");

    showMapMessage("Sensor saved successfully!");
  } catch (err) {
    console.error("Error saving sensor:", err);
    showErrorMessage("Error saving sensor");
  }
}

var OpenMotorInformationForm = (latt, lngg) => {
  motorCard.style.display = "block";
  motorLat.value = latt;
  motorLng.value = lngg;

  motorSubmitBtn.onclick = async () => {
    let dateValue = installationDateMotor.value; // "2025-12-04"
    const isoDate = new Date(dateValue + "T00:00:00").toISOString();

    const motorData = {
      motorId: motorID.value,
      type: motorType.value,
      lat: latt,
      lng: lngg,
      installationDate: isoDate,
      farmId: selectedFarmId,
    };
    console.log("Sending motor:", motorData);

    await saveMotor(motorData);

    motorCard.style.display = "none";
    hideMapMessage();
    //location.reload();
  };
};
async function saveMotor(motorData) {
  try {
    const response = await fetch("http://localhost:5212/api/motor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(motorData),
    });
    if (!response.ok) throw new Error("Failed to save");

    showMapMessage("Motor saved successfully!");
  } catch (err) {
    console.error("Error saving motor:", err);
    showErrorMessage("Error saving motor");
  }
}

//ToolBar Functions
function placeSensor(latlng) {
  L.marker([latlng.lat, latlng.lng], { icon: sensorIcon })
    .addTo(map)
    .bindPopup("Sensor placed!")
    .openPopup();

  OpenSensorInformationForm(latlng.lat, latlng.lng);
  hideMapMessage();
}

function placeMotor(latlng) {
  L.marker([latlng.lat, latlng.lng], { icon: motorIcon })
    .addTo(map)
    .bindPopup("Motor placed!")
    .openPopup();

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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ color: selectedColor }),
        }).catch((err) => console.error("Color update failed:", err));
      }
    }
  });

  // Reset coloring mode AFTER successful click
  if (colored) {
    isColoring = false;
    selectedColor = null;
    map.getContainer().style.cursor = "";
    hideMapMessage();
  }
}
//
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

  hideMapMessage(); // normal click
});

function Sensor() {
  // only prevent multiple forms open at the same time
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
  showMapMessage("📍 Click on the map to place a sensor.");
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
  showMapMessage("⚙️ Click on the map to place a motor.");
}
function Cursor() {
  resetToolSelection();
  map.getContainer().style.cursor = "default";
}

function createMapButton(options) {
  // options: {className, imgSrc, imgWidth, imgHeight, onClick}
  L.Control.GenericBtn = L.Control.extend({
    onAdd: function (map) {
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
    onRemove: function (map) {
      // optional cleanup
    },
  });

  // Factory function
  return function (opts) {
    return new L.Control.GenericBtn(opts);
  };
}
