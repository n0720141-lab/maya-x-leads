import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";
import { generateInitialOutreachMessage } from "@/lib/messaging/templates";
import * as XLSX from "xlsx";

/**
 * Format raw cell values into clean phone strings
 */
function cleanPhoneValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  let s = String(val).trim();
  if (typeof val === "number") {
    s = val.toLocaleString("fullwide", { useGrouping: false });
  } else if (s.includes("e+") || s.includes("E+")) {
    const num = Number(s);
    if (!isNaN(num)) s = num.toLocaleString("fullwide", { useGrouping: false });
  }
  return s.replace(/[^\d+]/g, "");
}

export interface ParsedLeadItem {
  name?: string;
  phone: string;
  email?: string;
  whatsapp?: string;
  channel: string;
  hasSimBox: boolean;
  hasWhatsApp: boolean;
}

/**
 * Smart Positional Text Row Parser:
 * 1. Supports Phone + Email, Email-only, Phone-only, or WhatsApp-only formats
 * 2. Number BEFORE Email = Phone / SIM Box
 * 3. Number AFTER Email = WhatsApp
 */
function parsePastedTextLeads(rawText: string): ParsedLeadItem[] {
  const leadItems: ParsedLeadItem[] = [];
  const seenKeys = new Set<string>();

  const lines = rawText.split(/\r?\n/);
  for (const line of lines) {
    let trimmed = line.trim();
    if (!trimmed) continue;

    // Check if line explicitly specifies WhatsApp (e.g. "ali wa +92 347 5038010")
    const isExplicitWa = /\b(wa|whatsapp)\b/i.test(trimmed);

    // Smart pre-normalize phone numbers with spaces/parentheses/dashes
    trimmed = trimmed.replace(/(\+?[\d()][\d\s()-]{5,22}\d)/g, (match) => {
      const digits = match.replace(/[^\d+]/g, "");
      return digits.length >= 7 && digits.length <= 15 ? digits : match;
    });

    const tokens = trimmed.split(/[\t,;]+|\s+/).filter(Boolean);

    // Find email index if present
    let emailIdx = -1;
    let emailVal = "";
    tokens.forEach((token, idx) => {
      if (token.includes("@") && emailIdx === -1) {
        const emMatch = token.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emMatch) {
          emailVal = emMatch[0].toLowerCase();
          emailIdx = idx;
        }
      }
    });

    let simBoxPhone = "";
    let whatsappPhone = "";
    const nameParts: string[] = [];

    tokens.forEach((token, idx) => {
      if (idx === emailIdx) return;
      if (/^(wa|whatsapp|wa:|whatsapp:)$/i.test(token)) return;

      const digits = cleanPhoneValue(token);
      const isPhoneCandidate = digits.length >= 7 && digits.length <= 15;

      if (isPhoneCandidate) {
        if (isExplicitWa) {
          if (!whatsappPhone) whatsappPhone = digits;
        } else if (emailIdx !== -1) {
          if (idx < emailIdx) {
            if (!simBoxPhone) simBoxPhone = digits;
          } else {
            if (!whatsappPhone) whatsappPhone = digits;
          }
        } else {
          if (!simBoxPhone) {
            simBoxPhone = digits;
          } else if (!whatsappPhone) {
            whatsappPhone = digits;
          }
        }
      } else {
        if (!/^(name|phone|email|whatsapp|mobile|contact|status|date|time)$/i.test(token)) {
          nameParts.push(token);
        }
      }
    });

    const nameVal = nameParts.join(" ") || "Lead";

    const primaryPhone = whatsappPhone || simBoxPhone;
    const finalPhone = primaryPhone && primaryPhone.length >= 7 ? primaryPhone : "N/A";
    const mainChannel = isExplicitWa ? "whatsapp" : (whatsappPhone && !simBoxPhone) ? "whatsapp" : simBoxPhone ? "sms" : "email";

    const hasSimBox = isExplicitWa ? false : Boolean(simBoxPhone);
    const hasWhatsApp = isExplicitWa ? true : Boolean(whatsappPhone);

    const leadKey = finalPhone !== "N/A" ? finalPhone : (emailVal ? emailVal.toLowerCase() : "");

    if (leadKey) {
      if (!seenKeys.has(leadKey)) {
        seenKeys.add(leadKey);
        leadItems.push({
          name: nameVal,
          phone: finalPhone,
          email: emailVal || undefined,
          whatsapp: whatsappPhone || undefined,
          channel: mainChannel,
          hasSimBox,
          hasWhatsApp,
        });
      }
    }
  }

  return leadItems;
}

/**
 * Universal Cell & Header Scanner for ANY Excel / WPS / CSV format
 */
