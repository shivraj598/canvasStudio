/**
 * A small in-memory stand-in for Supabase's PostgREST API, enough to run the Supabase store
 * against without a network. It mirrors the schema in supabase/migrations and enforces what
 * Postgres would (uuid syntax, not-null, unique, foreign keys, unknown columns), and records
 * every request so tests can assert on the exact calls the store makes.
 */
import { randomUUID } from 'node:crypto';

type ColumnType = 'uuid' | 'text' | 'timestamptz' | 'jsonb';

interface Column {
  type: ColumnType;
  notNull?: boolean;
  default?: () => unknown;
  unique?: boolean;
  references?: { table: string; column: string };
}

interface Table {
  primaryKey: string;
  columns: Record<string, Column>;
}

const now = () => new Date();

/** Mirrors supabase/migrations/20261106000000_init.sql. */
export const SCHEMA: Record<string, Table> = {
  users: {
    primaryKey: 'id',
    columns: {
      id: { type: 'uuid', notNull: true, default: randomUUID },
      email: { type: 'text', notNull: true, unique: true },
      name: { type: 'text', notNull: true },
      avatar_url: { type: 'text' },
      provider: { type: 'text', notNull: true },
      created_at: { type: 'timestamptz', notNull: true, default: now },
    },
  },
  sessions: {
    primaryKey: 'token_hash',
    columns: {
      token_hash: { type: 'text', notNull: true },
      user_id: {
        type: 'uuid',
        notNull: true,
        references: { table: 'users', column: 'id' },
      },
      expires_at: { type: 'timestamptz', notNull: true },
    },
  },
  projects: {
    primaryKey: 'id',
    columns: {
      id: { type: 'uuid', notNull: true, default: randomUUID },
      owner_id: {
        type: 'uuid',
        notNull: true,
        references: { table: 'users', column: 'id' },
      },
      name: { type: 'text', notNull: true },
      status: { type: 'text', notNull: true, default: () => 'draft' },
      prompt: { type: 'text' },
      answers: { type: 'jsonb', notNull: true, default: () => ({}) },
      completed_steps: { type: 'jsonb', notNull: true, default: () => [] },
      site: { type: 'jsonb' },
      files: { type: 'jsonb', notNull: true, default: () => [] },
      messages: { type: 'jsonb', notNull: true, default: () => [] },
      versions: { type: 'jsonb', notNull: true, default: () => [] },
      current_version_id: { type: 'text' },
      created_at: { type: 'timestamptz', notNull: true, default: now },
      updated_at: { type: 'timestamptz', notNull: true, default: now },
    },
  },
};

type Row = Record<string, unknown>;

export interface RecordedRequest {
  method: string;
  table: string;
  params: URLSearchParams;
  headers: Headers;
  body: unknown;
}

class PgError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** PostgREST renders timestamptz like `2026-01-01T00:00:05+00:00`, not `...05.000Z`. */
function renderTimestamp(date: Date): string {
  const iso = date.toISOString();
  const [base, ms] = iso.slice(0, -1).split('.');
  return `${base}${ms && ms !== '000' ? `.${ms}` : ''}+00:00`;
}

export interface FakePostgrest {
  fetch: typeof fetch;
  requests: RecordedRequest[];
  /** Raw stored rows, for asserting what actually landed in the database. */
  rows(table: string): Row[];
}

