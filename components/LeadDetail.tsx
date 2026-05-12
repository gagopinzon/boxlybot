"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

type DetailResponse = { lead: Lead; correos: Correo[]; correo: Correo | null };

function puedeEnviar(c: Correo | null | undefined): boolean {
  if (!c) return false;
  return c.estado === "borrador" || c.estado === "programado";
}

export function LeadDetail({ leadId, onClose, onQueued }: Props) {
  const { data, isLoading, mutate } = useSWR<DetailResponse>(
    leadId ? `/api/leads/${leadId}` : null,
    fetcher,
  );

  const open = Boolean(leadId);
  const [selectedCorreoId, setSelectedCorreoId] = useState<string | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [draftAsunto, setDraftAsunto] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [addingCorreo, setAddingCorreo] = useState(false);

  const correos = useMemo(() => data?.correos ?? [], [data?.correos]);
  const active = useMemo(
    () => correos.find((c) => c.id === selectedCorreoId) ?? correos[0] ?? null,
    [correos, selectedCorreoId],
  );

  useEffect(() => {
    if (!open || !leadId) {
      setSelectedCorreoId(null);
      return;
    }
    if (!correos.length) {
      setSelectedCorreoId(null);
      return;
    }
    setSelectedCorreoId((prev) => {
      if (prev && correos.some((c) => c.id === prev)) return prev;
      const prefer = correos.find((c) => c.estado === "borrador" || c.estado === "programado");
      return (prefer ?? correos[0]).id;
    });
  }, [open, leadId, correos]);

  // Sincronizar borradores con el servidor al cambiar de borrador o tras guardar/mutar.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- dependemos de campos del correo, no del objeto `active` entero
  useEffect(() => {
    if (!active) return;
    setDraftBody(active.cuerpo_markdown);
    setDraftAsunto(active.asunto);
    setDraftEmail(active.lead_email);
  }, [
    active?.id,
    active?.cuerpo_markdown,
    active?.asunto,
    active?.lead_email,
  ]);

  const dirty = useMemo(() => {
    if (!active) return false;
    return (
      draftBody !== active.cuerpo_markdown ||
      draftAsunto !== active.asunto ||
      draftEmail.trim() !== active.lead_email
    );
  }, [active, draftBody, draftAsunto, draftEmail]);

  const yaEnviado = active && !puedeEnviar(active);

  const persistDraft = useCallback(async () => {
    if (!active) return;
    const patch: Record<string, string> = {};
    if (draftBody !== active.cuerpo_markdown) patch.cuerpo_markdown = draftBody;
    if (draftAsunto !== active.asunto) patch.asunto = draftAsunto;
    const em = draftEmail.trim();
    if (em !== active.lead_email) patch.lead_email = em;
    if (Object.keys(patch).length === 0) return;
    await patchJSON<{ correo: Correo }>(`/api/correos/${active.id}`, patch);
    await mutate();
  }, [active, draftBody, draftAsunto, draftEmail, mutate]);

  async function enviarCorreo() {
    if (!active || !puedeEnviar(active)) return;
    try {
      setSending(true);
      if (dirty) {
        await persistDraft();
      }
      const res = await postJSON<{ ok: boolean; error?: string }>("/api/mautic/enviar", {
        correo_id: active.id,
      });
      onQueued?.(
        res?.ok
          ? "✅ Correo enviado correctamente"
          : `❌ ${res?.error ?? "Error al enviar"}`,
      );
      await mutate();
    } catch (e) {
      onQueued?.(e instanceof Error ? e.message : "No se pudo enviar el correo.");
    } finally {
      setSending(false);
    }
  }

  async function saveDraft() {
    if (!active) return;
    try {
      setSaving(true);
      await persistDraft();
      onQueued?.("Cambios guardados.");
    } catch (e) {
      onQueued?.(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function addCorreo() {
    if (!leadId) return;
    try {
      setAddingCorreo(true);
      const res = await postJSON<{ correo: Correo }>("/api/correos", {
        lead_id: leadId,
        ...(active ? { from_correo_id: active.id } : {}),
      });
      setSelectedCorreoId(res.correo.id);
      onQueued?.("Nuevo borrador para otra cuenta de correo.");
      await mutate();
    } catch (e) {
      onQueued?.(e instanceof Error ? e.message : "No se pudo crear el borrador.");
    } finally {
      setAddingCorreo(false);
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
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <span className="text-label-caps font-bold uppercase tracking-widest text-primary">
                  Borradores de correo
                </span>
                <button
                  type="button"
                  onClick={() => void addCorreo()}
                  disabled={!leadId || addingCorreo}
                  className="flex items-center gap-1 rounded border border-outline-variant bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {addingCorreo ? (
                    "Creando…"
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      Otra cuenta
                    </>
                  )}
                </button>
              </div>
              {!correos.length && (
                <div className="space-y-4">
                  <p className="text-body-sm text-on-surface-variant">
                    No hay borradores. Crea uno para definir asunto, destinatario y mensaje.
                  </p>
                  <button
                    type="button"
                    onClick={() => void addCorreo()}
                    disabled={addingCorreo}
                    className="rounded bg-primary px-5 py-2.5 text-label-caps font-bold uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {addingCorreo ? "Creando…" : "Crear borrador"}
                  </button>
                </div>
              )}
              {active && (
                <>
                  <div className="mb-4">
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Borrador activo
                    </label>
                    <select
                      value={active.id}
                      onChange={(e) => setSelectedCorreoId(e.target.value)}
                      className="w-full rounded border border-outline-variant bg-white px-3 py-2.5 text-body-sm text-primary outline-none focus:border-primary"
                    >
                      {correos.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.lead_email} — {c.estado}
                          {c.asunto ? ` (${c.asunto.slice(0, 36)}${c.asunto.length > 36 ? "…" : ""})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4 flex items-center justify-end">
                    <span className="rounded bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      {active.estado}
                    </span>
                  </div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Asunto
                  </label>
                  <input
                    type="text"
                    value={draftAsunto}
                    onChange={(e) => setDraftAsunto(e.target.value)}
                    className="mb-4 w-full rounded border border-outline-variant bg-white px-4 py-3 text-body-sm text-primary outline-none focus:border-primary"
                    placeholder="Asunto del correo"
                  />
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Correo destinatario
                  </label>
                  <input
                    type="email"
                    value={draftEmail}
                    onChange={(e) => setDraftEmail(e.target.value)}
                    className="mb-4 w-full rounded border border-outline-variant bg-white px-4 py-3 text-body-sm text-primary outline-none focus:border-primary"
                    placeholder="correo@ejemplo.com"
                    autoComplete="off"
                  />
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
                      onClick={() => void saveDraft()}
                      disabled={!dirty || saving}
                      className="flex items-center gap-2 rounded border border-outline-variant bg-white px-6 py-3 text-label-caps font-bold uppercase tracking-widest text-primary transition-all hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? "Guardando…" : "Guardar cambios"}
                      <span className="material-symbols-outlined text-[18px]">save</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void enviarCorreo()}
                      disabled={!puedeEnviar(active) || sending}
                      className="flex min-w-[10.5rem] items-center justify-center gap-2 rounded bg-primary px-6 py-3 text-label-caps font-bold uppercase tracking-widest text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:opacity-70"
                    >
                      {sending ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                          Enviando…
                        </>
                      ) : yaEnviado ? (
                        <>
                          Enviado
                          <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        </>
                      ) : (
                        <>
                          Enviar correo
                          <span className="material-symbols-outlined text-[18px]">send</span>
                        </>
                      )}
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
