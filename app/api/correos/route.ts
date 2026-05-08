import { NextResponse } from "next/server";
import { readCorreos } from "@/lib/hermes";

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
