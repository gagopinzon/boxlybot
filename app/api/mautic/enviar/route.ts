import { NextResponse } from "next/server";
import { readCorreos, readLeads } from "@/lib/hermes";

const MAUTIC_URL = process.env.MAUTIC_URL!;
const CLIENT_ID = process.env.MAUTIC_CLIENT_ID!;
const CLIENT_SECRET = process.env.MAUTIC_CLIENT_SECRET!;

async function getToken(): Promise<string> {
  const res = await fetch(`${MAUTIC_URL}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Error getting token: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function ensureContact(
  token: string,
  email: string,
  name: string
): Promise<number> {
  const search = await fetch(
    `${MAUTIC_URL}/api/contacts?search=email:${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchData = await search.json();
  const contacts = searchData?.contacts;
  if (contacts && Object.keys(contacts).length > 0) {
    return parseInt(Object.keys(contacts)[0]);
  }

  const create = await fetch(`${MAUTIC_URL}/api/contacts/new`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, firstname: name }),
  });
  const createData = await create.json();
  const cid = createData?.contact?.id ?? createData?.lead?.id;
  const n = Number(cid);
  if (!Number.isFinite(n)) {
    throw new Error(
      `Mautic crear contacto: sin id (${create.status}). ${JSON.stringify(createData).slice(0, 400)}`
    );
  }
  return n;
}

async function ensureSegment(token: string, segmentId: number): Promise<void> {
  const check = await fetch(`${MAUTIC_URL}/api/segments/${segmentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (check.ok) return;

  await fetch(`${MAUTIC_URL}/api/segments/new`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Boxlybot Leads",
      alias: "boxlybot-leads",
      isGlobal: 1,
      filters: [],
    }),
  });
}

async function addToSegment(
  token: string,
  segmentId: number,
  contactId: number
): Promise<void> {
  await fetch(
    `${MAUTIC_URL}/api/segments/${segmentId}/contact/${contactId}/add`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } }
  );
}

/** Symfony rellena $request->request con form-urlencoded; con JSON suele quedar vacío. */
function parseEmailIdFromJson(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const fromObj = (o: unknown): number | null => {
    if (!o || typeof o !== "object") return null;
    const id = (o as { id?: unknown }).id;
    if (typeof id === "number" && !Number.isNaN(id)) return id;
    if (typeof id === "string" && /^\d+$/.test(id)) return Number(id);
    return null;
  };
  const direct = fromObj(d.email);
  if (direct != null) return direct;
  if (typeof d.id === "number" && !Number.isNaN(d.id)) return d.id;
  if (typeof d.id === "string" && /^\d+$/.test(d.id)) return Number(d.id);
  const emails = d.emails;
  if (emails && typeof emails === "object") {
    const keys = Object.keys(emails as object);
    if (keys.length && /^\d+$/.test(keys[0])) return Number(keys[0]);
  }
  return null;
}

function parseEmailIdFromLocation(location: string | null): number | null {
  if (!location) return null;
  const m = location.match(/\/(?:api\/)?emails\/(\d+)/i);
  return m ? Number(m[1]) : null;
}

/**
 * Crea el email vía form-urlencoded (compatible con el Form de Mautic).
 * Envío a un solo contacto: POST /emails/{id}/contact/{contactId}/send
 */
async function createEmailTemplate(
  token: string,
  segmentId: number,
  subject: string,
  bodyHtml: string
): Promise<number> {
  const body = new URLSearchParams();
  body.append("name", `Correo Boxlybot - ${subject.slice(0, 40)}`);
  body.append("subject", subject);
  body.append("language", "en");
  body.append("lists[]", String(segmentId));
  body.append("customHtml", bodyHtml);
  body.append("emailType", "list");
  body.append("isPublished", "1");

  const res = await fetch(`${MAUTIC_URL}/api/emails/new`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const raw = await res.text();
  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  if (!res.ok) {
    throw new Error(
      `Mautic crear email (${res.status}): ${raw.slice(0, 800)}`
    );
  }
  const fromJson = parseEmailIdFromJson(parsed);
  const fromLoc = parseEmailIdFromLocation(res.headers.get("Location"));
  const id = fromJson ?? fromLoc;
  if (id == null || Number.isNaN(id)) {
    throw new Error(
      `Mautic crear email: sin id en respuesta. status=${res.status} location=${res.headers.get("Location")} body=${raw.slice(0, 600)}`
    );
  }
  return id;
}

async function sendEmailToContact(
  token: string,
  emailId: number,
  contactId: number
): Promise<void> {
  const res = await fetch(
    `${MAUTIC_URL}/api/emails/${emailId}/contact/${contactId}/send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mautic send error (${res.status}): ${text}`);
  }
}

export async function POST(request: Request) {
  try {
    if (!MAUTIC_URL || !CLIENT_ID || !CLIENT_SECRET) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Faltan MAUTIC_URL, MAUTIC_CLIENT_ID o MAUTIC_CLIENT_SECRET en el entorno.",
        },
        { status: 500 }
      );
    }

    const { correo_id } = await request.json();
    if (!correo_id) {
      return NextResponse.json(
        { error: "correo_id requerido" },
        { status: 400 }
      );
    }

    const correos = await readCorreos();
    const correo = correos.find((c) => c.id === correo_id);
    if (!correo) {
      return NextResponse.json(
        { error: "Correo no encontrado" },
        { status: 404 }
      );
    }

    const leads = await readLeads();
    const lead = leads.find((l) => l.id === correo.lead_id);

    const token = await getToken();

    const SEGMENT_ID = 4;
    await ensureSegment(token, SEGMENT_ID);

    const contactId = await ensureContact(
      token,
      correo.lead_email,
      lead?.negocio ?? correo.lead_email
    );

    await addToSegment(token, SEGMENT_ID, contactId);

    const bodyHtml = correo.cuerpo_markdown
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");

    const emailId = await createEmailTemplate(
      token,
      SEGMENT_ID,
      correo.asunto,
      `<p>${bodyHtml}</p>`
    );

    await sendEmailToContact(token, emailId, contactId);

    return NextResponse.json({
      ok: true,
      message: `Correo enviado a ${correo.lead_email}`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    console.error("Error enviando correo:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
