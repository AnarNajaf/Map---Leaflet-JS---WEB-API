// Drawing and Saving Polygonsd
let polygons = [];
let polygonList = [];
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var drawControl = new L.Control.Draw({
  position: "topright",
  draw: {
    polygon: {
      allowIntersection: false,
      showArea: true,
      shapeOptions: { color: "red" },
    },
    polyline: false,
    rectangle: false,
    circle: false,
    marker: false,
    circlemarker: false,
  },
  edit: {
    featureGroup: drawnItems,
    remove: true 
  },
});
map.addControl(drawControl);
map.on("draw:deleted", async function (event) {
    event.layers.eachLayer(async function (layer) {

        if (!layer.farmId) {
            console.warn("No farmId attached to layer.");
            return;
        }

        try {
            await fetch(`http://localhost:5212/api/farm/${layer.farmId}`, {
                method: "DELETE"
            });

            console.log("Deleted farm:", layer.farmId);

        } catch (err) {
            console.error("Delete failed:", err);
        }
    });
});

map.on(L.Draw.Event.CREATED, async function (event) {
    var layer = event.layer;

    if (event.layerType === "polygon") {
        const latlngs = layer.getLatLngs()[0];
        const coords = latlngs.map(p => [p.lat, p.lng]);

        const farmData = {
            name: `Farm ${Date.now()}`,
            color: "#FF0000",
            responsiblePerson: "Default User",
            farmType: "None",
            polygon: coords
        };

        try {
            const response = await fetch("http://localhost:5212/api/farm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(farmData)
            });

            if (!response.ok) return alert("Failed to save!");

            const result = await response.json();
            console.log("Saved farm:", result);

            // 🔥 Attach farm ID to the polygon layer
            layer.farmId = result.id;

        } catch (err) {
            console.error("Fetch failed:", err);
        }
    }

    drawnItems.addLayer(layer);
});
