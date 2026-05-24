import { getResultsCsv } from "@/lib/results";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const csv = await getResultsCsv();

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'inline; filename="results.csv"',
      "Cache-Control": "no-store"
    }
  });
}
