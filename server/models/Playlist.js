const mongoose = require('mongoose');

const TrackSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String },
  filename: { type: String, required: true },
  duration: { type: Number },
  coverUrl: { type: String }
});

const PlaylistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  tracks: [TrackSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

PlaylistSchema.index({ userId: 1 });

module.exports = mongoose.model('Playlist', PlaylistSchema);
