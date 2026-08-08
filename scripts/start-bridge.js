const smpp = require('smpp');
const http = require('http');
const https = require('https');

const SMPP_HOST = process.env.SMPP_HOST || '192.168.0.179';
const SMPP_PORT = parseInt(process.env.SMPP_PORT || '20002', 10);
const SMPP_USER = process.env.SMPP_USER || 'leadsminer_in';
const SMPP_PASS = process.env.SMPP_PASS || 'Sign4321';
const CLOUD_URL = process.env.CLOUD_URL || 'https://maya-x-leads.vercel.app/api/messaging/inbound';

console.log('====================================================');
console.log('🚀 MAYAX SIM BOX SMPP INBOUND AUTOMATION BRIDGE');
console.log('====================================================');
console.log(`📡 Connecting to SIM Box SMPP at ${SMPP_HOST}:${SMPP_PORT} as ${SMPP_USER}...`);
console.log(`🌐 DeepSeek AI Auto-Reply Cloud Webhook: ${CLOUD_URL}\n`);

function normalizePhone(phone) {
  let d = String(phone || '').replace(/[^\d]/g, '');
  if (!d) return '';
  if (d.length === 10) d = '1' + d;
  if (d.length > 11) d = '1' + d.slice(-10);
  return d;
}

function pduText(pdu) {
  try {
    if (pdu.short_message && pdu.short_message.message) return pdu.short_message.message;
    if (Buffer.isBuffer(pdu.short_message)) return pdu.short_message.toString('utf8');
    if (typeof pdu.short_message === 'string') return pdu.short_message;
  } catch (_) {}
  return '';
}

function startBridge() {
  try {
    const session = smpp.connect({
      url: `smpp://${SMPP_HOST}:${SMPP_PORT}`,
      auto_enquire_link_period: 15000,
      debug: false
    });

    session.on('error', (err) => {
      console.error('⚠️ SMPP Connection error:', err.message || err);
    });

    session.on('close', () => {
      console.warn('⚠️ SMPP Connection closed. Reconnecting in 5 seconds...');
      setTimeout(startBridge, 5000);
    });

    session.bind_transceiver(
      { system_id: SMPP_USER, password: SMPP_PASS, system_type: '', interface_version: 0x34 },
      (pdu) => {
        if (!pdu || pdu.command_status !== 0) {
          console.error('❌ SMPP Bind Failed status:', pdu ? pdu.command_status : 'no_pdu');
          return;
        }

        console.log('✅ SMPP INBOUND BRIDGE BOUND & ACTIVE!');
        console.log('📱 Ready! Waiting for customer SMS replies on SIM cards...\n');

        session.on('deliver_sm', (pdu2) => {
          try {
            try { session.deliver_sm_resp({ sequence_number: pdu2.sequence_number }); } catch (_) {}
            
            const from = normalizePhone(pdu2.source_addr || '');
            const msg = String(pduText(pdu2) || '').replace(/\u0000/g, '').trim();

            if (!from || !msg) return;

            console.log(`\n📩 INBOUND SMS RECEIVED from ${from}: "${msg}"`);
            console.log('⚡ Triggering DeepSeek AI Auto-Reply...');

            const payload = JSON.stringify({
              phone: from,
              content: msg,
              channel: 'sms',
              fromPort: '1.01'
            });

            const reqUrl = new URL(CLOUD_URL);
            const transport = reqUrl.protocol === 'https:' ? https : http;

            const req = transport.request(CLOUD_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
              },
              timeout: 15000
            }, (res) => {
              let resData = '';
              res.on('data', chunk => { resData += chunk; });
              res.on('end', () => {
                console.log('✅ DeepSeek AI Auto-Reply Sent Result:', resData);
              });
            });

            req.on('error', (e) => {
              console.error('❌ Failed to trigger Auto-Reply:', e.message);
            });

            req.write(payload);
            req.end();
          } catch (e) {
            console.error('Error handling deliver_sm:', e);
          }
        });
      }
    );
  } catch (e) {
    console.error('Failed to start SMPP session:', e);
    setTimeout(startBridge, 5000);
  }
}

startBridge();
