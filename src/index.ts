interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * EPA Emissions MCP — wraps EPA Envirofacts REST API (free, no auth)
 *
 * Combines GHGRP (greenhouse gas) and TRI (toxic releases) data.
 * API pattern: GET https://data.epa.gov/efservice/{TABLE}/{COL}/{VALUE}/JSON
 */


const BASE = 'https://data.epa.gov/efservice';

// ── Types ───────────────────────────────────────────────────────────

type RawGhgFacility = {
  FACILITY_NAME?: string;
  CITY?: string;
  STATE_NAME?: string;
  ZIP?: string;
  LATITUDE?: number;
  LONGITUDE?: number;
  INDUSTRY_TYPE?: string;
  TOTAL_REPORTED_DIRECT_EMISSIONS?: number;
  YEAR?: number;
  FACILITY_ID?: number;
};

type RawTriFacility = {
  FACILITY_NAME?: string;
  CITY_NAME?: string;
  COUNTY_NAME?: string;
  STATE_ABBR?: string;
  ZIP_CODE?: string;
  LATITUDE?: number;
  LONGITUDE?: number;
  INDUSTRY_SECTOR?: string;
  TRI_FACILITY_ID?: string;
  PREF_QA_CODE?: string;
};

type RawTriRelease = {
  FACILITY_NAME?: string;
  CHEMICAL_NAME?: string;
  TOTAL_RELEASES?: number;
  FUGITIVE_AIR?: number;
  STACK_AIR?: number;
  WATER?: number;
  UNDERGROUND?: number;
  LANDFILLS?: number;
  ON_SITE_RELEASE_TOTAL?: number;
  OFF_SITE_RELEASE_TOTAL?: number;
  REPORTING_YEAR?: number;
  STATE_ABBR?: string;
  TRI_FACILITY_ID?: string;
  UNIT_OF_MEASURE?: string;
};

// ── Helpers ─────────────────────────────────────────────────────────

function buildPath(table: string, filters: [string, string | null][]): string {
  let path = `${BASE}/${table}`;
  for (const [col, val] of filters) {
    if (val) path += `/${col}/${encodeURIComponent(val)}`;
  }
  return path;
}

async function efFetch(path: string, limit: number): Promise<unknown[]> {
  const rows = Math.min(100, Math.max(1, limit));
  const url = `${path}/JSON/rows/${rows}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`EPA Envirofacts API error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data as unknown[];
}

function cleanGhgFacility(f: RawGhgFacility) {
  return {
    facility_id: f.FACILITY_ID ?? null,
    name: f.FACILITY_NAME ?? null,
    city: f.CITY ?? null,
    state: f.STATE_NAME ?? null,
    zip: f.ZIP ?? null,
    latitude: f.LATITUDE ?? null,
    longitude: f.LONGITUDE ?? null,
    industry_type: f.INDUSTRY_TYPE ?? null,
    total_ghg_emissions_mt_co2e: f.TOTAL_REPORTED_DIRECT_EMISSIONS ?? null,
    year: f.YEAR ?? null,
  };
}

function cleanTriFacility(f: RawTriFacility) {
  return {
    tri_facility_id: f.TRI_FACILITY_ID ?? null,
    name: f.FACILITY_NAME ?? null,
    city: f.CITY_NAME ?? null,
    county: f.COUNTY_NAME ?? null,
    state: f.STATE_ABBR ?? null,
    zip: f.ZIP_CODE ?? null,
    latitude: f.LATITUDE ?? null,
    longitude: f.LONGITUDE ?? null,
    industry_sector: f.INDUSTRY_SECTOR ?? null,
  };
}

function cleanTriRelease(r: RawTriRelease) {
  return {
    tri_facility_id: r.TRI_FACILITY_ID ?? null,
    facility_name: r.FACILITY_NAME ?? null,
    chemical: r.CHEMICAL_NAME ?? null,
    reporting_year: r.REPORTING_YEAR ?? null,
    state: r.STATE_ABBR ?? null,
    unit: r.UNIT_OF_MEASURE ?? null,
    total_releases: r.TOTAL_RELEASES ?? null,
    fugitive_air: r.FUGITIVE_AIR ?? null,
    stack_air: r.STACK_AIR ?? null,
    water: r.WATER ?? null,
    underground: r.UNDERGROUND ?? null,
    landfills: r.LANDFILLS ?? null,
    on_site_total: r.ON_SITE_RELEASE_TOTAL ?? null,
    off_site_total: r.OFF_SITE_RELEASE_TOTAL ?? null,
  };
}

