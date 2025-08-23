const { test } = require('node:test');
const assert = require('node:assert/strict');

// Minimal DOM stubs required by script.js
const canvas = { width: 200, height: 100, getContext: () => ({}) };
const restartButton = { addEventListener: () => {} };

global.document = {
  getElementById: (id) => ({ gameCanvas: canvas, restartButton }[id] || null),
  addEventListener: () => {},
};

const { getTerrainYPixel, setTerrainPoints, canvas: scriptCanvas } = require('../script.js');

test('getTerrainYPixel returns a finite number at canvas width', () => {
  setTerrainPoints([0.1, 0.2, 0.3]);
  const y = getTerrainYPixel(scriptCanvas.width);
  assert.strictEqual(typeof y, 'number');
  assert.ok(!Number.isNaN(y));
});
