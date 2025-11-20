var map = L.map("map").setView([51.505, -0.09], 13);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);
let userMarker = null;

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
const sensorIcon = L.icon({
  iconUrl: "test.png",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

var isPlacingSensor = false;
function Sensor() {
  if (!isPlacingSensor) {
    isPlacingSensor = true;
    map.getContainer().style.cursor = "url('test.png') 16 16, auto"; // same folder
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

L.Control.LocateBtn = L.Control.extend({
  onAdd: function (map) {
    var btn = L.DomUtil.create("button", "locate-btn");
    btn.style.backgroundColor = "white";
    btn.style.padding = "5px";
    btn.style.cursor = "pointer";
    const img = document.createElement("img");
    img.className = "locate-icon";
    img.src = "test.png";
    img.style.width = "20px";
    img.style.height = "20px";
    img.style.verticalAlign = "middle";
    btn.appendChild(img);
    L.DomEvent.disableClickPropagation(btn);
    btn.onclick = function () {
      Location();
    };
    return btn;
  },
  onRemove: function (map) {
    // Nothing to do here
  },
});

// Factory function
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

      // attach the click function
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

const CursorBtn = createMapButton({
  className: "cursor-btn",
  imgSrc: "test.png",
  onClick: () => alert("Cursor button clicked!"),
});
L.control.cursorBtn = CursorBtn;
L.control.cursorBtn({ position: "topright" }).addTo(map);

const LocateBtn = createMapButton({
  className: "locate-btn",
  imgSrc: "test.png",
  onClick: Location,
});
L.control.locateBtn = LocateBtn;
L.control.locateBtn({ position: "bottomright" }).addTo(map);

const SensorBtn = createMapButton({
  className: "sensor-btn",
  imgSrc: "test.png",
  onClick: Sensor,
});
L.control.sensorBtn = SensorBtn;
L.control.sensorBtn({ position: "topright" }).addTo(map);

const MotorBtn = createMapButton({
  className: "motor-btn",
  imgSrc: "test.png",
  onClick: () => alert("Motor button clicked!"),
});
L.control.motorBtn = MotorBtn;
L.control.motorBtn({ position: "topright" }).addTo(map);

const PolygonBtn = createMapButton({
  className: "polygon-btn",
  imgSrc: "test.png",
  onClick: () => alert("Polygon button clicked!"),
});
L.control.polygonBtn = PolygonBtn;
L.control.polygonBtn({ position: "topright" }).addTo(map);

const deleteBtn = createMapButton({
  className: "delete-btn",
  imgSrc: "test.png",
  onClick: () => alert("Delete button clicked!"),
});
L.control.deleteBtn = deleteBtn;
L.control.deleteBtn({ position: "topright" }).addTo(map);

// map.on("click", function (e) {
//   // e.latlng contains the clicked coordinates
//   var lat = e.latlng.lat;
//   var lng = e.latlng.lng;

//   console.log("Map clicked at:");
//   console.log("Latitude:", lat);
//   console.log("Longitude:", lng);

//   alert(`You clicked at:\nLat: ${lat}\nLng: ${lng}`);
// });
