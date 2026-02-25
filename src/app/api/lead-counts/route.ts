import { NextResponse } from "next/server";
import db from "@/lib/data/db";

export const dynamic = "force-dynamic";

export function GET() {
  const rows = db.prepare(
    "SELECT lead_source, COUNT(*) as count FROM clients GROUP BY lead_source"
  ).all() as { lead_source: string; count: number }[];

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.lead_source || "internal_banking"] = row.count;
  }

  return NextResponse.json(counts);
}
