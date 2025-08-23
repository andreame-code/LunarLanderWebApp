// Lunar Lander web app with 2D graphics and keyboard controls.
//
// Use the arrow keys to control the lunar module:
//   - ArrowUp fires the main engine, reducing the downward velocity.
//   - ArrowLeft and ArrowRight fire side thrusters, accelerating left/right.
// Land gently on the surface with low vertical and horizontal speeds.

// Configuration constants
const CONFIG = {
  gravity: 1.62,           // Lunar gravity (m/s^2)
  mainThrust: 6.0,         // Upward acceleration from main engine (m/s^2)
  sideThrust: 3.0,         // Lateral acceleration from side thrusters (m/s^2)
  maxAltitude: 100.0,      // Maximum altitude used for scaling (m)
  maxRange: 100.0,         // Horizontal range corresponding to canvas width (m)
  landerWidth: 20,         // Lander width in pixels
  landerHeight: 30,        // Lander height in pixels
  baseFuel: 1000,
  fuelDecrease: 200,
  gravityIncrement: 0.3
};

// Simple audio helpers
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let thrusterOscillator = null;

function startThrusterSound() {
  if (thrusterOscillator) return;
  thrusterOscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  gain.gain.value = 0.1;
  thrusterOscillator.type = 'sawtooth';
  thrusterOscillator.frequency.value = 200;
  thrusterOscillator.connect(gain).connect(audioContext.destination);
  thrusterOscillator.start();
}

function stopThrusterSound() {
  if (!thrusterOscillator) return;
  thrusterOscillator.stop();
  thrusterOscillator.disconnect();
  thrusterOscillator = null;
}

