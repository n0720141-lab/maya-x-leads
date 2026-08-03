// Persistent launcher — keeps both services alive
import { spawn } from 'child_process'
import http from 'http'
import fs from 'fs'

const LOG = '/tmp/mayax-services.log'
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`
  console.log(line)
  try { fs.appendFileSync(LOG, line + '\n') } catch {}
}

function startWhatsAppService() {
  log('Starting WhatsApp service...')
  const child = spawn('node', ['/home/z/my-project/scripts/whatsapp-service.mjs'], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
    detached: true
  })
  child.stdout.on('data', d => {
    const s = d.toString()
    process.stdout.write(s)
    try { fs.appendFileSync(LOG, s) } catch {}
  })
  child.stderr.on('data', d => {
    const s = d.toString()
    process.stderr.write(s)
    try { fs.appendFileSync(LOG, s) } catch {}
  })
  child.on('exit', (code, sig) => {
    log(`WhatsApp service exited code=${code} sig=${sig}. Restarting in 3s...`)
    setTimeout(startWhatsAppService, 3000)
  })
  child.unref()
}

function startNextJs() {
  log('Starting Next.js dev server...')
  const child = spawn('node', ['node_modules/next/dist/bin/next', 'dev', '-p', '3000', '-H', '0.0.0.0'], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      DATABASE_URL: 'file:/home/z/my-project/db/custom.db',
      NODE_ENV: 'development',
      PORT: '3000',
      HOSTNAME: '0.0.0.0',
      NODE_OPTIONS: '--max-old-space-size=1024'
    },
    detached: true
  })
  child.stdout.on('data', d => {
    const s = d.toString()
    process.stdout.write(s)
    try { fs.appendFileSync(LOG, s) } catch {}
  })
  child.stderr.on('data', d => {
    const s = d.toString()
    process.stderr.write(s)
    try { fs.appendFileSync(LOG, s) } catch {}
  })
  child.on('exit', (code, sig) => {
    log(`Next.js exited code=${code} sig=${sig}. Restarting in 3s...`)
    setTimeout(startNextJs, 3000)
  })
  child.unref()
}

log('=== MayaX Services Launcher Started ===')
startWhatsAppService()
setTimeout(startNextJs, 2000)

// Health endpoint on port 3001
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ok: true, time: new Date().toISOString() }))
}).listen(3001, '0.0.0.0', () => {
  log('Health check on :3001')
})
