# Deploy — JARVISIA (Render + Vercel)

## URLs canónicas

| Capa | URL |
|---|---|
| **Frontend** | https://jarvis-ia-pi.vercel.app |
| **API** | https://jarvisia.onrender.com |
| Health | https://jarvisia.onrender.com/api/health → debe mostrar `"connected": true` |

> `jarvis-ia.vercel.app` **no es este proyecto**. Usa `jarvis-ia-pi.vercel.app`.

---

## ⚠️ Render — Settings obligatorios (Dashboard)

El servicio actual vive en monorepo. Si Root/`build` están mal, `mongodb-memory-server` no se instala y Mongo queda desconectado.

| Campo | Valor |
|---|---|
| **Root Directory** | *(vacío / `.`)* |
| **Build Command** | `npm run build:render` |
| **Start Command** | `npm run start:render` |
| **Health Check Path** | `/api/health` |

Luego: **Manual Deploy → Clear build cache & deploy**.

### Env

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://...   # clúster Atlas VIVO (el actual cluster0.aqlmmbn ya no resuelve DNS)
JWT_SECRET=...min-32-chars...
CLIENT_URL=https://jarvis-ia-pi.vercel.app
SEED_DEMO_USER=true
ALLOW_INMEMORY_DB=true
```

Login demo: `admin@jarvisia.do` / `JarvisIA2026!`  
(Si Mongo aún no conecta, hay **login de emergencia** para entrar al HUD.)

---

## Vercel

Proyecto: [jarvis-ia](https://vercel.com/dostindevs-projects/jarvis-ia) — `vercel.json` en la raíz construye `client/`.

```
VITE_API_URL=
VITE_SOCKET_URL=https://jarvisia.onrender.com
```
