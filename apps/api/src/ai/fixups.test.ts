import { describe, expect, it } from 'vitest';
import { importedPackages, reconcileDependencies } from './fixups.js';

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
