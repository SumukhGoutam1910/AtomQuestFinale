# SupportVision — Demo & Recording Guide

A clean, repeatable way to demo a full end-to-end call on **one laptop** and screen-record it for submission.

---

## 0. Prep (once)

1. Both servers running:
   ```bash
   npm run dev        # web :3000 + media-server :3001
   ```
   Wait for the media server to log `Media server running on port 3001` and `MongoDB connected`.
2. Seed an agent if you haven't:
   ```bash
   cd apps/web && npx tsx scripts/seed.ts
   ```
3. Use **headphones** (avoids audio echo between the two windows).

---

## 1. Agent side (your real camera)

1. Open **http://localhost:3000** in your normal browser.
2. Log in as the admin: `admin@atomberg.com` / `password123`.
3. Click **New session** → give it a name + customer name/phone → **Create**.
4. Click **Join call** → in the lobby, allow **camera + mic** → **Start session**.
5. You're on the stage (it shows "waiting for others"). **Copy the invite link** (from the dashboard banner or the session).

---

## 2. Customer side (synthetic camera, same machine)

Open a **second Chrome** with a fake camera so it doesn't fight your real webcam:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --use-fake-device-for-media-stream `
  --use-fake-ui-for-media-stream `
  --user-data-dir="C:\temp\sv-customer" `
  "PASTE_THE_FULL_INVITE_URL_HERE"
```

- Enter a name on the join page → lobby (synthetic video) → **Join now**.
- Within ~1–2s both windows connect: the agent sees the customer's test-pattern feed, the customer sees your real camera. ✅

> On a real phone instead, skip the flag and use the phone's real camera — but that needs HTTPS + LAN config (see README "Known Limitations").

---

## 3. Demo script (hits every scored feature)

Record your screen (Win+G / OBS) and walk through:

1. **End-to-end call** — both video tiles live, audio flowing.
2. **Controls** — mute/unmute, stop/start video (video resumes cleanly), camera flip (on mobile).
3. **Chat** — send text both ways; messages appear instantly and persist.
4. **File sharing** — drop an image and a PDF in chat; both parties see it.
5. **Recording** (agent) — click Record → wait a few seconds → Stop → "Recording ready" → open the download link (shows both participants composited).
6. **Reconnect** — refresh the customer window; it rejoins within the 60s grace window without ending the call.
7. **Admin dashboard** — open `/admin` in the agent browser: live session, participants, metrics; force-end works.
8. **End call** (agent) — both windows close cleanly; the session moves to history.
9. **Session record** — open the ended session's detail page: participants, duration, chat transcript, shared files, recording download.

---

## 4. What success looks like in logs

Media-server terminal during a healthy two-party call:
```
... (AGENT) joined session ...
Producer ... (video) created for peer ...   # agent
Producer ... (audio) created for peer ...
... (CUSTOMER) joined session ...
Producer ... (video) created for peer ...   # customer
Producer ... (audio) created for peer ...
```
No `ms:consume error` / `Cannot consume` lines.

---

## 5. Troubleshooting

| Symptom | Fix |
|---|---|
| Stuck on "Joining…" | Media server not running on :3001, or `NEXT_PUBLIC_MEDIA_SERVER_URL` wrong |
| Agent stays "waiting" after customer joins | Consume failure — check both browser consoles + media-server logs |
| File "shared" but not visible | Stale dev build (OneDrive) — restart `apps/web`, hard-refresh (Ctrl+Shift+R) |
| Camera blank after toggle | Same as above — ensure latest build is running |
| Recording fails | Confirm Cloudinary creds in root `.env` are real (not placeholders) |
