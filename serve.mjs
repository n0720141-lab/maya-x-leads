import { createServer } from 'http';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Start Next.js as child process and keep it alive
const child = spawn('npx', ['next', 'start', '-p', '3000', '-H', '0.0.0.0'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  console.log('Next.js exited with code', code, '— restarting in 1s...');
  setTimeout(() => process.exit(1), 1000);
});

import { spawn } from 'child_process';
