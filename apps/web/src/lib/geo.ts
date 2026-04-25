/**
 * Client-side geo detection for regulatory compliance.
 *
 * We use ipapi.co's free endpoint (no key, CORS-enabled, 1k req/day per IP)
 * to resolve the visitor's country and (for US) region code. The result is
 * cached in sessionStorage so we don't re-query on every navigation.
 *
 * Block list (see compliance report):
 *  - Sanctioned countries: CU, IR, KP, SY
 *  - Countries that prohibit skill wagering: AE, SG, CN, SA
 *  - US states that prohibit any real-money gaming: WA, AZ, LA, MT, SD,
 *    SC, TN, AR, CT, DE
 *
 * Fail-open policy: if the lookup fails (network error, ad-blocker kills
 * the request, etc.) we let the user through. A stricter policy would
 * fail-closed, but for a testnet skill game fail-open is an acceptable
 * trade-off between false positives and missed blocks. Override with
 * `VITE_GEO_FAIL_CLOSED=1` to flip.
 */

export type GeoResult = {
  country: string | null; // ISO alpha-2, uppercase
  region: string | null; // e.g. "WA" for US
  status: "ok" | "failed" | "skipped";
};

export type BlockReason = {
  reason: "sanctioned" | "prohibited_country" | "prohibited_state";
  country: string;
  region?: string;
};

const SANCTIONED = new Set(["CU", "IR", "KP", "SY"]);
const PROHIBITED_COUNTRIES = new Set(["AE", "SG", "CN", "SA"]);
const PROHIBITED_US_STATES = new Set([
  "WA",
  "AZ",
  "LA",
  "MT",
  "SD",
  "SC",
  "TN",
  "AR",
  "CT",
  "DE",
]);

const SS_KEY = "seabattle:geo:v1";
const ENDPOINT = "https://ipapi.co/json/";

export function evaluateBlock(geo: GeoResult): BlockReason | null {
  if (geo.status !== "ok" || !geo.country) return null;
  const country = geo.country.toUpperCase();
  if (SANCTIONED.has(country)) {
    return { reason: "sanctioned", country };
  }
  if (PROHIBITED_COUNTRIES.has(country)) {
    return { reason: "prohibited_country", country };
  }
  if (country === "US" && geo.region) {
    const region = geo.region.toUpperCase();
    if (PROHIBITED_US_STATES.has(region)) {
      return { reason: "prohibited_state", country, region };
    }
  }
  return null;
}

function readCache(): GeoResult | null {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GeoResult;
  } catch {
    return null;
  }
}

function writeCache(result: GeoResult) {
  try {
    sessionStorage.setItem(SS_KEY, JSON.stringify(result));
  } catch {
    /* ignore */
  }
}

export async function lookupGeo(signal?: AbortSignal): Promise<GeoResult> {
  const cached = readCache();
  if (cached) return cached;

  try {
    const res = await fetch(ENDPOINT, { signal });
    if (!res.ok) throw new Error(`geo ${res.status}`);
    const body = (await res.json()) as {
      country_code?: string;
      region_code?: string;
      error?: boolean;
    };
    if (body.error) throw new Error("geo error");
    const result: GeoResult = {
      country: body.country_code?.toUpperCase() ?? null,
      region: body.region_code?.toUpperCase() ?? null,
      status: "ok",
    };
    writeCache(result);
    return result;
  } catch {
    const failed: GeoResult = { country: null, region: null, status: "failed" };
    // don't cache failures aggressively; allow retry next session
    return failed;
  }
}

/** Test override — set in jsdom/unit tests before calling lookupGeo(). */
export function __setGeoForTest(geo: GeoResult | null) {
  if (geo) writeCache(geo);
  else {
    try {
      sessionStorage.removeItem(SS_KEY);
    } catch {
      /* ignore */
    }
  }
}
