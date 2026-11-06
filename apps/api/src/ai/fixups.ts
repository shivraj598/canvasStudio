/**
 * Post-processing applied to a project after an AI turn — the small slips models make that a
 * build tool would otherwise reject. Like Bolt/Lovable installing packages for you: imports of
 * packages missing from package.json are added to it.
 */
import type { ProjectFile } from '@canvas/shared';

/** Versions for packages the system prompt allows (and their usual companions). */
export const KNOWN_VERSIONS: Record<string, string> = {
  react: '^19.1.0',
  'react-dom': '^19.1.0',
  'lucide-react': '^0.468.0',
  clsx: '^2.1.1',
  'react-router-dom': '^7.6.0',
  'tailwind-merge': '^3.3.0',
};

const BUILTIN = new Set(['react/jsx-runtime', 'react/jsx-dev-runtime']);

function packageName(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]!;
}

/** Bare package imports in the project's source files. */
export function importedPackages(files: ProjectFile[]): Set<string> {
  const found = new Set<string>();
  const pattern =
    /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(?\s*['"]([^'"]+)['"]/g;
  for (const file of files) {
    if (!/^src\/.*\.(tsx?|jsx?)$/.test(file.path)) continue;
    for (const m of file.content.matchAll(pattern)) {
      const spec = m[1] ?? m[2]!;
      if (/^[./]/.test(spec) || spec.startsWith('@/') || BUILTIN.has(spec)) continue;
      if (/\.(css|scss|svg|png|jpe?g|webp)$/.test(spec)) continue;
      found.add(packageName(spec));
    }
  }
  return found;
}

export interface Fixup {
  file: ProjectFile;
  note: string;
}

/** Adds imported-but-undeclared packages to package.json. */
export function reconcileDependencies(files: ProjectFile[]): Fixup | null {
  const pkgFile = files.find((f) => f.path === 'package.json');
  if (!pkgFile) return null;
  let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  try {
    pkg = JSON.parse(pkgFile.content);
  } catch {
    return null;
  }
  const declared = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ]);
  const missing = [...importedPackages(files)].filter((name) => !declared.has(name)).sort();
  if (missing.length === 0) return null;

  const dependencies = { ...pkg.dependencies };
  for (const name of missing) dependencies[name] = KNOWN_VERSIONS[name] ?? 'latest';
  const sorted = Object.fromEntries(
    Object.entries(dependencies).sort(([a], [b]) => a.localeCompare(b)),
  );
  return {
    file: {
      path: 'package.json',
      content: `${JSON.stringify({ ...pkg, dependencies: sorted }, null, 2)}\n`,
    },
    note: `Added ${missing.map((m) => `\`${m}\``).join(', ')} to package.json — ${
      missing.length === 1 ? 'it was' : 'they were'
    } imported but not listed as dependencies.`,
  };
}

const IMPORT_STATEMENT =
  /^[ \t]*import\s+(type\s+)?([\w$\s{},*]+?)\s+from\s+(['"][^'"\n]+['"])[ \t]*;?[ \t]*\n?/gm;

interface ImportClause {
  defaultName?: string;
  namespace?: string;
  named: { text: string; local: string }[];
}

function parseClause(clause: string): ImportClause | null {
  const match = /^(?:([\w$]+)\s*,?\s*)?(?:\*\s+as\s+([\w$]+))?\s*(?:\{([^}]*)\})?$/.exec(
    clause.trim(),
  );
  if (!match) return null;
  const named = (match[3] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((text) => ({
      text,
      local: text
        .split(/\s+as\s+/)
        .pop()!
        .replace(/^type\s+/, ''),
    }));
  return { defaultName: match[1], namespace: match[2], named };
}

/** Whether `name` is used anywhere in `code` (member accesses like `x.name` don't count). */
function isUsed(name: string, code: string): boolean {
  const escaped = name.replace(/\$/g, '\\$');
  return new RegExp(`(?<![\\w$.])${escaped}(?![\\w$])`).test(code);
}

/** Drops imported names a file never uses — strict `tsc` (noUnusedLocals) rejects them. */
export function removeUnusedImports(
  file: ProjectFile,
): { file: ProjectFile; removed: number } | null {
  if (!/^src\/.*\.(tsx?|jsx?)$/.test(file.path)) return null;
  const body = file.content.replace(IMPORT_STATEMENT, '');
  let removed = 0;
  const content = file.content.replace(
    IMPORT_STATEMENT,
    (statement, typeOnly: string | undefined, clause: string, source: string) => {
      const parsed = parseClause(clause);
      if (!parsed) return statement;
      const keepDefault = parsed.defaultName && isUsed(parsed.defaultName, body);
      const keepNamespace = parsed.namespace && isUsed(parsed.namespace, body);
      const named = parsed.named.filter((n) => isUsed(n.local, body));
      const dropped =
        (parsed.defaultName && !keepDefault ? 1 : 0) +
        (parsed.namespace && !keepNamespace ? 1 : 0) +
        (parsed.named.length - named.length);
      if (dropped === 0) return statement;
      removed += dropped;
      const parts = [
        keepDefault ? parsed.defaultName : '',
        keepNamespace ? `* as ${parsed.namespace}` : '',
        named.length ? `{ ${named.map((n) => n.text).join(', ')} }` : '',
      ].filter(Boolean);
      if (parts.length === 0) return '';
      const indent = /^[ \t]*/.exec(statement)![0];
      const newline = statement.endsWith('\n') ? '\n' : '';
      return `${indent}import ${typeOnly ?? ''}${parts.join(', ')} from ${source};${newline}`;
    },
  );
  return removed > 0 ? { file: { path: file.path, content }, removed } : null;
}
