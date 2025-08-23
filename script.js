// Lunar Lander web app with 2D graphics and keyboard controls.
//
// Use the arrow keys to control the lunar module:
//   - ArrowUp fires the main engine, reducing the downward velocity.
//   - ArrowLeft and ArrowRight fire side thrusters, accelerating left/right.
// Land gently on the surface with low vertical and horizontal speeds.

// Constants for physics
const gravity = 1.62;           // Lunar gravity (m/s^2), acts downward
const mainThrust = 6.0;         // Upward acceleration from main engine (m/s^2)
const sideThrust = 3.0;         // Lateral acceleration from side thrusters (m/s^2)
const maxAltitude = 100.0;      // Maximum altitude used for scaling (m)
const maxRange = 100.0;         // Horizontal range corresponding to canvas width (m)
const landerWidth = 20;         // Width of the lander in pixels
const landerHeight = 30;        // Height of the lander in pixels

/**
 * Lander encapsulates the state and physics of the lunar module.  It
 * tracks position, velocity, fuel and thruster flags and exposes methods
 * to control thrusters and advance the simulation.
 */
class Lander {
  constructor(maxRange) {
    this.maxRange = maxRange;
    this.reset(0);
  }

  // Reset the lander to its initial position with a given starting fuel
  reset(startFuel) {
    this.altitude = 100.0;
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

  // Advance the physics simulation by dt seconds
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

    // Consume one unit of fuel per active thruster
    if (thrusters > 0 && this.fuel > 0) {
      this.fuel = Math.max(this.fuel - thrusters, 0);
      if (this.fuel <= 0) {
        this.upThruster = this.leftThruster = this.rightThruster = false;
      }
    }

    // Update velocities
    this.verticalVelocity += accelY * dt;
    this.horizontalVelocity += accelX * dt;

    // Update positions
    this.altitude -= this.verticalVelocity * dt; // altitude decreases when verticalVelocity is positive (downward)
    this.horizontalPosition += this.horizontalVelocity * dt;

    // Keep the module within horizontal boundaries
    if (this.horizontalPosition < 0) {
      this.horizontalPosition = 0;
      this.horizontalVelocity = 0;
    } else if (this.horizontalPosition > this.maxRange) {
      this.horizontalPosition = this.maxRange;
      this.horizontalVelocity = 0;
    }
  }
}

/**
 * Game controller manages terrain, UI updates and level progression.
 * It owns a Lander instance and orchestrates the simulation.
 */
class Game {
  constructor() {
    // Gameplay progression: level counter and difficulty scaling parameters.
    this.level = 1;
    this.baseFuel = 1000;
    this.fuelDecrease = 200;
    this.gravityIncrement = 0.3;
    this.currentGravity = gravity;

    // Game state
    this.gameOver = false;
    this.message = '';
    this.gameStarted = false;

    // Terrain definition
    this.terrainPoints = [];
    this.safeZone = { startRange: 0, endRange: 0, height: 0 };

    // DOM element references
    this.altitudeElem = document.getElementById('altitude');
    this.vVelElem = document.getElementById('vVelocity');
    this.hVelElem = document.getElementById('hVelocity');
    this.fuelElem = document.getElementById('fuel');
    this.messageElem = document.getElementById('message');
    this.levelElem = document.getElementById('level');
    this.restartButton = document.getElementById('restartButton');
    this.shareButton = document.getElementById('shareButton');
    this.endButtons = document.getElementById('endButtons');
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // Mobile control button references (may be null on desktop)
    this.btnUp = document.getElementById('btnUp');
    this.btnLeft = document.getElementById('btnLeft');
    this.btnRight = document.getElementById('btnRight');

    // Lander instance
    this.lander = new Lander(maxRange);

    // Bind restart button
    this.restartButton.addEventListener('click', () => this.restartGame());

    // Register touch and mouse events on the on-screen controls if they exist
    if (this.btnUp) {
      this.btnUp.addEventListener('touchstart', handleUpStart);
      this.btnUp.addEventListener('touchend', handleUpEnd);
      this.btnUp.addEventListener('mousedown', handleUpStart);
      this.btnUp.addEventListener('mouseup', handleUpEnd);
    }
    if (this.btnLeft) {
      this.btnLeft.addEventListener('touchstart', handleLeftStart);
      this.btnLeft.addEventListener('touchend', handleLeftEnd);
      this.btnLeft.addEventListener('mousedown', handleLeftStart);
      this.btnLeft.addEventListener('mouseup', handleLeftEnd);
    }
    if (this.btnRight) {
      this.btnRight.addEventListener('touchstart', handleRightStart);
      this.btnRight.addEventListener('touchend', handleRightEnd);
      this.btnRight.addEventListener('mousedown', handleRightStart);
      this.btnRight.addEventListener('mouseup', handleRightEnd);
    }

    this.updateUI();
    this.draw();
  }

