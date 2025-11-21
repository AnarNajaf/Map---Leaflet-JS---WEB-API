class Farms {
  constructor(name, lat, lng, area, crops, owner, sensors = []) {
    this.name = name;
    this.lat = lat;
    this.lng = lng;
    this.area = area;
    this.crops = crops;
    this.owner = owner;
    this.sensors = sensors;
  }
  // addSensor(sensor) {
  //   this.sensors.push(sensor);
  // }
  // removeSensor(sensorId) {
  //   this.sensors = this.sensors.filter((s) => s.id !== sensorId);
  // }
}
class SensorItem {
  constructor(id, lat, lng, type, status = "off", reading) {
    this.id = id;
    this.lat = lat;
    this.lng = lng;
    this.type = type;
    this.status = status;
    this.reading = reading;
  }
  getFarmName(lat, long) {
    return `Farm_${Math.floor(lat)}_${Math.floor(long)}`;
  }
  activate() {
    this.status = "on";
  }
  deactivate() {
    this.status = "off";
  }
}
