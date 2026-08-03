/**
 * Old system initial outreach message generator (ported from send.js)
 * Generates human-like, rotating initial outreach messages for auto financing leads.
 */

import fs from 'fs'
import path from 'path'

const AGENT_NAMES = [
  'Maria', 'Sarah', 'Emily', 'Chloe', 'Jessica', 'Ashley', 'Amanda', 'Hannah', 
  'Olivia', 'Sophie', 'Emma', 'Lauren', 'Megan', 'Nicole', 'Rachel', 'Brittany', 
  'Daniel', 'Michael', 'Alex', 'Ryan', 'Kevin', 'Jason', 'Chris', 'Andrew', 
  'Matthew', 'John', 'Mark', 'David', 'Brian', 'Justin', 'Tyler'
]

const COMPANY_NAMES = [
  'Approval Group', 'Approved Rides', 'Approval Motors', 'Approval Autos', 
  'Approved Now', 'Approval Firm', 'Approvals Today'
]

const INTRO_TEMPLATES = [
  (first: string, agent: string, company: string) => `Hi ${first}, it's ${agent} from ${company}.`,
  (first: string, agent: string, company: string) => `Hey ${first} - ${agent} here at ${company}.`,
  (first: string, agent: string, company: string) => `${first}, ${agent} with ${company}.`,
  (first: string, agent: string, company: string) => `Hello ${first}, this is ${agent} at ${company}.`,
  (first: string, agent: string, company: string) => `Quick question ${first} - ${agent} from ${company}.`
]

const INTRO_NO_NAME_TEMPLATES = [
  (agent: string, company: string) => `Hi, it's ${agent} from ${company}.`,
  (agent: string, company: string) => `Hey - ${agent} here at ${company}.`,
  (agent: string, company: string) => `Hello, this is ${agent} at ${company}.`
]

const BODY_VARIATIONS = [
  "Looking for a new ride?\nWe work with all credit & income types.",
  "Need a car, truck, or SUV?\nWe work with flexible credit & income.",
  "Thinking about a new ride?\nAll credit & income types welcome.",
  "Looking to upgrade your ride?\nWe help with all credit & income types.",
  "Need wheels?\nWe work with all credit backgrounds & income levels.",
  "Shopping for a vehicle?\nWe help with all credit & income types.",
  "Ready for a new ride?\nAll credit types & income levels welcome.",
  "Looking for auto financing?\nWe work with all credit & income types.",
  "Need help getting a vehicle?\nWe support all credit & income types.",
  "Want a car, truck, or SUV?\nWe work with flexible credit & income."
]

const LENDER_LINES = [
  'Lenders: RBC, TD, SDA, AI Auto & more.',
  'Lenders include RBC, TD, SDA, AI Auto & more.',
  'Funding options include RBC, TD, SDA, AI Auto & more.',
  'Approvals available with RBC, TD, SDA, AI Auto & more.',
  'Access lenders like RBC, TD, SDA, AI Auto & more.',
  'We work with RBC, TD, SDA, AI Auto & more.'
]

const CTA_LINES = [
  'Reply with the vehicle you want to finance.',
  'Reply with the vehicle you need.',
  'Reply with the car you are looking for.',
  'Reply with the car you would like to purchase.',
  'Reply with the truck or SUV you are looking for.'
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateInitialOutreachMessage(name?: string): string {
  const fullName = (name || '').trim()
  const first = fullName ? fullName.split(/\s+/)[0] : ''

  const agent = pick(AGENT_NAMES)
  const company = pick(COMPANY_NAMES)
  
  const intro = first 
    ? pick(INTRO_TEMPLATES)(first, agent, company)
    : pick(INTRO_NO_NAME_TEMPLATES)(agent, company)
    
  const body = pick(BODY_VARIATIONS)
  const lendersLine = pick(LENDER_LINES)
  const cta = pick(CTA_LINES)

  return `${intro}\n${body}\n${lendersLine}\n${cta}`
}

const EMAIL_SUBJECT_SPINS = [
  (first: string) => first ? `Hi ${first}` : `Hi there`,
  (first: string) => first ? `Hey ${first}` : `Hey there`,
  (first: string) => first ? `Quick question ${first}` : `Quick question`,
]

const EMAIL_BODY_SPINS = [
  (first: string, agent: string) => `${first ? `Hi ${first},` : `Hi,`}

Hope you're having a good week. Reaching out regarding your vehicle inquiry.

We work with a network of financing partners to help buyers explore flexible payment options for cars, trucks, and SUVs.

Are you currently shopping for a specific make or model? Reply back with what you're looking for and I'll check available options for you.

Best regards,
${agent}`,

  (first: string, agent: string) => `${first ? `Hey ${first},` : `Hey,`}

Reaching out about your vehicle search. Our network of financing partners helps arrange vehicle options for all credit backgrounds.

What type of vehicle (car, truck, or SUV) are you looking to get right now? Reply back and I'll send over what's available.

Thanks,
${agent}`,

  (first: string, agent: string) => `${first ? `Hello ${first},` : `Hello,`}

Quick follow up regarding your vehicle request. We connect buyers with financing partners to explore options that fit your situation.

If you're interested, let me know what vehicle (sedan, truck, or SUV) you have in mind and I'll see what options are open.

Regards,
${agent}`,
]

const EMAIL_AGENTS = ['Chloe', 'Sarah', 'Emily', 'Ayesha']

/**
 * Primary Inbox Email Generator (Simple Subject + Vehicle & Financing Copy)
 */
export function generateHumanEmailPayload(name?: string): { subject: string; body: string; textBody: string } {
  const fullName = (name || '').trim()
  const first = (fullName && fullName !== 'Lead') ? fullName.split(/\s+/)[0] : ''
  const agent = pick(EMAIL_AGENTS)

  try {
    const customFilePath = path.join(process.cwd(), 'FIRST_EMAIL_TEMPLATE.txt')
    if (fs.existsSync(customFilePath)) {
      const content = fs.readFileSync(customFilePath, 'utf-8')
      let subject = 'Quick question regarding your vehicle inquiry'
      let bodyLines = content

      if (content.startsWith('Subject:')) {
        const firstLineEnd = content.indexOf('\n')
        if (firstLineEnd !== -1) {
          subject = content.substring(8, firstLineEnd).trim()
          bodyLines = content.substring(firstLineEnd + 1).trim()
        }
      }

      subject = subject.replace(/\{name\}/gi, first || 'there').replace(/\{agent\}/gi, agent)
      bodyLines = bodyLines.replace(/\{name\}/gi, first || 'there').replace(/\{agent\}/gi, agent)

      return { subject, body: bodyLines, textBody: bodyLines }
    }
  } catch (err) {
    console.error('Error reading FIRST_EMAIL_TEMPLATE.txt:', err)
  }

  const subject = pick(EMAIL_SUBJECT_SPINS)(first)
  const plainText = pick(EMAIL_BODY_SPINS)(first, agent)

  return { subject, body: plainText, textBody: plainText }
}
