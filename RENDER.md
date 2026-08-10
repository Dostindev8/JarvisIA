# Deploy — JARVISIA (Render + Vercel)

## URLs canónicas

| Capa | URL |
|---|---|
| **Frontend (Vercel)** | https://jarvis-ia-pi.vercel.app |
| **API (Render)** | https://jarvisia.onrender.com |
| Health | https://jarvisia.onrender.com/api/health |

> `jarvis-ia.vercel.app` **no es este proyecto** (otro Jarvis en portugués). Usa `jarvis-ia-pi.vercel.app` o el alias `jarvis-ia-dostindevs-projects.vercel.app`.

---

## Vercel (frontend)

Proyecto: [jarvis-ia](https://vercel.com/dostindevs-projects/jarvis-ia)

| Campo | Valor |
|---|---|
| **Root Directory** | *(vacío — usa `vercel.json` de la raíz)* **o** `client` |
| **Framework** | Vite |
| **Install** | `npm install --prefix client` (raíz) / `npm install` (si Root=`client`) |
| **Build** | `npm run build --prefix client` / `npm run build` |
| **Output** | `client/dist` / `dist` |

Env (ya en `client/.env.production`):
```
VITE_API_URL=
VITE_SOCKET_URL=https://jarvisia.onrender.com
```

---

## Render (backend API)

Servicio: `https://jarvisia.onrender.com` (`srv-d9sis4ugekts738q6hm0`)

| Campo | Valor |
|---|---|
| **Root Directory** | `server` |
| **Build Command** | `npm install --no-audit --no-fund` |
| **Start Command** | `node index.js` |
| **Health Check Path** | `/api/health` |

> Exit 127 = Render intentó `vite` desde la raíz. Con Root Directory = `server` se soluciona.

### Environment (mínimo)

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...min-32-chars...
CLIENT_URL=https://jarvis-ia-pi.vercel.app
SEED_DEMO_USER=true
ALLOW_INMEMORY_DB=true
DEMO_USER_EMAIL=admin@jarvisia.do
DEMO_USER_PASSWORD=JarvisIA2026!
```

Si Atlas no resuelve DNS (clúster pausado/eliminado), con `SEED_DEMO_USER=true` o `ALLOW_INMEMORY_DB=true` el API arranca con **Mongo en memoria** y el login demo funciona. Los datos no persisten entre reinicios — crea un clúster Atlas nuevo y actualiza `MONGODB_URI` para producción real.

Opcionales: `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, WhatsApp vars.

### Redeploy

1. Settings → Root Directory = `server`
2. Env: `CLIENT_URL=https://jarvis-ia-pi.vercel.app` + `SEED_DEMO_USER=true`
3. **Manual Deploy → Clear build cache & deploy**
4. Espera cold start (~2–3 min free tier; el primer boot descarga el binario de MongoMemory)
5. Prueba: `https://jarvisia.onrender.com/api/health` → `"connected": true`
6. Login: `admin@jarvisia.do` / `JarvisIA2026!`
