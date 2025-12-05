var selectedFarmId = null;
let sensorMarkers = [];
let motorMarkers = [];
function attachPolygonClick(layer, farmId) {
    layer.farmId = farmId;
    layer.on("click", function () {
        selectedFarmId = farmId;
        console.log("Selected farm for sensor placement:", selectedFarmId);
    });
}

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
            attachPolygonClick(polygon, farm.id);    
        });

        console.log("Loaded farms:", farms);
    } catch (err) {
        console.error("Error loading farms:", err);
    }
}

async function loadSensorsFromDB() {
    try {
        const response = await fetch("http://localhost:5212/api/sensor");
        const sensors = await response.json();

        sensors.forEach(sensor => {
            const marker = L.marker([sensor.lat, sensor.lng], { icon: sensorIcon })
                .addTo(map)
                .bindPopup(`
                    <b>Sensor ID:</b> ${sensor.sensor_Id}<br>
                    <b>Type:</b> ${sensor.type}<br>
                    <b>Farm ID:</b> ${sensor.farmId}
                `);

            // Store reference to marker along with sensor data
            sensorMarkers.push({ id: sensor.sensor_Id, marker: marker, data: sensor });
        });

        console.log("Loaded sensors:", sensors);
    } catch (err) {
        console.error("Error loading sensors:", err);
    }
}

async function loadMotorsFromDB() {
    try {
        const response = await fetch("http://localhost:5212/api/motor");
        const motors = await response.json();

        motors.forEach(motor => {
            const marker = L.marker([motor.lat, motor.lng], { icon: motorIcon })
                .addTo(map)
                .bindPopup(`
                    <b>Motor ID:</b> ${motor.motor_Id}<br>
                    <b>Type:</b> ${motor.type}<br>
                    <b>Farm ID:</b> ${motor.farmId}
                `);

            motorMarkers.push({ id: motor.motor_Id, marker: marker, data: motor });
        });

        console.log("Loaded motors:", motors);
    } catch (err) {
        console.error("Error loading motors:", err);
    }
}

