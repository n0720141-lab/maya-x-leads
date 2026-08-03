# MayaX — Client Requirements (ALLI1985)
# DO NOT DELETE — This is the source of truth

## Client: Ali (alli1985)
## Date: July 16-19, 2026
## Platform: Fiverr → Farhan Aziz

---

## CURRENT SETUP (Client Already Has):
- Node.js server with send-node + relay
- Google Sheets service account → leads read karta hai
- DeepSeek AI API integrated (knowledge file controls behavior)
- SMS bulk SIM blaster (Skyline device on 192.168.1.16)
- SMPP protocol for inbound messages
- Sticky port (same SIM/slot replies to same customer)
- Webhooks qualified leads to CRM
- Scrapes: Name, Number, Email, Interested car, Location, Credit score, Bankruptcy, Appointment date

---

## CORE REQUIREMENTS:

### 1. SMS System:
- Use client's EXISTING Skyline SIM Box (NOT Twilio)
- HTTP API: 192.168.1.16 port 80
- SMPP inbound bridge (port 20002)
- Sticky port: same SIM/slot/number for replies to same customer
- Anti-ban: random delays, batching

### 2. WhatsApp System:
- Use Baileys / whatsapp-web.js (NOT official Meta Business API)
- QR code scan approach (like WhatsApp Web)
- FREE — no per-message fees
- Anti-ban: typing simulation (letter by letter), random delays
- Anti-ban delays and message-throttling via queue

### 3. Email System:
- Bulk email sending
- SMTP integration

### 4. Multi-Channel Workflow (CRITICAL):
- Initial message sent on ALL 3 channels (SMS + WhatsApp + Email)
- Customer replies on ONE channel → that becomes ACTIVE channel
- Stop sending on other 2 channels
- If customer switches channel mid-conversation → system switches too
- NEVER reply on all 3 channels at once for same conversation

### 5. Randomization & Batching (Anti-Ban):
- Random delay between messages (0-10 sec, CONFIGURABLE)
- Batch sending (e.g., 400 leads per batch, CONFIGURABLE)
- Sleep between batches (e.g., 10 sec, CONFIGURABLE)
- WhatsApp: typing simulation (letter by letter, human-like)
- All timing settings must be CONFIGURABLE

### 6. Volume:
- 25,000 leads/day currently
- Scaling to 50,000+
- Must handle high volume efficiently

### 7. Super Admin Global Messaging Settings:
- Batch size (adjustable)
- Sleep time between batches (adjustable)
- Random delay range (adjustable)
- All timing settings (adjustable)
- ALL businesses use SAME SIM box infrastructure
- Super Admin defines messaging rules, all tenants follow

### 8. Panel/CRM Features:
- Manage questions (add/remove/customize)
- Personality settings for AI
- Knowledge base management
- Instructions for AI
- Scrape fields configuration
- Workflow Automation on dashboard

### 9. Multi-Tenant SaaS:
- Other companies sign up
- Pay subscription (industry-specific pricing)
- Industry-specific subscription packages (NOT same for all)
- Pricing shows at signup when choosing industry (NOT on homepage)

### 10. Google Sheets Integration:
- Client's existing setup: leads from Google Sheets
- Service account auth

### 11. AI (DeepSeek):
- Qualify leads through conversation
- Extract: vehicle, income, credit, trade-in, down payment, etc.
- Auto-reply based on knowledge file
- Detect: not interested, wrong number, stop words

### 12. Webhook to CRM:
- Qualified lead data webhook to CRM
- Fields: Name, Number, Email, Interested car, Location, Credit score, Bankruptcy, Appointment date

---

## UI NOTES:
- Homepage too long — needs trimming (LATER)
- Dashboard looks good
- Add Workflow Automation to dashboard
- UI changes LATER — client said "I don't care about UI"
- Client priority: "I need see the msg function working"

---

## WHAT CLIENT EXPLICITLY SAID NO TO:
- NO official WhatsApp Business API
- NO Twilio for SMS (use own SIM box)
- NO pricing on homepage

---

## CLIENT'S EXACT WORDS:
- "If SIMbox integration and WhatsApp bulk messaging doesn't work properly, the whole platform is useless for us"
- "I need see the msg function working I don't care about UI"
- "Complete the functions after create login. We will fix the UI later"
- "Dashboard looks good, just add Workflow Automation"