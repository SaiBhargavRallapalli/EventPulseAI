# EventPulse AI

> **AI-powered fan experience for large-scale sporting venues** — Real-time crowd density, queue wait times, smart gate routing, and an AI assistant — all in one app.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)
[![Google Gemini](https://img.shields.io/badge/Google-Gemini_API-blue)](https://ai.google.dev)
[![Cloud Run](https://img.shields.io/badge/Google-Cloud_Run-blue)](https://cloud.google.com/run)
[![PromptWars](https://img.shields.io/badge/PromptWars-Virtual_2026-orange)](https://promptwars.in)

**Live Demo:** https://eventpulse-ai-901504497544.asia-south1.run.app

---

## Chosen Vertical

**Physical Event Experience** — EventPulse AI solves real pain points for attendees at large-scale sporting venues (28,000+ capacity stadiums). Fans face crowd congestion at entry gates, long waits at food courts, and poor real-time information. This app addresses all of that with an AI-powered interface backed by live crowd density and queue data.

---

## What It Does

EventPulse AI is a smart stadium companion web app demonstrated for **IPL 2026 — RCB vs MI at M. Chinnaswamy Stadium, Bengaluru**. It helps fans:

- **Live Zone Status** — Crowd density per stadium zone updates every 30 seconds with color-coded indicators (green/amber/red) and progress bars
- **Queue Wait Times** — Wait estimates for all 10 queue points auto-refresh every 30 seconds: food courts, entry gates, restrooms, and merchandise
- **AI Chat Assistant** — Ask natural questions like *"Which gate has the shortest queue?"* or *"When is the best time to grab food?"* — powered by Google Gemini
- **Smart Routing** — AI proactively warns about high-density zones and recommends alternatives
- **Match Schedule** — Full match day timeline from gates-open to post-match phased exit
- **Venue Map** — Google Maps embed with zone guide showing live density colours
- **Live Announcements** — Real-time crowd advisories, gate alerts, and parking updates

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
│  • /api/health       /api/event                      │
│  • /api/schedule     /api/announcements              │
│  • /api/crowd        /api/queues      /api/chat      │
└──────────┬──────────────────────┬───────────────────┘
           │                      │
┌──────────▼──────────┐  ┌───────▼──────────────────┐
│   Google Gemini API  │  │    Live Stadium Data      │
│   (gemini-flash)     │  │  zones, queues, schedule, │
│   AI chat + routing  │  │  crowd density, alerts    │
└─────────────────────┘  └──────────────────────────┘
```

**Key design decisions:**
- **API key stays server-side** — Gemini API key is never exposed to the browser
- **Single-file frontend** — no build step, fast load, easy to audit
- **Demo mode** — app works without an API key for evaluation purposes
- **Simulated live crowd data** — server fluctuates occupancy (±3%) and queue wait times (±2 min) every 30 seconds; frontend auto-refreshes without a page reload — designed to be swapped for real IoT/sensor feeds in production
- **AI prompt includes live context** — crowd density and queue wait times are injected into every Gemini request so the AI gives accurate, real-time answers

---

## Google Services Used

| Service | How It's Used |
|---|---|
| **Google Gemini (gemini-flash)** | Powers the AI chat assistant with full stadium context including live crowd density and queue wait times |
| **Google Maps Embed** | Interactive venue map showing M. Chinnaswamy Stadium with zone navigation |
| **Google Calendar** | Deep-link URLs to add any match day event to attendee's calendar |
| **Google Cloud Run** | Hosts the containerised Node.js app — serverless, auto-scaling |

---

## Project Structure

```
EventPulseAI/
├── server.js           # Express backend, API routes, Gemini proxy, crowd/queue data
├── server.test.js      # Jest + Supertest test suite (29 tests)
├── public/
│   └── index.html      # Single-page frontend (Vanilla JS + CSS)
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

```bash
gcloud run deploy eventpulse-ai \
  --source . \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=YOUR_KEY_HERE
```

---

## Running Tests

```bash
npm test
```

The test suite covers 29 tests across all endpoints:
- Health check endpoint
- Event metadata API (zones, speakers)
- Schedule filtering (by day, track, case-insensitive)
- Crowd density API — zone classification logic (low/moderate/high)
- Queue wait times API — all types (food, entry, restroom, merchandise)
- Announcements API — field validation
- Chat input validation (missing, empty, too long, wrong type, bad history)
- Demo mode (works without API key)
- Security headers (X-Content-Type-Options, X-Frame-Options)
- SPA fallback for unknown routes

---

## Assumptions Made

1. **Simulated live data** — Crowd density and queue wait times are seeded from realistic mock values and fluctuate every 30 seconds on the server to simulate real-time sensor feeds. In production, these would come from IoT sensors, turnstile counters, or stadium management systems.
2. **IST timezone** — All match times are in Indian Standard Time (UTC+5:30). Calendar links are converted to UTC.
3. **Single branch** — All development is on `main` as required by hackathon rules.
4. **No authentication** — The app is public (no login required), appropriate for a stadium fan companion app.
5. **Maps without Places API key** — The Google Maps embed uses the standard shareable iframe which works without an API key.
6. **Single match day** — The schedule covers one match day (May 10, 2026). The architecture supports multi-day events trivially.

---

## Accessibility

- Semantic HTML throughout (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`)
- All interactive elements have `aria-label` attributes
- Live regions (`aria-live`) for dynamic crowd status and announcements
- Keyboard navigation supported throughout
- Color contrast meets WCAG 2.1 AA standards
- Screen reader-friendly (sr-only labels for icon-only buttons)

---

## Built With

- **Google Antigravity** — AI-assisted development environment
- Node.js + Express — Backend server
- Vanilla JS/CSS/HTML — No-framework frontend
- Google Gemini (gemini-flash) — AI intelligence
- Google Cloud Run — Serverless deployment
- Jest + Supertest — Testing

---

*Built for PromptWars Virtual 2026 — Physical Event Experience track.*
