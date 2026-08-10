const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth, blacklistToken, logAuthEvent } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
}

function assertDbReady(res) {
  if (mongoose.connection.readyState === 1) return true;
  res.status(503).json({
    success: false,
    message:
      'Base de datos no conectada. En Render: Manual Deploy → Clear build cache & deploy. Si Atlas está muerto, el API usa Mongo en memoria automáticamente tras redeploy.'
  });
  return false;
}

/** Login de emergencia sin Mongo (demo) — solo si DB cae tras arranque. */
function tryEmergencyDemoLogin(email, password) {
  if (process.env.ALLOW_EMERGENCY_DEMO_LOGIN === 'false') return null;
  const demoEmail = (process.env.DEMO_USER_EMAIL || 'admin@jarvisia.do').toLowerCase();
  const demoPassword = process.env.DEMO_USER_PASSWORD || 'JarvisIA2026!';
  if ((email || '').toLowerCase() !== demoEmail || password !== demoPassword) return null;
  return {
    _id: '000000000000000000000001',
    name: 'Dostin Santana',
    email: demoEmail,
    role: 'admin'
  };
}

router.post('/register', async (req, res) => {
  try {
    if (!assertDbReady(res)) return;
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Datos incompletos' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Email ya registrado' });
    }

    const user = await User.create({ name, email, password });
    const token = signToken(user);

    res.status(201).json({
      success: true,
      data: { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (mongoose.connection.readyState !== 1) {
      const demo = tryEmergencyDemoLogin(email, password);
      if (!demo) {
        return assertDbReady(res);
      }
      const token = signToken(demo);
      return res.json({
        success: true,
        data: {
          token,
          user: { id: demo._id, name: demo.name, email: demo.email, role: demo.role },
          mode: 'emergency_demo'
        }
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const token = signToken(user);
    logAuthEvent('LOGIN_SUCCESS', user._id, req);
    res.json({
      success: true,
      data: { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/logout', requireAuth, async (req, res) => {
  try {
    if (req.token && req.tokenExp) await blacklistToken(req.token, req.tokenExp);
    logAuthEvent('LOGOUT', req.user._id, req);
    res.json({ success: true, message: 'Sesión cerrada' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, data: req.user });
});

module.exports = router;
