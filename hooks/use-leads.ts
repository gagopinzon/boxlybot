"use client";

import useSWR from "swr";
import type { Lead } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";

export type LeadFilters = {
  nicho?: string;
  minPuntaje?: number;
  search?: string;
  ordenarPor?: string;
};

export function leadsUrl(params: LeadFilters): string {
  const sp = new URLSearchParams();
  if (params.nicho) sp.set("nicho", params.nicho);
  if (params.minPuntaje !== undefined) sp.set("minPuntaje", String(params.minPuntaje));
  if (params.search) sp.set("search", params.search);
  if (params.ordenarPor) sp.set("ordenarPor", params.ordenarPor);
  const q = sp.toString();
  return q ? `/api/leads?${q}` : "/api/leads";
}

export type LeadsResponse = {
  leads: Lead[];
  total: number;
  filtros: Record<string, unknown>;
};

export function useLeads(params: LeadFilters) {
  return useSWR<LeadsResponse>(leadsUrl(params), fetcher, {
    revalidateOnFocus: true,
  });
}
