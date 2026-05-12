import { NextResponse } from "next/server";
import { readCorreos, updateCorreoById } from "@/lib/hermes";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  const { id } = await context.params;
  const correos = await readCorreos();
  const correo = correos.find((c) => c.id === id);
  if (!correo) {
    return NextResponse.json({ error: "Correo no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ correo });
}

export async function PATCH(request: Request, context: Params) {
  const { id } = await context.params;
  const correos = await readCorreos();
  const existing = correos.find((c) => c.id === id);
  if (!existing) {
    return NextResponse.json({ error: "Correo no encontrado" }, { status: 404 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    cuerpo_markdown?: unknown;
    asunto?: unknown;
    lead_email?: unknown;
  };
  const patch: Parameters<typeof updateCorreoById>[1] = {};
  if (typeof body.cuerpo_markdown === "string") patch.cuerpo_markdown = body.cuerpo_markdown;
  if (typeof body.asunto === "string") patch.asunto = body.asunto;
  if (typeof body.lead_email === "string") patch.lead_email = body.lead_email.trim();
  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "Envía al menos cuerpo_markdown, asunto o lead_email" },
      { status: 400 },
    );
  }
  if (patch.lead_email !== undefined && !patch.lead_email.includes("@")) {
    return NextResponse.json({ error: "lead_email no parece un correo válido" }, { status: 400 });
  }
  try {
    const correo = await updateCorreoById(id, patch);
    return NextResponse.json({ correo });
  } catch {
    return NextResponse.json({ error: "Correo no encontrado" }, { status: 404 });
  }
}
