'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// ── Firebase Admin + Firestore (Google Cloud) ─────────────────────────────

/** @type {FirebaseFirestore.Firestore|null} */
let db;
try {
  const admin = require('firebase-admin');
  admin.initializeApp();
  db = admin.firestore();
  console.log('Firebase Firestore: connected');
} catch (e) {
  console.log('Firebase Firestore: not configured, using in-memory data');
}

// ── Express App Setup ─────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 8080;

app.use(compression());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.googletagmanager.com', 'https://www.gstatic.com', 'https://apis.google.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      frameSrc: ['https://www.google.com', 'https://*.firebaseapp.com', 'https://accounts.google.com'],
      connectSrc: ["'self'", 'https://www.google-analytics.com', 'https://www.googleapis.com', 'https://securetoken.googleapis.com', 'https://identitytoolkit.googleapis.com', 'https://firestore.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*', methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '10kb' }));

// ── Rate Limiting ─────────────────────────────────────────────────────────

const chatLimiter = rateLimit({
  windowMs: 60000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment.' },
});

const apiLimiter = rateLimit({
  windowMs: 60000,
  max: 100,
  message: { error: 'Too many requests.' },
});

// ── In-Memory Response Cache ──────────────────────────────────────────────

/** @type {Map<string, {data: any, ts: number}>} */
const responseCache = new Map();
const CACHE_TTL = 25000; // 25 seconds — just under the 30s crowd fluctuation cycle

/**
 * Retrieves cached response data if within TTL window.
 * @param {string} key - Cache key identifier
 * @returns {any|null} Cached data or null if expired/missing
 */
