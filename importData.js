require('dotenv').config();
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const db = new Database(process.env.DATABASE_PATH || './hca.db');

const TEAMS = [
  {id:'towers',     city:'Toronto',       name:'Towers',        color:'#CC0000', conf:'East'},
  {id:'storm',      city:'Montreal',      name:'Storm',         color:'#333333', conf:'East'},
  {id:'voyageurs',  city:'Quebec',        name:'Voyageurs',     color:'#1B3A6B', conf:'East'},
  {id:'legends',    city:'New York',      name:'Legends',       color:'#1D3D7F', conf:'East'},
  {id:'bulldogs',   city:'Buffalo',       name:'Bulldogs',      color:'#F5C518', conf:'East'},
  {id:'waves',      city:'Miami',         name:'Waves',         color:'#E91E8C', conf:'East'},
  {id:'liberty',    city:'Philadelphia',  name:'Liberty',       color:'#008B8B', conf:'East'},
  {id:'firebirds',  city:'Florida',       name:'Firebirds',     color:'#FF4500', conf:'East'},
  {id:'imperials',  city:'New York',      name:'Imperials',     color:'#0038A8', conf:'East'},
  {id:'outlaws',    city:'Alberta',       name:'Outlaws',       color:'#8B1A1A', conf:'West'},
  {id:'stags',      city:'Seattle',       name:'Stags',         color:'#7B2FBE', conf:'West'},
  {id:'comets',     city:'Colorado',      name:'Comets',        color:'#E65100', conf:'West'},
  {id:'magic',      city:'Los Angeles',   name:'Magic',         color:'#6A0DAD', conf:'West'},
  {id:'notes',      city:'St. Louis',     name:'Notes',         color:'#5BB8F5', conf:'West'},
  {id:'ghostpirates',city:'Portland',     name:'Ghost Pirates', color:'#39FF14', conf:'West'},
  {id:'rams',       city:'Chicago',       name:'Rams',          color:'#1A2F6B', conf:'West'},
  {id:'longhorns',  city:'Dallas',        name:'Longhorns',     color:'#1A3A6B', conf:'West'},
  {id:'pirates',    city:'San Francisco', name:'Pirates',       color:'#9B1515', conf:'West'},
];

const ROSTERS = {
  towers:{players:[{name:'D. Nils',pos:'LW',ovr:99,note:''},{name:'C. Bedard',pos:'C',ovr:94,note:''},{name:'P. Martone',pos:'RW',ovr:96,note:'99 POT'}]},
  comets:{players:[{name:'Larkin',pos:'C',ovr:88,note:''},{name:'Stuzle',pos:'C',ovr:90,note:''},{name:'Guentzle',pos:'LW',ovr:88,note:''}]},
  bulldogs:{players:[{name:'Woodman',pos:'LW',ovr:82,note:'92 POT'},{name:'Rant',pos:'C',ovr:92,note:''}]},
  legends:{players:[{name:'Pastrnak',pos:'RW',ovr:95,note:''},{name:'Crosby',pos:'C',ovr:92,note:''}]},
  pirates:{players:[{name:'Kucherov',pos:'RW',ovr:95,note:''},{name:'Pettersson',pos:'C',ovr:89,note:''}]},
  notes:{players:[{name:'Michkov',pos:'RW',ovr:93,note:''},{name:'Thomas',pos:'LW',ovr:91,note:''}]},
  liberty:{players:[{name:'McDavid',pos:'C',ovr:98,note:''},{name:'Ehlers',pos:'LW',ovr:86,note:''}]},
  firebirds:{players:[{name:'McKenna',pos:'LW',ovr:96,note:''},{name:'Celebrini',pos:'C',ovr:94,note:''}]},
  outlaws:{players:[{name:'Raymond',pos:'LW',ovr:89,note:''},{name:'Thompson',pos:'C',ovr:91,note:''}]}
};

function upsertTeam(t){
  const exists = db.prepare('SELECT id FROM teams WHERE id = ?').get(t.id);
  if (exists) return;
  db.prepare('INSERT INTO teams (id,city,name,color,conf) VALUES (?,?,?,?,?)')
    .run(t.id, t.city, t.name, t.color, t.conf);
}

function insertPlayersFor(teamId, players){
  const insert = db.prepare('INSERT INTO players (id,team_id,name,pos,ovr,note) VALUES (?,?,?,?,?,?)');
  for (const p of players) {
    insert.run(uuidv4(), teamId, p.name, p.pos || '', p.ovr || 0, p.note || '');
  }
}

(function main(){
  console.log('Importing teams...');
  for (const t of TEAMS) upsertTeam(t);
  console.log('Importing rosters (partial)...');
  for (const k of Object.keys(ROSTERS)){
    const team = TEAMS.find(x=>x.id===k);
    if (team) insertPlayersFor(k, ROSTERS[k].players || []);
  }
  console.log('Done.');
})();
