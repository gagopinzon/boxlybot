"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import type { Correo, Lead } from "@/lib/types";
import { fetcher, patchJSON, postJSON } from "@/lib/fetcher";
import { IconFacebook, IconInstagram } from "@/components/SocialIcons";

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
  const [draftBody, setDraftBody] = useState("");
  const [saving, setSaving] = useState(false);

  const currentBody = data?.correo?.cuerpo_markdown ?? "";
  const dirty = useMemo(() => {
    if (!data?.correo) return false;
    return draftBody !== currentBody;
  }, [currentBody, data?.correo, draftBody]);

  useEffect(() => {
    if (!open) return;
    setDraftBody(currentBody);
  }, [currentBody, open, leadId]);

  async function enviarCorreo() {
    if (!data?.correo || !leadId) return;
    try {
      if (dirty) {
        await patchJSON(`/api/leads/${leadId}`, { cuerpo_markdown: draftBody });
        await mutate();
      }
      const res = await postJSON<{ ok: boolean; error?: string }>("/api/mautic/enviar", {
        correo_id: data.correo.id,
      });
      onQueued?.(
        res?.ok
          ? "✅ Correo enviado correctamente"
          : `❌ ${res?.error ?? "Error al enviar"}`
      );
      void mutate();
    } catch (e) {
      onQueued?.(e instanceof Error ? e.message : "No se pudo enviar el correo.");
    }
  }

  async function saveBody() {
    if (!leadId || !data?.correo) return;
    try {
      setSaving(true);
      await patchJSON(`/api/leads/${leadId}`, { cuerpo_markdown: draftBody });
      onQueued?.("Mensaje actualizado.");
      await mutate();
    } catch (e) {
      onQueued?.(e instanceof Error ? e.message : "No se pudo guardar el mensaje.");
    } finally {
      setSaving(false);
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
                      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary hover:underline"
                    >
                      <IconInstagram className="h-4 w-4 shrink-0" aria-hidden />
                      Instagram
                    </a>
                  )}
                  {data.lead.facebook && (
                    <a
                      href={data.lead.facebook}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary hover:underline"
                    >
                      <IconFacebook className="h-4 w-4 shrink-0" aria-hidden />
                      Facebook
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
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Mensaje (editable)
                  </label>
                  <textarea
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    rows={10}
                    className="w-full resize-y rounded border border-outline-variant bg-white p-4 text-body-sm leading-relaxed text-primary outline-none focus:border-primary"
                  />
                  <div className="mt-4 rounded border border-outline-variant bg-white p-4">
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Vista previa
                    </div>
                    <MdPreview text={draftBody} />
                  </div>
                  <div className="mt-8 flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={saveBody}
                      disabled={!dirty || saving}
                      className="flex items-center gap-2 rounded border border-outline-variant bg-white px-6 py-3 text-label-caps font-bold uppercase tracking-widest text-primary transition-all hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? "Guardando…" : "Guardar mensaje"}
                      <span className="material-symbols-outlined text-[18px]">save</span>
                    </button>
                    <button
                      type="button"
                      onClick={enviarCorreo}
                      className="flex items-center gap-2 rounded bg-primary px-6 py-3 text-label-caps font-bold uppercase tracking-widest text-white transition-all hover:opacity-90"
                    >
                      Enviar correo
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