function getCached(key) {
  const entry = responseCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

/**
 * Stores response data in cache with current timestamp.
 * @param {string} key - Cache key identifier
 * @param {any} data - Response payload to cache
 */
function setCache(key, data) {
  responseCache.set(key, { data, ts: Date.now() });
}

// ── Helper Functions ──────────────────────────────────────────────────────

/**
 * Classifies crowd density from occupancy percentage.
 * @param {number} occupancy - Zone occupancy percentage (0-100)
 * @returns {'high'|'moderate'|'low'} Density classification
 */
function getDensityLevel(occupancy) {
  if (occupancy >= 80) return 'high';
  if (occupancy >= 50) return 'moderate';
  return 'low';
}

/**
 * Returns a human-readable recommendation for a given density level.
 * @param {'high'|'moderate'|'low'} level - Density classification
 * @returns {string} Recommendation text for fans
 */
function getDensityRecommendation(level) {
  const recommendations = {
    high: 'Avoid — critically high crowd density',
    moderate: 'Moderate — manageable crowd',
    low: 'Recommended — low crowd density',
  };
  return recommendations[level];
}

/**
 * Classifies queue status from wait time in minutes.
 * @param {number} waitMinutes - Current queue wait time
 * @returns {'low'|'moderate'|'high'} Queue status label
 */
function getQueueStatus(waitMinutes) {
  if (waitMinutes <= 5) return 'low';
  if (waitMinutes <= 15) return 'moderate';
  return 'high';
}

// ── Event Data ────────────────────────────────────────────────────────────

const EVENT = {
  name: 'IPL 2026 — RCB vs MI',
  tagline: 'AI-Powered Fan Experience at Chinnaswamy Stadium',
  dates: 'May 10, 2026 · 19:00 IST',
  venue: 'M. Chinnaswamy Stadium, Bengaluru',
  organizer: 'Board of Control for Cricket in India (BCCI)',
  zones: [
    { id: 'gate-a', name: 'Gate A — North Stand', capacity: 8000, occupancy: 72, floor: 'Ground Level, North Entrance', facilities: 'Food Court F1, Restrooms R1, First Aid Post' },
    { id: 'gate-b', name: 'Gate B — South Stand', capacity: 8000, occupancy: 38, floor: 'Ground Level, South Entrance', facilities: 'Food Court F2, Restrooms R2, Merchandise Store' },
    { id: 'gate-c', name: 'Gate C — East Stand', capacity: 6000, occupancy: 91, floor: 'Ground Level, East Entrance', facilities: 'Food Court F3, Restrooms R3, ATM' },
    { id: 'gate-d', name: 'Gate D — West Stand (VIP)', capacity: 4000, occupancy: 55, floor: 'Ground Level, West Entrance', facilities: 'VIP Lounge, Premium Dining, Restrooms R4' },
    { id: 'parking', name: 'Parking Complex', capacity: 2500, occupancy: 87, floor: 'Basement + Open Lot', facilities: 'Vehicle Entry/Exit, Security, Overflow via MG Road' },
  ],
  queues: [
    { id: 'q1', location: 'Food Court F1 (Gate A)', type: 'food', waitMinutes: 14, status: 'moderate' },
    { id: 'q2', location: 'Food Court F2 (Gate B)', type: 'food', waitMinutes: 4, status: 'low' },
    { id: 'q3', location: 'Food Court F3 (Gate C)', type: 'food', waitMinutes: 28, status: 'high' },
    { id: 'q4', location: 'Entry Gate A Security', type: 'entry', waitMinutes: 9, status: 'moderate' },
    { id: 'q5', location: 'Entry Gate B Security', type: 'entry', waitMinutes: 3, status: 'low' },
    { id: 'q6', location: 'Entry Gate C Security', type: 'entry', waitMinutes: 22, status: 'high' },
    { id: 'q7', location: 'Entry Gate D (VIP)', type: 'entry', waitMinutes: 2, status: 'low' },
    { id: 'q8', location: 'Merchandise Store (Gate B)', type: 'merchandise', waitMinutes: 18, status: 'moderate' },
    { id: 'q9', location: 'Restrooms — North Stand', type: 'restroom', waitMinutes: 6, status: 'moderate' },
    { id: 'q10', location: 'Restrooms — East Stand', type: 'restroom', waitMinutes: 15, status: 'high' },
  ],
  speakers: [
    { name: 'Royal Challengers Bengaluru', role: 'Home Team · Captain: Faf du Plessis', avatar: 'RCB' },
    { name: 'Mumbai Indians', role: 'Away Team · Captain: Hardik Pandya', avatar: 'MI' },
    { name: 'Match Officials', role: 'Umpires: Nitin Menon & S. Ravi', avatar: 'OFF' },
    { name: 'Stadium Security', role: 'Chief: Col. Arvind Kumar · Control Room: Gate A', avatar: 'SEC' },
    { name: 'Medical Team', role: 'First Aid: Gate A & C · Ambulance on Standby', avatar: 'MED' },
    { name: 'Fan Helpdesk', role: 'Assistance Desk: Gate B, Ground Floor', avatar: 'HLP' },
  ],
  schedule: [
    { id: 's1', day: 1, date: '2026-05-10', title: 'Gates Open — Early Entry (Beat the Rush)', speaker: 'Stadium Management', hall: 'All Gates', start: '16:00', end: '17:00', track: 'Entry & Exit', description: 'Early entry for all ticket holders. Gate B recommended — lowest crowd density expected. Collect your welcome kit at Gate B merchandise desk.', calStart: '20260510T103000Z', calEnd: '20260510T113000Z' },
    { id: 's2', day: 1, date: '2026-05-10', title: 'Pre-Match Fan Zone — Live Music & Activities', speaker: 'Entertainment Team', hall: 'Gate B — South Stand', start: '17:00', end: '18:30', track: 'Fan Experience', description: 'Live DJ, fan photo zones, RCB & MI player cutout displays, and merchandise. Food courts fully open — best time to grab food before the match.', calStart: '20260510T113000Z', calEnd: '20260510T130000Z' },
    { id: 's3', day: 1, date: '2026-05-10', title: 'Team Warm-Up & Ground Activities', speaker: 'Both Teams', hall: 'Ground', start: '17:30', end: '18:45', track: 'Match', description: 'Watch both teams warm up on the ground. Camera zones open for fan photography from designated stands.', calStart: '20260510T120000Z', calEnd: '20260510T131500Z' },
    { id: 's4', day: 1, date: '2026-05-10', title: 'Opening Ceremony & Toss', speaker: 'Match Officials', hall: 'Ground', start: '18:45', end: '19:00', track: 'Match', description: 'National anthem, player presentations, and coin toss. All attendees requested to be in seats by 18:45.', calStart: '20260510T131500Z', calEnd: '20260510T133000Z' },
    { id: 's5', day: 1, date: '2026-05-10', title: 'First Innings — T20 Match Begins', speaker: 'RCB vs MI', hall: 'Ground', start: '19:00', end: '21:00', track: 'Match', description: 'First 10 overs: Food courts accessible between overs. Restroom breaks recommended between overs 6–10. Avoid Gate C — high crowd density alert active.', calStart: '20260510T133000Z', calEnd: '20260510T153000Z' },
    { id: 's6', day: 1, date: '2026-05-10', title: 'Strategic Timeout & Innings Break', speaker: 'Stadium Management', hall: 'All Zones', start: '21:00', end: '21:20', track: 'Break', description: 'Best time to visit food courts — wait times drop 60% during break. Gate B food court (F2) recommended: only 4-min wait. Avoid F3 at Gate C.', calStart: '20260510T153000Z', calEnd: '20260510T155000Z' },
    { id: 's7', day: 1, date: '2026-05-10', title: 'Second Innings — Chase Begins', speaker: 'RCB vs MI', hall: 'Ground', start: '21:20', end: '23:20', track: 'Match', description: 'Stadium exits open 10 mins before match end. Gate A and Gate B exits recommended for fastest crowd dispersal. Avoid Gate C exit — high congestion expected.', calStart: '20260510T155000Z', calEnd: '20260510T175000Z' },
    { id: 's8', day: 1, date: '2026-05-10', title: 'Post-Match Presentation & Phased Exit', speaker: 'Stadium Management', hall: 'All Gates', start: '23:20', end: '23:59', track: 'Entry & Exit', description: 'Award ceremony followed by phased exit. North Stand exits first (23:25), South Stand (23:35), East Stand (23:45). Metro running until 01:00 from Cubbon Park Station.', calStart: '20260510T175000Z', calEnd: '20260510T182900Z' },
  ],
  announcements: [
    { id: 'a1', time: '16:00', text: 'Gate B is OPEN with shortest queue — only 3 min wait. Recommended entry point for all general ticket holders.', type: 'success' },
    { id: 'a2', time: '16:30', text: 'Gate C crowd density at 91% — AVOID. AI routing attendees via Gate A or B. Gate C entry wait: 22 min.', type: 'warning' },
    { id: 'a3', time: '17:00', text: 'Parking Zones B and C are full. Use Zone A (East side) or take Metro to Cubbon Park Station (2 min walk).', type: 'info' },
    { id: 'a4', time: '18:00', text: 'Food Court F2 at Gate B: Only 4-min wait! Head there before the match. Food Court F3 (Gate C): 28-min wait — avoid.', type: 'success' },
    { id: 'a5', time: '19:05', text: 'Crowd advisory: North Stand at 90% capacity. Empty seats available in South Stand — stewards will guide you.', type: 'warning' },
  ],
};

// ── Live Crowd Simulation ─────────────────────────────────────────────────

/** @type {Array<Object>} Mutable copy of zone data — fluctuates every 30s */
let liveZones = EVENT.zones.map(z => ({ ...z }));

/** @type {Array<Object>} Mutable copy of queue data — fluctuates every 30s */
let liveQueues = EVENT.queues.map(q => ({ ...q }));

/**
 * Simulates real-time crowd fluctuation by applying bounded random deltas
 * to zone occupancy (±3%) and queue wait times (±2 min) every 30 seconds.
 * Persists snapshots to Firebase Firestore when available.
 */
function fluctuateCrowd() {
  liveZones = liveZones.map(z => {
    const delta = Math.floor(Math.random() * 7) - 3;
    const occupancy = Math.min(99, Math.max(10, z.occupancy + delta));
    return { ...z, occupancy };
  });

  liveQueues = liveQueues.map(q => {
    const delta = Math.floor(Math.random() * 5) - 2;
    const waitMinutes = Math.min(40, Math.max(1, q.waitMinutes + delta));
    return { ...q, waitMinutes, status: getQueueStatus(waitMinutes) };
  });

  // Persist snapshot to Firebase Firestore for historical analytics
  if (db) {
    db.collection('crowd-snapshots').add({
      zones: liveZones.map(z => ({ id: z.id, name: z.name, occupancy: z.occupancy })),
      queues: liveQueues.map(q => ({ id: q.id, location: q.location, waitMinutes: q.waitMinutes, status: q.status })),
      timestamp: new Date(),
    }).catch(() => {});
  }

  // Invalidate response cache after fluctuation
  responseCache.delete('crowd');
  responseCache.delete('queues');
}

setInterval(fluctuateCrowd, 30000);

// ── API Routes ────────────────────────────────────────────────────────────

/** Health check — used by Cloud Run for readiness probes */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', event: EVENT.name, timestamp: new Date().toISOString() });
});