export function createFakePostgrest({
  url,
  serviceRoleKey,
}: {
  url: string;
  serviceRoleKey: string;
}): FakePostgrest {
  const tables = new Map<string, Row[]>(Object.keys(SCHEMA).map((name) => [name, []]));
  const requests: RecordedRequest[] = [];
  const restPrefix = `${url}/rest/v1/`;

  const coerce = (table: string, column: string, value: unknown): unknown => {
    const def = SCHEMA[table]!.columns[column];
    if (!def) {
      throw new PgError(
        400,
        'PGRST204',
        `Could not find the '${column}' column of '${table}' in the schema cache`,
      );
    }
    if (value === null || value === undefined) return null;
    switch (def.type) {
      case 'uuid':
        if (typeof value !== 'string' || !UUID.test(value)) {
          throw new PgError(400, '22P02', `invalid input syntax for type uuid: "${String(value)}"`);
        }
        return value.toLowerCase();
      case 'text':
        if (typeof value !== 'string') throw new PgError(400, '22P02', `expected text`);
        return value;
      case 'timestamptz': {
        const date = new Date(value as string);
        if (Number.isNaN(date.getTime())) {
          throw new PgError(400, '22007', `invalid input syntax for type timestamp with time zone`);
        }
        return date;
      }
      case 'jsonb':
        return structuredClone(value);
    }
  };

  const render = (table: string, row: Row, select: string | null): Row => {
    const columns =
      !select || select === '*'
        ? Object.keys(SCHEMA[table]!.columns)
        : select.split(',').map((c) => c.trim());
    const out: Row = {};
    for (const column of columns) {
      if (!(column in SCHEMA[table]!.columns)) {
        throw new PgError(400, '42703', `column ${table}.${column} does not exist`);
      }
      const value = row[column];
      out[column] = value instanceof Date ? renderTimestamp(value) : structuredClone(value ?? null);
    }
    return out;
  };

  const check = (table: string, row: Row, ignore?: Row) => {
    for (const [column, def] of Object.entries(SCHEMA[table]!.columns)) {
      const value = row[column];
      if (def.notNull && (value === null || value === undefined)) {
        throw new PgError(
          400,
          '23502',
          `null value in column "${column}" of relation "${table}" violates not-null constraint`,
        );
      }
      const others = tables.get(table)!.filter((r) => r !== ignore);
      if (
        (def.unique || column === SCHEMA[table]!.primaryKey) &&
        others.some((r) => r[column] === value)
      ) {
        throw new PgError(409, '23505', `duplicate key value violates unique constraint`);
      }
      if (def.references && value !== null && value !== undefined) {
        const parent = tables.get(def.references.table)!;
        if (!parent.some((r) => r[def.references!.column] === value)) {
          throw new PgError(
            409,
            '23503',
            `insert or update on table "${table}" violates foreign key constraint`,
          );
        }
      }
    }
  };

  const filtersOf = (table: string, params: URLSearchParams) => {
    const filters: [string, unknown][] = [];
    for (const [key, raw] of params) {
      if (['select', 'order', 'on_conflict', 'limit', 'columns'].includes(key)) continue;
      if (!raw.startsWith('eq.')) throw new Error(`fake PostgREST only supports eq: ${key}=${raw}`);
      filters.push([key, coerce(table, key, raw.slice(3))]);
    }
    return (row: Row) => filters.every(([column, value]) => row[column] === value);
  };

  const cascadeDelete = (table: string, removed: Row[]) => {
    for (const [childName, child] of Object.entries(SCHEMA)) {
      for (const [column, def] of Object.entries(child.columns)) {
        if (def.references?.table !== table) continue;
        const keys = new Set(removed.map((r) => r[def.references!.column]));
        const rows = tables.get(childName)!;
        const gone = rows.filter((r) => keys.has(r[column]));
        tables.set(
          childName,
          rows.filter((r) => !keys.has(r[column])),
        );
        cascadeDelete(childName, gone);
      }
    }
  };

  const handle = (
    method: string,
    table: string,
    params: URLSearchParams,
    headers: Headers,
    body: unknown,
  ): Row[] | null => {
    const rows = tables.get(table)!;
    const matches = filtersOf(table, params);

    if (method === 'GET') {
      const result = rows.filter(matches);
      const order = params.get('order');
      if (order) {
        const [column, direction] = order.split('.');
        const sign = direction === 'desc' ? -1 : 1;
        result.sort((a, b) => {
          const x = a[column!] as Date | string;
          const y = b[column!] as Date | string;
          return x < y ? -sign : x > y ? sign : 0;
        });
      }
      return result;
    }

    if (method === 'POST') {
      const prefer = headers.get('prefer') ?? '';
      const inputs = (Array.isArray(body) ? body : [body]) as Row[];
      const onConflict = params.get('on_conflict');
      const merge = prefer.includes('resolution=merge-duplicates');
      const written: Row[] = [];
      for (const input of inputs) {
        const values: Row = {};
        for (const [column, value] of Object.entries(input)) {
          values[column] = coerce(table, column, value);
        }
        const conflictColumn = onConflict ?? SCHEMA[table]!.primaryKey;
        const existing =
          merge && values[conflictColumn] !== undefined
            ? rows.find((r) => r[conflictColumn] === values[conflictColumn])
            : undefined;
        if (existing) {
          const updated = { ...existing, ...values };
          check(table, updated, existing);
          Object.assign(existing, updated);
          written.push(existing);
          continue;
        }
        const row: Row = {};
        for (const [column, def] of Object.entries(SCHEMA[table]!.columns)) {
          row[column] = column in values ? values[column] : (def.default?.() ?? null);
        }
        check(table, row);
        rows.push(row);
        written.push(row);
      }
      return written;
    }

    if (method === 'PATCH') {
      const values: Row = {};
      for (const [column, value] of Object.entries(body as Row)) {
        values[column] = coerce(table, column, value);
      }
      const targets = rows.filter(matches);
      for (const row of targets) {
        const updated = { ...row, ...values };
        check(table, updated, row);
        Object.assign(row, updated);
      }
      return targets;
    }

    if (method === 'DELETE') {
      const removed = rows.filter(matches);
      tables.set(
        table,
        rows.filter((r) => !matches(r)),
      );
      cascadeDelete(table, removed);
      return removed;
    }

    throw new Error(`fake PostgREST does not support ${method}`);
  };

  const fakeFetch: typeof fetch = async (input, init = {}) => {
    const requestUrl = new URL(typeof input === 'string' ? input : (input as Request).url);
    const href = requestUrl.toString();
    if (!href.startsWith(restPrefix)) {
      throw new Error(`fake PostgREST got an unexpected request to ${href}`);
    }
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = new Headers(init.headers);
    const table = requestUrl.pathname.split('/').pop()!;
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    requests.push({ method, table, params: requestUrl.searchParams, headers, body });

    const json = (status: number, payload: unknown) =>
      new Response(JSON.stringify(payload), {
        status,
        headers: { 'content-type': 'application/json' },
      });

    if (headers.get('apikey') !== serviceRoleKey) {
      return json(401, { message: 'Invalid API key', hint: null, details: null, code: null });
    }
    if (headers.get('authorization') !== `Bearer ${serviceRoleKey}`) {
      return json(401, { message: 'JWT invalid', code: 'PGRST301', details: null, hint: null });
    }
    if (!SCHEMA[table]) {
      return json(404, { code: 'PGRST205', message: `Could not find the table 'public.${table}'` });
    }

    try {
      const affected = handle(method, table, requestUrl.searchParams, headers, body);
      const prefer = headers.get('prefer') ?? '';
      const wantsRows = method === 'GET' || prefer.includes('return=representation');
      if (!wantsRows) return new Response(null, { status: method === 'POST' ? 201 : 204 });

      const rendered = (affected ?? []).map((row) =>
        render(table, row, requestUrl.searchParams.get('select')),
      );
      const status = method === 'POST' ? 201 : 200;
      if (headers.get('accept') === 'application/vnd.pgrst.object+json') {
        if (rendered.length !== 1) {
          return json(406, {
            code: 'PGRST116',
            details: `The result contains ${rendered.length} rows`,
            hint: null,
            message: 'JSON object requested, multiple (or no) rows returned',
          });
        }
        return json(status, rendered[0]);
      }
      return json(status, rendered);
    } catch (error) {
      if (error instanceof PgError) {
        return json(error.status, {
          code: error.code,
          message: error.message,
          details: null,
          hint: null,
        });
      }
      throw error;
    }
  };

  return {
    fetch: fakeFetch,
    requests,
    rows: (table) => structuredClone(tables.get(table) ?? []),
  };
}
