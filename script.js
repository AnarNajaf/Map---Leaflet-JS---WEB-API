var map = L.map("map").setView([40.505, 49], 13);
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

// Motor form
document.getElementById("useTodayDateMotor").addEventListener("change", function () {
  const dateInput = document.getElementById("installationDateMotor");
  if (this.checked) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.value = today;
  } else {
    dateInput.value = "";
  }
});

const sensorCard = document.getElementById("sensorCard");
const sensorID = document.getElementById("sensorId");
const sensorType = document.getElementById("sensorType");
const sensorLat = document.getElementById("sensorLat");
const sensorLng = document.getElementById("sensorLng");
const installationDate = document.getElementById("installationDate");
const useTodayDate = document.getElementById("useTodayDate");
const submitBtn = document.getElementById("submitBtn");

//Motor
const motorCard = document.getElementById("motorCard");
const motorID = document.getElementById("motorId");
const motorType = document.getElementById("motorType");
const motorLat = document.getElementById("motorLat");
const motorLng = document.getElementById("motorLng");
const motorSubmitBtn = document.getElementById("MotorSubmitBtn");

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    resetToolSelection();
  }
});
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


function resetToolSelection() {
  selectedTool = null;
  colorMode = false;
  isPlacingSensor = false;
  map.getContainer().style.cursor = "";
  console.log("Tool selection reset.");
}
function Location() {
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
      (err) => alert("Error getting location: " + err.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
  } else {
    alert("Geolocation is not supported by this browser.");
  }
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
  };
};

async function saveSensor(sensorData) {
    try {
        const response = await fetch("http://localhost:5212/api/sensor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sensorData)
        });

        if (!response.ok) throw new Error("Failed to save");

        alert("Sensor saved successfully!");
    } catch (err) {
        console.error("Error saving sensor:", err);
        alert("Error saving sensor");
    }
}

var OpenMotorInformationForm = (latt, lngg) => {
  motorCard.style.display = "block";
  motorLat.value = latt;
  motorLng.value = lngg;
  motorSubmitBtn.onclick = async() => {
    const motorData = {
      motorId: motorID.value,
      type: motorType.value,
      lat: latt,
      lng: lngg,
      farmId: selectedFarmId,
    };
    console.log("Sending motor:", motorData);

    await saveMotor(motorData);

    motorCard.style.display = "none";
  };
};
async function saveMotor(motorData) {
    try {
        const response = await fetch("http://localhost:5212/api/motor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(motorData)
        });
        if (!response.ok) throw new Error("Failed to save");

        alert("Motor saved successfully!");
    }
    catch (err) {
        console.error("Error saving motor:", err);
        alert("Error saving motor");
    }
}

function Sensor() {
  if (!isPlacingSensor) {
    isPlacingSensor = true;
    map.getContainer().style.cursor =
      "url('../images/alternative_sensor.png') 20 20, auto";
    map.on("click", function (e) {
      if (!isPlacingSensor) return;
      L.marker([e.latlng.lat, e.latlng.lng], { icon: sensorIcon })
        .addTo(map)
        .bindPopup("Sensor placed!")
        .openPopup();
      OpenSensorInformationForm(e.latlng.lat, e.latlng.lng);
      map.getContainer().style.cursor = "";
      isPlacingSensor = false;
    });
  } else {
    map.getContainer().style.cursor = "";
    isPlacingSensor = false;
  }
}
function Motor() {
  if (!isPlacingMotor) {
    isPlacingMotor = true;
    map.getContainer().style.cursor = "url('../images/motor.png') 20 20, auto";

    map.on("click", function (e) {
      if (!isPlacingMotor) return;
      L.marker([e.latlng.lat, e.latlng.lng], { icon: motorIcon })
        .addTo(map)
        .bindPopup("Motor placed!")
        .openPopup();
      OpenMotorInformationForm(e.latlng.lat, e.latlng.lng);
      map.getContainer().style.cursor = "";
      isPlacingMotor = false;
    });
  } else {
    map.getContainer().style.cursor = "";
    isPlacingMotor = false;
  }
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
