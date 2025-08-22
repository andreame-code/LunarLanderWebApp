// Lunar Lander web app with 2D graphics and keyboard controls.
//
// Use the arrow keys to control the lunar module:
//   - ArrowUp fires the main engine, reducing the downward velocity.
//   - ArrowLeft and ArrowRight fire side thrusters, accelerating left/right.
// Land gently on the surface with low vertical and horizontal speeds.

// Physical state variables
let altitude = 100.0;           // Vertical distance above the surface (m)
let verticalVelocity = 0.0;     // Vertical velocity (m/s), positive downwards
let horizontalPosition = 50.0;  // Horizontal position (m), between 0 and maxRange
let horizontalVelocity = 0.0;   // Horizontal velocity (m/s), positive to the right
let fuel = 1000;                // Remaining fuel units

// Constants for physics
const gravity = 1.62;           // Lunar gravity (m/s^2), acts downward
const mainThrust = 3.0;         // Upward acceleration from main engine (m/s^2)
const sideThrust = 1.5;         // Lateral acceleration from side thrusters (m/s^2)
const maxAltitude = 100.0;      // Maximum altitude used for scaling (m)
const maxRange = 100.0;         // Horizontal range corresponding to canvas width (m)

// Thruster state flags
let upThruster = false;
let leftThruster = false;
let rightThruster = false;

// Game state
let gameOver = false;
let message = '';

// DOM element references
const altitudeElem = document.getElementById('altitude');
const vVelElem = document.getElementById('vVelocity');
const hVelElem = document.getElementById('hVelocity');
const fuelElem = document.getElementById('fuel');
const messageElem = document.getElementById('message');
const restartButton = document.getElementById('restartButton');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Update textual status on the page
function updateUI() {
  altitudeElem.textContent = `Altitude: ${altitude.toFixed(1)} m`;
  vVelElem.textContent = `Vertical Velocity: ${verticalVelocity.toFixed(1)} m/s`;
  hVelElem.textContent = `Horizontal Velocity: ${horizontalVelocity.toFixed(1)} m/s`;
  fuelElem.textContent = `Fuel: ${Math.floor(fuel)}`;
  messageElem.textContent = message;
}

// Draw the lander, ground and thruster flames on the canvas
function draw() {
  // Clear entire canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw ground line at the bottom of the canvas
  ctx.fillStyle = '#30363d';
  ctx.fillRect(0, canvas.height - 4, canvas.width, 4);

  // Convert physical coordinates to pixel positions
  const xPix = (horizontalPosition / maxRange) * canvas.width;
  const yPix = canvas.height - (altitude / maxAltitude) * canvas.height;

  // Dimensions of the lunar module (in pixels)
  const landerWidth = 20;
  const landerHeight = 30;

  // Draw the lunar module body
  ctx.fillStyle = '#dcdcdc';
  ctx.fillRect(xPix - landerWidth / 2, yPix - landerHeight, landerWidth, landerHeight);

  // Main thruster flame (drawn below the lander) when firing
  if (upThruster && fuel > 0 && !gameOver) {
    ctx.fillStyle = '#ff9e00';
    ctx.beginPath();
    ctx.moveTo(xPix - 10, yPix);
    ctx.lineTo(xPix, yPix + 15);
    ctx.lineTo(xPix + 10, yPix);
    ctx.closePath();
    ctx.fill();
  }

  // Left thruster flame (drawn on the right side of the module) when firing
  if (leftThruster && fuel > 0 && !gameOver) {
    ctx.fillStyle = '#ff9e00';
    ctx.beginPath();
    ctx.moveTo(xPix + landerWidth / 2, yPix - landerHeight + 5);
    ctx.lineTo(xPix + landerWidth / 2 + 15, yPix - landerHeight + 15);
    ctx.lineTo(xPix + landerWidth / 2, yPix - landerHeight + 25);
    ctx.closePath();
    ctx.fill();
  }

  // Right thruster flame (drawn on the left side of the module) when firing
  if (rightThruster && fuel > 0 && !gameOver) {
    ctx.fillStyle = '#ff9e00';
    ctx.beginPath();
    ctx.moveTo(xPix - landerWidth / 2, yPix - landerHeight + 5);
    ctx.lineTo(xPix - landerWidth / 2 - 15, yPix - landerHeight + 15);
    ctx.lineTo(xPix - landerWidth / 2, yPix - landerHeight + 25);
    ctx.closePath();
    ctx.fill();
  }
}

