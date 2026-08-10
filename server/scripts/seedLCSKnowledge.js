const mongoose = require('mongoose');
const JarvisMemory = require('../models/JarvisMemory');

const LCS_SEED_MEMORIES = [
  {
    type: 'fact',
    importance: 5,
    content:
      'Logic Code Spot Software Solutions — Santo Domingo, RD. Eslogan: Creamos agentes que hacen tareas por ti. Contacto: +1 849-473-7963'
  },
  {
    type: 'fact',
    importance: 5,
    content:
      'Servicios LCS: automatización 24/7, asistente virtual IA, agentes que aprenden, documentos, inversiones, reducción costos hasta 70%'
  },
  {
    type: 'preference',
    importance: 5,
    content:
      'CEO Dostin Santana prefiere respuestas directas, ejecutables, en español dominicano profesional, con mentalidad DostinX8 Supreme'
  },
  {
    type: 'fact',
    importance: 4,
    content:
      'Verticales LCS: bienes raíces, abogados, clínicas, restaurantes, tiendas online, e-commerce WhatsApp RD'
  },
  {
    type: 'pattern',
    importance: 4,
    content:
      'Protocolo DostinX8: primeros principios, zero trust, OWASP, construir no sugerir, escala 100x, seguridad como cimiento'
  }
];

async function seedLCSKnowledge() {
  if (mongoose.connection.readyState !== 1) return;

  const count = await JarvisMemory.countDocuments({ context: 'lcs-seed' });
  if (count > 0) return;

  await JarvisMemory.insertMany(
    LCS_SEED_MEMORIES.map((m) => ({
      ...m,
      context: 'lcs-seed',
      lastUsedAt: new Date()
    }))
  );

  console.log('[Seed] Memorias LCS/DostinX8 insertadas');
}

module.exports = { seedLCSKnowledge };
