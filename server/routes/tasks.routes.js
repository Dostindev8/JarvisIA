const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const { requireAuth } = require('../middleware/auth');
const { createTaskSchema, updateTaskSchema, parseOrThrow } = require('../validators/task.validators');

const router = express.Router();

function assertDb(res) {
  if (mongoose.connection.readyState === 1) return true;
  res.status(503).json({
    success: false,
    message: 'Base de datos no disponible. Usa tareas locales en el cliente (modo offline).'
  });
  return false;
}

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    if (!assertDb(res)) return;
    const filter = { userId: req.user._id };
    const { status, scope } = req.query;
    if (status) filter.status = status;
    if (scope === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      filter.dueDate = { $gte: start, $lte: end };
    }
    if (scope === 'pending') filter.status = { $in: ['pendiente', 'en_progreso'] };
    const tasks = await Task.find(filter).sort({ priority: -1, dueDate: 1, createdAt: -1 }).limit(200);
    res.json({ success: true, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    if (!assertDb(res)) return;
    const userId = req.user._id;
    const [pendiente, en_progreso, completada, urgentes] = await Promise.all([
      Task.countDocuments({ userId, status: 'pendiente' }),
      Task.countDocuments({ userId, status: 'en_progreso' }),
      Task.countDocuments({ userId, status: 'completada' }),
      Task.countDocuments({ userId, status: { $ne: 'completada' }, priority: 'urgente' })
    ]);
    res.json({
      success: true,
      data: { pendiente, en_progreso, completada, urgentes, total: pendiente + en_progreso + completada }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    if (!assertDb(res)) return;
    const body = parseOrThrow(createTaskSchema, req.body);
    const task = await Task.create({
      userId: req.user._id,
      title: body.title,
      priority: body.priority || 'media',
      status: body.status || 'pendiente',
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      tags: body.tags || [],
      notes: body.notes
    });
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    const code = err.name === 'ValidationError' || err.code === 'ZOD' ? 400 : 500;
    res.status(code).json({ success: false, message: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    if (!assertDb(res)) return;
    const body = parseOrThrow(updateTaskSchema, req.body);
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.notes !== undefined && { notes: body.notes })
      },
      { new: true }
    );
    if (!task) return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
    res.json({ success: true, data: task });
  } catch (err) {
    const code = err.name === 'ValidationError' || err.code === 'ZOD' ? 400 : 500;
    res.status(code).json({ success: false, message: err.message });
  }
});

router.post('/:id/complete', async (req, res) => {
  try {
    if (!assertDb(res)) return;
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: 'completada' },
      { new: true }
    );
    if (!task) return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!assertDb(res)) return;
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!task) return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
    res.json({ success: true, message: 'Tarea eliminada' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
