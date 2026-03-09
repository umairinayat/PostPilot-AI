import { NextResponse } from "next/server";
import { OPENROUTER_MODELS } from "@/types";

export async function GET() {
  return NextResponse.json({ models: OPENROUTER_MODELS });
}
