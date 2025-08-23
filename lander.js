const CONFIG = {
  maxAltitude: 100.0
};

class Lander {
  constructor(maxRange) {
    this.maxRange = maxRange;
    this.reset(0);
  }

  reset(startFuel) {
    this.altitude = CONFIG.maxAltitude;
    this.verticalVelocity = 0.0;
    this.horizontalPosition = this.maxRange / 2;
    this.horizontalVelocity = 0.0;
    this.fuel = startFuel;
    this.upThruster = false;
    this.leftThruster = false;
    this.rightThruster = false;
  }

  startUp() {
    if (this.fuel > 0) this.upThruster = true;
  }
  stopUp() {
    this.upThruster = false;
  }
  startLeft() {
    if (this.fuel > 0) this.leftThruster = true;
  }
  stopLeft() {
    this.leftThruster = false;
  }
  startRight() {
    if (this.fuel > 0) this.rightThruster = true;
  }
  stopRight() {
    this.rightThruster = false;
  }

  update(dt, gravity, mainThrust, sideThrust) {
    let accelY = gravity;
    let accelX = 0;
    let thrusters = 0;

    if (this.upThruster && this.fuel > 0) {
      accelY -= mainThrust;
      thrusters++;
    }
    if (this.leftThruster && this.fuel > 0) {
      accelX -= sideThrust;
      thrusters++;
    }
    if (this.rightThruster && this.fuel > 0) {
      accelX += sideThrust;
      thrusters++;
    }

    if (thrusters > 0 && this.fuel > 0) {
      this.fuel = Math.max(this.fuel - thrusters, 0);
      if (this.fuel <= 0) {
        this.upThruster = this.leftThruster = this.rightThruster = false;
      }
    }

    this.verticalVelocity += accelY * dt;
    this.horizontalVelocity += accelX * dt;

    this.altitude -= this.verticalVelocity * dt;
    this.horizontalPosition += this.horizontalVelocity * dt;

    if (this.horizontalPosition < 0) {
      this.horizontalPosition = 0;
      this.horizontalVelocity = 0;
    } else if (this.horizontalPosition > this.maxRange) {
      this.horizontalPosition = this.maxRange;
      this.horizontalVelocity = 0;
    }
  }
}

module.exports = { Lander, CONFIG };