function parseWorksheetLeads(workbook: XLSX.WorkBook): ParsedLeadItem[] {
  const leadItems: ParsedLeadItem[] = [];
  const seenKeys = new Set<string>();

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet || !worksheet["!ref"]) continue;

    const range = XLSX.utils.decode_range(worksheet["!ref"]);

    for (let R = range.s.r; R <= range.e.r; ++R) {
      let nameVal = "";
      let phoneVal = "";
      let emailVal = "";
      let waVal = "";

      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        if (!cell) continue;

        const cellRawStr = String(cell.v !== undefined ? cell.v : (cell.w || "")).trim();

        if (cellRawStr.includes("@") && !emailVal) {
          emailVal = cellRawStr;
          continue;
        }

        const digits = cleanPhoneValue(cell.v !== undefined ? cell.v : cell.w);
        if (digits.length >= 7 && digits.length <= 15) {
          if (!/^(name|phone|email|whatsapp|mobile|contact|status|date|time)/i.test(cellRawStr)) {
            if (!phoneVal) {
              phoneVal = digits;
            } else if (!waVal && digits !== phoneVal) {
              waVal = digits;
            }
            continue;
          }
        }

        if (cellRawStr && !/^\d+$/.test(cellRawStr) && !cellRawStr.includes("@")) {
          if (!/^(name|phone|email|whatsapp|mobile|contact|status|date|time)/i.test(cellRawStr)) {
            if (!nameVal) {
              nameVal = cellRawStr;
            }
          }
        }
      }

      const finalPhone = phoneVal && phoneVal.length >= 7 ? phoneVal : "N/A";
      const leadKey = finalPhone !== "N/A" ? finalPhone : (emailVal ? emailVal.toLowerCase() : "");

      if (leadKey) {
        if (!seenKeys.has(leadKey)) {
          seenKeys.add(leadKey);
          leadItems.push({
            name: nameVal || (emailVal ? emailVal.split('@')[0] : (finalPhone !== "N/A" ? "Lead #" + finalPhone.slice(-4) : "Imported Lead")),
            phone: finalPhone,
            email: emailVal || undefined,
            whatsapp: waVal || undefined,
            channel: finalPhone !== "N/A" ? "sms" : "email",
            hasSimBox: finalPhone !== "N/A",
            hasWhatsApp: Boolean(waVal),
          });
        }
      }
    }
  }

  return leadItems;
}

/**
 * POST /api/leads/import
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;

    let leadItems: ParsedLeadItem[] = [];

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided." }, { status: 400 });
      }

      const arrayBuf = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: true });

      leadItems = parseWorksheetLeads(workbook);
    } else {
      const body = (await req.json().catch(() => ({}))) as {
        csvText?: string;
        leads?: ParsedLeadItem[];
      };

      if (Array.isArray(body.leads) && body.leads.length > 0) {
        leadItems = body.leads;
      } else if (body.csvText) {
        leadItems = parsePastedTextLeads(body.csvText);

        if (leadItems.length === 0) {
          const workbook = XLSX.read(body.csvText, { type: "string", raw: true });
          leadItems = parseWorksheetLeads(workbook);
        }
      }
    }

    if (leadItems.length === 0) {
      return NextResponse.json({ error: "No valid leads found in the uploaded text." }, { status: 400 });
    }

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of leadItems) {
      let phone = item.phone === "N/A" ? "N/A" : item.phone.replace(/[^\d+]/g, "");
      if (phone !== "N/A" && phone.length === 10) phone = "+1" + phone;

      const rawEm = item.email ? String(item.email).trim() : "";
      const emMatch = rawEm.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      const cleanEmailVal = emMatch ? emMatch[0].toLowerCase() : null;

      const channelTag = JSON.stringify({
        hasSimBox: item.hasSimBox,
        hasWhatsApp: item.hasWhatsApp,
        whatsappNum: item.whatsapp || null,
      });

      // Find existing lead by phone or email
      let existing = null;
      if (phone !== "N/A") {
        existing = await db.lead.findFirst({ where: { tenantId, phone } });
      } else if (cleanEmailVal) {
        existing = await db.lead.findFirst({ where: { tenantId, email: cleanEmailVal } });
      }

      if (existing) {
        await db.lead.update({
          where: { id: existing.id },
          data: {
            name: item.name && item.name !== "Lead" ? item.name : existing.name,
            email: cleanEmailVal || existing.email,
            channel: item.channel || existing.channel,
            notes: channelTag,
          },
        });
        updatedCount++;
        continue;
      }

      const lead = await db.lead.create({
        data: {
          tenantId,
          phone: phone || "N/A",
          name: item.name || null,
          email: cleanEmailVal,
          channel: item.channel || "email",
          notes: channelTag,
          status: "new",
          source: "text_upload",
        },
      });

      await db.conversation.create({
        data: {
          tenantId,
          leadId: lead.id,
          channel: lead.channel,
          state: "IDLE",
          messages: JSON.stringify([
            {
              direction: "outbound",
              text: generateInitialOutreachMessage(lead.name || undefined),
              timestamp: new Date().toISOString(),
            },
          ]),
        },
      });

      createdCount++;
    }

    if (createdCount > 0 || updatedCount > 0) {
      await db.usageLog.create({
        data: {
          tenantId,
          type: "lead_imported",
          count: createdCount + updatedCount,
          date: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      createdCount,
      updatedCount,
      totalProcessed: leadItems.length,
      message: `Successfully processed ${createdCount + updatedCount} leads (${createdCount} new created, ${updatedCount} updated).`,
    });
  } catch (error) {
    console.error("Excel/CSV import error:", error);
    return NextResponse.json({ error: "Internal server error during file processing." }, { status: 500 });
  }
}
