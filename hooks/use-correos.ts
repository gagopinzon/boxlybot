"use client";

import useSWR from "swr";
import type { Correo } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";

export type CorreoFilters = {
  estado?: string;
  leadId?: string;
};

function correosUrl(f: CorreoFilters): string {
  const sp = new URLSearchParams();
  if (f.estado) sp.set("estado", f.estado);
  if (f.leadId) sp.set("leadId", f.leadId);
  const q = sp.toString();
  return q ? `/api/correos?${q}` : "/api/correos";
}

export type CorreosResponse = {
  correos: Correo[];
  total: number;
  filtros: Record<string, unknown>;
};

export function useCorreos(filters: CorreoFilters = {}) {
  return useSWR<CorreosResponse>(correosUrl(filters), fetcher);
}
