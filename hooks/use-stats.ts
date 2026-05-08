"use client";

import useSWR from "swr";
import type { DashboardStats } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";

export function useStats() {
  return useSWR<DashboardStats>("/api/stats", fetcher);
}