// Physics update executed on a fixed interval
function updatePhysics() {
  if (gameOver) return;

  // Determine accelerations due to thrusters and gravity
  let accelY = gravity;
  let accelX = 0;
  let thrustersFiring = 0;

  if (upThruster && fuel > 0) {
    accelY -= mainThrust;
    thrustersFiring++;
  }
  if (leftThruster && fuel > 0) {
    accelX -= sideThrust;
    thrustersFiring++;
  }
  if (rightThruster && fuel > 0) {
    accelX += sideThrust;
    thrustersFiring++;
  }

  // Consume fuel: one unit per thruster per update
  if (thrustersFiring > 0 && fuel > 0) {
    fuel = Math.max(fuel - thrustersFiring, 0);
    if (fuel <= 0) {
      // Disable all thrusters when fuel runs out
      upThruster = leftThruster = rightThruster = false;
    }
  }

  const dt = 0.1;
  // Update velocities based on accelerations
  verticalVelocity += accelY * dt;
  horizontalVelocity += accelX * dt;

  // Update positions based on velocities
  altitude -= verticalVelocity * dt;        // altitude decreases when verticalVelocity is positive (downward)
  horizontalPosition += horizontalVelocity * dt;

  // Keep the module within horizontal boundaries
  if (horizontalPosition < 0) {
    horizontalPosition = 0;
    horizontalVelocity = 0;
  } else if (horizontalPosition > maxRange) {
    horizontalPosition = maxRange;
    horizontalVelocity = 0;
  }

  // Check for landing or crash
  if (altitude <= 0) {
    altitude = 0;
    gameOver = true;
    // Determine if landing is successful: low speeds and within safe area
    const safeVertical = Math.abs(verticalVelocity) <= 2.0;
    const safeHorizontal = Math.abs(horizontalVelocity) <= 2.0;
    const safePosition = horizontalPosition > maxRange * 0.2 && horizontalPosition < maxRange * 0.8;
    if (safeVertical && safeHorizontal && safePosition) {
      message = 'Successful landing!';
    } else {
      message = 'Crash!';
    }
    // Reveal the restart button when game ends
    restartButton.style.display = 'inline-block';
  }

  // Redraw the game and update text on each tick
  draw();
  updateUI();
}

// Reset the game state to initial conditions
function restartGame() {
  altitude = 100.0;
  verticalVelocity = 0.0;
  horizontalPosition = maxRange / 2;
  horizontalVelocity = 0.0;
  fuel = 1000;
  upThruster = leftThruster = rightThruster = false;
  gameOver = false;
  message = '';
  restartButton.style.display = 'none';
  updateUI();
  draw();
}

// Keyboard event handlers to toggle thrusters
document.addEventListener('keydown', function (event) {
  if (gameOver) return;
  switch (event.code) {
    case 'ArrowUp':
      upThruster = true;
      event.preventDefault();
      break;
    case 'ArrowLeft':
      leftThruster = true;
      event.preventDefault();
      break;
    case 'ArrowRight':
      rightThruster = true;
      event.preventDefault();
      break;
    default:
      break;
  }
});

document.addEventListener('keyup', function (event) {
  switch (event.code) {
    case 'ArrowUp':
      upThruster = false;
      event.preventDefault();
      break;
    case 'ArrowLeft':
      leftThruster = false;
      event.preventDefault();
      break;
    case 'ArrowRight':
      rightThruster = false;
      event.preventDefault();
      break;
    default:
      break;
  }
});

// Hook up restart button
restartButton.addEventListener('click', restartGame);

// Initial drawing and UI update
draw();
updateUI();
// Physics update timer (10 updates per second)
setInterval(updatePhysics, 100);