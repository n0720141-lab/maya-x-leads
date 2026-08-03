import { spawn } from 'child_process';
import http from 'http';

function startApp() {
  const child = spawn('npx', ['next', 'start', '-p', '3000'], {
    cwd: '/home/z/my-project',
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, PORT: '3000', HOSTNAME: '0.0.0.0' }
  });
  child.stdout.on('data', d => process.stdout.write(d));
  child.stderr.on('data', d => process.stderr.write(d));
  child.on('exit', () => {
    console.error('[keepalive] next exited, restarting in 2s...');
    setTimeout(startApp, 2000);
  });
  return child;
}

// Also create a tiny health server on 3001 so something is always listening
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('alive');
}).listen(3001, '0.0.0.0', () => {
  console.log('Health server on :3001');
});

startApp();
console.log('Keep-alive wrapper started');
