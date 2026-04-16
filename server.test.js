'use strict';

const request = require('supertest');
const { app, server, EVENT } = require('../server');

afterAll(() => new Promise(resolve => server.close(resolve)));

// ── Health Check ────────────────────────────────────────────────────────────
describe('GET /api/health', () => {
  it('returns status ok with event name', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.event).toBe(EVENT.name);
    expect(res.body.timestamp).toBeDefined();
  });
});

// ── Event Metadata ──────────────────────────────────────────────────────────
describe('GET /api/event', () => {
  it('returns event metadata without schedule', async () => {
    const res = await request(app).get('/api/event');
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe(EVENT.name);
    expect(res.body.venue).toBeDefined();
    expect(res.body.speakers).toBeDefined();
    expect(res.body.halls).toBeDefined();
    // Must NOT expose full schedule (it's served via /api/schedule)
    expect(res.body.schedule).toBeUndefined();
  });

  it('includes all 6 speakers', async () => {
    const res = await request(app).get('/api/event');
    expect(res.body.speakers).toHaveLength(6);
  });

  it('includes all 4 halls', async () => {
    const res = await request(app).get('/api/event');
    expect(res.body.halls).toHaveLength(4);
  });
});

// ── Schedule ────────────────────────────────────────────────────────────────
describe('GET /api/schedule', () => {
  it('returns all 12 sessions with no filters', async () => {
    const res = await request(app).get('/api/schedule');
    expect(res.statusCode).toBe(200);
    expect(res.body.sessions).toHaveLength(12);
    expect(res.body.total).toBe(12);
  });

  it('filters by day=1 and returns only Day 1 sessions', async () => {
    const res = await request(app).get('/api/schedule?day=1');
    expect(res.statusCode).toBe(200);
    res.body.sessions.forEach(s => expect(s.day).toBe(1));
  });

  it('filters by day=2 and returns only Day 2 sessions', async () => {
    const res = await request(app).get('/api/schedule?day=2');
    expect(res.statusCode).toBe(200);
    res.body.sessions.forEach(s => expect(s.day).toBe(2));
    expect(res.body.sessions.length).toBeGreaterThan(0);
  });

  it('filters by track (case-insensitive)', async () => {
    const res = await request(app).get('/api/schedule?track=keynote');
    expect(res.statusCode).toBe(200);
    res.body.sessions.forEach(s => expect(s.track.toLowerCase()).toBe('keynote'));
    expect(res.body.sessions.length).toBeGreaterThan(0);
  });

  it('returns 400 for invalid day value', async () => {
    const res = await request(app).get('/api/schedule?day=5');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 for non-numeric day', async () => {
    const res = await request(app).get('/api/schedule?day=abc');
    expect(res.statusCode).toBe(400);
  });

  it('each session has required fields', async () => {
    const res = await request(app).get('/api/schedule');
    res.body.sessions.forEach(s => {
      expect(s.id).toBeDefined();
      expect(s.title).toBeDefined();
      expect(s.speaker).toBeDefined();
      expect(s.hall).toBeDefined();
      expect(s.start).toBeDefined();
      expect(s.end).toBeDefined();
      expect(s.track).toBeDefined();
      expect(s.calStart).toBeDefined();
      expect(s.calEnd).toBeDefined();
    });
  });
});

// ── Announcements ───────────────────────────────────────────────────────────
describe('GET /api/announcements', () => {
  it('returns announcements array', async () => {
    const res = await request(app).get('/api/announcements');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.announcements)).toBe(true);
    expect(res.body.announcements.length).toBeGreaterThan(0);
  });

  it('each announcement has id, text, type, and time fields', async () => {
    const res = await request(app).get('/api/announcements');
    res.body.announcements.forEach(a => {
      expect(a.id).toBeDefined();
      expect(a.text).toBeDefined();
      expect(a.type).toBeDefined();
      expect(a.time).toBeDefined();
    });
  });
});

// ── Chat Input Validation ───────────────────────────────────────────────────
describe('POST /api/chat', () => {
  it('returns 400 when message is missing', async () => {
    const res = await request(app).post('/api/chat').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when message is empty string', async () => {
    const res = await request(app).post('/api/chat').send({ message: '   ' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when message exceeds 1000 characters', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'a'.repeat(1001) });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when message is not a string', async () => {
    const res = await request(app).post('/api/chat').send({ message: 12345 });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when history is not an array', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'Hello', history: 'not-an-array' });
    expect(res.statusCode).toBe(400);
  });

  it('returns a reply in demo mode (no API key)', async () => {
    // No GEMINI_API_KEY set in test environment → demo mode
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'Hello, what sessions are today?' });
    expect(res.statusCode).toBe(200);
    expect(res.body.reply).toBeDefined();
    expect(typeof res.body.reply).toBe('string');
    expect(res.body.reply.length).toBeGreaterThan(0);
  });
});

// ── Security Headers ────────────────────────────────────────────────────────
describe('Security headers', () => {
  it('has X-Content-Type-Options header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('has X-Frame-Options header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-frame-options']).toBeDefined();
  });
});

// ── SPA Fallback ─────────────────────────────────────────────────────────────
describe('SPA fallback', () => {
  it('serves index.html for unknown routes', async () => {
    const res = await request(app).get('/some-unknown-route');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });
});