  /*
   * Generate a random lunar surface profile and select a flat landing zone.
   * The surface is defined by a series of normalized heights (0–1) sampled
   * along the horizontal range. A contiguous pair of segments is chosen to
   * form a flat safe pad. The safe zone is stored both in pixel range and
   * in physical range units (0–maxRange).
   */
  generateTerrain() {
    const numPoints = 10;
    this.terrainPoints = [];
    for (let i = 0; i <= numPoints; i++) {
      // random heights between 10% and 40% of the canvas height
      this.terrainPoints.push(Math.random() * 0.3 + 0.1);
    }
    // choose a random flat zone of width one segment somewhere in the middle
    const safeIndex = Math.floor(Math.random() * (numPoints - 2)) + 1;
    const segmentRange = maxRange / numPoints;
    const flatHeight = Math.min(
      this.terrainPoints[safeIndex],
      this.terrainPoints[safeIndex + 1],
      0.2
    );
    this.terrainPoints[safeIndex] = flatHeight;
    this.terrainPoints[safeIndex + 1] = flatHeight;
    this.safeZone = {
      startRange: safeIndex * segmentRange,
      endRange: (safeIndex + 1) * segmentRange,
      height: flatHeight
    };
  }

  // Compute the terrain pixel Y coordinate at a given pixel X using linear interpolation
  getTerrainYPixel(xPix) {
    if (this.terrainPoints.length === 0) return this.canvas.height;
    const numSegments = this.terrainPoints.length - 1;
    const segmentWidth = this.canvas.width / numSegments;
    const i = Math.min(Math.floor(xPix / segmentWidth), numSegments - 1); // clamp index
    const t = (xPix - i * segmentWidth) / segmentWidth;
    const h0 = this.terrainPoints[i];
    const h1 = this.terrainPoints[i + 1];
    const heightNorm = h0 * (1 - t) + h1 * t;
    return this.canvas.height - heightNorm * this.canvas.height;
  }

  // Draw the lunar surface on the canvas, highlighting the safe landing pad.
  drawTerrain() {
    if (this.terrainPoints.length === 0) return;
    this.ctx.strokeStyle = '#7b8794';
    this.ctx.fillStyle = '#1e2530';
    this.ctx.beginPath();
    const numSegments = this.terrainPoints.length - 1;
    const segmentWidth = this.canvas.width / numSegments;
    this.ctx.moveTo(0, this.canvas.height);
    for (let i = 0; i < this.terrainPoints.length; i++) {
      const x = i * segmentWidth;
      const y = this.canvas.height - this.terrainPoints[i] * this.canvas.height;
      this.ctx.lineTo(x, y);
    }
    this.ctx.lineTo(this.canvas.width, this.canvas.height);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    // Highlight safe landing pad
    const padStartPix = (this.safeZone.startRange / maxRange) * this.canvas.width;
    const padEndPix = (this.safeZone.endRange / maxRange) * this.canvas.width;
    const padYPix = this.canvas.height - this.safeZone.height * this.canvas.height;
    this.ctx.fillStyle = '#2a9d8f';
    this.ctx.fillRect(padStartPix, padYPix - 2, padEndPix - padStartPix, 4);
  }

