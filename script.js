var map = L.map("map").setView([51.505, -0.09], 13);
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

let userMarker = null;
let selectedTool = null;
var isPlacingSensor = false;

const sensorIcon = L.icon({
  iconUrl: "../images/sensor.png",
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

function Sensor() {
  if (!isPlacingSensor) {
    isPlacingSensor = true;
    map.getContainer().style.cursor =
      "url('../images/alternative_sensor.png') 20 20, auto"; // same folder
    map.on("click", function (e) {
      if (!isPlacingSensor) return;

      if (confirm("Place sensor here?")) {
        L.marker([e.latlng.lat, e.latlng.lng], { icon: sensorIcon })
          .addTo(map)
          .bindPopup("Sensor placed!")
          .openPopup();

        map.getContainer().style.cursor = "";
        isPlacingSensor = false;
      }
    });
  } else {
    map.getContainer().style.cursor = "";
    isPlacingSensor = false;
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