// ── Tool definitions ────────────────────────────────────────────────

const tools: McpToolExport['tools'] = [
  {
    name: 'ghg_facility_emissions',
    description:
      'Search greenhouse gas emissions by state and optionally by facility name. Returns facility details and total GHG emissions in metric tons CO2 equivalent.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        state: {
          type: 'string',
          description: 'Full state name (e.g., "Texas", "California").',
        },
        facility_name: {
          type: 'string',
          description: 'Facility name to search for (partial match using CONTAINING).',
        },
        limit: { type: 'number', description: 'Max results (default 20, max 100).' },
      },
      required: ['state'],
    },
  },
  {
    name: 'ghg_emissions_by_sector',
    description:
      'Get greenhouse gas emissions by industry sector for a state. Optionally filter by sector type (e.g., "Power Plants", "Chemicals").',
    inputSchema: {
      type: 'object' as const,
      properties: {
        state: {
          type: 'string',
          description: 'Full state name (e.g., "Texas").',
        },
        sector: {
          type: 'string',
          description: 'Industry type filter (e.g., "Power Plants", "Petroleum and Natural Gas Systems", "Chemicals").',
        },
        limit: { type: 'number', description: 'Max results (default 20, max 100).' },
      },
      required: ['state'],
    },
  },
  {
    name: 'tri_facility_releases',
    description:
      'Search Toxic Release Inventory (TRI) facilities by state. Returns facility details and released chemicals.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        state: {
          type: 'string',
          description: 'Two-letter state abbreviation (e.g., "TX", "CA").',
        },
        facility_name: {
          type: 'string',
          description: 'Facility name to search for (partial match).',
        },
        limit: { type: 'number', description: 'Max results (default 20, max 100).' },
      },
      required: ['state'],
    },
  },
  {
    name: 'tri_chemical_releases',
    description:
      'Search toxic chemical releases across all facilities. Filter by chemical name and optionally by state. Returns quantities released by media (air, water, land).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        chemical: {
          type: 'string',
          description: 'Chemical name (e.g., "LEAD", "MERCURY", "BENZENE", "TOLUENE").',
        },
        state: {
          type: 'string',
          description: 'Two-letter state abbreviation to filter by (optional).',
        },
        limit: { type: 'number', description: 'Max results (default 20, max 100).' },
      },
      required: ['chemical'],
    },
  },
  {
    name: 'tri_trends',
    description:
      'Get toxic release trends over time for a state or chemical across reporting years. Queries multiple years and summarizes totals.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        state: {
          type: 'string',
          description: 'Two-letter state abbreviation (e.g., "OH").',
        },
        chemical: {
          type: 'string',
          description: 'Chemical name (e.g., "LEAD").',
        },
        start_year: {
          type: 'number',
          description: 'Start year for the trend range (default: 5 years ago).',
        },
        end_year: {
          type: 'number',
          description: 'End year for the trend range (default: most recent available).',
        },
      },
    },
  },
];

// ── Tool implementations ────────────────────────────────────────────

async function ghgFacilityEmissions(args: Record<string, unknown>) {
  const state = String(args.state);
  const limit = Number(args.limit) || 20;

  const filters: [string, string | null][] = [
    ['STATE_NAME', state],
  ];
  if (args.facility_name) {
    filters.push(['FACILITY_NAME', `CONTAINING/${String(args.facility_name)}`]);
  }

  const path = buildPath('PUB_DIM_FACILITY', filters);
  const rows = (await efFetch(path, limit)) as RawGhgFacility[];

  return {
    count: rows.length,
    state,
    facilities: rows.map(cleanGhgFacility),
  };
}

