"use client";

import type { Lead } from "@/lib/types";
import { IconFacebook, IconInstagram } from "@/components/SocialIcons";

type Props = {
  leads: Lead[];
  loading?: boolean;
  total?: number;
  onOpen: (leadId: string) => void;
  onEnviarCorreo: (correoId: string) => void;
  correoIdByLeadId: Map<string, string>;
};

function WebBadge({ lead }: { lead: Lead }) {
  if (lead.tiene_web && lead.url_web) {
    return (
      <span className="rounded bg-primary px-2 py-0.5 text-[10px] font-bold tracking-tight text-white">
        WEB
      </span>
    );
  }
  if (lead.tiene_web) {
    return (
      <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold tracking-tight text-slate-600">
        BÁSICA
      </span>
    );
  }
  return (
    <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold tracking-tight text-red-600">
      SIN WEB
    </span>
  );
}

export function LeadTable({
  leads,
  loading,
  total,
  onOpen,
  onEnviarCorreo,
  correoIdByLeadId,
}: Props) {
  if (loading && leads.length === 0) {
    return (
      <div className="rounded border border-outline-variant bg-white p-10 text-center text-on-surface-variant">
        Cargando prospectos…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded border border-outline-variant bg-white">
      <table className="w-full text-left">
        <thead className="border-b border-outline-variant bg-surface-container-low">
          <tr>
            <th className="px-6 py-4 text-label-caps font-bold uppercase tracking-widest text-on-surface-variant">
              Negocio
            </th>
            <th className="px-6 py-4 text-label-caps font-bold uppercase tracking-widest text-on-surface-variant">
              Nicho
            </th>
            <th className="px-6 py-4 text-label-caps font-bold uppercase tracking-widest text-on-surface-variant">
              Contacto
            </th>
            <th className="px-6 py-4 text-label-caps font-bold uppercase tracking-widest text-on-surface-variant">
              Redes
            </th>
            <th className="px-6 py-4 text-label-caps font-bold uppercase tracking-widest text-on-surface-variant">
              Web
            </th>
            <th className="px-6 py-4 text-label-caps font-bold uppercase tracking-widest text-on-surface-variant">
              Score
            </th>
            <th className="px-6 py-4 text-right text-label-caps font-bold uppercase tracking-widest text-on-surface-variant">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {leads.map((lead) => {
            const pct = Math.min(100, Math.round(lead.puntaje_oportunidad * 10));
            const correoId = correoIdByLeadId.get(lead.id);
            return (
              <tr
                key={lead.id}
                className="table-row-hover group cursor-pointer transition-colors"
                onClick={() => onOpen(lead.id)}
              >
                <td className="px-6 py-5">
                  <div className="font-bold text-primary">{lead.negocio}</div>
                  <div className="text-body-sm text-on-surface-variant">{lead.ubicacion}</div>
                </td>
                <td className="px-6 py-5">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-on-surface">
                    {lead.nicho}
                  </span>
                </td>
                <td className="text-body-sm text-primary underline decoration-slate-300 underline-offset-4 px-6 py-5">
                  {lead.email}
                </td>
                <td className="px-6 py-5">
                  {lead.instagram || lead.facebook ? (
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      {lead.instagram && (
                        <span title="Instagram" className="inline-flex">
                          <IconInstagram className="h-[18px] w-[18px]" aria-hidden />
                        </span>
                      )}
                      {lead.facebook && (
                        <span title="Facebook" className="inline-flex">
                          <IconFacebook className="h-[18px] w-[18px]" aria-hidden />
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant opacity-40">
                      link_off
                    </span>
                  )}
                </td>
                <td className="px-6 py-5">
                  <WebBadge lead={lead} />
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <span className="text-body-sm font-bold text-primary">
                      {lead.puntaje_oportunidad}
                    </span>
                    <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full ${lead.puntaje_oportunidad >= 7 ? "bg-primary" : "bg-red-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      className="rounded border border-transparent p-2 transition-all hover:border-outline-variant hover:bg-white"
                      aria-label="Ver detalle"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(lead.id);
                      }}
                    >
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </button>
                    <button
                      type="button"
                      className="rounded border border-transparent p-2 transition-all hover:bg-primary hover:text-white"
                      aria-label="Enviar correo con Mautic"
                      disabled={!correoId}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (correoId) onEnviarCorreo(correoId);
                      }}
                    >
                      <span className="material-symbols-outlined text-[18px]">send</span>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-outline-variant bg-surface-container-low px-6 py-4">
        <p className="text-[11px] font-medium text-on-surface-variant">
          Mostrando {leads.length}
          {typeof total === "number" ? ` de ${total}` : ""} prospectos
        </p>
      </div>
    </div>
  );
}
