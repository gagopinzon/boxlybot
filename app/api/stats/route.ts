import { NextResponse } from "next/server";
import type { DashboardStats } from "@/lib/types";
import { readCorreos, readLeads } from "@/lib/hermes";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  const leads = await readLeads();
  const correos = await readCorreos();
  const today = startOfToday();

  const leadsHoy = leads.filter(
    (l) => new Date(l.fecha_deteccion).getTime() >= today.getTime(),
  ).length;

  const puntajePromedio =
    leads.length === 0
      ? 0
      : leads.reduce((acc, l) => acc + l.puntaje_oportunidad, 0) / leads.length;

  const correosEnviados = correos.filter((c) =>
    ["enviado", "respondido"].includes(c.estado),
  ).length;
  const correosPendientes = correos.filter((c) =>
    ["borrador", "programado"].includes(c.estado),
  ).length;

  const byNicho = new Map<string, number>();
  for (const l of leads) {
    byNicho.set(l.nicho, (byNicho.get(l.nicho) ?? 0) + 1);
  }
  const leadsPorNicho = [...byNicho.entries()].map(([nicho, count]) => ({
    nicho,
    count,
  }));

  const stats: DashboardStats = {
    totalLeads: leads.length,
    leadsHoy,
    puntajePromedio: Math.round(puntajePromedio * 10) / 10,
    correosEnviados,
    correosPendientes,
    leadsPorNicho,
  };

  return NextResponse.json(stats);
}
