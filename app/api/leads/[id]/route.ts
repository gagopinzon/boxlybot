import { NextResponse } from "next/server";
import { readCorreos, readLeads, updateCorreoById } from "@/lib/hermes";
import type { Correo } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

function correosForLead(correos: Correo[], leadId: string): Correo[] {
  return [...correos.filter((c) => c.lead_id === leadId)].sort(
    (a, b) =>
      new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime(),
  );
}

export async function GET(_request: Request, context: Params) {
  const { id } = await context.params;
  const leads = await readLeads();
  const correos = await readCorreos();
  const lead = leads.find((l) => l.id === id);
  if (!lead) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }
  const list = correosForLead(correos, lead.id);
  const correo = list[0] ?? null;
  return NextResponse.json({ lead, correos: list, correo });
}

export async function PATCH(request: Request, context: Params) {
  const { id } = await context.params;
  const leads = await readLeads();
  const correos = await readCorreos();
  const lead = leads.find((l) => l.id === id);
  if (!lead) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }
  const list = correosForLead(correos, lead.id);
  const body = (await request.json().catch(() => ({}))) as {
    correo_id?: unknown;
    cuerpo_markdown?: unknown;
    asunto?: unknown;
    lead_email?: unknown;
  };
  const byId =
    typeof body.correo_id === "string"
      ? list.find((c) => c.id === body.correo_id)
      : undefined;
  const correo = byId ?? list[0] ?? null;
  if (!correo) {
    return NextResponse.json(
      { error: "No hay correo asociado para este lead" },
      { status: 404 },
    );
  }
  if (typeof body.correo_id === "string" && !byId) {
    return NextResponse.json({ error: "correo_id no pertenece a este lead" }, { status: 400 });
  }

  const patch: Parameters<typeof updateCorreoById>[1] = {};
  if (typeof body.cuerpo_markdown === "string") patch.cuerpo_markdown = body.cuerpo_markdown;
  if (typeof body.asunto === "string") patch.asunto = body.asunto;
  if (typeof body.lead_email === "string") patch.lead_email = body.lead_email.trim();

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "Envía al menos cuerpo_markdown, asunto o lead_email" },
      { status: 400 },
    );
  }
  if (patch.lead_email !== undefined && !patch.lead_email.includes("@")) {
    return NextResponse.json({ error: "lead_email no parece un correo válido" }, { status: 400 });
  }

  const updated = await updateCorreoById(correo.id, patch);
  const nextList = correosForLead(await readCorreos(), lead.id);
  return NextResponse.json({ lead, correo: updated, correos: nextList });
}
