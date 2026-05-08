export type LeadEstado =
  | "nuevo"
  | "contactado"
  | "respondio"
  | "cerrado"
  | "descartado";

export interface Lead {
  id: string;
  negocio: string;
  nicho: string;
  email: string;
  telefono: string;
  ubicacion: string;
  instagram?: string;
  facebook?: string;
  tiene_web: boolean;
  url_web?: string;
  descripcion: string;
  puntaje_oportunidad: number;
  fecha_deteccion: string;
  ultimo_contacto?: string;
  estado: LeadEstado;
  notas: string;
  screenshot_url?: string;
}

export type CorreoEstado =
  | "borrador"
  | "enviado"
  | "respondido"
  | "rebotado"
  | "programado";

export interface Correo {
  id: string;
  lead_id: string;
  asunto: string;
  cuerpo_markdown: string;
  variante: "personalizado" | "plantilla_a" | "plantilla_b";
  estado: CorreoEstado;
  fecha_creacion: string;
  fecha_envio?: string;
  lead_email: string;
}

export interface Investigacion {
  id: string;
  nicho: string;
  ubicacion: string;
  fecha: string;
  total_revisados: number;
  leads_generados: number;
  fuentes: string[];
  duracion_segundos: number;
  estado: "completada" | "en_progreso" | "fallida";
}

export interface DashboardStats {
  totalLeads: number;
  leadsHoy: number;
  puntajePromedio: number;
  correosEnviados: number;
  correosPendientes: number;
  leadsPorNicho: { nicho: string; count: number }[];
}

export interface WebhookBody {
  action: string;
  payload: Record<string, unknown>;
}

export interface PendingAction {
  id: string;
  action: string;
  payload: Record<string, unknown>;
  requestedAt: string;
}

export interface PendingActionsFile {
  actions: PendingAction[];
}
