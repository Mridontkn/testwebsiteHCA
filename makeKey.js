require('dotenv').config();
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const db = new Database(process.env.DATABASE_PATH || './hca.db');
const name = process.argv[2] || 'initial-admin';
const plaintext = uuidv4() + '-' + Math.random().toString(36).slice(2,10);
const hash = bcrypt.hashSync(plaintext, 10);
db.prepare('INSERT INTO commissioners (id,name,key_hash,role,created_at) VALUES (?,?,?,?,?)')
  .run(uuidv4(), name, hash, 'admin', Date.now());
console.log('Created admin:', name);
console.log('PLAINTEXT KEY (copy now and store securely):', plaintext);
