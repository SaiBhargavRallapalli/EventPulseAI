'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      frameSrc: ['https://www.google.com'],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*', methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '10kb' }));

const chatLimiter = rateLimit({ windowMs: 60000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests. Please wait a moment.' } });
const apiLimiter = rateLimit({ windowMs: 60000, max: 100, message: { error: 'Too many requests.' } });

const EVENT = {
  name: 'DevFest Hubballi 2026',
  tagline: 'Building the Agentic Future with Google AI',
  dates: 'May 10-11, 2026',
  venue: 'BVB College of Engineering, Hubballi',
  organizer: 'GDG Hubballi x Google for Developers',
  halls: [
    { id: 'main', name: 'Main Auditorium', capacity: 800, floor: 'Ground Floor' },
    { id: 'hall-a', name: 'Hall A - AI & Cloud', capacity: 400, floor: '1st Floor, East Wing' },
    { id: 'hall-b', name: 'Hall B - Web & Mobile', capacity: 400, floor: '1st Floor, West Wing' },
    { id: 'hall-c', name: 'Hall C - Workshops', capacity: 150, floor: '2nd Floor, North Block' },
  ],
  speakers: [
    { name: 'Dr. Priya Sharma', role: 'AI Research Lead, Google DeepMind', avatar: 'PS' },
    { name: 'Rahul Gupta', role: 'Developer Advocate, Google Cloud', avatar: 'RG' },
    { name: 'Ananya Krishnan', role: 'Senior Engineer, Firebase', avatar: 'AK' },
    { name: 'Arjun Mehta', role: 'Vertex AI Product Manager', avatar: 'AM' },
    { name: 'Kavitha Nair', role: 'Flutter GDE, India', avatar: 'KN' },
    { name: 'Siddharth Rao', role: 'Cloud Architecture, Google', avatar: 'SR' },
  ],
  schedule: [
    { id: 's1', day: 1, date: '2026-04-25', title: 'Opening Keynote: The Agentic AI Era', speaker: 'Dr. Priya Sharma', hall: 'Main Auditorium', start: '09:00', end: '10:00', track: 'Keynote', description: 'Live demos of Gemini 3 and ADK. Explore how autonomous AI agents are reshaping software development.', calStart: '20260425T033000Z', calEnd: '20260425T043000Z' },
    { id: 's2', day: 1, date: '2026-04-25', title: 'Building Production Apps with Gemini API', speaker: 'Rahul Gupta', hall: 'Hall A - AI & Cloud', start: '10:30', end: '11:30', track: 'AI & ML', description: 'Deep dive into Gemini 1.5 Flash, function calling, multimodal inputs, and streaming responses.', calStart: '20260425T050000Z', calEnd: '20260425T060000Z' },
    { id: 's3', day: 1, date: '2026-04-25', title: 'Firebase Real-time Architecture at Scale', speaker: 'Ananya Krishnan', hall: 'Hall B - Web & Mobile', start: '10:30', end: '11:30', track: 'Web & Mobile', description: 'Design patterns for high-traffic Firestore apps. Security rules, offline support, and performance.', calStart: '20260425T050000Z', calEnd: '20260425T060000Z' },
    { id: 's4', day: 1, date: '2026-04-25', title: 'Vertex AI for Production: MLOps Best Practices', speaker: 'Arjun Mehta', hall: 'Hall A - AI & Cloud', start: '13:00', end: '14:00', track: 'AI & ML', description: 'End-to-end ML pipelines: training, evaluation, deployment, and monitoring with Vertex AI.', calStart: '20260425T073000Z', calEnd: '20260425T083000Z' },
    { id: 's5', day: 1, date: '2026-04-25', title: 'Flutter for Enterprise: Beyond Todo Apps', speaker: 'Kavitha Nair', hall: 'Hall B - Web & Mobile', start: '13:00', end: '14:00', track: 'Web & Mobile', description: 'State management, accessibility, performance profiling, and platform-specific UI patterns.', calStart: '20260425T073000Z', calEnd: '20260425T083000Z' },
    { id: 's6', day: 1, date: '2026-04-25', title: 'Google Cloud Run: Serverless at Any Scale', speaker: 'Siddharth Rao', hall: 'Hall A - AI & Cloud', start: '14:30', end: '15:30', track: 'Cloud', description: 'Container-based serverless: cold start optimization, concurrency, traffic splitting, and IAM.', calStart: '20260425T090000Z', calEnd: '20260425T100000Z' },
    { id: 's7', day: 1, date: '2026-04-25', title: 'Responsible AI: Building Ethically at Scale', speaker: 'Dr. Priya Sharma', hall: 'Main Auditorium', start: '15:30', end: '16:30', track: 'Keynote', description: 'Bias detection, safety layers, explainability, and responsible deployment of generative AI.', calStart: '20260425T100000Z', calEnd: '20260425T110000Z' },
    { id: 's8', day: 2, date: '2026-04-26', title: 'Hands-on: Building AI Agents with ADK', speaker: 'Ananya Krishnan', hall: 'Hall A - AI & Cloud', start: '09:00', end: '10:30', track: 'AI & ML', description: 'Live workshop: Build a multi-step AI agent using Google Agent Development Kit from scratch.', calStart: '20260426T033000Z', calEnd: '20260426T050000Z' },
    { id: 's9', day: 2, date: '2026-04-26', title: 'Gemini Multimodal: Vision, Audio & Code', speaker: 'Rahul Gupta', hall: 'Hall C - Workshops', start: '09:00', end: '11:00', track: 'AI & ML', description: 'Workshop: Process images, audio, video, and code with Gemini multimodal capabilities.', calStart: '20260426T033000Z', calEnd: '20260426T053000Z' },
    { id: 's10', day: 2, date: '2026-04-26', title: 'Geo AI: Maps Platform & Places API', speaker: 'Arjun Mehta', hall: 'Hall B - Web & Mobile', start: '10:30', end: '12:00', track: 'Web & Mobile', description: 'Build location-aware apps: Geocoding, Routes API, Places (new), and Street View integration.', calStart: '20260426T050000Z', calEnd: '20260426T063000Z' },
    { id: 's11', day: 2, date: '2026-04-26', title: 'Cloud Architecture Patterns for AI Apps', speaker: 'Siddharth Rao', hall: 'Hall A - AI & Cloud', start: '13:00', end: '14:00', track: 'Cloud', description: 'RAG pipelines, vector search with Vertex AI, and cost-optimized architectures for AI-heavy workloads.', calStart: '20260426T073000Z', calEnd: '20260426T083000Z' },
    { id: 's12', day: 2, date: '2026-04-26', title: 'Closing Keynote: The Future of Build with AI', speaker: 'All Speakers', hall: 'Main Auditorium', start: '15:00', end: '16:00', track: 'Keynote', description: 'Panel: Where is vibe coding taking us? The next 5 years of AI-native development.', calStart: '20260426T093000Z', calEnd: '20260426T103000Z' },
  ],
  announcements: [
    { id: 'a1', time: '08:30', text: 'Registration desk is open at the main entrance. Collect your badge and welcome kit!', type: 'info' },
    { id: 'a2', time: '09:45', text: 'WiFi: Network TechSurge2026 | Password build2026', type: 'success' },
    { id: 'a3', time: '11:00', text: 'Lunch served at the courtyard 12:00-13:00. Veg and non-veg options available.', type: 'info' },
    { id: 'a4', time: '12:00', text: 'Hall A: Vertex AI session starts at 13:10 (10 min delay).', type: 'warning' },
    { id: 'a5', time: '14:00', text: 'Workshop kits for Hall C available outside entrance. Collect before 15:00.', type: 'info' },
  ],
};

app.get('/api/health', (_req, res) => res.json({ status: 'ok', event: EVENT.name, timestamp: new Date().toISOString() }));

app.get('/api/event', apiLimiter, (_req, res) => { const { schedule, ...meta } = EVENT; res.json(meta); });

app.get('/api/schedule', apiLimiter, (req, res) => {
  const { day, track } = req.query;
  let sessions = [...EVENT.schedule];
  if (day !== undefined) {
    const d = parseInt(day, 10);
    if (isNaN(d) || d < 1 || d > 2) return res.status(400).json({ error: 'day must be 1 or 2.' });
    sessions = sessions.filter(s => s.day === d);
  }
  if (track) sessions = sessions.filter(s => s.track.toLowerCase() === decodeURIComponent(track).toLowerCase());
  res.json({ event: EVENT.name, sessions, total: sessions.length });
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
    return res.json({ reply: "Hi! I'm EventPulse AI running in demo mode. Set GEMINI_API_KEY to enable full AI assistance.\n\nI can answer questions like:\n- Which AI sessions are on Day 1?\n- Where is Hall A?\n- What time does the Gemini workshop start?", demo: true });
  }

  const systemPrompt = `You are EventPulse AI, the official smart assistant for ${EVENT.name} ("${EVENT.tagline}").

EVENT: ${EVENT.dates} | ${EVENT.venue} | Organised by: ${EVENT.organizer}

HALLS:
${EVENT.halls.map(h => `  - ${h.name}: capacity ${h.capacity}, ${h.floor}`).join('\n')}

SPEAKERS:
${EVENT.speakers.map(s => `  - ${s.name}: ${s.role}`).join('\n')}

FULL SCHEDULE:
${EVENT.schedule.map(s => `[Day ${s.day} | ${s.start}-${s.end}] "${s.title}"
  Speaker: ${s.speaker} | Hall: ${s.hall} | Track: ${s.track}
  About: ${s.description}`).join('\n\n')}

RULES:
- Be friendly, helpful, and concise.
- Only use data provided above. Do not fabricate information.
- Use bullet points for lists.
- For WiFi/food/transport, use common sense for a tech conference.`;

  try {
    const contents = [
      ...history.slice(-10).map(h => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: 'user', parts: [{ text: message.trim() }] },
    ];

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 512, temperature: 0.4, topP: 0.9 },
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

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Something went wrong.' }); });

const server = app.listen(PORT, () => {
  console.log(`EventPulse AI on http://localhost:${PORT}`);
  console.log(`Gemini: ${process.env.GEMINI_API_KEY ? 'configured' : 'demo mode'}`);
});

module.exports = { app, server, EVENT };