/** Firebase client configuration — serves config from environment variables */
app.get('/api/config', apiLimiter, (_req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.json({
    firebase: {
      apiKey: process.env.FIREBASE_API_KEY || '',
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || '',
    },
    features: {
      auth: !!process.env.FIREBASE_API_KEY,
      analytics: true,
      translation: !!process.env.GEMINI_API_KEY,
    },
  });
});

/** Event metadata — excludes schedule and queues (served via dedicated endpoints) */
app.get('/api/event', apiLimiter, (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  const { schedule, queues, ...meta } = EVENT;
  res.json(meta);
});

/** Schedule with optional day and track filters */
app.get('/api/schedule', apiLimiter, (req, res) => {
  const { day, track } = req.query;
  let sessions = [...EVENT.schedule];

  if (day !== undefined) {
    const d = parseInt(day, 10);
    if (isNaN(d) || d < 1 || d > 1) {
      return res.status(400).json({ error: 'day must be 1.' });
    }
    sessions = sessions.filter(s => s.day === d);
  }

  if (track) {
    sessions = sessions.filter(s =>
      s.track.toLowerCase() === decodeURIComponent(track).toLowerCase()
    );
  }

  res.set('Cache-Control', 'public, max-age=60');
  res.json({ event: EVENT.name, sessions, total: sessions.length });
});

