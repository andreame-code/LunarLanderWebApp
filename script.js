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

// Gameplay progression: level counter and difficulty scaling parameters.
// Each time the player lands successfully, the level increments.  A higher
// level means the lander starts with less fuel and experiences stronger
// gravitational acceleration, increasing the challenge.  These constants
// define the base fuel, how much fuel is removed per level, and how
// quickly gravity ramps up per level.
let level = 1;
const baseFuel = 1000;
const fuelDecrease = 200;
const gravityIncrement = 0.3;
// The current effective gravity used during simulation. It is initialized
// to the base lunar gravity and adjusted in restartGame() based on the level.
let currentGravity = 1.62;

// Constants for physics
const gravity = 1.62;           // Lunar gravity (m/s^2), acts downward
const mainThrust = 6.0;         // Upward acceleration from main engine (m/s^2)
const sideThrust = 3.0;         // Lateral acceleration from side thrusters (m/s^2)
const maxAltitude = 100.0;      // Maximum altitude used for scaling (m)
const maxRange = 100.0;         // Horizontal range corresponding to canvas width (m)

// Thruster state flags
let upThruster = false;
let leftThruster = false;
let rightThruster = false;

// Game state
let gameOver = false;
let message = '';

// Flag to indicate whether the game has started.  The game logic and physics
// updates should only run when this flag is true.  It is set to true in
// restartGame() when the player presses "Gioca".
let gameStarted = false;

// Terrain definition
let terrainPoints = [];
let safeZone = { startRange: 0, endRange: 0, height: 0 };

// DOM element references
const altitudeElem = document.getElementById('altitude');
const vVelElem = document.getElementById('vVelocity');
const hVelElem = document.getElementById('hVelocity');
const fuelElem = document.getElementById('fuel');
const messageElem = document.getElementById('message');
const levelElem = document.getElementById('level');
const restartButton = document.getElementById('restartButton');
// Share button (for sharing a screenshot of the game stats)
const shareButton = document.getElementById('shareButton');
// Container for end-of-game buttons (restart and share)
const endButtons = document.getElementById('endButtons');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Mobile control button references (may be null on desktop)
const btnUp = document.getElementById('btnUp');
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');

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

// Compute the terrain pixel Y coordinate at a given pixel X using linear
// interpolation. The segment index is clamped so that an X value at the far
// right edge uses the last terrain segment instead of reading past the array.
function getTerrainYPixel(xPix) {
  if (terrainPoints.length === 0) return canvas.height;
  const numSegments = terrainPoints.length - 1;
  const segmentWidth = canvas.width / numSegments;
  const i = Math.min(Math.floor(xPix / segmentWidth), numSegments - 1); // clamp index
  const t = (xPix - i * segmentWidth) / segmentWidth;
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
  levelElem.textContent = `Level: ${level}`;
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
  // Only update physics if the game is in progress and not over
  if (!gameStarted || gameOver) return;

  // Determine accelerations due to thrusters and gravity
  // The vertical acceleration starts with the current gravity for this level.
  let accelY = currentGravity;
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
      // Successful landing: advance to the next level and update controls
      message = 'Successful landing!';
      level += 1;
      restartButton.textContent = 'Next Level';
    } else {
      message = 'Crash!';
      restartButton.textContent = 'Retry Level';
    }
    // Reveal the restart and share buttons when the game ends and show the container
    restartButton.style.display = 'inline-block';
    if (shareButton) {
      shareButton.style.display = 'inline-block';
    }
    if (endButtons) {
      endButtons.style.display = 'flex';
    }
  }

  // Redraw the game and update text on each tick
  draw();
  updateUI();
}

