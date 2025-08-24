const test = require('node:test');
const assert = require('node:assert/strict');
const { Lander, CONFIG } = require('../src/lander');

test('fuel decreases when thrusters fire', () => {
  const lander = new Lander(100);
  lander.reset(10);
  lander.startUp();
  lander.update(1, 0, 1, 0);
  assert.strictEqual(lander.fuel, 9);
});

test('thrusters stop when fuel runs out', () => {
  const lander = new Lander(100);
  lander.reset(1);
  lander.startUp();
  lander.update(1, 0, 1, 0);
  assert.strictEqual(lander.upThruster, false);
});

test('position updates according to velocity', () => {
  const lander = new Lander(100);
  lander.reset(0);
  lander.verticalVelocity = 10;
  lander.horizontalVelocity = 5;
  lander.update(1, 0, 0, 0);
  assert.ok(Math.abs(lander.altitude - (CONFIG.maxAltitude - 10)) < 1e-6);
  assert.ok(Math.abs(lander.horizontalPosition - (50 + 5)) < 1e-6);
});

test('constructor stores lander type', () => {
  const lander = new Lander(100, 'triangle');
  assert.strictEqual(lander.type, 'triangle');
});
