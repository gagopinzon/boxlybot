import { NextResponse } from "next/server";
import { appendCorreo, readCorreos, readLeads } from "@/lib/hermes";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const estado = searchParams.get("estado") ?? undefined;
  const leadId = searchParams.get("leadId") ?? undefined;

  let correos = await readCorreos();
  if (estado) {
    correos = correos.filter((c) => c.estado === estado);
  }
  if (leadId) {
    correos = correos.filter((c) => c.lead_id === leadId);
  }

  correos = [...correos].sort(
    (a, b) =>
      new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime(),
  );

  return NextResponse.json({
    correos,
    total: correos.length,
    filtros: { estado: estado ?? null, leadId: leadId ?? null },
  });
}

/** Nuevo borrador para un lead (p. ej. otra cuenta de correo destino). */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      lead_id?: unknown;
      from_correo_id?: unknown;
    };
    const lead_id = typeof body.lead_id === "string" ? body.lead_id.trim() : "";
    if (!lead_id) {
      return NextResponse.json({ error: "lead_id es obligatorio" }, { status: 400 });
    }
    const leads = await readLeads();
    const lead = leads.find((l) => l.id === lead_id);
    if (!lead) {
      return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
    }
    const correos = await readCorreos();
    let plantilla = null as (typeof correos)[0] | null;
    if (typeof body.from_correo_id === "string") {
      plantilla = correos.find((c) => c.id === body.from_correo_id) ?? null;
      if (!plantilla) {
        return NextResponse.json({ error: "from_correo_id no encontrado" }, { status: 404 });
      }
      if (plantilla.lead_id !== lead_id) {
        return NextResponse.json(
          { error: "El correo de plantilla no pertenece a este lead" },
          { status: 400 },
        );
      }
    }
    const asunto = plantilla?.asunto ?? `Mensaje para ${lead.negocio}`;
    const cuerpo_markdown = plantilla?.cuerpo_markdown ?? "";
    const variante = plantilla?.variante ?? "personalizado";
    const nuevo = await appendCorreo({
      lead_id,
      asunto,
      cuerpo_markdown,
      variante,
      estado: "borrador",
      lead_email: lead.email.trim() || plantilla?.lead_email || "",
    });
    return NextResponse.json({ correo: nuevo });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al crear correo";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
