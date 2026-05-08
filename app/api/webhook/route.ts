import { NextResponse } from "next/server";
import type { WebhookBody } from "@/lib/types";
import { appendPendingAction } from "@/lib/hermes";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const b = body as Partial<WebhookBody>;
  if (!b || typeof b.action !== "string" || !b.action.trim()) {
    return NextResponse.json({ error: "action requerido" }, { status: 400 });
  }
  const payload =
    b.payload && typeof b.payload === "object" && !Array.isArray(b.payload)
      ? (b.payload as Record<string, unknown>)
      : {};

  const queued = await appendPendingAction(b.action.trim(), payload);

  return NextResponse.json({
    ok: true,
    queued: queued,
    message:
      "Acción registrada en pending_actions.json para que Hermes la procese.",
  });
}
