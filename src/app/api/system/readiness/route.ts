import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getReadinessReport } from "@/lib/system-readiness";
import { getErrorMessage } from "@/lib/utils";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const report = await getReadinessReport();
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to load readiness report") },
      { status: 500 }
    );
  }
}
