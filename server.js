const express = require('express');
const crypto = require('crypto');
const { Lander, LANDER_CONFIG } = require('./src/lander');

const SECRET = process.env.LANDER_SECRET || 'supersecret';

const app = express();
app.use(express.json());

const GAME_PARAMS = {
  mass: 1000,
  gravity: 1.62
};

function signParams(params) {
  return crypto
    .createHmac('sha256', SECRET)
    .update(JSON.stringify(params))
    .digest('hex');
}

app.get('/config', (req, res) => {
  const token = signParams(GAME_PARAMS);
  res.json({ params: GAME_PARAMS, token });
});

app.post('/validate', (req, res) => {
  const { result, token } = req.body || {};
  const expected = signParams(GAME_PARAMS);
  if (token !== expected) {
    return res.status(400).json({ ok: false, reason: 'invalid token' });
  }
  if (!result || typeof result.altitude !== 'number' || typeof result.verticalVelocity !== 'number') {
    return res.status(400).json({ ok: false, reason: 'malformed result' });
  }
  if (result.altitude < 0 || result.altitude > LANDER_CONFIG.maxAltitude || !isFinite(result.altitude)) {
    return res.status(400).json({ ok: false, reason: 'invalid altitude' });
  }
  if (!isFinite(result.verticalVelocity) || Math.abs(result.verticalVelocity) > 50) {
    return res.status(400).json({ ok: false, reason: 'invalid velocity' });
  }
  return res.json({ ok: true });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Lander server listening on ${port}`);
});
