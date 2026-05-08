import { NextResponse } from "next/server";
import { readCorreos } from "@/lib/hermes";

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
