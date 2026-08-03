import { spawn } from 'child_process';
import path from 'path';

const projectDir = process.cwd();

console.log('[MayaX] Starting WhatsApp microservice on port 3002...');
const waService = spawn('node', [path.join(projectDir, 'scripts', 'whatsapp-service.mjs')], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
});

console.log('[MayaX] Starting Gmail Inbox Poller microservice...');
const gmailPoller = spawn('node', [path.join(projectDir, 'scripts', 'gmail-poller.mjs')], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
});

console.log('[MayaX] Starting Next.js dev server on port 3000...');
const nextDev = spawn('npx', ['next', 'dev', '-p', '3000'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
});

function cleanup() {
  console.log('[MayaX] Shutting down services...');
  try { waService.kill(); } catch {}
  try { gmailPoller.kill(); } catch {}
  try { nextDev.kill(); } catch {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
