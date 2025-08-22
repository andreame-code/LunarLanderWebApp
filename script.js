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

// Terrain definition
let terrainPoints = [];
let safeZone = { startRange: 0, endRange: 0, height: 0 };

// DOM element references
const altitudeElem = document.getElementById('altitude');
const vVelElem = document.getElementById('vVelocity');
const hVelElem = document.getElementById('hVelocity');
const fuelElem = document.getElementById('fuel');
const messageElem = document.getElementById('message');
const restartButton = document.getElementById('restartButton');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

/*
 * Generate a random lunar surface profile and select a flat landing zone.
 * The surface is defined by a series of normalized heights (0–1) sampled
 * along the horizontal range. A contiguous pair of segments is chosen to
 * form a flat safe pad. The safe zone is stored both in pixel range and
 * in physical range units (0–maxRange).
 */
function generateTerrain() {
  const numPoints = 10;
  terrainPoints = [];
  for (let i = 0; i <= numPoints; i++) {
    // random heights between 10% and 40% of the canvas height
    terrainPoints.push(Math.random() * 0.3 + 0.1);
  }
  // choose a random flat zone of width one segment somewhere in the middle
  const safeIndex = Math.floor(Math.random() * (numPoints - 2)) + 1;
  const segmentRange = maxRange / numPoints;
  const flatHeight = Math.min(terrainPoints[safeIndex], terrainPoints[safeIndex + 1], 0.2);
  terrainPoints[safeIndex] = flatHeight;
  terrainPoints[safeIndex + 1] = flatHeight;
  safeZone = {
    startRange: safeIndex * segmentRange,
    endRange: (safeIndex + 1) * segmentRange,
    height: flatHeight
  };
}

// Compute the terrain pixel Y coordinate at a given pixel X using linear interpolation.
function getTerrainYPixel(xPix) {
  if (terrainPoints.length === 0) return canvas.height;
  const numSegments = terrainPoints.length - 1;
  const segmentWidth = canvas.width / numSegments;
  const i = Math.floor(xPix / segmentWidth);
  const t = (xPix % segmentWidth) / segmentWidth;
  const h0 = terrainPoints[i];
  const h1 = terrainPoints[i + 1];
  const heightNorm = h0 * (1 - t) + h1 * t;
  return canvas.height - heightNorm * canvas.height;
}

// Draw the lunar surface on the canvas, highlighting the safe landing pad.
function drawTerrain() {
  if (terrainPoints.length === 0) return;
  ctx.strokeStyle = '#7b8794';
  ctx.fillStyle = '#1e2530';
  ctx.beginPath();
  const numSegments = terrainPoints.length - 1;
  const segmentWidth = canvas.width / numSegments;
  ctx.moveTo(0, canvas.height);
  for (let i = 0; i < terrainPoints.length; i++) {
    const x = i * segmentWidth;
    const y = canvas.height - terrainPoints[i] * canvas.height;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Highlight safe landing pad
  const padStartPix = (safeZone.startRange / maxRange) * canvas.width;
  const padEndPix = (safeZone.endRange / maxRange) * canvas.width;
  const padYPix = canvas.height - safeZone.height * canvas.height;
  ctx.fillStyle = '#2a9d8f';
  ctx.fillRect(padStartPix, padYPix - 2, padEndPix - padStartPix, 4);
}

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

  // Draw the terrain and safe pad
  drawTerrain();

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

  // Check for landing or crash against terrain
  // Convert positions to pixels for terrain collision detection
  const xPix = (horizontalPosition / maxRange) * canvas.width;
  const yPix = canvas.height - (altitude / maxAltitude) * canvas.height;
  const terrainY = getTerrainYPixel(xPix);
  // landerHeight defined in draw(), replicate value here
  const landerHeight = 30;
  if (yPix >= terrainY) {
    // Touching terrain: set altitude to zero and end game
    altitude = 0;
    gameOver = true;
    // Determine if landing is successful: low speeds and within safe landing pad
    const safeVertical = Math.abs(verticalVelocity) <= 2.0;
    const safeHorizontal = Math.abs(horizontalVelocity) <= 2.0;
    const safePosition = horizontalPosition >= safeZone.startRange && horizontalPosition <= safeZone.endRange;
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
  // Generate a new terrain for each game
  generateTerrain();
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
// Generate a new terrain before starting the simulation
generateTerrain();
draw();
updateUI();
// Physics update timer (10 updates per second)
setInterval(updatePhysics, 100);