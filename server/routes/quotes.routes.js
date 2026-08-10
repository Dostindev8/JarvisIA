const express = require('express');
const Quote = require('../models/Quote');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const quotes = await Quote.find().populate('clientId', 'nombre empresa').sort({ createdAt: -1 });
    res.json({ success: true, data: quotes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
