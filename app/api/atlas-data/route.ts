import { NextRequest, NextResponse } from "next/server";
import { CACHE_DURATION_SECONDS } from "@/app/config/cache";

// Manual in-memory cache
let cachedData: any = null;
let cacheTimestamp: number = 0;

export async function GET() {
  try {
    const now = Date.now();
    const cacheAgeMs = now - cacheTimestamp;
    const cacheMaxAgeMs = CACHE_DURATION_SECONDS * 1000;

    // If there is a valid cache entry, return it
    if (cachedData && cacheAgeMs < cacheMaxAgeMs) {
      return NextResponse.json(cachedData, {
        headers: {
          "Cache-Control": `public, s-maxage=${CACHE_DURATION_SECONDS}, stale-while-revalidate=${
            CACHE_DURATION_SECONDS * 2
          }`,
          "X-Cache-Status": "HIT",
          "X-Cache-Age": `${Math.floor(cacheAgeMs / 1000)}s`,
        },
      });
    }

    // Cache expired or missing, fetch data
    const response = await fetch("https://api.atlas.red/api/dashboard", {
      headers: {
        "x-admin-key": process.env.X_ADMIN_KEY || "",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Update cache
    cachedData = data;
    cacheTimestamp = now;

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_DURATION_SECONDS}, stale-while-revalidate=${
          CACHE_DURATION_SECONDS * 2
        }`,
        "X-Cache-Status": "MISS",
      },
    });
  } catch (error: any) {
    // If there is a cache entry (even an expired one), return it on error
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          "X-Cache-Status": "STALE",
        },
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
