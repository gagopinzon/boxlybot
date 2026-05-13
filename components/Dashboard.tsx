"use client";

import { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { CorreoPreview } from "@/components/CorreoPreview";
import { LeadDetail } from "@/components/LeadDetail";
import { LeadTable } from "@/components/LeadTable";
import { StatsCards } from "@/components/StatsCards";
import type { LeadFilters } from "@/hooks/use-leads";
import { useLeads } from "@/hooks/use-leads";
import { useCorreos } from "@/hooks/use-correos";
import { useInvestigaciones } from "@/hooks/use-investigaciones";
import { useStats } from "@/hooks/use-stats";
import type { Correo } from "@/lib/types";
import { postJSON } from "@/lib/fetcher";

export function Dashboard() {
  const { mutate } = useSWRConfig();
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [nicho, setNicho] = useState<string>("");
  const [minScore, setMinScore] = useState(1);
  const [ordenarPor, setOrdenarPor] = useState<string>("fecha");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [invOpen, setInvOpen] = useState(false);
  const [invNicho, setInvNicho] = useState("");
  const [invUbicacion, setInvUbicacion] = useState("");
  const [banner, setBanner] = useState<string | null>(null);

  const filters: LeadFilters = useMemo(
    () => ({
      search: appliedSearch || undefined,
      nicho: nicho || undefined,
      minPuntaje: minScore > 1 ? minScore : undefined,
      ordenarPor: ordenarPor || undefined,
    }),
    [appliedSearch, nicho, minScore, ordenarPor],
  );

  const { data: leadsRes, isLoading: leadsLoading } = useLeads(filters);
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: correosRes } = useCorreos();
  const { data: invRes } = useInvestigaciones();

  const quickSendByLeadId = useMemo(() => {
    const byLead = new Map<string, Correo[]>();
    for (const c of correosRes?.correos ?? []) {
      const arr = byLead.get(c.lead_id) ?? [];
      arr.push(c);
      byLead.set(c.lead_id, arr);
    }
    const m = new Map<
      string,
      { correoId: string; canSend: boolean; sent: boolean; fechaEnvio?: string }
    >();
    for (const [lid, list] of byLead) {
      const sorted = [...list].sort(
        (a, b) =>
          new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime(),
      );
      const enviado = sorted.find(
        (c) => c.estado === "enviado" || c.estado === "respondido",
      );
      const sendable = sorted.find(
        (c) => c.estado === "borrador" || c.estado === "programado",
      );
      const pick = sendable ?? enviado ?? sorted[0];
      if (pick) {
        m.set(lid, {
          correoId: pick.id,
          canSend: pick.estado === "borrador" || pick.estado === "programado",
          sent: Boolean(enviado),
          fechaEnvio: enviado?.fecha_envio ?? enviado?.fecha_creacion,
        });
      }
    }
    return m;
  }, [correosRes?.correos]);

  const nichos = useMemo(() => {
    const s = new Set<string>();
    for (const l of leadsRes?.leads ?? []) s.add(l.nicho);
    for (const row of stats?.leadsPorNicho ?? []) s.add(row.nicho);
    return [...s].sort((a, b) => a.localeCompare(b, "es"));
  }, [leadsRes?.leads, stats?.leadsPorNicho]);

  const latestCorreos = useMemo(() => {
    return [...(correosRes?.correos ?? [])].slice(0, 3);
  }, [correosRes?.correos]);

  async function refreshAll() {
    await mutate((key) => typeof key === "string" && key.startsWith("/api"));
  }

  async function startInvestigacion() {
    try {
      await postJSON("/api/webhook", {
        action: "investigar",
        payload: { nicho: invNicho, ubicacion: invUbicacion },
      });
      setBanner("Investigación solicitada: Hermes la tomará del archivo de acciones pendientes.");
      setInvOpen(false);
      setInvNicho("");
      setInvUbicacion("");
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "No se pudo registrar la investigación.");
    }
  }

  const emptyGlobal = !statsLoading && stats && stats.totalLeads === 0;

  function applySearchFromHeader() {
    setAppliedSearch(searchInput.trim());
  }

  return (
    <>
      <header className="font-body-md fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface px-margin text-base">
        <div className="flex items-center gap-md">
          <span className="text-2xl font-bold leading-snug text-primary">Hermes</span>
          <div className="relative ml-lg hidden w-80 md:block">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearchFromHeader()}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-2 pl-10 pr-4 text-body-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Buscar prospectos..."
              type="search"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={refreshAll}
            className="hidden rounded border border-outline-variant bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-primary transition-colors hover:bg-surface-container-low sm:inline-flex sm:items-center sm:gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refrescar datos
          </button>
          <button
            type="button"
            onClick={() => setInvOpen(true)}
            className="flex items-center gap-2 rounded bg-primary px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-on-primary transition-all hover:opacity-90 active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nueva investigación
          </button>
        </div>
      </header>

      <nav className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-outline-variant bg-surface py-lg">
        <div className="mb-xl mt-16 px-md">
          <div className="flex items-center gap-3 p-2">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-primary">
              <span
                className="material-symbols-outlined text-white"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                dataset
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold leading-snug text-primary">Hermes Admin</h3>
              <p className="text-[11px] uppercase tracking-tighter text-on-surface-variant">
                Lead Generation · Boxly
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1 px-4">
          <span className="flex items-center gap-3 rounded bg-surface-container-low px-4 py-3 text-label-caps font-bold uppercase tracking-widest text-primary">
            <span className="material-symbols-outlined">dashboard</span>
            Dashboard
          </span>
        </div>
        <div className="mt-auto px-md pb-md">
          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-primary">
              Investigaciones recientes
            </p>
            <ul className="space-y-2 text-[11px] text-on-surface-variant">
              {(invRes?.investigaciones ?? []).slice(0, 3).map((inv) => (
                <li key={inv.id}>
                  <span className="font-semibold text-primary">{inv.nicho}</span> · {inv.ubicacion}{" "}
                  <span className="block text-[10px] opacity-80">
                    {inv.leads_generados} leads · {inv.estado}
                  </span>
                </li>
              ))}
              {(invRes?.investigaciones ?? []).length === 0 && (
                <li className="opacity-70">Sin historial todavía.</li>
              )}
            </ul>
          </div>
        </div>
      </nav>

      <main className="ml-0 min-h-screen pt-16 md:ml-64">
        <div className="mx-auto max-w-7xl p-margin">
          <div className="mb-lg flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-primary">
                Resumen general
              </h1>
              <p className="mt-1 text-body-md text-on-surface-variant">
                Monitorea leads y correos redactados por Hermes vía archivos JSON locales.
              </p>
            </div>
            <button
              type="button"
              onClick={refreshAll}
              className="inline-flex items-center justify-center gap-2 rounded border border-outline-variant bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-primary hover:bg-surface-container-low sm:hidden"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Refrescar datos
            </button>
          </div>

          <StatsCards stats={stats} loading={statsLoading} />

          {banner && (
            <div className="mb-gutter rounded border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm text-primary">
              {banner}{" "}
              <button type="button" className="ml-2 underline" onClick={() => setBanner(null)}>
                Cerrar
              </button>
            </div>
          )}

          {emptyGlobal ? (
            <div className="mb-xl flex flex-col items-center justify-center rounded border border-dashed border-outline-variant bg-white px-8 py-16 text-center">
              <span className="material-symbols-outlined mb-4 text-5xl text-on-surface-variant">
                travel_explore
              </span>
              <p className="max-w-md text-body-md text-on-surface-variant">
                Aún no hay leads. Inicia una investigación para empezar.
              </p>
              <button
                type="button"
                onClick={() => setInvOpen(true)}
                className="mt-6 rounded bg-primary px-6 py-3 text-label-caps font-bold uppercase tracking-widest text-white hover:opacity-90"
              >
                Nueva investigación
              </button>
            </div>
          ) : (
            <>
              <section className="mb-gutter flex flex-wrap items-center gap-md rounded-lg border border-outline-variant bg-surface-container-low p-md">
                <div className="flex items-center gap-3">
                  <span className="text-label-caps font-bold uppercase tracking-widest text-on-surface-variant">
                    Nicho:
                  </span>
                  <select
                    value={nicho}
                    onChange={(e) => setNicho(e.target.value)}
                    className="rounded border border-outline-variant bg-white px-3 py-1.5 text-body-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Todos los nichos</option>
                    {nichos.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex max-w-md flex-1 flex-col gap-2 sm:ml-4">
                  <span className="text-label-caps font-bold uppercase tracking-widest text-on-surface-variant">
                    Score mínimo: {minScore}
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="h-1 w-full cursor-pointer accent-primary"
                  />
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
                  <select
                    value={ordenarPor}
                    onChange={(e) => setOrdenarPor(e.target.value)}
                    className="rounded border border-outline-variant bg-white px-3 py-1.5 text-body-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="fecha">Orden: fecha</option>
                    <option value="puntaje">Orden: puntaje</option>
                    <option value="negocio">Orden: negocio</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setAppliedSearch(searchInput.trim())}
                    className="rounded border border-outline-variant bg-white px-4 py-1.5 text-body-sm transition-colors hover:bg-slate-50"
                  >
                    Aplicar búsqueda
                  </button>
                </div>
              </section>

              <LeadTable
                leads={leadsRes?.leads ?? []}
                loading={leadsLoading}
                total={leadsRes?.total}
                onOpen={setLeadId}
                quickSendByLeadId={quickSendByLeadId}
              />

              <section className="mt-xl">
                <div className="mb-lg flex items-center justify-between">
                  <h3 className="text-xl font-semibold leading-snug text-primary">
                    Últimos correos generados
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3">
                  {latestCorreos.map((c) => (
                    <CorreoPreview
                      key={c.id}
                      correo={c}
                      onOpen={() => {
                        const lead = (leadsRes?.leads ?? []).find((l) => l.id === c.lead_id);
                        if (lead) setLeadId(lead.id);
                      }}
                    />
                  ))}
                  {latestCorreos.length === 0 && (
                    <p className="text-body-sm text-on-surface-variant">Sin correos todavía.</p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      {leadId && (
        <button
          type="button"
          className="fixed inset-0 z-[55] bg-slate-900/30"
          aria-label="Cerrar panel"
          onClick={() => setLeadId(null)}
        />
      )}
      <LeadDetail
        leadId={leadId}
        onClose={() => setLeadId(null)}
        onQueued={(msg) => setBanner(msg)}
      />

      {invOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInvOpen(false);
          }}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded border border-outline-variant bg-white p-10"
          >
            <h2 className="mb-2 text-2xl font-bold text-primary">Nueva investigación</h2>
            <p className="mb-8 text-body-sm text-on-surface-variant">
              Define parámetros para que Hermes encuentre leads; la solicitud se guarda en{" "}
              <code className="rounded bg-slate-100 px-1">pending_actions.json</code>.
            </p>
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-label-caps font-bold uppercase tracking-widest text-primary">
                  Nicho / palabra clave
                </label>
                <input
                  value={invNicho}
                  onChange={(e) => setInvNicho(e.target.value)}
                  className="w-full rounded border border-outline-variant bg-slate-50 p-3 text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Ej. Muebles de lujo"
                />
              </div>
              <div>
                <label className="mb-2 block text-label-caps font-bold uppercase tracking-widest text-primary">
                  Ubicación
                </label>
                <input
                  value={invUbicacion}
                  onChange={(e) => setInvUbicacion(e.target.value)}
                  className="w-full rounded border border-outline-variant bg-slate-50 p-3 text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Ej. Zapopan, Jalisco"
                />
              </div>
              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setInvOpen(false)}
                  className="flex-1 rounded border border-outline-variant px-6 py-3 text-label-caps font-bold uppercase tracking-widest transition-colors hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!invNicho.trim() || !invUbicacion.trim()}
                  onClick={() => void startInvestigacion()}
                  className="flex-1 rounded bg-primary px-6 py-3 text-label-caps font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Solicitar búsqueda
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setInvOpen(true)}
        className="group fixed bottom-10 right-10 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:scale-105 active:scale-95"
        aria-label="Nueva investigación"
      >
        <span className="material-symbols-outlined text-[30px] transition-transform group-hover:rotate-90">
          add
        </span>
      </button>
    </>
  );
}
