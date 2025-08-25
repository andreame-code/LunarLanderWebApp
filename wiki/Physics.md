# Physics

The simulation models a 1‑dimensional descent with simple horizontal movement.

## Forces

- **Gravity** pulls the lander toward the surface each tick.
- **Main Thruster** provides upward acceleration when firing.
- **Side Thrusters** supply horizontal acceleration.

The `Lander` class scales thrust according to the craft's current mass. As fuel burns, mass decreases and thrust becomes more effective.

## Mass and Fuel

- The lander starts with a configurable amount of fuel.
- Fuel is consumed proportionally to the number of active thrusters and the elapsed time.
- When fuel reaches zero all thrusters shut off automatically.

## Anomaly Detection

To keep gameplay fair, the lander monitors for impossible states such as infinite velocities or leaving the simulation range. If an anomaly is detected the simulation clamps values and sets a flag for debugging.

Back to [Home](Home.md).

