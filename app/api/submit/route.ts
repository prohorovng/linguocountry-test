import { NextResponse } from "next/server";
import { buildResult, saveResult } from "@/lib/results";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = buildResult(body);
    await saveResult(result);

    return NextResponse.json({
      ok: true,
      score: result.score,
      total: result.total,
      percent: result.percent
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Не вдалося зберегти результат."
      },
      { status: 400 }
    );
  }
}
