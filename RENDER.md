# Deploy — JARVISIA (Render + Vercel)

## Vercel (frontend)

Proyecto: [jarvis-ia](https://vercel.com/dostindevs-projects/jarvis-ia)

| Campo | Valor recomendado |
|---|---|
| **Root Directory** | `client` *(o vacío si usas el `vercel.json` de la raíz)* |
| **Framework** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

Env (opcional en Vercel — ya hay `client/.env.production`):
```
VITE_API_URL=
VITE_SOCKET_URL=https://jarvisia.onrender.com
```

## Render (backend API)

Servicio: `https://jarvisia.onrender.com` (`srv-d9sis4ugekts738q6hm0`)

## Settings correctos (Dashboard → Settings)

| Campo | Valor |
|---|---|
| **Root Directory** | `server` |
| **Build Command** | `npm install --omit=dev` |
| **Start Command** | `node index.js` |
| **Health Check Path** | `/api/health` |

> Exit 127 = Render intentó `vite` / build del client desde la raíz. Con Root Directory = `server` se soluciona.

## Environment (mínimo)

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...min-32-chars...
CLIENT_URL=https://tu-app.vercel.app
SEED_DEMO_USER=true
DEMO_USER_EMAIL=admin@jarvisia.do
DEMO_USER_PASSWORD=JarvisIA2026!
```

Opcionales: `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, WhatsApp vars.

## Redeploy

1. Guarda Settings
2. **Manual Deploy → Deploy latest commit**
3. Espera ~2–3 min (cold start free tier)
4. Prueba: `https://jarvisia.onrender.com/api/health`
