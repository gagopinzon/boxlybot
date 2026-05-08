import { NextResponse } from "next/server";
import { readInvestigaciones } from "@/lib/hermes";

export async function GET() {
  let rows = await readInvestigaciones();
  rows = [...rows].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  );
  return NextResponse.json({ investigaciones: rows, total: rows.length });
}
