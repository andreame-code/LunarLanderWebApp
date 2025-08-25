# Development

This page explains how the project is structured and how to work on it locally.

## Project Structure

| Path | Purpose |
| --- | --- |
| `index.html` | Main page that wires up the user interface |
| `style.css` | Basic styling for buttons and layout |
| `src/lander.js` | Physics and state management for the lander |
| `src/game.js` | Game loop and interaction logic |
| `src/lang.js` | Localization strings |

## Running Locally

1. Install dependencies (only Express is required):
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
   The game is served at <http://localhost:3000>.

## Testing

Unit tests use the built‑in `node:test` runner:
```bash
npm test
```

## Building

To produce a minified bundle of the source files:
```bash
npm run build
```
The bundle will be written to `dist/app.min.js`.

Back to [Home](Home.md).

