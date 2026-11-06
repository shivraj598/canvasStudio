import { describe, expect, it } from 'vitest';
import { importedPackages, reconcileDependencies, removeUnusedImports } from './fixups.js';

const pkg = (deps: Record<string, string>) => ({
  path: 'package.json',
  content: JSON.stringify({ name: 'x', dependencies: deps, devDependencies: { vite: '^7.0.0' } }),
});

describe('reconcileDependencies', () => {
  it('finds bare package imports in source files only', () => {
    const found = importedPackages([
      {
        path: 'src/App.tsx',
        content:
          "import clsx from 'clsx';\nimport { Star } from 'lucide-react';\nimport { x } from './x';\nimport '@scope/ui/styles.css';\nexport { y } from '@scope/ui/button';\nconst m = import('react-router-dom');",
      },
      { path: 'vite.config.ts', content: "import { defineConfig } from 'vite';" },
    ]);
    expect([...found].sort()).toEqual(['@scope/ui', 'clsx', 'lucide-react', 'react-router-dom']);
  });

  it('adds imported packages missing from package.json', () => {
    const fix = reconcileDependencies([
      pkg({ react: '^19.1.0' }),
      {
        path: 'src/a.tsx',
        content: "import clsx from 'clsx';\nimport { Star } from 'lucide-react';",
      },
    ]);
    const json = JSON.parse(fix!.file.content);
    expect(json.dependencies).toEqual({
      clsx: '^2.1.1',
      'lucide-react': '^0.468.0',
      react: '^19.1.0',
    });
    expect(json.devDependencies).toEqual({ vite: '^7.0.0' });
    expect(fix!.note).toContain('`clsx`, `lucide-react`');
  });

  it('does nothing when everything is declared or there is no package.json', () => {
    expect(
      reconcileDependencies([
        pkg({ clsx: '^2.0.0' }),
        { path: 'src/a.ts', content: "import c from 'clsx';" },
      ]),
    ).toBeNull();
    expect(
      reconcileDependencies([{ path: 'src/a.ts', content: "import c from 'clsx';" }]),
    ).toBeNull();
  });
});

describe('removeUnusedImports', () => {
  const clean = (content: string, path = 'src/components/Hero.tsx') =>
    removeUnusedImports({ path, content });

  it('drops unused named, default and namespace imports', () => {
    const result = clean(
      [
        "import React from 'react';",
        "import * as Icons from 'lucide-react';",
        "import { Heart, Star as Rating, type Site, CLINIC } from '../content';",
        'export const Hero = (p: { site: Site }) => <Rating title={p.site.name} />;',
        '',
      ].join('\n'),
    );
    expect(result?.removed).toBe(4);
    expect(result?.file.content).toBe(
      [
        "import { Star as Rating, type Site } from '../content';",
        'export const Hero = (p: { site: Site }) => <Rating title={p.site.name} />;',
        '',
      ].join('\n'),
    );
  });

  it('handles multi-line imports and keeps type-only imports typed', () => {
    const result = clean(
      [
        'import {',
        '  ArrowRight,',
        '  Calendar,',
        '  Phone,',
        "} from 'lucide-react';",
        "import type { Service, Doctor } from '../types';",
        'export function A(s: Service) { return <><ArrowRight />{s.name}<Phone /></>; }',
      ].join('\n'),
    );
    expect(result?.file.content.split('\n').slice(0, 2)).toEqual([
      "import { ArrowRight, Phone } from 'lucide-react';",
      "import type { Service } from '../types';",
    ]);
  });

  it('keeps a default import alongside used named imports', () => {
    const result = clean("import React, { useState } from 'react';\nconst [a] = useState(0);\n");
    expect(result?.file.content).toBe(
      "import { useState } from 'react';\nconst [a] = useState(0);\n",
    );
  });

  it('does not count member accesses as uses but counts everything else', () => {
    const code = "import { name, Star } from './x';\nconsole.log(user.name, { Star });\n";
    expect(clean(code)?.file.content).toBe(
      "import { Star } from './x';\nconsole.log(user.name, { Star });\n",
    );
  });

  it('leaves side-effect imports, used imports and non-source files alone', () => {
    expect(clean("import './index.css';\nimport { a } from './a';\nconsole.log(a);\n")).toBeNull();
    expect(clean("import { a } from './a';", 'vite.config.ts')).toBeNull();
    expect(clean("import { a } from './a';", 'README.md')).toBeNull();
  });
});
