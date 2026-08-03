import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

const LOG = '/tmp/next-keep.log';
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG, line + '\n');
}

// Restart loop wrapper
function startApp() {
  log('Spawning next dev server...');
  const child = spawn('node', ['node_modules/next/dist/bin/next', 'dev', '-p', '3000', '-H', '0.0.0.0'], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PORT: '3000',
      HOSTNAME: '0.0.0.0',
      DATABASE_URL: 'file:/home/z/my-project/db/custom.db',
      NODE_OPTIONS: '--max-old-space-size=1536'
    },
    detached: true
  });

  // Important: detached + unref so this child survives parent exit
  child.stdout.on('data', d => {
    const s = d.toString();
    process.stdout.write(s);
    fs.appendFileSync(LOG, s);
  });
  child.stderr.on('data', d => {
    const s = d.toString();
    process.stderr.write(s);
    fs.appendFileSync(LOG, s);
  });
  child.on('exit', (code, sig) => {
    log(`next dev exited code=${code} sig=${sig}. Restarting in 3s...`);
    setTimeout(startApp, 3000);
  });
  child.unref();
}

log('Keep-alive wrapper started.');
startApp();

// Tiny health-check server on port 3001
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('MayaX keep-alive OK\n');
}).listen(3001, '0.0.0.0', () => {
  log('Health check on :3001');
});
