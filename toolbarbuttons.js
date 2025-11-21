//Cursor

const CursorBtn = createMapButton({
  className: "cursor-btn",
  imgSrc: "../images/cursor.png",
  onClick: () => alert("Cursor button clicked!"),
});
L.control.cursorBtn = CursorBtn;
L.control.cursorBtn({ position: "topright" }).addTo(map);

//Create

const LocateBtn = createMapButton({
  className: "locate-btn",
  imgSrc: "../images/location.png",
  onClick: Location,
});
L.control.locateBtn = LocateBtn;
L.control.locateBtn({ position: "bottomright" }).addTo(map);

//Sensor

const SensorBtn = createMapButton({
  className: "sensor-btn",
  imgSrc: "../images/sensor.png",
  onClick: Sensor,
});
L.control.sensorBtn = SensorBtn;
L.control.sensorBtn({ position: "topright" }).addTo(map);

//Motor

const MotorBtn = createMapButton({
  className: "motor-btn",
  imgSrc: "../images/motor.png",
  onClick: () => alert("Motor button clicked!"),
});
L.control.motorBtn = MotorBtn;
L.control.motorBtn({ position: "topright" }).addTo(map);

//Color

const ColorBtn = createMapButton({
  className: "color-btn",
  imgSrc: "../images/color.png",
  onClick: () => alert("Color button clicked!"),
});
L.control.colorBtn = ColorBtn;
L.control.colorBtn({ position: "topright" }).addTo(map);

const deleteBtn = createMapButton({
  className: "delete-btn",
  imgSrc: "../images/delete.png",
  onClick: () => alert("Delete button clicked!"),
});
L.control.deleteBtn = deleteBtn;
L.control.deleteBtn({ position: "topright" }).addTo(map);
