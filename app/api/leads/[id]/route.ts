import { NextResponse } from "next/server";
import { readCorreos, readLeads, updateCorreoById } from "@/lib/hermes";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  const { id } = await context.params;
  const leads = await readLeads();
  const correos = await readCorreos();
  const lead = leads.find((l) => l.id === id);
  if (!lead) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }
  const correo = correos.find((c) => c.lead_id === lead.id) ?? null;
  return NextResponse.json({ lead, correo });
}

export async function PATCH(request: Request, context: Params) {
  const { id } = await context.params;
  const leads = await readLeads();
  const correos = await readCorreos();
  const lead = leads.find((l) => l.id === id);
  if (!lead) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }
  const correo = correos.find((c) => c.lead_id === lead.id) ?? null;
  if (!correo) {
    return NextResponse.json(
      { error: "No hay correo asociado para este lead" },
      { status: 404 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    cuerpo_markdown?: unknown;
  };
  const cuerpo_markdown = body.cuerpo_markdown;
  if (typeof cuerpo_markdown !== "string") {
    return NextResponse.json(
      { error: "cuerpo_markdown debe ser string" },
      { status: 400 },
    );
  }

  const updated = await updateCorreoById(correo.id, { cuerpo_markdown });
  return NextResponse.json({ lead, correo: updated });
}
