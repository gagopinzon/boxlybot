"use client";

import useSWR from "swr";
import type { Correo, Lead } from "@/lib/types";
import { fetcher, postJSON } from "@/lib/fetcher";

function MdPreview({ text }: { text: string }) {
  const parts = text.split(/\*\*/);
  return (
    <div className="text-body-sm leading-relaxed text-primary whitespace-pre-wrap">
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-bold">
            {p}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </div>
  );
}

type Props = {
  leadId: string | null;
  onClose: () => void;
  onQueued?: (msg: string) => void;
};

type DetailResponse = { lead: Lead; correo: Correo | null };

export function LeadDetail({ leadId, onClose, onQueued }: Props) {
  const { data, isLoading, mutate } = useSWR<DetailResponse>(
    leadId ? `/api/leads/${leadId}` : null,
    fetcher,
  );

  const open = Boolean(leadId);

  async function enqueueEnvio() {
    if (!data?.correo) return;
    try {
      await postJSON("/api/webhook", {
        action: "enviar_correo",
        payload: { correo_id: data.correo.id },
      });
      onQueued?.("Solicitud enviada: Hermes procesará el envío del correo.");
      void mutate();
    } catch (e) {
      onQueued?.(e instanceof Error ? e.message : "No se pudo registrar la acción.");
    }
  }

  return (
    <aside
      className={`fixed right-0 top-0 z-[60] flex h-full w-full max-w-[480px] flex-col border-l border-outline-variant bg-white shadow-xl transition-transform duration-300 sm:w-[480px] ${
        open ? "translate-x-0" : "translate-x-full pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between border-b border-outline-variant px-8 py-6">
        <h3 className="text-xl font-semibold leading-snug text-primary">Detalle del prospecto</h3>
        <button
          type="button"
          className="rounded-full p-2 transition-colors hover:bg-slate-50"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        {isLoading && (
          <p className="text-body-sm text-on-surface-variant">Cargando…</p>
        )}
        {!isLoading && data && (
          <>
            <div className="mb-10 flex items-start gap-6">
              <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded border border-outline-variant bg-slate-100">
                {data.lead.screenshot_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={data.lead.negocio}
                    src={data.lead.screenshot_url}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant">
                    storefront
                  </span>
                )}
              </div>
              <div>
                <h4 className="text-2xl font-bold text-primary">{data.lead.negocio}</h4>
                <p className="text-body-md text-on-surface-variant">
                  {data.lead.nicho} · {data.lead.ubicacion}
                </p>
                <p className="mt-3 text-body-sm text-on-surface-variant">{data.lead.descripcion}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {data.lead.instagram && (
                    <a
                      href={data.lead.instagram}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-primary hover:underline"
                    >
                      <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                      Instagram
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-6">
              <div className="mb-6 flex items-center justify-between">
                <span className="text-label-caps font-bold uppercase tracking-widest text-primary">
                  Borrador de correo
                </span>
                {data.correo && (
                  <span className="rounded bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {data.correo.estado}
                  </span>
                )}
              </div>
              {!data.correo && (
                <p className="text-body-sm text-on-surface-variant">
                  Aún no hay correo asociado para este lead.
                </p>
              )}
              {data.correo && (
                <>
                  <p className="mb-4 text-base font-bold text-primary">{data.correo.asunto}</p>
                  <MdPreview text={data.correo.cuerpo_markdown} />
                  <div className="mt-8 flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={enqueueEnvio}
                      className="flex items-center gap-2 rounded bg-primary px-6 py-3 text-label-caps font-bold uppercase tracking-widest text-white transition-all hover:opacity-90"
                    >
                      Solicitar envío (Hermes)
                      <span className="material-symbols-outlined text-[18px]">send</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