async function ghgEmissionsBySector(args: Record<string, unknown>) {
  const state = String(args.state);
  const limit = Number(args.limit) || 20;

  const filters: [string, string | null][] = [
    ['STATE_NAME', state],
  ];
  if (args.sector) {
    filters.push(['INDUSTRY_TYPE', String(args.sector)]);
  }

  const path = buildPath('PUB_DIM_FACILITY', filters);
  const rows = (await efFetch(path, limit)) as RawGhgFacility[];

  // Aggregate by sector
  const sectorMap = new Map<string, { count: number; total_emissions: number }>();
  for (const row of rows) {
    const sector = row.INDUSTRY_TYPE ?? 'Unknown';
    const entry = sectorMap.get(sector) ?? { count: 0, total_emissions: 0 };
    entry.count += 1;
    entry.total_emissions += row.TOTAL_REPORTED_DIRECT_EMISSIONS ?? 0;
    sectorMap.set(sector, entry);
  }

  return {
    state,
    facility_count: rows.length,
    sectors: Array.from(sectorMap.entries()).map(([name, data]) => ({
      sector: name,
      facility_count: data.count,
      total_emissions_mt_co2e: Math.round(data.total_emissions * 100) / 100,
    })),
    facilities: rows.map(cleanGhgFacility),
  };
}

async function triFacilityReleases(args: Record<string, unknown>) {
  const state = String(args.state);
  const limit = Number(args.limit) || 20;

  const filters: [string, string | null][] = [
    ['STATE_ABBR', state.toUpperCase()],
  ];
  if (args.facility_name) {
    filters.push(['FACILITY_NAME', `CONTAINING/${String(args.facility_name)}`]);
  }

  const path = buildPath('TRI_FACILITY', filters);
  const rows = (await efFetch(path, limit)) as RawTriFacility[];

  return {
    count: rows.length,
    state: state.toUpperCase(),
    facilities: rows.map(cleanTriFacility),
  };
}

async function triChemicalReleases(args: Record<string, unknown>) {
  const chemical = String(args.chemical).toUpperCase();
  const limit = Number(args.limit) || 20;

  const filters: [string, string | null][] = [
    ['CHEMICAL_NAME', chemical],
  ];
  if (args.state) {
    filters.push(['STATE_ABBR', String(args.state).toUpperCase()]);
  }

  const path = buildPath('TRI_RELEASE_QTY', filters);
  const rows = (await efFetch(path, limit)) as RawTriRelease[];

  return {
    chemical,
    count: rows.length,
    releases: rows.map(cleanTriRelease),
  };
}

async function triTrends(args: Record<string, unknown>) {
  if (!args.state && !args.chemical) {
    throw new Error('At least one of "state" or "chemical" is required for trend queries.');
  }

  const currentYear = new Date().getFullYear();
  const startYear = Number(args.start_year) || currentYear - 5;
  const endYear = Number(args.end_year) || currentYear - 1;

  if (endYear - startYear > 10) {
    throw new Error('Year range cannot exceed 10 years to stay within API limits.');
  }

  const yearlyTotals: { year: number; total_releases: number; facility_count: number }[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const filters: [string, string | null][] = [
      ['REPORTING_YEAR', String(year)],
    ];
    if (args.state) filters.push(['STATE_ABBR', String(args.state).toUpperCase()]);
    if (args.chemical) filters.push(['CHEMICAL_NAME', String(args.chemical).toUpperCase()]);

    const path = buildPath('TRI_RELEASE_QTY', filters);
    const rows = (await efFetch(path, 100)) as RawTriRelease[];

    let totalReleases = 0;
    for (const r of rows) {
      totalReleases += r.TOTAL_RELEASES ?? 0;
    }

    yearlyTotals.push({
      year,
      total_releases: Math.round(totalReleases * 100) / 100,
      facility_count: rows.length,
    });
  }

  return {
    state: args.state ? String(args.state).toUpperCase() : null,
    chemical: args.chemical ? String(args.chemical).toUpperCase() : null,
    start_year: startYear,
    end_year: endYear,
    trends: yearlyTotals,
  };
}

// ── Router ──────────────────────────────────────────────────────────

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'ghg_facility_emissions':
      return ghgFacilityEmissions(args);
    case 'ghg_emissions_by_sector':
      return ghgEmissionsBySector(args);
    case 'tri_facility_releases':
      return triFacilityReleases(args);
    case 'tri_chemical_releases':
      return triChemicalReleases(args);
    case 'tri_trends':
      return triTrends(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default { tools, callTool, meter: { credits: 5 } } satisfies McpToolExport;
