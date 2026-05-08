"use client";

import useSWR from "swr";
import type { Investigacion } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";

export type InvestigacionesResponse = {
  investigaciones: Investigacion[];
  total: number;
};

export function useInvestigaciones() {
  return useSWR<InvestigacionesResponse>("/api/investigaciones", fetcher);
}
