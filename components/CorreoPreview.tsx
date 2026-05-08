"use client";

import type { Correo } from "@/lib/types";

function formatAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Hace un momento";
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  return `Hace ${d} d`;
}

function estadoChip(estado: Correo["estado"]) {
  if (estado === "borrador") {
    return (
      <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
        Borrador
      </span>
    );
  }
  if (estado === "enviado" || estado === "respondido") {
    return (
      <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
        Enviado
      </span>
    );
  }
  return (
    <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
      {estado}
    </span>
  );
}

type Props = {
  correo: Correo;
  onOpen?: () => void;
};

export function CorreoPreview({ correo, onOpen }: Props) {
  const preview = correo.cuerpo_markdown.replace(/\*\*/g, "").slice(0, 140);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded border border-outline-variant bg-white p-5 text-left transition-all hover:border-primary"
    >
      <div className="mb-4 flex items-center justify-between">
        {estadoChip(correo.estado)}
        <span className="text-[10px] text-on-surface-variant">
          {formatAgo(correo.fecha_creacion)}
        </span>
      </div>
      <p className="mb-2 truncate text-base font-bold text-primary">{correo.asunto}</p>
      <p className="line-clamp-2 text-body-sm leading-relaxed text-on-surface-variant">
        {preview}…
      </p>
      <div className="mt-4 flex justify-end border-t border-slate-50 pt-4">
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant transition-colors group-hover:text-primary">
          arrow_forward
        </span>
      </div>
    </button>
  );
}
