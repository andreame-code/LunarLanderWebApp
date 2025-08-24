# Lunar Lander Web App

This repository contains a simple web version of the **Lunar Lander** game. It simulates the lunar module descent phase of the Apollo missions. The objective is to land the module safely on the Moon’s surface by controlling a single thruster.

## How the game works

- The lunar module starts at an altitude of **100 m** with zero initial vertical velocity.
- Every **0.1 s** the simulation updates velocity and altitude by applying the Moon’s gravitational acceleration. When the thruster is on, an additional upward acceleration is applied and fuel is consumed.
- You control the thrusters with the arrow keys or the on-screen mobile buttons: press **↑** for the main engine and **←/→** for the side thrusters. Each thruster fires as long as you hold the key or button and fuel remains; when fuel runs out, the thrusters shut off automatically.
- The game ends when the altitude reaches zero. If the module’s speed is **≤ 2 m/s** upon touchdown, you land successfully; otherwise, the lander crashes.
- After landing or crashing, a **Restart** button appears to start a new attempt.

## Files

The JavaScript source code is organized into the `src/` directory.

| File | Description |
| --- | --- |
| **`index.html`** | Main HTML page that defines the UI structure. |
| **`style.css`** | Basic styling for the page, buttons and text. |
| **`src/lander.js`** | Handles lander physics and movement. |
| **`src/game.js`** | Runs the game loop and orchestrates events. |
| **`src/lang.js`** | Manages language strings and localization helpers. |

## Running locally

Open `index.html` in any modern browser (Chrome, Firefox, Safari, Edge) to play. For additional security the repository now includes a small Node.js server. Run `npm start` to launch the server and load the game from `http://localhost:3000` so that gameplay parameters are signed and basic result validation occurs.

## Notes

This version is designed to mirror the behaviour of the watchOS game by focusing on core physics and simple controls. For improved fairness the server verifies critical gameplay data and runtime checks detect impossible states. Feel free to extend it by adding graphics, sound effects, or additional game mechanics.

## 🤖 AI Generated

All code and content in this project were created entirely using a large language model (LLM), specifically **ChatGPT**. No part of the project was written manually by a person. The entire development was generated and guided by ChatGPT.

