<div align="center">

# 🎥 SupportVision

### Real-Time Video Support Platform — owned and operated end-to-end

A self-hosted, video-first customer support platform. Agents create sessions, customers join from a browser with no install, and both parties get **real-time video, audio, chat, file sharing, and call recording** — with media routed entirely through our **own mediasoup SFU**, never a third-party video API.

*Built for the AtomQuest Hackathon 1.0 — Grand Finale.*

</div>

---

## ✨ Highlights

- 🔴 **Self-hosted WebRTC SFU** (mediasoup) — media routes through your own server, **no P2P, no Twilio/Agora/Daily**
- 🏢 **Multi-tier organization** — **Admin** manages a support team of **Agents**, creates & assigns sessions; agents only see/run their own
- 👥 **Team management** — admin can add / edit / disable / remove support agents, each with their own login
- ⭐ **Customer feedback → Agent KPIs** — ending a call prompts the customer for objective ratings (handling, courteousness, promptness) + a comment; the agent's **Confirm end** unlocks only after feedback is captured
- 📈 **KPI dashboards** — agents see their own performance; admin sees every agent's KPIs
- 🎬 **Google-Meet-style pre-join lobby** — preview camera/mic, pick devices, live mic meter, before connecting
- 💬 **Real-time chat** with **file & image sharing** (Cloudinary), persisted per session
- ⏺️ **Call recording** — composites both participants into one MP4/WebM, uploaded for download
- 🔄 **Reconnect handling** — 60-second grace window for seamless rejoin after a drop
- 📱 **Fully mobile responsive** + **front/rear camera flip** (perfect for a customer showing a technician a device)
- 🛡️ **Role-based access control** — Admin / Agent / Customer, enforced server-side
- 📊 **Admin operations dashboard** + **Prometheus metrics** for observability
- 🎨 Clean, corporate light UI (Tailwind + custom design system)

---

## 🏢 Roles & Organization

A real support-org hierarchy: an **Admin** runs the show, **Agents** are the support team, and **Customers** join by invite.

| Capability | Admin | Agent | Customer |
|---|:--:|:--:|:--:|
| Manage team (add/edit/disable/remove agents) | ✅ | ❌ | ❌ |
| Create & **assign** sessions to an agent | ✅ | ❌ | ❌ |
| See **all** sessions & data | ✅ | own only | ❌ |
| Share the customer invite link | ✅ | ❌ | — |
| Join & run the call | ✅ (any) | ✅ (assigned) | ✅ (via invite) |
| Mute / video / camera-flip / chat / files | ✅ | ✅ | ✅ |
| Start / stop recording | ✅ | ✅ | ❌ |
| End the call | ✅ | ✅ (after feedback) | leave only |
| View KPIs | **everyone's** | own only | — |
| Operations dashboard + force-end any session | ✅ | ❌ | ❌ |

**End-of-call feedback loop:** when the agent clicks **End call**, the customer is automatically shown a feedback form (rate handling, courteousness, promptness + an optional comment). The agent's **Confirm end** button stays disabled until that feedback is submitted and stored — feeding directly into the agent's KPIs.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), TypeScript, TailwindCSS, Zustand, React Query |
| **Auth** | NextAuth (Credentials provider, JWT sessions) |
| **Signaling / Realtime** | Socket.IO (typed events) |
| **Media (SFU)** | mediasoup + mediasoup-client (WebRTC) |
| **Recording** | Browser `MediaRecorder` (canvas composite + Web Audio mix) → Cloudinary |
| **Database** | MongoDB Atlas + Mongoose |
| **Storage** | Cloudinary (recordings, shared files) |
| **Observability** | prom-client (`/metrics`) |
| **Tooling** | Turborepo, npm workspaces, `tsx` |

---

## 🗂️ Monorepo Structure

```
AtomQuest/
├── apps/
│   ├── web/                  # Next.js 15 app — UI + API routes (deploy: Vercel)
│   │   ├── src/app/          #   pages + /api route handlers
│   │   ├── src/components/   #   UI (video, chat, session, admin, ui kit)
│   │   ├── src/hooks/        #   useSocket, useMediasoup, useCall
│   │   ├── src/store/        #   Zustand stores (call, chat)
│   │   ├── src/models/       #   Mongoose models
│   │   └── src/lib/          #   db, auth, cloudinary, recorder, utils
│   │
│   └── media-server/         # mediasoup SFU + Socket.IO (deploy: Fly.io / VPS)
│       └── src/
│           ├── mediasoup/    #   WorkerPool, Room, RoomManager
│           ├── socket/       #   typed handlers: session, chat, mediasoup, recording
│           ├── models/       #   Mongoose models (shared collections)
│           └── index.ts      #   HTTP (health, /metrics, admin) + Socket.IO bootstrap
│
└── packages/
    ├── types/                # shared TypeScript types
    ├── socket-events/        # typed Socket.IO event contracts
    └── shared/               # shared utils + constants
```

> Two deploy targets because a WebRTC SFU needs a **persistent process + raw UDP ports**, which serverless (Vercel) can't provide. See [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 🚀 Quick Start (Local)

### Prerequisites
- **Node.js ≥ 20**
- A **MongoDB Atlas** connection string (free M0 tier is fine)
- A **Cloudinary** account (free tier) for file/recording storage
- Windows users: mediasoup compiles a native worker on install — needs Python 3 + build tools (already present on most dev machines)

