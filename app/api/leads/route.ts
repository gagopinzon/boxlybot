import { NextResponse } from "next/server";
import {
  filtrarLeads,
  ordenarLeads,
  readLeads,
} from "@/lib/hermes";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nicho = searchParams.get("nicho") ?? undefined;
  const minPuntajeRaw = searchParams.get("minPuntaje");
  const minPuntaje =
    minPuntajeRaw !== null && minPuntajeRaw !== ""
      ? Number(minPuntajeRaw)
      : undefined;
  const search = searchParams.get("search") ?? undefined;
  const ordenarPor = searchParams.get("ordenarPor");

  const all = await readLeads();
  const filtros = {
    nicho: nicho || undefined,
    minPuntaje: Number.isFinite(minPuntaje) ? minPuntaje : undefined,
    search: search || undefined,
  };
  let filtered = filtrarLeads(all, filtros);
  filtered = ordenarLeads(filtered, ordenarPor);

  return NextResponse.json({
    leads: filtered,
    total: filtered.length,
    filtros: {
      nicho: filtros.nicho ?? null,
      minPuntaje: filtros.minPuntaje ?? null,
      search: filtros.search ?? null,
      ordenarPor: ordenarPor ?? "fecha",
    },
  });
}
