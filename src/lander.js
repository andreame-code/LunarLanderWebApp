// Configuration specific to the lander model.  Naming this object uniquely
// avoids clashing with other global constants when the script is included in
// a browser environment alongside additional scripts such as game logic.
const LANDER_CONFIG = {
  maxAltitude: 100.0
};

// Approximate dry mass of the lander (arbitrary units). The total mass
// is this dry mass plus remaining fuel. As fuel burns, the mass decreases
// which makes the thrusters more effective. Individual lander models can
// override this default value.
const DEFAULT_DRY_MASS = 1000;

class Lander {
  constructor(maxRange, type = 'classic', dryMass = DEFAULT_DRY_MASS) {
    this.maxRange = maxRange;
    // Store the visual/physical variant of the lander.  For now the type only
    // affects rendering but in the future it will influence physics as well.
    this.type = type;
    // Mass properties. `fullMass` will hold the mass when fuel is full so we
    // can scale thrust effectiveness based on current mass.
    this.dryMass = dryMass;
    this.fullMass = this.dryMass;
    this.mass = this.dryMass;
    this.reset(0);
    this.anomaly = false;
  }

  reset(startFuel) {
    this.altitude = LANDER_CONFIG.maxAltitude;
    this.verticalVelocity = 0.0;
    this.horizontalPosition = this.maxRange / 2;
    this.horizontalVelocity = 0.0;
    this.fuel = startFuel;
    this.mass = this.dryMass + this.fuel;
    this.fullMass = this.mass;
    this.upThruster = false;
    this.leftThruster = false;
    this.rightThruster = false;
    this.anomaly = false;
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

    // Scale thrust based on current mass relative to the fully fueled mass.
    const massRatio = this.fullMass / this.mass;

    if (this.upThruster && this.fuel > 0) {
      accelY -= mainThrust * massRatio;
      thrusters++;
    }
    if (this.leftThruster && this.fuel > 0) {
      accelX -= sideThrust * massRatio;
      thrusters++;
    }
    if (this.rightThruster && this.fuel > 0) {
      accelX += sideThrust * massRatio;
      thrusters++;
    }

    if (thrusters > 0 && this.fuel > 0) {
      // Consume fuel in proportion to active thrusters and elapsed time
      const fuelUsed = thrusters * dt;
      this.fuel = Math.max(this.fuel - fuelUsed, 0);
      this.mass = this.dryMass + this.fuel;
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

    if (
      !isFinite(this.altitude) ||
      this.altitude < 0 ||
      this.altitude > LANDER_CONFIG.maxAltitude ||
      !isFinite(this.verticalVelocity) ||
      Math.abs(this.verticalVelocity) > 1000
    ) {
      this.anomaly = true;
      this.altitude = Math.min(Math.max(this.altitude, 0), LANDER_CONFIG.maxAltitude);
      if (!isFinite(this.verticalVelocity) || Math.abs(this.verticalVelocity) > 1000) {
        this.verticalVelocity = 0;
      }
    }
  }
}

// Export for Node and attach to window for browser usage
if (typeof module !== 'undefined' && module.exports) {
  // Export the configuration with a descriptive name to avoid collisions when
  // required from Node-based tests.
  module.exports = { Lander, LANDER_CONFIG };
} else {
  window.Lander = Lander;
  window.LANDER_CONFIG = LANDER_CONFIG;
}
