import { NextResponse } from "next/server";
import { readCorreos, readLeads } from "@/lib/hermes";

/** Hermes lee JSON del disco; debe ejecutarse en Node, no en Edge. */
export const runtime = "nodejs";

function mauticEnv() {
  const base = (process.env.MAUTIC_URL ?? "").trim().replace(/\/+$/, "");
  const clientId = (process.env.MAUTIC_CLIENT_ID ?? "").trim();
  const clientSecret = (process.env.MAUTIC_CLIENT_SECRET ?? "").trim();
  return { base, clientId, clientSecret };
}

async function getToken(base: string, clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(`${base}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Token Mautic (${res.status}): ${t.slice(0, 500)}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Token Mautic: respuesta sin access_token");
  }
  return data.access_token;
}

function firstMappedNumericId(collection: unknown): number | null {
  if (!collection || typeof collection !== "object") return null;
  const keys = Object.keys(collection as object).filter((k) => /^\d+$/.test(k));
  return keys.length ? Number(keys[0]) : null;
}

async function ensureContact(
  base: string,
  token: string,
  email: string,
  name: string
): Promise<number> {
  const search = await fetch(
    `${base}/api/contacts?search=email:${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchData = (await search.json()) as { contacts?: Record<string, unknown> };
  const contacts = searchData?.contacts;
  const existing = firstMappedNumericId(contacts);
  if (existing != null) return existing;

  const body = new URLSearchParams();
  body.append("email", email);
  body.append("firstname", name);

  const create = await fetch(`${base}/api/contacts/new`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const raw = await create.text();
  let createData: unknown;
  try {
    createData = raw ? JSON.parse(raw) : null;
  } catch {
    createData = null;
  }
  const cd = createData as { contact?: { id?: number }; lead?: { id?: number } } | null;
  const cid = cd?.contact?.id ?? cd?.lead?.id;
  const n = Number(cid);
  if (!Number.isFinite(n)) {
    throw new Error(
      `Mautic crear contacto (${create.status}): ${raw.slice(0, 500)}`
    );
  }
  return n;
}

function parseEntityIdFromLocation(
  location: string | null,
  segment: "emails" | "segments"
): number | null {
  if (!location) return null;
  const re =
    segment === "emails"
      ? /\/(?:api\/)?emails\/(\d+)/i
      : /\/(?:api\/)?segments\/(\d+)/i;
  const m = location.match(re);
  return m ? Number(m[1]) : null;
}

/** Busca un segmento por alias exacto dentro de la respuesta de /api/segments. */
async function findSegmentByAlias(
  base: string,
  token: string,
  alias: string
): Promise<number | null> {
  const res = await fetch(
    `${base}/api/segments?search=${encodeURIComponent(alias)}&limit=200`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  let data: Record<string, unknown> | null = null;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
  const lists = (data?.lists ?? data?.segments) as Record<string, unknown> | undefined;
  if (!lists || typeof lists !== "object") return null;
  for (const [key, seg] of Object.entries(lists)) {
    if (!/^\d+$/.test(key) || !seg || typeof seg !== "object") continue;
    const s = seg as { id?: unknown; alias?: unknown };
    if (s.alias === alias && s.id != null) {
      const n = Number(s.id);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

/** Segmento/lista: ID real. Busca primero, crea sólo si no existe. */
async function resolveSegmentId(base: string, token: string): Promise<number> {
  const preferred = Number(process.env.MAUTIC_SEGMENT_ID ?? "");
  if (Number.isFinite(preferred) && preferred > 0) {
    const check = await fetch(`${base}/api/segments/${preferred}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (check.ok) return preferred;
  }

  // Buscar por alias exacto antes de intentar crear
  const existing = await findSegmentByAlias(base, token, "boxlybot-leads");
  if (existing != null) return existing;

  const body = new URLSearchParams();
  body.append("name", "Boxlybot Leads");
  body.append("alias", "boxlybot-leads");
  body.append("isPublished", "1");

  const res = await fetch(`${base}/api/segments/new`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const raw = await res.text();
  let data: Record<string, unknown> | null = null;
  try {
    data = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    // Si el alias ya existe, buscar más amplio (get all) y devolver el que coincide
    if (res.status === 400 && raw.includes("already in use")) {
      const retry = await findSegmentByAlias(base, token, "boxlybot-leads");
      if (retry != null) return retry;
    }
    throw new Error(`Mautic crear segmento (${res.status}): ${raw.slice(0, 600)}`);
  }
  const listObj = data?.list as { id?: number } | undefined;
  const segObj = data?.segment as { id?: number } | undefined;
  const id =
    listObj?.id ??
    segObj?.id ??
    firstMappedNumericId(data?.lists) ??
    parseEntityIdFromLocation(res.headers.get("Location"), "segments");
  if (id == null || Number.isNaN(Number(id))) {
    throw new Error(`Mautic segmento: sin id. body=${raw.slice(0, 500)}`);
  }
  return Number(id);
}

async function addToSegment(
  base: string,
  token: string,
  segmentId: number,
  contactId: number
): Promise<void> {
  const res = await fetch(
    `${base}/api/segments/${segmentId}/contact/${contactId}/add`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Mautic añadir a segmento (${res.status}): ${t.slice(0, 400)}`);
  }
}

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
  return firstMappedNumericId(d.emails);
}

async function createEmailTemplate(
  base: string,
  token: string,
  segmentId: number,
  subject: string,
  bodyHtml: string
): Promise<number> {
  const body = new URLSearchParams();
  body.append("name", `Correo Boxlybot - ${subject.slice(0, 40)}`);
  body.append("subject", subject);
  body.append("language", (process.env.MAUTIC_EMAIL_LANGUAGE ?? "en").trim() || "en");
  body.append("lists[0]", String(segmentId));
  body.append("customHtml", bodyHtml);
  body.append("emailType", "template");
  body.append("isPublished", "1");

  const res = await fetch(`${base}/api/emails/new`, {
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
    throw new Error(`Mautic crear email (${res.status}): ${raw.slice(0, 800)}`);
  }
  const fromJson = parseEmailIdFromJson(parsed);
  const fromLoc = parseEntityIdFromLocation(res.headers.get("Location"), "emails");
  const id = fromJson ?? fromLoc;
  if (id == null || Number.isNaN(id)) {
    throw new Error(
      `Mautic crear email: sin id. status=${res.status} location=${res.headers.get("Location")} body=${raw.slice(0, 600)}`
    );
  }
  return id;
}

async function sendEmailToContact(
  base: string,
  token: string,
  emailId: number,
  contactId: number
): Promise<void> {
  const res = await fetch(
    `${base}/api/emails/${emailId}/contact/${contactId}/send`,
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
    throw new Error(`Mautic enviar a contacto (${res.status}): ${text.slice(0, 800)}`);
  }
}

export async function POST(request: Request) {
  try {
    const { base, clientId, clientSecret } = mauticEnv();
    if (!base || !clientId || !clientSecret) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Faltan MAUTIC_URL, MAUTIC_CLIENT_ID o MAUTIC_CLIENT_SECRET (revisa el .env del servidor y reinicia la app).",
        },
        { status: 500 }
      );
    }

    let bodyJson: { correo_id?: string };
    try {
      bodyJson = (await request.json()) as { correo_id?: string };
    } catch {
      return NextResponse.json(
        { ok: false, error: "Cuerpo JSON inválido" },
        { status: 400 }
      );
    }

    const correo_id = bodyJson.correo_id;
    if (!correo_id) {
      return NextResponse.json(
        { ok: false, error: "correo_id requerido" },
        { status: 400 }
      );
    }

    const correos = await readCorreos();
    const correo = correos.find((c) => c.id === correo_id);
    if (!correo) {
      return NextResponse.json(
        { ok: false, error: "Correo no encontrado" },
        { status: 404 }
      );
    }

    const leads = await readLeads();
    const lead = leads.find((l) => l.id === correo.lead_id);

    const token = await getToken(base, clientId, clientSecret);
    const segmentId = await resolveSegmentId(base, token);

    const contactId = await ensureContact(
      base,
      token,
      correo.lead_email,
      lead?.negocio ?? correo.lead_email
    );

    await addToSegment(base, token, segmentId, contactId);

    const bodyHtml = correo.cuerpo_markdown
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");

    const emailId = await createEmailTemplate(
      base,
      token,
      segmentId,
      correo.asunto,
      `<p>${bodyHtml}</p>`
    );

    await sendEmailToContact(base, token, emailId, contactId);

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