// Reset the game state to initial conditions
function restartGame() {
  // Reset the module's state to starting conditions for the current level.
  altitude = 100.0;
  verticalVelocity = 0.0;
  horizontalPosition = maxRange / 2;
  horizontalVelocity = 0.0;
  // Reduce starting fuel based on the level, ensuring at least 100 units remain
  fuel = Math.max(baseFuel - fuelDecrease * (level - 1), 100);
  // Increase gravity as the level increases
  currentGravity = gravity + gravityIncrement * (level - 1);
  // Clear thruster flags and reset state
  upThruster = leftThruster = rightThruster = false;
  gameOver = false;
  message = '';
  // Mark the game as started so physics updates will run
  gameStarted = true;
  // Generate a new random terrain and safe zone each game
  generateTerrain();
  restartButton.style.display = 'none';
  // Hide share button when restarting level and hide the end buttons container
  if (shareButton) {
    shareButton.style.display = 'none';
  }
  if (endButtons) {
    endButtons.style.display = 'none';
  }
  restartButton.textContent = 'Restart';
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

// --------- Menu logic ---------
// References to menu and modal elements
const menu = document.getElementById('menu');
const playButton = document.getElementById('playButton');
const instructionsButton = document.getElementById('instructionsButton');
const creditsButton = document.getElementById('creditsButton');
const instructionsModal = document.getElementById('instructionsModal');
const creditsModal = document.getElementById('creditsModal');
const closeInstructionsBtn = document.getElementById('closeInstructions');
const closeCreditsBtn = document.getElementById('closeCredits');

// Show game and start when "Gioca" is clicked
if (playButton) {
  playButton.addEventListener('click', () => {
    // Hide menu and show the game container
    if (menu) menu.style.display = 'none';
    const gameContainer = document.getElementById('gameContainer');
    if (gameContainer) gameContainer.style.display = 'block';
    // Start the first level
    restartGame();
  });
}

// Show instructions modal when "Istruzioni" is clicked
if (instructionsButton) {
  instructionsButton.addEventListener('click', () => {
    if (instructionsModal) instructionsModal.style.display = 'flex';
  });
}

// Show credits modal when "Credits" is clicked
if (creditsButton) {
  creditsButton.addEventListener('click', () => {
    if (creditsModal) creditsModal.style.display = 'flex';
  });
}

// Close modals when close buttons are clicked
if (closeInstructionsBtn) {
  closeInstructionsBtn.addEventListener('click', () => {
    if (instructionsModal) instructionsModal.style.display = 'none';
  });
}

if (closeCreditsBtn) {
  closeCreditsBtn.addEventListener('click', () => {
    if (creditsModal) creditsModal.style.display = 'none';
  });
}

//
// Share functionality: capture the current game area as an image and share via Web Share API
// or provide a fallback download if sharing is not supported.
function shareStats() {
  // Identify the game container which wraps the status, canvas and instructions
  const gameContainer = document.getElementById('gameContainer') || document.body;
  html2canvas(gameContainer).then(canvas => {
    canvas.toBlob(blob => {
      const file = new File([blob], 'lunar-lander-stats.png', { type: 'image/png' });
      // Compose share text with current statistics
      const shareText = `Level ${level}, Fuel left ${Math.floor(fuel)}, Vertical velocity ${verticalVelocity.toFixed(1)} m/s, Horizontal velocity ${horizontalVelocity.toFixed(1)} m/s`;
      // Use Web Share API if available and supports files
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: 'Lunar Lander Stats',
          text: shareText
        }).catch((error) => {
          console.error('Share failed', error);
        });
      } else {
        // Fallback: download the image to the user’s device
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'lunar-lander-stats.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    });
  });
}

// Register click handler for share button
if (shareButton) {
  shareButton.addEventListener('click', shareStats);
}

//
// Touch and mouse handlers for mobile controls
// These functions set and clear thruster flags when the on‑screen buttons
// are pressed on touch devices or clicked with the mouse. We call
// preventDefault() to avoid triggering the default click behavior on mobile.
function handleUpStart(e) {
  e.preventDefault();
  if (!gameOver && fuel > 0) {
    upThruster = true;
  }
}

function handleUpEnd(e) {
  e.preventDefault();
  upThruster = false;
}

function handleLeftStart(e) {
  e.preventDefault();
  if (!gameOver && fuel > 0) {
    leftThruster = true;
  }
}

function handleLeftEnd(e) {
  e.preventDefault();
  leftThruster = false;
}

function handleRightStart(e) {
  e.preventDefault();
  if (!gameOver && fuel > 0) {
    rightThruster = true;
  }
}

function handleRightEnd(e) {
  e.preventDefault();
  rightThruster = false;
}

// Register touch and mouse events on the on‑screen controls if they exist
if (btnUp) {
  btnUp.addEventListener('touchstart', handleUpStart);
  btnUp.addEventListener('touchend', handleUpEnd);
  btnUp.addEventListener('mousedown', handleUpStart);
  btnUp.addEventListener('mouseup', handleUpEnd);
}

if (btnLeft) {
  btnLeft.addEventListener('touchstart', handleLeftStart);
  btnLeft.addEventListener('touchend', handleLeftEnd);
  btnLeft.addEventListener('mousedown', handleLeftStart);
  btnLeft.addEventListener('mouseup', handleLeftEnd);
}

if (btnRight) {
  btnRight.addEventListener('touchstart', handleRightStart);
  btnRight.addEventListener('touchend', handleRightEnd);
  btnRight.addEventListener('mousedown', handleRightStart);
  btnRight.addEventListener('mouseup', handleRightEnd);
}

// Physics update timer (10 updates per second)
setInterval(updatePhysics, 100);