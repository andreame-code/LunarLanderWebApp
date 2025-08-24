const test = require('node:test');
const assert = require('node:assert/strict');
const { Lander, LANDER_CONFIG } = require('../src/lander');

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
  assert.ok(Math.abs(lander.altitude - (LANDER_CONFIG.maxAltitude - 10)) < 1e-6);
  assert.ok(Math.abs(lander.horizontalPosition - (50 + 5)) < 1e-6);
});

test('constructor stores lander type', () => {
  const lander = new Lander(100, 'triangle');
  assert.strictEqual(lander.type, 'triangle');
});

test('mass decreases as fuel burns', () => {
  const lander = new Lander(100);
  lander.reset(10);
  const initialMass = lander.mass;
  lander.startUp();
  // Burn fuel without advancing time to isolate mass change
  lander.update(0, 0, 1, 0);
  assert.strictEqual(lander.mass, initialMass - 1);
});

test('thrust is more effective with lower mass', () => {
  const heavy = new Lander(100);
  heavy.reset(1000);
  heavy.startUp();
  heavy.update(1, 0, 1, 0);
  const heavyVel = heavy.verticalVelocity;

  const light = new Lander(100);
  light.reset(1000);
  for (let i = 0; i < 999; i++) {
    light.startUp();
    light.update(0, 0, 1, 0);
  }
  light.startUp();
  light.update(1, 0, 1, 0);
  const lightVel = light.verticalVelocity;
  assert.ok(Math.abs(lightVel) > Math.abs(heavyVel));
});