/** Live crowd density — cached for 25s, refreshes on fluctuation */
app.get('/api/crowd', apiLimiter, (_req, res) => {
  const cached = getCached('crowd');
  if (cached) {
    res.set('X-Cache', 'HIT');
    return res.json(cached);
  }

  const data = {
    updatedAt: new Date().toISOString(),
    zones: liveZones.map(z => {
      const densityLevel = getDensityLevel(z.occupancy);
      return {
        ...z,
        densityLevel,
        recommendation: getDensityRecommendation(densityLevel),
      };
    }),
  };

  setCache('crowd', data);
  res.set('X-Cache', 'MISS');
  res.json(data);
});

/** Live queue wait times — cached for 25s, refreshes on fluctuation */
app.get('/api/queues', apiLimiter, (_req, res) => {
  const cached = getCached('queues');
  if (cached) {
    res.set('X-Cache', 'HIT');
    return res.json(cached);
  }

  const data = { updatedAt: new Date().toISOString(), queues: liveQueues };
  setCache('queues', data);
  res.set('X-Cache', 'MISS');
  res.json(data);
});

/** Live announcements feed */
app.get('/api/announcements', apiLimiter, (_req, res) => {
  res.json({ announcements: EVENT.announcements });
});

// ── AI Chat (Google Gemini) ───────────────────────────────────────────────

const VALID_ROLES = new Set(['user', 'model']);

/**
 * Builds the Gemini system prompt with live crowd and queue context.
 * @returns {string} Complete system prompt for the AI assistant
 */