  // Update textual status on the page
  updateUI() {
    this.altitudeElem.textContent = `Altitude: ${this.lander.altitude.toFixed(1)} m`;
    this.vVelElem.textContent = `Vertical Velocity: ${this.lander.verticalVelocity.toFixed(1)} m/s`;
    this.hVelElem.textContent = `Horizontal Velocity: ${this.lander.horizontalVelocity.toFixed(1)} m/s`;
    this.fuelElem.textContent = `Fuel: ${Math.floor(this.lander.fuel)}`;
    this.messageElem.textContent = this.message;
    this.levelElem.textContent = `Level: ${this.level}`;
  }

  // Draw the lander, ground and thruster flames on the canvas
  draw() {
    // Clear entire canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw the terrain and safe pad
    this.drawTerrain();

    // Convert physical coordinates to pixel positions
    const xPix = (this.lander.horizontalPosition / maxRange) * this.canvas.width;
    const yPix = this.canvas.height - (this.lander.altitude / maxAltitude) * this.canvas.height;

    // Draw the lunar module body
    this.ctx.fillStyle = '#dcdcdc';
    this.ctx.fillRect(xPix - landerWidth / 2, yPix - landerHeight, landerWidth, landerHeight);

    // Main thruster flame (drawn below the lander) when firing
    if (this.lander.upThruster && this.lander.fuel > 0 && !this.gameOver) {
      this.ctx.fillStyle = '#ff9e00';
      this.ctx.beginPath();
      this.ctx.moveTo(xPix - 10, yPix);
      this.ctx.lineTo(xPix, yPix + 15);
      this.ctx.lineTo(xPix + 10, yPix);
      this.ctx.closePath();
      this.ctx.fill();
    }

    // Left thruster flame (drawn on the right side of the module) when firing
    if (this.lander.leftThruster && this.lander.fuel > 0 && !this.gameOver) {
      this.ctx.fillStyle = '#ff9e00';
      this.ctx.beginPath();
      this.ctx.moveTo(xPix + landerWidth / 2, yPix - landerHeight + 5);
      this.ctx.lineTo(xPix + landerWidth / 2 + 15, yPix - landerHeight + 15);
      this.ctx.lineTo(xPix + landerWidth / 2, yPix - landerHeight + 25);
      this.ctx.closePath();
      this.ctx.fill();
    }

    // Right thruster flame (drawn on the left side of the module) when firing
    if (this.lander.rightThruster && this.lander.fuel > 0 && !this.gameOver) {
      this.ctx.fillStyle = '#ff9e00';
      this.ctx.beginPath();
      this.ctx.moveTo(xPix - landerWidth / 2, yPix - landerHeight + 5);
      this.ctx.lineTo(xPix - landerWidth / 2 - 15, yPix - landerHeight + 15);
      this.ctx.lineTo(xPix - landerWidth / 2, yPix - landerHeight + 25);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  // Physics update executed on a fixed interval
  updatePhysics() {
    // Only update physics if the game is in progress and not over
    if (!this.gameStarted || this.gameOver) return;

    const dt = 0.1;
    this.lander.update(dt, this.currentGravity, mainThrust, sideThrust);

    // Convert positions to pixels for terrain collision detection
    const xPix = (this.lander.horizontalPosition / maxRange) * this.canvas.width;
    const yPix = this.canvas.height - (this.lander.altitude / maxAltitude) * this.canvas.height;
    const terrainY = this.getTerrainYPixel(xPix);
    if (yPix >= terrainY) {
      // Touching terrain: set altitude to zero and end game
      this.lander.altitude = 0;
      this.gameOver = true;
      // Determine if landing is successful: low speeds and within safe landing pad
      const safeVertical = Math.abs(this.lander.verticalVelocity) <= 2.0;
      const safeHorizontal = Math.abs(this.lander.horizontalVelocity) <= 2.0;
      const safePosition =
        this.lander.horizontalPosition >= this.safeZone.startRange &&
        this.lander.horizontalPosition <= this.safeZone.endRange;
      if (safeVertical && safeHorizontal && safePosition) {
        // Successful landing: advance to the next level and update controls
        this.message = 'Successful landing!';
        this.level += 1;
        this.restartButton.textContent = 'Next Level';
      } else {
        this.message = 'Crash!';
        this.restartButton.textContent = 'Retry Level';
      }
      // Reveal the restart and share buttons when the game ends and show the container
      this.restartButton.style.display = 'inline-block';
      if (this.shareButton) {
        this.shareButton.style.display = 'inline-block';
      }
      if (this.endButtons) {
        this.endButtons.style.display = 'flex';
      }
    }

    // Redraw the game and update text on each tick
    this.draw();
    this.updateUI();
  }

  // Reset the game state to initial conditions
  restartGame() {
    // Reset the module's state to starting conditions for the current level.
    const startFuel = Math.max(this.baseFuel - this.fuelDecrease * (this.level - 1), 100);
    this.lander.reset(startFuel);
    // Increase gravity as the level increases
    this.currentGravity = gravity + this.gravityIncrement * (this.level - 1);
    // Clear thruster flags and reset state
    this.gameOver = false;
    this.message = '';
    // Mark the game as started so physics updates will run
    this.gameStarted = true;
    // Generate a new random terrain and safe zone each game
    this.generateTerrain();
    this.restartButton.style.display = 'none';
    // Hide share button when restarting level and hide the end buttons container
    if (this.shareButton) {
      this.shareButton.style.display = 'none';
    }
    if (this.endButtons) {
      this.endButtons.style.display = 'none';
    }
    this.restartButton.textContent = 'Restart';
    this.updateUI();
    this.draw();
  }
}

// Instantiate the game controller
const game = new Game();

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
      const shareText = `Level ${game.level}, Fuel left ${Math.floor(game.lander.fuel)}, Vertical velocity ${game.lander.verticalVelocity.toFixed(1)} m/s, Horizontal velocity ${game.lander.horizontalVelocity.toFixed(1)} m/s`;
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
if (game.shareButton) {
  game.shareButton.addEventListener('click', shareStats);
}

//
// Touch and mouse handlers for mobile controls
// These functions set and clear thruster flags when the on‑screen buttons
// are pressed on touch devices or clicked with the mouse. We call
// preventDefault() to avoid triggering the default click behavior on mobile.
function handleUpStart(e) {
  e.preventDefault();
  if (!game.gameOver) {
    game.lander.startUp();
  }
}

function handleUpEnd(e) {
  e.preventDefault();
  game.lander.stopUp();
}

function handleLeftStart(e) {
  e.preventDefault();
  if (!game.gameOver) {
    game.lander.startLeft();
  }
}

function handleLeftEnd(e) {
  e.preventDefault();
  game.lander.stopLeft();
}

function handleRightStart(e) {
  e.preventDefault();
  if (!game.gameOver) {
    game.lander.startRight();
  }
}

function handleRightEnd(e) {
  e.preventDefault();
  game.lander.stopRight();
}

// Keyboard event handlers to toggle thrusters
document.addEventListener('keydown', function (event) {
  if (game.gameOver) return;
  switch (event.code) {
    case 'ArrowUp':
      game.lander.startUp();
      event.preventDefault();
      break;
    case 'ArrowLeft':
      game.lander.startLeft();
      event.preventDefault();
      break;
    case 'ArrowRight':
      game.lander.startRight();
      event.preventDefault();
      break;
    default:
      break;
  }
});

document.addEventListener('keyup', function (event) {
  switch (event.code) {
    case 'ArrowUp':
      game.lander.stopUp();
      event.preventDefault();
      break;
    case 'ArrowLeft':
      game.lander.stopLeft();
      event.preventDefault();
      break;
    case 'ArrowRight':
      game.lander.stopRight();
      event.preventDefault();
      break;
    default:
      break;
  }
});

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
    game.restartGame();
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

// Physics update timer (10 updates per second)
setInterval(() => game.updatePhysics(), 100);