function playLandingSound(success) {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  gain.gain.value = 0.2;
  osc.frequency.value = success ? 440 : 110;
  osc.connect(gain).connect(audioContext.destination);
  osc.start();
  osc.stop(audioContext.currentTime + 0.2);
}

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
    // Gameplay progression
    this.level = 1;
    this.currentGravity = CONFIG.gravity;

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
    this.lander = new Lander(CONFIG.maxRange);

    // Bind restart button
    this.restartButton.addEventListener('click', () => this.restartGame());

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
    const segmentRange = CONFIG.maxRange / numPoints;
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
      const padStartPix = (this.safeZone.startRange / CONFIG.maxRange) * this.canvas.width;
      const padEndPix = (this.safeZone.endRange / CONFIG.maxRange) * this.canvas.width;
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
      const xPix = (this.lander.horizontalPosition / CONFIG.maxRange) * this.canvas.width;
      const yPix = this.canvas.height - (this.lander.altitude / CONFIG.maxAltitude) * this.canvas.height;

    // Draw the lunar module body
    this.ctx.fillStyle = '#dcdcdc';
      this.ctx.fillRect(
        xPix - CONFIG.landerWidth / 2,
        yPix - CONFIG.landerHeight,
        CONFIG.landerWidth,
        CONFIG.landerHeight
      );

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
        this.ctx.moveTo(xPix + CONFIG.landerWidth / 2, yPix - CONFIG.landerHeight + 5);
        this.ctx.lineTo(
          xPix + CONFIG.landerWidth / 2 + 15,
          yPix - CONFIG.landerHeight + 15
        );
        this.ctx.lineTo(xPix + CONFIG.landerWidth / 2, yPix - CONFIG.landerHeight + 25);
        this.ctx.closePath();
        this.ctx.fill();
      }

    // Right thruster flame (drawn on the left side of the module) when firing
      if (this.lander.rightThruster && this.lander.fuel > 0 && !this.gameOver) {
        this.ctx.fillStyle = '#ff9e00';
        this.ctx.beginPath();
        this.ctx.moveTo(xPix - CONFIG.landerWidth / 2, yPix - CONFIG.landerHeight + 5);
        this.ctx.lineTo(
          xPix - CONFIG.landerWidth / 2 - 15,
          yPix - CONFIG.landerHeight + 15
        );
        this.ctx.lineTo(xPix - CONFIG.landerWidth / 2, yPix - CONFIG.landerHeight + 25);
        this.ctx.closePath();
        this.ctx.fill();
      }
  }

  // Physics update executed on a fixed interval
  updatePhysics(dt) {
    // Only update physics if the game is in progress and not over
    if (!this.gameStarted || this.gameOver) return;

    this.lander.update(dt, this.currentGravity, CONFIG.mainThrust, CONFIG.sideThrust);

    // Convert positions to pixels for terrain collision detection
      const xPix = (this.lander.horizontalPosition / CONFIG.maxRange) * this.canvas.width;
      const yPix = this.canvas.height - (this.lander.altitude / CONFIG.maxAltitude) * this.canvas.height;
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
      this.restartButton.classList.remove('hidden');
      if (this.shareButton) {
        this.shareButton.classList.remove('hidden');
      }
      if (this.endButtons) {
        this.endButtons.classList.remove('hidden');
      }
      stopThrusterSound();
      playLandingSound(safeVertical && safeHorizontal && safePosition);
    }

    // Redraw the game and update text on each tick
    this.draw();
    this.updateUI();
  }

  // Reset the game state to initial conditions
  restartGame() {
    // Reset the module's state to starting conditions for the current level.
    const startFuel = Math.max(CONFIG.baseFuel - CONFIG.fuelDecrease * (this.level - 1), 100);
    this.lander.reset(startFuel);
    // Increase gravity as the level increases
    this.currentGravity = CONFIG.gravity + CONFIG.gravityIncrement * (this.level - 1);
    // Clear thruster flags and reset state
    this.gameOver = false;
    this.message = '';
    // Mark the game as started so physics updates will run
    this.gameStarted = true;
    // Generate a new random terrain and safe zone each game
    this.generateTerrain();
    this.restartButton.classList.add('hidden');
    // Hide share button when restarting level and hide the end buttons container
    if (this.shareButton) {
      this.shareButton.classList.add('hidden');
    }
    if (this.endButtons) {
      this.endButtons.classList.add('hidden');
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

// --------- Control handling ---------
const thrusterButtons = [
  { id: 'btnUp', start: 'startUp', stop: 'stopUp' },
  { id: 'btnLeft', start: 'startLeft', stop: 'stopLeft' },
  { id: 'btnRight', start: 'startRight', stop: 'stopRight' }
];

thrusterButtons.forEach(({ id, start, stop }) => {
  const btn = document.getElementById(id);
  if (!btn) return;
  const startHandler = e => {
    e.preventDefault();
    if (!game.gameOver) {
      audioContext.resume();
      game.lander[start]();
      startThrusterSound();
    }
  };
  const stopHandler = e => {
    e.preventDefault();
    game.lander[stop]();
    if (!game.lander.upThruster && !game.lander.leftThruster && !game.lander.rightThruster) {
      stopThrusterSound();
    }
  };
  btn.addEventListener('pointerdown', startHandler);
  btn.addEventListener('pointerup', stopHandler);
  btn.addEventListener('pointerout', stopHandler);
  btn.addEventListener('pointercancel', stopHandler);
});

const KEY_MAP = {
  ArrowUp: { start: 'startUp', stop: 'stopUp' },
  ArrowLeft: { start: 'startLeft', stop: 'stopLeft' },
  ArrowRight: { start: 'startRight', stop: 'stopRight' }
};

document.addEventListener('keydown', e => {
  const action = KEY_MAP[e.code];
  if (action && !game.gameOver) {
    audioContext.resume();
    game.lander[action.start]();
    startThrusterSound();
    e.preventDefault();
  }
});

document.addEventListener('keyup', e => {
  const action = KEY_MAP[e.code];
  if (action) {
    game.lander[action.stop]();
    if (!game.lander.upThruster && !game.lander.leftThruster && !game.lander.rightThruster) {
      stopThrusterSound();
    }
    e.preventDefault();
  }
});

// --------- Menu and modal logic ---------
const menu = document.getElementById('menu');
const playButton = document.getElementById('playButton');
const instructionsButton = document.getElementById('instructionsButton');
const creditsButton = document.getElementById('creditsButton');
const instructionsModal = document.getElementById('instructionsModal');
const creditsModal = document.getElementById('creditsModal');
const closeInstructionsBtn = document.getElementById('closeInstructions');
const closeCreditsBtn = document.getElementById('closeCredits');

if (playButton) {
  playButton.addEventListener('click', () => {
    if (menu) menu.classList.add('hidden');
    const gameContainer = document.getElementById('gameContainer');
    if (gameContainer) gameContainer.classList.remove('hidden');
    game.restartGame();
  });
}

[
  { button: instructionsButton, modal: instructionsModal },
  { button: creditsButton, modal: creditsModal }
].forEach(({ button, modal }) => {
  if (button && modal) {
    button.addEventListener('click', () => modal.classList.remove('hidden'));
  }
});

[
  { button: closeInstructionsBtn, modal: instructionsModal },
  { button: closeCreditsBtn, modal: creditsModal }
].forEach(({ button, modal }) => {
  if (button && modal) {
    button.addEventListener('click', () => modal.classList.add('hidden'));
  }
});

// --------- Game loop ---------
let lastTime = 0;
let paused = false;

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;
  if (!paused) {
    game.updatePhysics(dt);
  }
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

document.addEventListener('visibilitychange', () => {
  paused = document.hidden;
  if (paused) {
    game.lander.stopUp();
    game.lander.stopLeft();
    game.lander.stopRight();
    stopThrusterSound();
  }
});

function resizeCanvas() {
  const maxWidth = 360;
  const maxHeight = 480;
  const scale = Math.min(window.innerWidth / maxWidth, window.innerHeight / maxHeight, 1);
  game.canvas.style.width = `${maxWidth * scale}px`;
  game.canvas.style.height = `${maxHeight * scale}px`;
}

let resizeRaf = null;
function handleResize() {
  if (resizeRaf !== null) {
    cancelAnimationFrame(resizeRaf);
  }
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = null;
    resizeCanvas();
  });
}

window.addEventListener('resize', handleResize);
resizeCanvas();

