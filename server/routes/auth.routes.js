const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth, blacklistToken, logAuthEvent } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
}

router.post('/register', async (req, res) => {
  try {
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
