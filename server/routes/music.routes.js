const express = require('express');
const path = require('path');
const Playlist = require('../models/Playlist');
const { requireAuth } = require('../middleware/auth');
const { listAudioFiles, ensureAudioDir } = require('../services/MusicService');

const router = express.Router();

router.get('/library', requireAuth, async (req, res) => {
  try {
    ensureAudioDir();
    const files = listAudioFiles();
    const library = files.map((filename) => ({
      filename,
      title: path.basename(filename, path.extname(filename)),
      url: `/audio/${filename}`
    }));
    res.json({ success: true, data: library });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/playlists', requireAuth, async (req, res) => {
  try {
    const playlists = await Playlist.find({ userId: req.user._id }).sort({ updatedAt: -1 });
    res.json({ success: true, data: playlists });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/playlists', requireAuth, async (req, res) => {
  try {
    const playlist = await Playlist.create({ ...req.body, userId: req.user._id });
    res.status(201).json({ success: true, data: playlist });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/playlists/:id', requireAuth, async (req, res) => {
  try {
    const playlist = await Playlist.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!playlist) return res.status(404).json({ success: false, message: 'Playlist no encontrada' });
    res.json({ success: true, data: playlist });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/playlists/:id', requireAuth, async (req, res) => {
  try {
    await Playlist.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true, message: 'Playlist eliminada' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