function buildSystemPrompt() {
  return `You are EventPulse AI, the official AI assistant for ${EVENT.name} ("${EVENT.tagline}").

EVENT: ${EVENT.dates} | ${EVENT.venue} | Organised by: ${EVENT.organizer}

STADIUM ZONES (with live crowd density — updates every 30s):
${liveZones.map(z => {
    const level = getDensityLevel(z.occupancy);
    const label = level === 'high' ? 'HIGH DENSITY — AVOID' : level === 'moderate' ? 'Moderate' : 'Low — Recommended';
    return `  - ${z.name}: ${z.occupancy}% full [${label}] | ${z.facilities}`;
  }).join('\n')}

QUEUE WAIT TIMES (live — updates every 30s):
${liveQueues.map(q => `  - ${q.location}: ${q.waitMinutes} min wait [${getQueueStatus(q.waitMinutes).toUpperCase()}]`).join('\n')}

TEAMS & OFFICIALS:
${EVENT.speakers.map(s => `  - ${s.name}: ${s.role}`).join('\n')}

MATCH SCHEDULE:
${EVENT.schedule.map(s => `[${s.start}-${s.end}] "${s.title}"
  Zone: ${s.hall} | Track: ${s.track}
  Info: ${s.description}`).join('\n\n')}

RULES:
- Be friendly, helpful, and concise.
- Always recommend the least crowded gate or food court when relevant.
- Proactively warn about high-density zones and suggest alternatives.
- Only use data provided above. Do not fabricate information.
- Use bullet points for lists.
- For transport: Cubbon Park Metro Station is 2 min walk from Gate B.`;
}

app.post('/api/chat', chatLimiter, async (req, res) => {
  const { message, history = [] } = req.body;

  // Input validation
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required and must be a string.' });
  }
  if (message.trim().length === 0) {
    return res.status(400).json({ error: 'message cannot be empty.' });
  }
  if (message.length > 1000) {
    return res.status(400).json({ error: 'message too long. Max 1000 characters.' });
  }
  if (!Array.isArray(history)) {
    return res.status(400).json({ error: 'history must be an array.' });
  }

  // Validate each history entry
  if (history.length > 0) {
    const validHistory = history.every(h =>
      h && typeof h.role === 'string' && VALID_ROLES.has(h.role) && typeof h.text === 'string'
    );
    if (!validHistory) {
      return res.status(400).json({ error: 'Each history item must have a valid role (user/model) and text (string).' });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({
      reply: "Hi! I'm EventPulse AI running in demo mode. Set GEMINI_API_KEY to enable full AI assistance.\n\nI can answer questions like:\n- Which gate has the shortest queue?\n- Where is the nearest food court?\n- What time does the match start?",
      demo: true,
    });
  }

  try {
    const contents = [
      ...history.slice(-10).map(h => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: 'user', parts: [{ text: message.trim() }] },
    ];

    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: buildSystemPrompt() }] },
        contents,
        generationConfig: { maxOutputTokens: 1024, temperature: 0.4, topP: 0.9 },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }),
    });

    if (!r.ok) {
      const errBody = await r.json().catch(() => ({}));
      console.error('Gemini error:', r.status, JSON.stringify(errBody));
      return res.status(502).json({ error: 'AI service unavailable. Please try again.' });
    }

    const data = await r.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      return res.status(502).json({ error: 'No response from AI. Please try again.' });
    }

    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── Translation (Google Gemini — multilingual fan support) ────────────────

const SUPPORTED_LANGS = new Set([
  'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati',
]);

app.post('/api/translate', apiLimiter, async (req, res) => {
  const { text, lang = 'Hindi' } = req.body;

  // Input validation
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required.' });
  }
  if (text.length > 1000) {
    return res.status(400).json({ error: 'text too long. Max 1000 characters.' });
  }
  if (!SUPPORTED_LANGS.has(lang)) {
    return res.status(400).json({ error: `Unsupported language. Supported: ${[...SUPPORTED_LANGS].join(', ')}` });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.json({ translated: text, source: 'demo' });

  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `Translate the following stadium announcement to ${lang}. Return ONLY the translation, nothing else:\n\n${text}` }] }],
        generationConfig: { maxOutputTokens: 256, temperature: 0.1 },
      }),
    });
    const data = await r.json();
    const translated = data?.candidates?.[0]?.content?.parts?.[0]?.text || text;
    res.json({ translated, lang });
  } catch (e) {
    res.json({ translated: text, error: 'Translation unavailable.' });
  }
});

// ── Static Files & Error Handling ─────────────────────────────────────────

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong.' });
});

// ── Server Start ──────────────────────────────────────────────────────────

const server = app.listen(PORT, () => {
  console.log(`EventPulse AI on http://localhost:${PORT}`);
  console.log(`Gemini: ${process.env.GEMINI_API_KEY ? 'configured' : 'demo mode'}`);
  console.log(`Firestore: ${db ? 'connected' : 'in-memory fallback'}`);
});

module.exports = { app, server, EVENT };