### 1. Install
```bash
npm install
```

### 2. Configure environment
Create a `.env` file in the **repo root** (both apps read it):

```env
# App / Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# Database (shared)
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/supportvision?retryWrites=true&w=majority

# Cloudinary (shared)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name

# Media server link
NEXT_PUBLIC_MEDIA_SERVER_URL=http://localhost:3001
MEDIA_SERVER_INTERNAL_URL=http://localhost:3001

# Media server (mediasoup)
PORT=3001
CORS_ORIGINS=http://localhost:3000
MEDIASOUP_WORKERS=2
RTC_MIN_PORT=10000
RTC_MAX_PORT=10100
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=127.0.0.1   # use your LAN IP for cross-device testing
```

### 3. Seed demo accounts (1 admin + 2 agents)
```bash
cd apps/web
npx tsx scripts/seed.ts
cd ../..
```

### 4. Run everything
```bash
npm run dev          # Turborepo runs web (:3000) + media-server (:3001)
```
Or run each separately in two terminals:
```bash
cd apps/web && npm run dev
cd apps/media-server && npm run dev
```

### 5. Open
- **Admin:** http://localhost:3000 → log in → **Team** (manage agents) → **New session** (assign to an agent) → copy invite
- **Agent:** log in (separate browser) → dashboard shows assigned sessions → **Start call**
- **Customer:** open the invite link the admin shared → join

---

## 🔑 Demo Credentials

All accounts use password **`password123`**.

| Role | Email | Can do |
|---|---|---|
| **Admin** | `admin@atomberg.com` | Manage team, create/assign sessions, see everything, KPIs |
| **Agent** | `priya@atomberg.com` | Run assigned sessions, see own KPIs |
| **Agent** | `rahul@atomberg.com` | Run assigned sessions, see own KPIs |
| **Customer** | — | Open the admin's **invite link** (`/join/<token>`) — no login required |

> To demo two parties on one machine, run the customer in a second Chrome window with a synthetic camera so it doesn't conflict with your real webcam — see [DEMO.md](./DEMO.md).

---

## 🧭 Feature → Requirement Map

| PDF Requirement | Where it lives |
|---|---|
| Create session + invite link/token | `POST /api/session/create`, `inviteToken` |
| Browser join, no install | mediasoup-client (WebRTC) |
| Track who's in a session | `Participant` model + presence events |
| End session, close connections cleanly | `session:end` handler → closes room |
| Persisted, queryable history | `Session` model, `/session/[id]`, admin |
| Real-time A/V **through server** | mediasoup SFU (`Room.ts`) |
| Mute audio / stop video | call store + producer track toggles |
| In-call chat (realtime + persisted) | `chat:send/receive`, `Message` model |
| Role enforcement | NextAuth (admin/agent) + token (customer), server checks |
| **Recording** (bonus) | client composite → `/api/recording/upload` → Cloudinary |
| **File sharing** (bonus) | `/api/upload` → Cloudinary → chat message |
| **Reconnect** (bonus) | 60s grace window in `session.ts` |
| **Admin dashboard** (bonus) | `/admin` + media-server admin endpoints |
| **Observability** (bonus) | `/metrics` (Prometheus) |
| **Team management** (extra) | `/team`, `/api/admin/agents` (admin-only CRUD) |
| **Session assignment** (extra) | admin assigns sessions to agents at creation |
| **Customer feedback + Agent KPIs** (extra) | `feedback:request/submit` socket flow, `Feedback` model, `/lib/kpi` aggregation |

### Key pages
`/login` · `/dashboard` (role-aware) · `/team` (admin) · `/admin` (operations) · `/session/[id]` · `/call/[sessionId]` · `/join/[token]`

---

## 🌐 Deployment

| Component | Target | Why |
|---|---|---|
| `apps/web` | **Vercel** | Standard Next.js |
| `apps/media-server` | **Fly.io** or a **VPS** (Oracle Cloud Always-Free, etc.) | Needs persistent process + **UDP** ports — *not* possible on Vercel/Render/Railway |

Set on the media-server host: `MEDIASOUP_ANNOUNCED_IP` = its public IP, expose UDP `10000–10100`, and `CORS_ORIGINS` = your Vercel URL. Set on Vercel: `NEXT_PUBLIC_MEDIA_SERVER_URL` = the media server's `https://` URL.

---

## ⚠️ Known Limitations

- **Recording is client-side** (agent's browser composites the call). Reliable and fully compliant, but the recording reflects the agent's view and stops if the agent's tab closes.
- **Mobile camera over LAN** requires HTTPS (browsers block `getUserMedia` on non-secure origins). Localhost is exempt, so single-machine demos work out of the box.
- **Hosting needs UDP** — serverless platforms (Vercel/Render/Railway) can host the web app but **not** the SFU.
- If developing inside a cloud-synced folder (OneDrive/Dropbox), disable sync or move the project out — it interferes with Next.js's file watcher and build cache.

---

## 📄 More Docs
- [ARCHITECTURE.md](./ARCHITECTURE.md) — system design + diagrams
- [DEMO.md](./DEMO.md) — step-by-step demo & recording guide
