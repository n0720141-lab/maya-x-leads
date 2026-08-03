// Production keep-alive wrapper for low-memory environments
// - Restarts Next.js if it crashes
// - Logs to /tmp/next-keep.log
// - Listens for OOM-killed child and restarts in 2s
import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

const LOG = '/tmp/next-keep.log';
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n'); } catch {}
}

let childPid = null;
let restartCount = 0;
const MAX_FAST_RESTARTS = 5;
const fastRestarts = [];

function startApp() {
  log(`Starting Next.js prod server (restart #${restartCount})...`);
  const child = spawn('node', ['.next/standalone/server.js'], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '3000',
      HOSTNAME: '0.0.0.0',
      DATABASE_URL: 'file:/home/z/my-project/db/custom.db',
      NODE_OPTIONS: '--max-old-space-size=768'
    },
    detached: true
  });
  childPid = child.pid;
  
  child.stdout.on('data', d => {
    const s = d.toString();
    process.stdout.write(s);
    try { fs.appendFileSync(LOG, s); } catch {}
  });
  child.stderr.on('data', d => {
    const s = d.toString();
    process.stderr.write(s);
    try { fs.appendFileSync(LOG, s); } catch {}
  });
  
  child.on('exit', (code, sig) => {
    log(`Server exited code=${code} sig=${sig} (pid=${childPid}). Restarting in 2s...`);
    childPid = null;
    
    // Track fast restarts to prevent infinite loop
    const now = Date.now();
    fastRestarts.push(now);
    // Remove restarts older than 60s
    while (fastRestarts.length > 0 && fastRestarts[0] < now - 60000) {
      fastRestarts.shift();
    }
    
    if (fastRestarts.length > MAX_FAST_RESTARTS) {
      log(`Too many fast restarts (${fastRestarts.length} in 60s). Waiting 30s before retry...`);
      setTimeout(() => {
        fastRestarts.length = 0;
        restartCount++;
        startApp();
      }, 30000);
    } else {
      restartCount++;
      setTimeout(startApp, 2000);
    }
  });
  
  child.unref();
}

log('Keep-alive wrapper started.');
startApp();

// Tiny health server on port 3001
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    ok: true,
    serverRunning: childPid !== null,
    pid: childPid,
    restartCount,
    uptime: process.uptime()
  }));
}).listen(3001, '0.0.0.0', () => {
  log('Health check on :3001');
});

// Cleanup on exit
process.on('SIGTERM', () => {
  log('SIGTERM received. Exiting.');
  process.exit(0);
});
process.on('SIGINT', () => {
  log('SIGINT received. Exiting.');
  process.exit(0);
});
