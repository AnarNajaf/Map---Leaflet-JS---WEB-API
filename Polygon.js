// Drawing and Saving Polygons
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
  },
});
map.addControl(drawControl);

map.on(L.Draw.Event.CREATED, function (event) {
  var layer = event.layer;
  if (event.layerType === "polygon") {
    const latlngs = layer.getLatLngs()[0];
    const coords = latlngs.map((p) => [p.lat, p.lng]);
    const polygonData = {
      id: polygonList.length + 1,
      coords: coords,
    };
    polygonList.push(polygonData);
    polygons.push(polygonData);
    console.log("Polygon saved:", polygonData);
    console.log("All polygons:", polygons);
  }
  drawnItems.addLayer(layer);
});
