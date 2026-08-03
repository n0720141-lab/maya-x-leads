// Test WhatsApp Baileys connection in isolation
const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const path = require('path');

async function test() {
  console.log('1. Fetching Baileys version...');
  const { version } = await fetchLatestBaileysVersion();
  console.log('   Version:', version);

  console.log('2. Loading auth state...');
  const sessionPath = path.join(process.cwd(), '.wa-sessions', 'test_session');
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  console.log('   Auth state loaded');

  console.log('3. Creating socket...');
  const socket = makeWASocket({
    version,
    auth: { creds: state.creds, keys: state.keys },
    printQRToTerminal: false,
    connectTimeoutMs: 20000,
    defaultQueryTimeoutMs: 20000,
    keepAliveIntervalMs: 60000,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    browser: ['MayaX', 'Chrome', '1.0.0'],
  });
  console.log('   Socket created');

  console.log('4. Waiting for QR code (15s timeout)...');
  let gotQR = false;
  const timeout = setTimeout(() => {
    if (!gotQR) {
      console.log('   TIMEOUT - no QR received in 15s');
      try { socket.end(); } catch {}
      process.exit(1);
    }
  }, 15000);

  socket.ev.on('creds.update', saveCreds);

  socket.ev.on('connection.update', async (update) => {
    const { connection, qr, lastDisconnect } = update;
    console.log('   Update:', { connection, hasQR: !!qr, lastDisconnect: lastDisconnect?.error?.message });

    if (qr && !gotQR) {
      gotQR = true;
      clearTimeout(timeout);
      console.log('   QR CODE RECEIVED! Length:', qr.length);
      try {
        const qrImage = await QRCode.toDataURL(qr, { width: 200, margin: 1 });
        console.log('   QR Image generated, length:', qrImage.length);
        console.log('   SUCCESS!');
      } catch (e) {
        console.log('   QR generation failed:', e.message);
        console.log('   Raw QR string:', qr.substring(0, 50) + '...');
      }
      try { socket.end(); } catch {}
      process.exit(0);
    }

    if (connection === 'open') {
      console.log('   CONNECTED!');
      try { socket.end(); } catch {}
      process.exit(0);
    }

    if (connection === 'close') {
      console.log('   Connection closed');
    }
  });

  socket.ev.on('error', (err) => {
    console.log('   Socket error:', err.message || err);
  });
}

test().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
