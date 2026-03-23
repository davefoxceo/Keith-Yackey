#!/usr/bin/env node
/**
 * Ingest Keith Yackey's coaching content into Pi-Brain.
 * Run: node scripts/ingest-content.js
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const seeds = require(path.join(__dirname, '..', 'data', 'processed_seeds.json'));
const keithTs = fs.readFileSync(path.join(__dirname, '..', 'apps/api/src/modules/learning/seeds/keith-content.ts'), 'utf8');

const handWritten = [];
const regex = /id: '([^']+)',\s*\n\s*text: `([\s\S]*?)`,\s*\n\s*sourceType: '([^']+)',(?:\s*\n\s*dial: '([^']+)',)?/g;
let m;
while ((m = regex.exec(keithTs)) !== null) {
  handWritten.push({ id: m[1], text: m[2].trim(), sourceType: m[3], dial: m[4], topic: m[1] });
}

const allContent = [...handWritten, ...seeds];
console.log(`Ingesting ${allContent.length} entries...`);

const brain = spawn('npx', ['-y', 'mcp-brain@latest'], {
  env: {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://navigator:navigator@localhost:5433/coach_keith_brain',
    MEMORY_NAMESPACE: 'coach-keith',
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

let buffer = '', pending = new Map(), reqId = 1;
brain.stdout.on('data', d => { buffer += d.toString(); const lines = buffer.split('\n'); buffer = lines.pop()||''; for (const l of lines) { if (!l.trim()) continue; try { const msg = JSON.parse(l); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } } catch {} } });

function rpc(method, params) {
  return new Promise(r => {
    const id = reqId++;
    pending.set(id, r);
    brain.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');
    setTimeout(()=>{if(pending.has(id)){pending.delete(id);r({error:'timeout'})}},60000);
  });
}

async function main() {
  await rpc('initialize', { protocolVersion:'2024-11-05', capabilities:{}, clientInfo:{name:'ingester',version:'1'} });
  brain.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
  await new Promise(r=>setTimeout(r,500));

  let ingested = 0;
  for (let i = 0; i < allContent.length; i += 10) {
    const batch = allContent.slice(i, i + 10);
    const items = batch.map(e => ({
      type: 'semantic',
      content: (e.text||'').substring(0, 5000),
      tags: [e.sourceType, e.dial, 'coach-keith'].filter(Boolean),
      entities: ['Keith Yackey', 'Five Dials', e.dial].filter(Boolean),
      salience: e.sourceType === 'FRAMEWORK' ? 0.9 : 0.7,
      confidence: 0.85,
      source: 'content-pipeline',
    })).filter(item => item.content.length > 20);
    await rpc('tools/call', { name: 'memory_ingest', arguments: { namespace: 'coach-keith', items } });
    ingested += items.length;
    process.stdout.write(`\r  ${Math.min(i+10,allContent.length)}/${allContent.length} entries`);
  }
  console.log(`\n  Done: ${ingested} entries ingested`);
  brain.kill();
  process.exit(0);
}

main().catch(e => { console.error(e); brain.kill(); process.exit(1); });
