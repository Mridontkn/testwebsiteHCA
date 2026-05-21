require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4000;
const DB_PATH = process.env.DATABASE_PATH || './hca.db';
const MASTER_KEY_PLAINTEXT = process.env.MASTER_KEY || null;

const db = new Database(DB_PATH);

// Init tables
db.exec(`
CREATE TABLE IF NOT EXISTS commissioners (
  id TEXT PRIMARY KEY,
  name TEXT,
  key_hash TEXT NOT NULL,
  role TEXT DEFAULT 'commissioner',
  created_at INTEGER
);
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  city TEXT,
  name TEXT,
  color TEXT,
  conf TEXT
);
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  team_id TEXT,
  name TEXT,
  pos TEXT,
  ovr INTEGER,
  note TEXT,
  FOREIGN KEY(team_id) REFERENCES teams(id)
);
`);

// If you provided MASTER_KEY in env, ensure a record exists
if (MASTER_KEY_PLAINTEXT) {
  const stmt = db.prepare('SELECT id FROM commissioners WHERE name = ?');
  const existing = stmt.get('initial-admin');
  if (!existing) {
    const id = uuidv4();
    const hash = bcrypt.hashSync(MASTER_KEY_PLAINTEXT, 10);
    const insert = db.prepare('INSERT INTO commissioners (id,name,key_hash,role,created_at) VALUES (?,?,?,?,?)');
    insert.run(id, 'initial-admin', hash, 'admin', Date.now());
    console.log('Initial admin created (name: initial-admin). Keep MASTER_KEY safe.');
  }
}

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({ windowMs: 15*60*1000, max: 200 });
app.use(limiter);

// Auth middleware - commissioner key must be sent in header x-commissioner-key
function requireCommissioner(req, res, next) {
  const key = req.get('x-commissioner-key') || '';
  if (!key) return res.status(401).json({ error: 'Missing commissioner key' });
  const row = db.prepare('SELECT * FROM commissioners').all();
  // compare against hashes
  for (const r of row) {
    if (bcrypt.compareSync(key, r.key_hash)) {
      req.commissioner = { id: r.id, name: r.name, role: r.role };
      return next();
    }
  }
  return res.status(403).json({ error: 'Invalid commissioner key' });
}

// Admin-only middleware
function requireAdmin(req, res, next) {
  if (req.commissioner && req.commissioner.role === 'admin') return next();
  return res.status(403).json({ error: 'Admin required' });
}

// Commissioner key management (admin required)
// Create new key: returns plaintext once
app.post('/keys', requireCommissioner, requireAdmin, (req,res)=>{
  const { name, role='commissioner' } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const plaintext = uuidv4() + '-' + Math.random().toString(36).slice(2,10);
  const hash = bcrypt.hashSync(plaintext, 10);
  const id = uuidv4();
  db.prepare('INSERT INTO commissioners (id,name,key_hash,role,created_at) VALUES (?,?,?,?,?)')
    .run(id, name, hash, role, Date.now());
  return res.json({ id, name, role, key: plaintext });
});

// Revoke key (admin)
app.delete('/keys/:id', requireCommissioner, requireAdmin, (req,res)=>{
  const id = req.params.id;
  db.prepare('DELETE FROM commissioners WHERE id = ?').run(id);
  res.json({ ok: true });
});

// Public: get teams and players
app.get('/teams', (req,res)=>{
  const teams = db.prepare('SELECT * FROM teams').all();
  res.json(teams);
});
app.get('/teams/:id/players', (req,res)=>{
  const players = db.prepare('SELECT * FROM players WHERE team_id = ?').all(req.params.id);
  res.json(players);
});

// Protected: update player stat (commissioner)
app.put('/players/:id', requireCommissioner, (req,res)=>{
  const id = req.params.id;
  const { name, pos, ovr, note, team_id } = req.body;
  const p = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
  if (!p) return res.status(404).json({ error: 'Player not found' });
  db.prepare('UPDATE players SET name=?, pos=?, ovr=?, note=?, team_id=? WHERE id=?')
    .run(name||p.name, pos||p.pos, (ovr==null? p.ovr : ovr), note||p.note, team_id||p.team_id, id);
  res.json({ ok: true });
});

// Protected: create player
app.post('/players', requireCommissioner, (req,res)=>{
  const { team_id, name, pos, ovr=0, note='' } = req.body;
  if (!team_id || !name) return res.status(400).json({ error: 'team_id and name required' });
  const id = uuidv4();
  db.prepare('INSERT INTO players (id,team_id,name,pos,ovr,note) VALUES (?,?,?,?,?,?)')
    .run(id, team_id, name, pos, ovr, note);
  res.json({ id });
});

// Protected: update team metadata
app.put('/teams/:id', requireCommissioner, (req,res)=>{
  const id = req.params.id;
  const { city, name, color, conf } = req.body;
  const t = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
  if (!t) return res.status(404).json({ error: 'Team not found' });
  db.prepare('UPDATE teams SET city=?,name=?,color=?,conf=? WHERE id=?')
    .run(city||t.city, name||t.name, color||t.color, conf||t.conf, id);
  res.json({ ok:true });
});

// Protected: create/update standings or arbitrary stat endpoint example
app.post('/teams/:id/stats', requireCommissioner, (req,res)=>{
  // keep simple: store stats as players/fields in DB; adapt as needed
  // Here you would update team-level stats table or players as required.
  res.json({ ok:true, message:'Implement your specific stat updates here' });
});

app.listen(PORT, ()=>console.log('Server running on port', PORT));