# SupportVision

A self-hosted video customer-support platform. All audio/video runs through **our own server** (mediasoup WebRTC SFU) — no Twilio/Agora/Daily.

---

## What happens (operations)

- **Admin** logs in → manages the support team (add / edit / remove agents) → creates a support session and **assigns it to an agent** → shares the customer invite link.
- **Agent** logs in → sees only the sessions assigned to them → joins and runs the video call.
- **Customer** opens the invite link (no login) → joins the call from the browser.
- On the call: **live video + audio, chat, file sharing, and recording**.
- When the agent clicks **End call** → the customer gets a **feedback form**; the call can only be confirmed-ended after they submit it.
- That feedback becomes the agent's **KPI** — agents see their own, the admin sees everyone's.

---

## Core features

1. **Self-hosted WebRTC calling (mediasoup SFU)** — real-time video/audio routed through your own server, with mute, camera on/off, and front/rear camera flip.
2. **Role-based workflow** — Admin assigns sessions to agents; customers join by invite. Plus in-call **chat + file sharing**, persisted to the session record.
3. **Feedback-gated end + Agent KPIs** — ending a call requires customer feedback (handling, courteousness, promptness), which rolls up into per-agent performance scores.

*(Also included: pre-join camera/mic lobby, call recording, 60s reconnect grace, admin dashboard, mobile support.)*

---

## Run it on your local machine

### 1. Environment files

**`/.env`** (repo root — used by both apps):
```env
# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=any-long-random-string

# Database + storage
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/supportvision
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

# Media server link
NEXT_PUBLIC_MEDIA_SERVER_URL=http://localhost:3001
MEDIA_SERVER_INTERNAL_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:3000

# Media server (mediasoup)
PORT=3001
MEDIASOUP_WORKERS=1
RTC_PORT=10000
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=127.0.0.1
```

**`/apps/web/.env.local`** (browser-exposed vars):
```env
NEXT_PUBLIC_MEDIA_SERVER_URL=http://localhost:3001
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
```

### 2. Install + seed demo accounts
```bash
npm install
cd apps/web && npx tsx scripts/seed.ts && cd ../..
```

### 3. Start both servers (two terminals)
```bash
# Terminal 1 — media server
cd apps/media-server && npm run dev      # http://localhost:3001

# Terminal 2 — web app
cd apps/web && npm run dev               # http://localhost:3000
```

### 4. Log in
| Role | Email | Password |
|---|---|---|
| Admin | `admin@atomberg.com` | `password123` |
| Agent | `priya@atomberg.com` | `password123` |
| Customer | — | opens the admin's invite link |

Two windows on one PC: log in as the agent in your normal browser, and open the invite link in an **incognito window** as the customer.

---

## Run it over LAN (test with your phone as the customer)

So another device on the same Wi-Fi can join:

### 1. Find your PC's LAN IP
```bash
ipconfig        # IPv4 Address, e.g. 192.168.1.17
```

### 2. Swap `localhost` → your IP in **both** env files
In **`/.env`**:
```env
NEXTAUTH_URL=http://192.168.1.17:3000
NEXT_PUBLIC_MEDIA_SERVER_URL=http://192.168.1.17:3001
MEDIA_SERVER_INTERNAL_URL=http://192.168.1.17:3001
CORS_ORIGINS=http://192.168.1.17:3000,http://localhost:3000
MEDIASOUP_ANNOUNCED_IP=192.168.1.17
```
In **`/apps/web/.env.local`**:
```env
NEXT_PUBLIC_MEDIA_SERVER_URL=http://192.168.1.17:3001
```
Then **restart both servers** (env loads on boot).

### 3. Allow the camera on the phone (required)
Browsers block the camera on plain `http://<IP>`. On the phone's Chrome:
`chrome://flags/#unsafely-treat-insecure-origin-as-secure` → add `http://192.168.1.17:3000` → **Enabled** → **Relaunch**.
(Do the same on the laptop, since you'll also use the IP URL.)

### 4. Open the firewall
Allow **Node.js** through Windows Firewall on **Private** networks (ports 3000, 3001, and UDP 10000).

### 5. Go
- Laptop → `http://192.168.1.17:3000` (admin creates + assigns, agent joins)
- Phone → open the invite link → join as customer

**Quick check:** open `http://192.168.1.17:3001/health` on the phone — if it returns `{"status":"ok"}`, the phone can reach the server.
