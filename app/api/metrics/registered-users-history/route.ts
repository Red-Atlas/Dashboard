import { NextResponse } from "next/server";
import { getRegisteredUsersByDay } from "@/lib/google-analytics";

export const dynamic = "force-dynamic";

/**
 * Real per-day active users for the last 7 days. Previously this called
 * getRegisteredUsers() (a single 28-day total) once per day and added a random
 * ±50 to each point, so the whole trend line was invented.
 */
export async function GET() {
  try {
    const data = await getRegisteredUsersByDay();

    return NextResponse.json(
      { data, timestamp: new Date().toISOString() },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Error en registered-users-history:", error);
    return NextResponse.json(
      { data: [], error: "Failed to fetch registered users history" },
      { status: 502 }
    );
  }
}
