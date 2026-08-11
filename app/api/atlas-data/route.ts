import { NextResponse } from "next/server";
import { CACHE_DURATION_SECONDS } from "@/app/config/cache";

export const dynamic = "force-dynamic";

/**
 * Atlas backend moved to apiv3 and switched auth: the old `x-admin-key` header
 * is no longer accepted (it returns 401 "Invalid token"), which is what broke
 * this screen. The full /dashboard endpoint now needs a JWT bearer token.
 *
 * /dashboard/landing-stats is public and carries the entity counts we display,
 * so it is the default source. If ATLAS_API_TOKEN is configured we use the
 * richer authenticated endpoint instead — no code change needed to switch.
 */
const ATLAS_BASE_URL = process.env.ATLAS_API_URL ?? "https://apiv3.atlas.red/api";

const PUBLIC_ENDPOINT = `${ATLAS_BASE_URL}/dashboard/landing-stats`;
const ADMIN_ENDPOINT = `${ATLAS_BASE_URL}/dashboard`;

const UPSTREAM_TIMEOUT_MS = 15_000;

export interface AtlasMarketCount {
  pri: number;
  col: number;
}

export interface AtlasData {
  parcels: AtlasMarketCount;
  listings: AtlasMarketCount;
  transactions: AtlasMarketCount;
  news: number;
  /** Only available from the authenticated endpoint. */
  users: (AtlasMarketCount & { externalPayments: number }) | null;
  source: "public" | "admin";
  fetchedAt: string;
}

let cache: { data: AtlasData; fetchedAt: number } | null = null;

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * landing-stats returns a flat, dotted map:
 * { "parcels.pri": 1351733, "listings.col": 1855737, news: 102941, ... }
 */
function normalizePublic(payload: any): AtlasData {
  const data = payload?.data ?? {};
  return {
    parcels: { pri: num(data["parcels.pri"]), col: num(data["parcels.col"]) },
    listings: { pri: num(data["listings.pri"]), col: num(data["listings.col"]) },
    transactions: {
      pri: num(data["transactions.pri"]),
      col: num(data["transactions.col"]),
    },
    news: num(data.news),
    users: null,
    source: "public",
    fetchedAt: new Date().toISOString(),
  };
}

/** The authenticated endpoint nests its counts instead. */
function normalizeAdmin(payload: any): AtlasData {
  const data = payload?.data ?? {};
  const newsFromSources = Array.isArray(data.dataSources?.byType)
    ? data.dataSources.byType.find((entry: any) => entry?.key === "News")
        ?.doc_count
    : undefined;

  return {
    parcels: { pri: num(data.parcels?.pri), col: num(data.parcels?.col) },
    listings: { pri: num(data.listings?.pri), col: num(data.listings?.col) },
    transactions: {
      pri: num(data.transactions?.pri),
      col: num(data.transactions?.col),
    },
    news: num(data.news ?? newsFromSources),
    users: data.users
      ? {
          pri: num(data.users.pri),
          col: num(data.users.col),
          externalPayments: num(data.users.externalPayments),
        }
      : null,
    source: "admin",
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchUpstream(): Promise<AtlasData> {
  const token = process.env.ATLAS_API_TOKEN;

  const url = token ? ADMIN_ENDPOINT : PUBLIC_ENDPOINT;
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });

  if (!response.ok) {
    // A stale/revoked token shouldn't take the whole screen down — fall back
    // to the public endpoint, which still covers most of the cards.
    if (token && (response.status === 401 || response.status === 403)) {
      console.warn(
        `Atlas admin endpoint rejected the token (${response.status}); falling back to public stats`
      );
      const publicResponse = await fetch(PUBLIC_ENDPOINT, {
        cache: "no-store",
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      if (!publicResponse.ok) {
        throw new Error(`Atlas responded ${publicResponse.status}`);
      }
      return normalizePublic(await publicResponse.json());
    }
    throw new Error(`Atlas responded ${response.status}`);
  }

  const payload = await response.json();
  return token ? normalizeAdmin(payload) : normalizePublic(payload);
}

export async function GET() {
  const cacheMaxAgeMs = CACHE_DURATION_SECONDS * 1000;
  const cacheHeaders = {
    "Cache-Control": `private, max-age=${CACHE_DURATION_SECONDS}`,
  };

  if (cache && Date.now() - cache.fetchedAt < cacheMaxAgeMs) {
    return NextResponse.json(cache.data, {
      headers: {
        ...cacheHeaders,
        "X-Cache-Status": "HIT",
        "X-Cache-Age": `${Math.floor((Date.now() - cache.fetchedAt) / 1000)}s`,
      },
    });
  }

  try {
    const data = await fetchUpstream();
    cache = { data, fetchedAt: Date.now() };
    return NextResponse.json(data, {
      headers: { ...cacheHeaders, "X-Cache-Status": "MISS" },
    });
  } catch (error) {
    console.error("Atlas data error:", error);

    // Prefer showing slightly old numbers over an error screen.
    if (cache) {
      return NextResponse.json(cache.data, {
        headers: { "X-Cache-Status": "STALE" },
      });
    }

    return NextResponse.json(
      {
        error: "No se pudo obtener los datos de Atlas",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}
