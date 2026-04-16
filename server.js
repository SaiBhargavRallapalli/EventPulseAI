'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// ── Firebase Admin + Firestore (Google Cloud) ─────────────────────────────
let db;
try {
  const admin = require('firebase-admin');
  admin.initializeApp({ projectId: process.env.GOOGLE_CLOUD_PROJECT || 'eventpulse-ai' });
  db = admin.firestore();
  console.log('Firebase Firestore: connected');
} catch (e) {
  console.log('Firebase Firestore: not configured, using in-memory data');
}

const app = express();
const PORT = process.env.PORT || 8080;

app.use(compression()); // gzip responses for efficiency
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.googletagmanager.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      frameSrc: ['https://www.google.com'],
      connectSrc: ["'self'", 'https://www.google-analytics.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*', methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '10kb' }));

const chatLimiter = rateLimit({ windowMs: 60000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests. Please wait a moment.' } });
const apiLimiter = rateLimit({ windowMs: 60000, max: 100, message: { error: 'Too many requests.' } });

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

// Live crowd state — seeded from EVENT, fluctuates every 30 s
let liveZones = EVENT.zones.map(z => ({ ...z }));
let liveQueues = EVENT.queues.map(q => ({ ...q }));

function fluctuateCrowd() {
  liveZones = liveZones.map(z => {
    const delta = Math.floor(Math.random() * 7) - 3;
    const occupancy = Math.min(99, Math.max(10, z.occupancy + delta));
    return { ...z, occupancy };
  });
  liveQueues = liveQueues.map(q => {
    const delta = Math.floor(Math.random() * 5) - 2;
    const waitMinutes = Math.min(40, Math.max(1, q.waitMinutes + delta));
    const status = waitMinutes <= 5 ? 'low' : waitMinutes <= 15 ? 'moderate' : 'high';
    return { ...q, waitMinutes, status };
  });
  // Persist snapshot to Firebase Firestore (if available)
  if (db) {
    db.collection('crowd-snapshots').add({
      zones: liveZones.map(z => ({ id: z.id, name: z.name, occupancy: z.occupancy })),
      queues: liveQueues.map(q => ({ id: q.id, location: q.location, waitMinutes: q.waitMinutes, status: q.status })),
      timestamp: new Date(),
    }).catch(() => {});
  }
}
setInterval(fluctuateCrowd, 30000);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', event: EVENT.name, timestamp: new Date().toISOString() }));

app.get('/api/event', apiLimiter, (_req, res) => { const { schedule, queues, ...meta } = EVENT; res.json(meta); });

app.get('/api/schedule', apiLimiter, (req, res) => {
  const { day, track } = req.query;
  let sessions = [...EVENT.schedule];
  if (day !== undefined) {
    const d = parseInt(day, 10);
    if (isNaN(d) || d < 1 || d > 1) return res.status(400).json({ error: 'day must be 1.' });
    sessions = sessions.filter(s => s.day === d);
  }
  if (track) sessions = sessions.filter(s => s.track.toLowerCase() === decodeURIComponent(track).toLowerCase());
  res.json({ event: EVENT.name, sessions, total: sessions.length });
});

app.get('/api/crowd', apiLimiter, (_req, res) => {
  res.json({
    updatedAt: new Date().toISOString(),
    zones: liveZones.map(z => ({
      ...z,
      densityLevel: z.occupancy >= 80 ? 'high' : z.occupancy >= 50 ? 'moderate' : 'low',
      recommendation: z.occupancy >= 80
        ? 'Avoid — critically high crowd density'
        : z.occupancy >= 50
          ? 'Moderate — manageable crowd'
          : 'Recommended — low crowd density',
    })),
  });
});

app.get('/api/queues', apiLimiter, (_req, res) => {
  res.json({ updatedAt: new Date().toISOString(), queues: liveQueues });
});

app.get('/api/announcements', apiLimiter, (_req, res) => res.json({ announcements: EVENT.announcements }));

app.post('/api/chat', chatLimiter, async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message is required and must be a string.' });
  if (message.trim().length === 0) return res.status(400).json({ error: 'message cannot be empty.' });
  if (message.length > 1000) return res.status(400).json({ error: 'message too long. Max 1000 characters.' });
  if (!Array.isArray(history)) return res.status(400).json({ error: 'history must be an array.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({ reply: "Hi! I'm EventPulse AI running in demo mode. Set GEMINI_API_KEY to enable full AI assistance.\n\nI can answer questions like:\n- Which gate has the shortest queue?\n- Where is the nearest food court?\n- What time does the match start?", demo: true });
  }

  const systemPrompt = `You are EventPulse AI, the official AI assistant for ${EVENT.name} ("${EVENT.tagline}").

EVENT: ${EVENT.dates} | ${EVENT.venue} | Organised by: ${EVENT.organizer}

STADIUM ZONES (with live crowd density — updates every 30s):
${liveZones.map(z => {
    const level = z.occupancy >= 80 ? 'HIGH DENSITY — AVOID' : z.occupancy >= 50 ? 'Moderate' : 'Low — Recommended';
    return `  - ${z.name}: ${z.occupancy}% full [${level}] | ${z.facilities}`;
  }).join('\n')}

QUEUE WAIT TIMES (live — updates every 30s):
${liveQueues.map(q => {
    const status = q.waitMinutes <= 5 ? 'LOW' : q.waitMinutes <= 15 ? 'MODERATE' : 'HIGH';
    return `  - ${q.location}: ${q.waitMinutes} min wait [${status}]`;
  }).join('\n')}

TEAMS & OFFICIALS:
${EVENT.speakers.map(s => `  - ${s.name}: ${s.role}`).join('\n')}

MATCH SCHEDULE:
${EVENT.schedule.map(s => `[${s.start}-${s.end}] "${s.title}"
  Zone: ${s.hall} | Track: ${s.track}
  Info: ${s.description}`).join('\n\n')}

RULES:
- Be friendly, helpful, and concise.
- Always recommend the least crowded gate or food court when relevant.
- Proactively warn about high-density zones (Gate C, Food Court F3) and suggest alternatives.
- Only use data provided above. Do not fabricate information.
- Use bullet points for lists.
- For transport: Cubbon Park Metro Station is 2 min walk from Gate B.`;

  try {
    const contents = [
      ...history.slice(-10).map(h => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: 'user', parts: [{ text: message.trim() }] },
    ];

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
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
    if (!reply) return res.status(502).json({ error: 'No response from AI. Please try again.' });
    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Google Cloud Translation — uses Gemini for multilingual fan support
app.post('/api/translate', apiLimiter, async (req, res) => {
  const { text, lang = 'Hindi' } = req.body;
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text is required.' });

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

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Something went wrong.' }); });

const server = app.listen(PORT, () => {
  console.log(`EventPulse AI on http://localhost:${PORT}`);
  console.log(`Gemini: ${process.env.GEMINI_API_KEY ? 'configured' : 'demo mode'}`);
});

module.exports = { app, server, EVENT };
