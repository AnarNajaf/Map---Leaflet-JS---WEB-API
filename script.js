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
async function loadFarmsFromDB() {
    try {
        const response = await fetch("http://localhost:5212/api/farm");
        const farms = await response.json();

        farms.forEach(farm => {
            if (!farm.polygon || farm.polygon.length === 0) return;

            const latlngs = farm.polygon.map(p => L.latLng(p[0], p[1]));

            const polygon = L.polygon(latlngs, {
                color: farm.color || "green",
                weight: 2
            });

            polygon.farmId = farm.id;

            drawnItems.addLayer(polygon);

            polygon.bindPopup(`<b>${farm.name}</b><br>ID: ${farm.id}`);
        });

        console.log("Loaded farms:", farms);
    } catch (err) {
        console.error("Error loading farms:", err);
    }
}

loadFarmsFromDB();

let userMarker = null;
let selectedTool = null;
var isPlacingSensor = false;
var isPlacingMotor = false;

const sensorIcon = L.icon({
  iconUrl: "../images/sensor.png",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});
const motorIcon = L.icon({
  iconUrl: "../images/motor.png",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});
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

        // Center map on user
        map.setView([lat, lng], 16);

        // Add or update marker
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
var OpenSensorInformationForm = (lat, lng) => {
  sensorCard.style.display = "block";
  sensorLat.value = lat;
  sensorLng.value = lng;
  submitBtn.onclick = () => {
    sensorCard.style.display = "none";
  };
};
var OpenMotorInformationForm = (lat, lng) => {
  motorCard.style.display = "block";
  motorLat.value = lat;
  motorLng.value = lng;
  motorSubmitBtn.onclick = () => {
    motorCard.style.display = "none";
  };
};
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
