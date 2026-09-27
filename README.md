# JARVIS — Asistente IA · Logic Code Spot

Asistente virtual de IA con voz bidireccional, reproductor de música, memoria de largo plazo, tool calling sobre CRM y HUD cinematográfico.

**Stack:** React 18 + Vite + Tailwind · Node.js + Express + Socket.io · MongoDB Atlas · Redis Upstash · Claude API · ElevenLabs

---

## Instalación local

```bash
# Clonar e instalar
npm run install-all

# Configurar variables
cp .env.example server/.env
cp .env.example client/.env

# Editar server/.env con MONGODB_URI, JWT_SECRET, ANTHROPIC_API_KEY, etc.

# Desarrollo (API :5000 + Vite :5173)
npm run dev
```

Accede a `http://localhost:5173/login` → registra usuario → `/jarvis`

---

## Variables de entorno

Ver `.env.example` para la lista completa.

| Variable | Dónde | Descripción |
|---|---|---|
| `MONGODB_URI` | Backend | MongoDB Atlas |
| `JWT_SECRET` | Backend | Secreto JWT (mín. 32 chars) |
| `ANTHROPIC_API_KEY` | Backend | Claude API |
| `ELEVENLABS_API_KEY` | Backend | TTS premium |
| `ELEVENLABS_VOICE_ID` | Backend | ID de voz ElevenLabs |
| `REDIS_URL` | Backend | Rate limiting (opcional) |
| `VITE_API_URL` | Frontend | URL del backend |
| `VITE_SOCKET_URL` | Frontend | URL Socket.io |

---

## Deploy

### Backend — Railway / Render

1. Conectar repo, root: `server/`
2. Start command: `node index.js`
3. Variables de `.env.example` (backend)
4. Exponer puerto `5000`

### Frontend — Vercel

1. Root directory: `client/`
2. Build: `npm run build`
3. Output: `dist`
4. Variables: `VITE_API_URL`, `VITE_SOCKET_URL`
5. Actualizar `client/vercel.json` con la URL real de Railway

---

## Comandos de voz / texto

Jarvis entiende instrucciones naturales en español dominicano:

| Comando ejemplo | Acción |
|---|---|
| "¿Cuántos clientes activos tengo?" | Tool `get_kpis` / `get_clients` |
| "Muéstrame los pagos de enero 2026" | Tool `get_payments` |
| "Crea una cotización para..." | Tool `create_quote` |
| "Envía WhatsApp a..." | Tool `send_whatsapp` |
| "Pon música" / "Busca [canción]" | Tools `music_search`, `music_play` |
| "Pausa la música" | Tool `music_pause` |
| "Jarvis, recuerda que..." | Tool `jarvis_remember` |
| "¿Qué recuerdas sobre...?" | Tool `jarvis_recall` |

---

## Portada holográfica (`/`)

| Ruta | Acceso | Contenido |
|---|---|---|
| `/` | Pública | Portada con el agente holográfico JarvisIA |
| `/login` | Pública | Acceso |
| `/operations` | Privada | AI Operations Center (antes vivía en `/`) |
| `/jarvis` | Privada | Chat de voz completo |

- Lo que el agente puede decir vive solo en `client/src/lib/agent-script.json` (intro, FAQ y `fallback`). Fuera del guion responde el `fallback`; nunca inventa precios, clientes ni cifras.
- Máquina de estados `idle → listening → thinking → speaking → idle` y `error` desde cualquier estado, con watchdogs: escucha 12 s, respuesta 8 s y voz según la duración estimada. Está en `client/src/lib/voiceAgentMachine.js`.
- El micrófono solo se activa al pulsar "Hablar con Jarvis". Las contraseñas dichas en voz alta se rechazan. Hay entrada de texto como alternativa para navegadores sin reconocimiento de voz.
- Mientras escucha, la onda usa la amplitud real del micrófono (`AnalyserNode`). Mientras habla, sigue los eventos de palabra de `speechSynthesis`, porque la voz nativa no expone su audio a Web Audio.
- Respeta `prefers-reduced-motion` en vivo: sin partículas ni rotaciones, solo fundidos de opacidad.

Flags de desarrollo (solo `npm run dev`): `?fps` muestra el contador de fotogramas, `?simulate=network` simula un fallo de red y `?simulate=timeout` una respuesta que nunca llega.

```bash
cd client
npm run lint   # ESLint + reglas React Compiler en el código nuevo
npm test       # máquina de estados + guion (node:test)
npm run build
```

---

## Estructura del proyecto

```
JarvisIA/
├── client/          # React + Vite → Vercel
│   └── src/
│       ├── pages/JarvisAI.jsx
│       ├── components/jarvis/
│       ├── hooks/
│       └── store/
├── server/          # Express + Socket.io → Railway
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── tools/jarvisTools.js
│   └── sockets/
└── .env.example
```

---

## Música local

Coloca archivos `.mp3`, `.ogg`, `.wav` o `.flac` en:

```
server/public/audio/
```

Jarvis los indexará vía `GET /api/music/library`.

---

Logic Code Spot · Dostin Santana · Santo Domingo, RD · 2026
