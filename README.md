# Lunar Lander Web App

This repository contains a simple web version of the **Lunar Lander** game. It simulates the lunar module descent phase of the Apollo missions. The objective is to land the module safely on the Moon’s surface by controlling a single thruster.

## How the game works

- The lunar module starts at an altitude of **100 m** with zero initial vertical velocity.
- Every **0.1 s** the simulation updates velocity and altitude by applying the Moon’s gravitational acceleration. When the thruster is on, an additional upward acceleration is applied and fuel is consumed.
- You control the thruster by pressing and holding the **“Hold to Thrust”** button. The thruster fires as long as you hold the button and fuel remains. When fuel runs out, the thruster shuts off automatically.
- The game ends when the altitude reaches zero. If the module’s speed is **≤ 2 m/s** upon touchdown, you land successfully; otherwise, the lander crashes.
- After landing or crashing, a **Restart** button appears to start a new attempt.

## Files

| File | Description |
| --- | --- |
| **`index.html`** | Main HTML page that defines the UI structure. |
| **`style.css`** | Basic styling for the page, buttons and text. |
| **`script.js`** | Contains all game logic, physics updates and event handlers. |

## Running locally

Open `index.html` in any modern browser (Chrome, Firefox, Safari, Edge) to play. No server or installation is required because the game is built entirely with client‑side HTML/CSS/JavaScript.

## Notes

This version is designed to mirror the behaviour of the watchOS game by focusing on core physics and simple controls. Feel free to extend it by adding graphics, sounds, or more sophisticated physics.