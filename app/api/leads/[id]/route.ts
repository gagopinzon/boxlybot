import { NextResponse } from "next/server";
import { readCorreos, readLeads } from "@/lib/hermes";

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
