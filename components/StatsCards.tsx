"use client";

import type { DashboardStats } from "@/lib/types";

type Props = {
  stats: DashboardStats | undefined;
  loading?: boolean;
};

export function StatsCards({ stats, loading }: Props) {
  const tasa =
    stats && stats.totalLeads > 0
      ? Math.round((stats.puntajePromedio / 10) * 100)
      : 0;

  if (loading && !stats) {
    return (
      <div className="mb-xl grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded border border-outline-variant bg-white p-6"
          >
            <div className="mb-4 h-3 w-24 rounded bg-surface-container-high" />
            <div className="h-8 w-20 rounded bg-surface-container-high" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="mb-xl grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-4">
      <div className="rounded border border-outline-variant bg-white p-6">
        <p className="mb-4 text-label-caps font-semibold uppercase tracking-widest text-on-surface-variant">
          Total leads
        </p>
        <div className="flex items-baseline justify-between">
          <span className="text-[32px] font-bold leading-[1.2] tracking-tight text-primary">
            {stats.totalLeads.toLocaleString("es-MX")}
          </span>
        </div>
      </div>
      <div className="rounded border border-outline-variant bg-white p-6">
        <p className="mb-4 text-label-caps font-semibold uppercase tracking-widest text-on-surface-variant">
          Calificados hoy
        </p>
        <div className="flex items-baseline justify-between">
          <span className="text-[32px] font-bold leading-[1.2] tracking-tight text-primary">
            {stats.leadsHoy}
          </span>
        </div>
      </div>
      <div className="rounded border border-outline-variant bg-white p-6">
        <p className="mb-4 text-label-caps font-semibold uppercase tracking-widest text-on-surface-variant">
          Índice oportunidad
        </p>
        <div className="flex items-baseline justify-between">
          <span className="text-[32px] font-bold leading-[1.2] tracking-tight text-primary">
            {tasa}%
          </span>
          <span className="material-symbols-outlined text-primary">trending_up</span>
        </div>
      </div>
      <div className="rounded border border-outline-variant bg-white p-6">
        <p className="mb-4 text-label-caps font-semibold uppercase tracking-widest text-on-surface-variant">
          Correos: enviados / pend.
        </p>
        <div className="flex items-baseline justify-between">
          <span className="text-[32px] font-bold leading-[1.2] tracking-tight text-primary">
            {stats.correosEnviados}{" "}
            <span className="text-h3 text-xl font-normal text-on-surface-variant">
              / {stats.correosPendientes}
            </span>
          </span>
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-primary"
              style={{
                width: `${(() => {
                  const t = stats.correosEnviados + stats.correosPendientes;
                  if (t === 0) return "0%";
                  return `${Math.round((stats.correosEnviados / t) * 100)}%`;
                })()}`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
