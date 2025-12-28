//Cursor

const CursorBtn = createMapButton({
  className: "cursor-btn",
  imgSrc:
    "https://anarnajaf.github.io/Map---Leaflet-JS---WEB-API/images/cursor.png",
  onClick: Cursor,
});
L.control.cursorBtn = CursorBtn;
L.control.cursorBtn({ position: "topright" }).addTo(map);

//Create

const LocateBtn = createMapButton({
  className: "locate-btn",
  imgSrc:
    "https://anarnajaf.github.io/Map---Leaflet-JS---WEB-API/images/location.png",
  onClick: LocationFunction,
});
L.control.locateBtn = LocateBtn;
L.control.locateBtn({ position: "bottomright" }).addTo(map);

//Sensor

const SensorBtn = createMapButton({
  className: "sensor-btn",
  imgSrc: "../images/sensor_left.png",
  onClick: Sensor,
});
L.control.sensorBtn = SensorBtn;
L.control.sensorBtn({ position: "topright" }).addTo(map);

//Motor

const MotorBtn = createMapButton({
  className: "motor-btn",
  imgSrc: "../images/motor_left.png",
  onClick: Motor,
});
L.control.motorBtn = MotorBtn;
L.control.motorBtn({ position: "topright" }).addTo(map);

//Color

const ColorBtn = createMapButton({
  className: "color-btn",
  imgSrc:
    "https://anarnajaf.github.io/Map---Leaflet-JS---WEB-API/images/color.png",
  onClick: () => ColorPickerFunction(),
});
L.control.colorBtn = ColorBtn;
L.control.colorBtn({ position: "topright" }).addTo(map);
