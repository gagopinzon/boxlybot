import { NextResponse } from "next/server";
import {
  readCorreos,
  readLeads,
  updateCorreoById,
  updateLeadById,
} from "@/lib/hermes";
import type { Correo, LeadEstado } from "@/lib/types";

const VALID_LEAD_ESTADOS: LeadEstado[] = [
  "nuevo",
  "contactado",
  "respondio",
  "cerrado",
  "descartado",
];

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
    estado?: unknown;
    notas?: unknown;
  };

  const leadPatch: Parameters<typeof updateLeadById>[1] = {};
  if (typeof body.estado === "string") {
    if (!VALID_LEAD_ESTADOS.includes(body.estado as LeadEstado)) {
      return NextResponse.json(
        { error: `estado inválido. Usa uno de: ${VALID_LEAD_ESTADOS.join(", ")}` },
        { status: 400 },
      );
    }
    leadPatch.estado = body.estado as LeadEstado;
  }
  if (typeof body.notas === "string") leadPatch.notas = body.notas;

  let updatedLead = lead;
  if (Object.keys(leadPatch).length > 0) {
    updatedLead = await updateLeadById(lead.id, leadPatch);
  }

  const correoPatch: Parameters<typeof updateCorreoById>[1] = {};
  if (typeof body.cuerpo_markdown === "string") correoPatch.cuerpo_markdown = body.cuerpo_markdown;
  if (typeof body.asunto === "string") correoPatch.asunto = body.asunto;
  if (typeof body.lead_email === "string") correoPatch.lead_email = body.lead_email.trim();

  if (correoPatch.lead_email !== undefined && !correoPatch.lead_email.includes("@")) {
    return NextResponse.json({ error: "lead_email no parece un correo válido" }, { status: 400 });
  }

  let updatedCorreo: Correo | null = null;
  if (Object.keys(correoPatch).length > 0) {
    const byId =
      typeof body.correo_id === "string"
        ? list.find((c) => c.id === body.correo_id)
        : undefined;
    const target = byId ?? list[0] ?? null;
    if (!target) {
      return NextResponse.json(
        { error: "No hay correo asociado para este lead" },
        { status: 404 },
      );
    }
    if (typeof body.correo_id === "string" && !byId) {
      return NextResponse.json({ error: "correo_id no pertenece a este lead" }, { status: 400 });
    }
    updatedCorreo = await updateCorreoById(target.id, correoPatch);
  }

  if (Object.keys(leadPatch).length === 0 && Object.keys(correoPatch).length === 0) {
    return NextResponse.json(
      { error: "Envía estado/notas del lead o cuerpo_markdown/asunto/lead_email del correo" },
      { status: 400 },
    );
  }

  const nextList = correosForLead(await readCorreos(), updatedLead.id);
  return NextResponse.json({
    lead: updatedLead,
    correo: updatedCorreo ?? nextList[0] ?? null,
    correos: nextList,
  });
}
