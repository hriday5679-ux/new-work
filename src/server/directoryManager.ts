import fs from 'fs';
import path from 'path';
import { mapStateToAicteRegion } from '../utils/aicteRegions.ts';
import { FICTIONAL_DEMO_INSTITUTIONS } from '../data/fictionalDemoData.ts';
import type { Institution } from '../types/index.ts';

const CSV_FILE = path.resolve(process.cwd(), 'data', 'aicte_institutions.csv');
const COMPACT_JSON = path.resolve(process.cwd(), 'data', 'aicte_institutions_compact.json');

export interface DirectoryQuery {
  search?: string;
  state?: string;
  region?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export interface DirectoryResult {
  institutions: Institution[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  isCsvMissing: boolean;
  message: string;
}

let cachedInstitutions: Institution[] | null = null;
let lastCsvMtime = 0;

/**
 * Parse CSV line respecting quotes
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Load or convert Directory
 */
export function getAicteDirectory(): { institutions: Institution[]; isCsvMissing: boolean; message: string } {
  // Check if CSV exists
  if (fs.existsSync(CSV_FILE)) {
    try {
      const stats = fs.statSync(CSV_FILE);
      if (!cachedInstitutions || stats.mtimeMs > lastCsvMtime) {
        const content = fs.readFileSync(CSV_FILE, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim().length > 0);

        if (lines.length > 1) {
          // Columns: AICTE ID, name, state, district, address, institution type, programmes
          const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase());
          const idIdx = headers.findIndex(h => h.includes('id') || h.includes('code'));
          const nameIdx = headers.findIndex(h => h.includes('name'));
          const stateIdx = headers.findIndex(h => h.includes('state'));
          const distIdx = headers.findIndex(h => h.includes('dist'));
          const addrIdx = headers.findIndex(h => h.includes('addr'));
          const typeIdx = headers.findIndex(h => h.includes('type'));
          const progIdx = headers.findIndex(h => h.includes('prog'));

          const parsedList: Institution[] = [];
          for (let i = 1; i < lines.length; i++) {
            const row = parseCsvLine(lines[i]);
            if (!row || row.length < 2) continue;

            const code = row[idIdx !== -1 ? idIdx : 0] || `1-CSV-${i}`;
            const name = row[nameIdx !== -1 ? nameIdx : 1] || 'Unnamed Institute';
            const state = row[stateIdx !== -1 ? stateIdx : 2] || 'Delhi';
            const district = row[distIdx !== -1 ? distIdx : 3] || '';
            const address = row[addrIdx !== -1 ? addrIdx : 4] || `${district}, ${state}`;
            const type = row[typeIdx !== -1 ? typeIdx : 5] || 'Engineering & Tech';
            const programmes = row[progIdx !== -1 ? progIdx : 6] || '';
            const region = mapStateToAicteRegion(state);

            parsedList.push({
              id: `inst-csv-${code.replace(/[^a-zA-Z0-9]/g, '-')}`,
              name,
              code,
              state,
              district,
              region,
              type: (type as any) || 'Engineering & Tech',
              contactPerson: 'Director / Authorized Signatory',
              email: `info@${code.toLowerCase().replace(/[^a-z0-9]/g, '')}.aicte.gov.in`,
              phone: '+91 11 2372 4151',
              address,
              approvalStatus: 'APPROVED',
              establishmentYear: 2010,
              totalDepositAmount: 0,
              category: 'GGSIPU_AFFILIATED',
              categoryLabel: 'AICTE Approved Institution',
              isAffiliationVerified: true,
              affiliationStatus: 'AICTE Approved Directory Record',
              isDemoReference: false,
              programmes,
            });
          }

          cachedInstitutions = parsedList;
          lastCsvMtime = stats.mtimeMs;

          // Save compact JSON cache asynchronously
          fs.promises.writeFile(COMPACT_JSON, JSON.stringify(parsedList)).catch(() => {});

          return {
            institutions: cachedInstitutions,
            isCsvMissing: false,
            message: `Loaded ${cachedInstitutions.length} AICTE-approved institutions from /data/aicte_institutions.csv.`,
          };
        }
      }
    } catch (err) {
      console.warn('[DirectoryManager] Error parsing CSV:', err);
    }
  }

  // Check if compact JSON exists from previous build
  if (fs.existsSync(COMPACT_JSON)) {
    try {
      if (!cachedInstitutions) {
        const raw = fs.readFileSync(COMPACT_JSON, 'utf-8');
        cachedInstitutions = JSON.parse(raw);
      }
      if (cachedInstitutions && cachedInstitutions.length > 0) {
        return {
          institutions: cachedInstitutions,
          isCsvMissing: false,
          message: `Loaded ${cachedInstitutions.length} institutions from cached directory.`,
        };
      }
    } catch (e) {}
  }

  // Fallback to Section 2 Sample Institutions when CSV is missing
  return {
    institutions: FICTIONAL_DEMO_INSTITUTIONS,
    isCsvMissing: true,
    message:
      'AICTE Institution Directory CSV (/data/aicte_institutions.csv) was not found. Showing sample/demo institutions. Place the official CSV in /data to enable the full national directory.',
  };
}

/**
 * Query Directory with search, filters, pagination
 */
export function queryDirectory(params: DirectoryQuery): DirectoryResult {
  const { institutions, isCsvMissing, message } = getAicteDirectory();

  let filtered = [...institutions];

  if (params.region && params.region !== 'ALL') {
    filtered = filtered.filter(i => i.region === params.region);
  }

  if (params.state && params.state !== 'ALL') {
    filtered = filtered.filter(i => i.state.toLowerCase() === params.state?.toLowerCase());
  }

  if (params.type && params.type !== 'ALL') {
    filtered = filtered.filter(i => i.type.toLowerCase().includes(params.type?.toLowerCase() || ''));
  }

  if (params.search) {
    const q = params.search.toLowerCase().trim();
    filtered = filtered.filter(
      i =>
        i.name.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q) ||
        i.district.toLowerCase().includes(q) ||
        i.state.toLowerCase().includes(q) ||
        (i.programmes && i.programmes.toLowerCase().includes(q))
    );
  }

  const total = filtered.length;
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(5, params.limit || 20));
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const pagedInstitutions = filtered.slice(startIndex, startIndex + limit);

  return {
    institutions: pagedInstitutions,
    total,
    page,
    limit,
    totalPages,
    isCsvMissing,
    message,
  };
}
