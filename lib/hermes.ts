import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";
import type { Correo, Investigacion, Lead, PendingAction, PendingActionsFile } from "./types";

/** Carpeta compartida con Hermes (JSON). Prioridad: HERMES_DATA_DIR → BOXLYBOT_DATA_DIR → ./data (o ../../data si el cwd es .next/standalone). */
function resolveDataDir(): string {
  const explicit =
    process.env.HERMES_DATA_DIR?.trim() || process.env.BOXLYBOT_DATA_DIR?.trim();
  if (explicit) {
    return path.isAbsolute(explicit) ? explicit : path.resolve(process.cwd(), explicit);
  }
  const cwd = process.cwd();
  if (
    path.basename(cwd) === "standalone" &&
    existsSync(path.join(cwd, "server.js"))
  ) {
    return path.resolve(cwd, "..", "..", "data");
  }
  return path.resolve(cwd, "data");
}

const DATA_DIR = resolveDataDir();

const FILES = {
  leads: "leads.json",
  correos: "correos.json",
  investigaciones: "investigaciones.json",
  pendingActions: "pending_actions.json",
} as const;

export async function readJSON<T>(filename: string, fallback: T): Promise<T> {
  const filePath = path.join(DATA_DIR, filename);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJSON(filename: string, data: unknown): Promise<void> {
  const filePath = path.join(DATA_DIR, filename);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function filtrarLeads(
  leads: Lead[],
  filtros: { nicho?: string; minPuntaje?: number; search?: string },
): Lead[] {
  return leads.filter((l) => {
    if (filtros.nicho && l.nicho !== filtros.nicho) return false;
    if (filtros.minPuntaje !== undefined && l.puntaje_oportunidad < filtros.minPuntaje)
      return false;
    if (filtros.search) {
      const s = filtros.search.toLowerCase();
      return (
        l.negocio.toLowerCase().includes(s) ||
        l.email.toLowerCase().includes(s) ||
        l.ubicacion.toLowerCase().includes(s)
      );
    }
    return true;
  });
}

export function ordenarLeads(leads: Lead[], ordenarPor: string | null): Lead[] {
  const copy = [...leads];
  if (ordenarPor === "puntaje") {
    copy.sort((a, b) => b.puntaje_oportunidad - a.puntaje_oportunidad);
    return copy;
  }
  if (ordenarPor === "negocio") {
    copy.sort((a, b) => a.negocio.localeCompare(b.negocio, "es"));
    return copy;
  }
  copy.sort(
    (a, b) =>
      new Date(b.fecha_deteccion).getTime() - new Date(a.fecha_deteccion).getTime(),
  );
  return copy;
}

export async function ensureSeedData(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const leadsPath = path.join(DATA_DIR, FILES.leads);
  let needsLeads = false;
  try {
    await fs.access(leadsPath);
  } catch {
    needsLeads = true;
  }
  if (!needsLeads) {
    const raw = await readJSON<Lead[]>(FILES.leads, []);
    needsLeads = !Array.isArray(raw) || raw.length === 0;
  }
  if (needsLeads) {
    await writeJSON(FILES.leads, MOCK_LEADS);
  }

  const correosPath = path.join(DATA_DIR, FILES.correos);
  let needsCorreos = false;
  try {
    await fs.access(correosPath);
  } catch {
    needsCorreos = true;
  }
  if (!needsCorreos) {
    const raw = await readJSON<Correo[]>(FILES.correos, []);
    needsCorreos = !Array.isArray(raw) || raw.length === 0;
  }
  if (needsCorreos) {
    await writeJSON(FILES.correos, MOCK_CORREOS);
  }

  const invPath = path.join(DATA_DIR, FILES.investigaciones);
  try {
    await fs.access(invPath);
  } catch {
    await writeJSON(FILES.investigaciones, MOCK_INVESTIGACIONES);
  }

  const pendingPath = path.join(DATA_DIR, FILES.pendingActions);
  try {
    await fs.access(pendingPath);
  } catch {
    const empty: PendingActionsFile = { actions: [] };
    await writeJSON(FILES.pendingActions, empty);
  }
}

export async function readLeads(): Promise<Lead[]> {
  await ensureSeedData();
  const data = await readJSON<Lead[]>(FILES.leads, []);
  return Array.isArray(data) ? data : [];
}

export async function readCorreos(): Promise<Correo[]> {
  await ensureSeedData();
  const data = await readJSON<Correo[]>(FILES.correos, []);
  return Array.isArray(data) ? data : [];
}

export async function updateLeadById(
  id: string,
  patch: Partial<Pick<Lead, "estado" | "notas" | "ultimo_contacto">>,
): Promise<Lead> {
  await ensureSeedData();
  const leads = await readLeads();
  const idx = leads.findIndex((l) => l.id === id);
  if (idx === -1) {
    throw new Error("Lead no encontrado");
  }
  const updated: Lead = { ...leads[idx], ...patch };
  leads[idx] = updated;
  await writeJSON(FILES.leads, leads);
  return updated;
}

export async function updateCorreoById(
  id: string,
  patch: Partial<
    Pick<Correo, "asunto" | "cuerpo_markdown" | "estado" | "variante" | "lead_email" | "fecha_envio">
  >,
): Promise<Correo> {
  await ensureSeedData();
  const correos = await readCorreos();
  const idx = correos.findIndex((c) => c.id === id);
  if (idx === -1) {
    throw new Error("Correo no encontrado");
  }
  const updated: Correo = { ...correos[idx], ...patch };
  correos[idx] = updated;
  await writeJSON(FILES.correos, correos);
  return updated;
}

export async function appendCorreo(
  row: Omit<Correo, "id" | "fecha_creacion"> & { id?: string; fecha_creacion?: string },
): Promise<Correo> {
  await ensureSeedData();
  const correos = await readCorreos();
  const nuevo: Correo = {
    id: row.id ?? `cor_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    fecha_creacion: row.fecha_creacion ?? new Date().toISOString(),
    lead_id: row.lead_id,
    asunto: row.asunto,
    cuerpo_markdown: row.cuerpo_markdown,
    variante: row.variante,
    estado: row.estado,
    lead_email: row.lead_email,
    ...(row.fecha_envio !== undefined ? { fecha_envio: row.fecha_envio } : {}),
  };
  correos.push(nuevo);
  await writeJSON(FILES.correos, correos);
  return nuevo;
}

export async function appendPendingAction(
  action: string,
  payload: Record<string, unknown>,
): Promise<PendingAction> {
  await ensureSeedData();
  const file = await readJSON<PendingActionsFile>(FILES.pendingActions, { actions: [] });
  const actions = Array.isArray(file.actions) ? file.actions : [];
  const row: PendingAction = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    action,
    payload,
    requestedAt: new Date().toISOString(),
  };
  actions.push(row);
  await writeJSON(FILES.pendingActions, { actions });
  return row;
}

const MOCK_LEADS: Lead[] = [
  {
    id: "cactus-muebles",
    negocio: "Cactus Muebles",
    nicho: "Muebles",
    email: "cactusmuebles@gmail.com",
    telefono: "",
    ubicacion: "Zapopan, JAL",
    instagram: "https://instagram.com/cactusmuebles",
    tiene_web: false,
    descripcion:
      "Tienda de muebles en Zapopan con fuerte presencia en Instagram; sin sitio web transaccional.",
    puntaje_oportunidad: 9,
    fecha_deteccion: new Date().toISOString(),
    estado: "nuevo",
    notas: "",
  },
  {
    id: "gardiel-muebles-y-diseno",
    negocio: "Gardiel Muebles y Diseño",
    nicho: "Muebles",
    email: "gardielmueblesydiseno@gmail.com",
    telefono: "",
    ubicacion: "Guadalajara, JAL",
    tiene_web: false,
    descripcion:
      "Mueblería y diseño en GDL; oportunidad en eCommerce y embudos de captación.",
    puntaje_oportunidad: 8,
    fecha_deteccion: new Date(Date.now() - 86400000).toISOString(),
    estado: "nuevo",
    notas: "",
  },
  {
    id: "moda-y-estilo-muebles",
    negocio: "Moda y Estilo Muebles",
    nicho: "Muebles",
    email: "modayestilomuebles@hotmail.com",
    telefono: "",
    ubicacion: "Guadalajara, JAL",
    tiene_web: false,
    descripcion:
      "Catálogo orientado a hogar; potencial para automatización de seguimiento y pauta.",
    puntaje_oportunidad: 7,
    fecha_deteccion: new Date(Date.now() - 172800000).toISOString(),
    estado: "nuevo",
    notas: "",
  },
];

const MOCK_CORREOS: Correo[] = [
  {
    id: "correo-cactus-muebles",
    lead_id: "cactus-muebles",
    asunto: "Propuesta para Cactus Muebles — presencia digital",
    cuerpo_markdown:
      "Hola equipo de **Cactus Muebles**,\n\nNotamos que su presencia en redes destaca sus piezas, pero **no cuentan con un sitio web** que cierre ventas en línea. En Boxly Digital ayudamos a mueblerías como la suya a convertir consultas en pedidos.\n\n¿Les gustaría una llamada de 15 minutos esta semana?\n\nSaludos,\nBoxly Digital",
    variante: "personalizado",
    estado: "borrador",
    fecha_creacion: new Date().toISOString(),
    lead_email: "cactusmuebles@gmail.com",
  },
  {
    id: "correo-gardiel-muebles-y-diseno",
    lead_id: "gardiel-muebles-y-diseno",
    asunto: "Gardiel Muebles y Diseño — optimización web",
    cuerpo_markdown:
      "Estimado equipo de **Gardiel Muebles y Diseño**,\n\nHemos revisado su presencia digital y vemos oportunidades claras en **captación y seguimiento de leads**. Adjuntamos ideas rápidas sin compromiso.\n\n¿Podemos coordinar un café virtual?\n\nSaludos,\nBoxly Digital",
    variante: "personalizado",
    estado: "borrador",
    fecha_creacion: new Date(Date.now() - 3600000).toISOString(),
    lead_email: "gardielmueblesydiseno@gmail.com",
  },
  {
    id: "correo-moda-y-estilo-muebles",
    lead_id: "moda-y-estilo-muebles",
    asunto: "Moda y Estilo Muebles — estrategia y canal digital",
    cuerpo_markdown:
      "Hola,\n\nSu catálogo tiene potencial para **escalar con una estrategia integrada** (web + ads + automatización). Nos encantaría mostrarles un roadmap breve.\n\n¿Les parece si les envío 3 ideas accionables?\n\nSaludos,\nBoxly Digital",
    variante: "personalizado",
    estado: "borrador",
    fecha_creacion: new Date(Date.now() - 7200000).toISOString(),
    lead_email: "modayestilomuebles@hotmail.com",
  },
];

const MOCK_INVESTIGACIONES: Investigacion[] = [
  {
    id: "inv-muebles-zapopan-1",
    nicho: "Muebles",
    ubicacion: "Zapopan / GDL",
    fecha: new Date(Date.now() - 86400000 * 3).toISOString(),
    total_revisados: 42,
    leads_generados: 3,
    fuentes: ["Google Maps", "Instagram"],
    duracion_segundos: 120,
    estado: "completada",
  },
];

export async function readInvestigaciones(): Promise<Investigacion[]> {
  await ensureSeedData();
  const data = await readJSON<Investigacion[]>(FILES.investigaciones, []);
  return Array.isArray(data) ? data : [];
}
