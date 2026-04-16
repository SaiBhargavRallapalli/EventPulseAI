# EventPulse AI 🎯

> **Smart AI-powered companion for physical events** — Navigate sessions, chat with an AI assistant, and plan your schedule, all in one app.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)
[![Google Gemini](https://img.shields.io/badge/Google-Gemini_API-blue)](https://ai.google.dev)
[![Cloud Run](https://img.shields.io/badge/Google-Cloud_Run-blue)](https://cloud.google.com/run)
[![PromptWars](https://img.shields.io/badge/PromptWars-Virtual_2026-orange)](https://promptwars.in)

---

## Chosen Vertical

**Physical Event Experience** — EventPulse AI tackles a real pain point: attendees at large conferences often miss sessions they'd love, don't know where halls are, and can't quickly get answers about the event. This app solves all of that with an AI-powered interface.

---

## What It Does

EventPulse AI is a smart event companion web app for **TechSurge 2026** (a developer conference). It lets attendees:

- 🤖 **Chat with an AI** — ask natural questions like *"Which AI talks are on Day 1?"* or *"Where is Hall A?"*
- 📅 **Browse & filter the schedule** — by day, track, or both
- 📆 **Add sessions to Google Calendar** — one-click calendar integration
- 📍 **Find their way** — Google Maps embed with hall guide
- 📢 **See live updates** — announcements feed for the day

---

## Architecture & Approach

```
┌─────────────────────────────────────────────────────┐
│                     Browser (SPA)                    │
│  index.html — Vanilla JS, single-file, accessible    │
└────────────────────┬────────────────────────────────┘
                     │ HTTP (REST)
┌────────────────────▼────────────────────────────────┐
│              Express.js Backend (Node 18)            │
│  • helmet (security headers)                         │
│  • express-rate-limit (abuse prevention)             │
│  • /api/health  /api/event  /api/schedule            │
│  • /api/chat  /api/announcements                     │
└──────────┬──────────────────────┬───────────────────┘
           │                      │
┌──────────▼──────────┐  ┌───────▼──────────────────┐
│   Google Gemini API  │  │     Static Event Data     │
│   (Gemini 1.5 Flash) │  │   (schedule, speakers,    │
│   AI chat assistant  │  │    halls, announcements)  │
└─────────────────────┘  └──────────────────────────┘
```

**Key design decisions:**
- **API key stays server-side** — Gemini API key is never exposed to the browser
- **Single-file frontend** — no build step, fast load, easy to audit
- **Demo mode** — app works without an API key for evaluation purposes
- **Event data is structured JSON** — easy to swap for a real event/database

---

## Google Services Used

| Service | How It's Used |
|---|---|
| **Gemini 1.5 Flash** | Powers the AI chat assistant with full event context |
| **Google Maps Embed** | Interactive venue map showing NIMHANS Convention Centre |
| **Google Calendar** | Deep-link URLs to add any session to attendee's calendar |
| **Google Cloud Run** | Hosts the containerized Node.js app (deployment target) |

---

## Project Structure

```
EventPulseAI/
├── server.js           # Express backend, API routes, Gemini proxy
├── public/
│   └── index.html      # Single-page frontend (Vanilla JS + CSS)
├── tests/
│   └── server.test.js  # Jest + Supertest test suite (20 tests)
├── Dockerfile          # Cloud Run deployment
├── package.json
├── .env.example        # Environment variable template
└── .gitignore
```

---

## How to Run Locally

### Prerequisites
- Node.js 18+
- A Google Gemini API key ([get one free](https://aistudio.google.com/app/apikey))

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/SaiBhargavRallapalli/EventPulseAI.git
cd EventPulseAI

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# 4. Start the server
npm start
# → http://localhost:8080

# 5. Run tests
npm test
```

---

## Deploy to Google Cloud Run

### Step 1 — Enable APIs
```bash
gcloud config set project promptwars-493418
gcloud services enable run.googleapis.com artifactregistry.googleapis.com
```

### Step 2 — Get Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **Create API Key** → select project `promptwars-493418`
3. Copy the key

### Step 3 — Deploy
```bash
gcloud run deploy eventpulse-ai \
  --source . \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=YOUR_KEY_HERE
```

### Step 4 — Get your URL
```bash
gcloud run services describe eventpulse-ai \
  --region asia-south1 \
  --format 'value(status.url)'
```
Your Cloud Run URL (e.g. `https://eventpulse-ai-xxxx-el.a.run.app`) is your submission's **Deployed Link**.

---

## Running Tests

```bash
npm test
```

The test suite covers:
- ✅ Health check endpoint
- ✅ Event metadata API
- ✅ Schedule filtering (by day, track, combined)
- ✅ Field validation on all session objects
- ✅ Announcements API
- ✅ Chat input validation (missing, empty, too long, wrong type)
- ✅ Demo mode (works without API key)
- ✅ Security headers (CSP, X-Content-Type-Options, X-Frame-Options)
- ✅ SPA fallback for unknown routes

---

## Assumptions Made

1. **Demo event data** — TechSurge 2026 is a representative mock event. In production, the schedule would come from a database or CMS.
2. **IST timezone** — All event times are in Indian Standard Time (UTC+5:30). Calendar links are converted to UTC.
3. **Single branch** — All development is on `main` as required by hackathon rules.
4. **No authentication** — The app is public (no login required), appropriate for a conference companion app.
5. **Maps without Places API key** — The Google Maps embed uses the standard shareable iframe which works without an API key.

---

## Accessibility

- Semantic HTML throughout (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`)
- All interactive elements have `aria-label` attributes
- Live regions (`aria-live`) for dynamic content updates
- Keyboard navigation supported throughout
- Color contrast meets WCAG 2.1 AA standards
- Screen reader-friendly (sr-only labels for icon-only buttons)

---

## Built With

- **Google Antigravity** — AI-assisted development
- Node.js + Express — Backend server
- Vanilla JS/CSS/HTML — No-framework frontend
- Google Gemini 1.5 Flash — AI intelligence
- Google Cloud Run — Serverless deployment
- Jest + Supertest — Testing

---

*Built for PromptWars Virtual 2026 — Physical Event Experience track.*
