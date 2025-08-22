// Simple Lunar Lander game simulation for the web.
// The simulation updates altitude, velocity and fuel at a fixed time step.
// Holding down the thruster button applies a positive acceleration while fuel lasts.

let altitude = 100.0;        // Current altitude of the lunar module in metres
let velocity = 0.0;          // Current vertical velocity in metres per second (downwards is positive)
let fuel = 1000;             // Remaining fuel units
const gravity = 1.62;        // Magnitude of lunar gravity (m/s^2)
const thrustAcceleration = 3.0; // Acceleration provided by thruster (m/s^2)
let thrusterOn = false;      // Whether the thruster is currently firing
let gameOver = false;        // Whether the game has ended
let message = "";            // Message displayed at game end

// Grab DOM elements for updating the UI
const altElem = document.getElementById('altitude');
const velElem = document.getElementById('velocity');
const fuelElem = document.getElementById('fuel');
const messageElem = document.getElementById('message');
const thrusterButton = document.getElementById('thrusterButton');
const restartButton = document.getElementById('restartButton');

// Helper function to update the textual status on the page
function updateUI() {
  altElem.textContent = `Altitude: ${altitude.toFixed(1)} m`;
  velElem.textContent = `Velocity: ${velocity.toFixed(1)} m/s`;
  fuelElem.textContent = `Fuel: ${Math.floor(fuel)}`;
  messageElem.textContent = message;
}

// Physics update executed on a fixed interval
function updatePhysics() {
  if (gameOver) return;

  // Compute acceleration: gravity always pulls downward (increasing velocity)
  // When thruster is on and fuel remains, provide upward acceleration and consume fuel.
  let acceleration = gravity;
  if (thrusterOn && fuel > 0) {
    acceleration -= thrustAcceleration;
    fuel = Math.max(fuel - 1, 0);
    if (fuel <= 0) {
      thrusterOn = false;
    }
  }

  // Integrate velocity and position using a small time step (0.1 s)
  const dt = 0.1;
  velocity += acceleration * dt;
  altitude -= velocity * dt; // subtract because positive velocity points downward

  // Check for landing or crash
  if (altitude <= 0) {
    altitude = 0;
    gameOver = true;
    thrusterOn = false;
    // Determine success or crash based on landing speed threshold (2 m/s)
    if (Math.abs(velocity) <= 2.0) {
      message = 'Successful landing!';
    } else {
      message = 'Crash!';
    }
    thrusterButton.style.display = 'none';
    restartButton.style.display = 'inline-block';
  }

  updateUI();
}

// Restart the simulation to initial conditions
function restartGame() {
  altitude = 100.0;
  velocity = 0.0;
  fuel = 1000;
  thrusterOn = false;
  gameOver = false;
  message = '';
  thrusterButton.style.display = 'inline-block';
  restartButton.style.display = 'none';
  updateUI();
}

// Event handlers for mouse and touch interactions on the thruster button
function startThruster() {
  if (!gameOver && fuel > 0) {
    thrusterOn = true;
  }
}

function stopThruster() {
  thrusterOn = false;
}

thrusterButton.addEventListener('mousedown', startThruster);
thrusterButton.addEventListener('mouseup', stopThruster);
thrusterButton.addEventListener('mouseleave', stopThruster);

// Mobile touch events
thrusterButton.addEventListener('touchstart', function(event) {
  event.preventDefault();
  startThruster();
});
thrusterButton.addEventListener('touchend', function(event) {
  event.preventDefault();
  stopThruster();
});

restartButton.addEventListener('click', restartGame);

// Initial UI update and start the physics loop
updateUI();
setInterval(updatePhysics, 100);