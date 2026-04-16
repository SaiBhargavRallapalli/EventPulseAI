'use strict';

const request = require('supertest');
const { app, server, EVENT } = require('./server');

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
  it('returns event metadata without schedule or queues', async () => {
    const res = await request(app).get('/api/event');
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe(EVENT.name);
    expect(res.body.venue).toBeDefined();
    expect(res.body.speakers).toBeDefined();
    expect(res.body.zones).toBeDefined();
    expect(res.body.schedule).toBeUndefined();
    expect(res.body.queues).toBeUndefined();
  });

  it('includes all 6 speakers / officials', async () => {
    const res = await request(app).get('/api/event');
    expect(res.body.speakers).toHaveLength(6);
  });

  it('includes all 5 stadium zones', async () => {
    const res = await request(app).get('/api/event');
    expect(res.body.zones).toHaveLength(5);
  });

  it('each zone has required fields', async () => {
    const res = await request(app).get('/api/event');
    res.body.zones.forEach(z => {
      expect(z.id).toBeDefined();
      expect(z.name).toBeDefined();
      expect(z.capacity).toBeDefined();
      expect(z.occupancy).toBeDefined();
      expect(z.facilities).toBeDefined();
    });
  });
});

// ── Schedule ────────────────────────────────────────────────────────────────
describe('GET /api/schedule', () => {
  it('returns all 8 sessions with no filters', async () => {
    const res = await request(app).get('/api/schedule');
    expect(res.statusCode).toBe(200);
    expect(res.body.sessions).toHaveLength(8);
    expect(res.body.total).toBe(8);
  });

  it('filters by day=1 and returns only match day sessions', async () => {
    const res = await request(app).get('/api/schedule?day=1');
    expect(res.statusCode).toBe(200);
    res.body.sessions.forEach(s => expect(s.day).toBe(1));
    expect(res.body.sessions.length).toBeGreaterThan(0);
  });

  it('filters by track=Match', async () => {
    const res = await request(app).get('/api/schedule?track=Match');
    expect(res.statusCode).toBe(200);
    res.body.sessions.forEach(s => expect(s.track).toBe('Match'));
    expect(res.body.sessions.length).toBeGreaterThan(0);
  });

  it('filters by track case-insensitively', async () => {
    const res = await request(app).get('/api/schedule?track=match');
    expect(res.statusCode).toBe(200);
    res.body.sessions.forEach(s => expect(s.track.toLowerCase()).toBe('match'));
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

// ── Crowd Density ───────────────────────────────────────────────────────────
describe('GET /api/crowd', () => {
  it('returns zones array with density data', async () => {
    const res = await request(app).get('/api/crowd');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.zones)).toBe(true);
    expect(res.body.zones).toHaveLength(5);
    expect(res.body.updatedAt).toBeDefined();
  });

  it('each zone has densityLevel and recommendation', async () => {
    const res = await request(app).get('/api/crowd');
    res.body.zones.forEach(z => {
      expect(z.occupancy).toBeDefined();
      expect(['low', 'moderate', 'high']).toContain(z.densityLevel);
      expect(z.recommendation).toBeDefined();
    });
  });

  it('correctly classifies high density zones (>=80%)', async () => {
    const res = await request(app).get('/api/crowd');
    res.body.zones.forEach(z => {
      if (z.occupancy >= 80) expect(z.densityLevel).toBe('high');
      else if (z.occupancy >= 50) expect(z.densityLevel).toBe('moderate');
      else expect(z.densityLevel).toBe('low');
    });
  });
});

// ── Queue Wait Times ─────────────────────────────────────────────────────────
describe('GET /api/queues', () => {
  it('returns queues array with wait times', async () => {
    const res = await request(app).get('/api/queues');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.queues)).toBe(true);
    expect(res.body.queues).toHaveLength(10);
    expect(res.body.updatedAt).toBeDefined();
  });

  it('each queue has required fields', async () => {
    const res = await request(app).get('/api/queues');
    res.body.queues.forEach(q => {
      expect(q.id).toBeDefined();
      expect(q.location).toBeDefined();
      expect(q.type).toBeDefined();
      expect(q.waitMinutes).toBeDefined();
      expect(['low', 'moderate', 'high']).toContain(q.status);
    });
  });

  it('includes all queue types', async () => {
    const res = await request(app).get('/api/queues');
    const types = res.body.queues.map(q => q.type);
    expect(types).toContain('food');
    expect(types).toContain('entry');
    expect(types).toContain('restroom');
    expect(types).toContain('merchandise');
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
      expect(['info', 'success', 'warning']).toContain(a.type);
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
    const res = await request(app).post('/api/chat').send({ message: 'a'.repeat(1001) });
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
      .send({ message: 'Which gate is least crowded?', history: 'not-an-array' });
    expect(res.statusCode).toBe(400);
  });

  it('returns a reply in demo mode (no API key)', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'Which gate has the shortest queue?' });
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
