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
  return createData?.contact?.id ?? createData?.lead?.id;
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

async function createEmailTemplate(
  token: string,
  subject: string,
  bodyHtml: string
): Promise<number> {
  const res = await fetch(`${MAUTIC_URL}/api/emails/new`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `Correo Boxlybot - ${subject.slice(0, 40)}`,
      subject,
      customHtml: bodyHtml,
      emailType: "list",
      isPublished: 1,
    }),
  });
  const data = await res.json();
  return data?.email?.id;
}

async function sendEmail(
  token: string,
  emailId: number,
  segmentId: number
): Promise<void> {
  const res = await fetch(`${MAUTIC_URL}/api/emails/${emailId}/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ list: String(segmentId) }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mautic send error (${res.status}): ${text}`);
  }
}

export async function POST(request: Request) {
  try {
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
      correo.asunto,
      `<p>${bodyHtml}</p>`
    );

    await sendEmail(token, emailId, SEGMENT_ID);

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
