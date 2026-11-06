import type { ProjectFile } from '@canvas/shared';
import { describe, expect, it } from 'vitest';
import { bundleReactPreview, esmUrl, isReactProject, packageName } from './reactPreview';

const project: ProjectFile[] = [
  {
    path: 'package.json',
    content: JSON.stringify({
      dependencies: { react: '^19.1.0', 'react-dom': '^19.1.0', 'lucide-react': '^0.468.0' },
    }),
  },
  {
    path: 'index.html',
    content:
      '<!doctype html><html><head><title>Test</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
  },
  {
    path: 'src/main.tsx',
    content:
      "import { createRoot } from 'react-dom/client';\nimport { App } from './App';\nimport './index.css';\ncreateRoot(document.getElementById('root')!).render(<App />);",
  },
  {
    path: 'src/App.tsx',
    content:
      "import { Star } from 'lucide-react';\nimport { title } from '@/content';\ntype P = { n: number };\nexport function App({ n = 1 }: Partial<P>) { return <h1><Star />{title} {n} {'</script>'}</h1>; }",
  },
  { path: 'src/content.ts', content: "export const title: string = 'Hello';" },
  {
    path: 'src/index.css',
    content: "@import 'tailwindcss';\n@plugin 'x';\n@theme { --color-brand: #0d9488; }",
  },
  { path: 'vite.config.ts', content: "import { defineConfig } from 'vite'; export default {};" },
];

describe('isReactProject', () => {
  it('spots React projects', () => {
    expect(isReactProject(project)).toBe(true);
    expect(isReactProject([{ path: 'index.html', content: '<h1>hi</h1>' }])).toBe(false);
  });
});

describe('esmUrl', () => {
  const versions = { react: '^19.1.0', 'react-dom': '~19.1.0', '@scope/pkg': '2.0.0' };
  it('pins versions from package.json and shares React', () => {
    expect(esmUrl('react/jsx-runtime', versions)).toBe(
      'https://esm.sh/react@19.1.0/jsx-runtime?dev',
    );
    expect(esmUrl('react-dom/client', versions)).toBe(
      'https://esm.sh/react-dom@19.1.0/client?dev&external=react',
    );
    expect(esmUrl('@scope/pkg/sub', versions)).toBe(
      'https://esm.sh/@scope/pkg@2.0.0/sub?dev&external=react,react-dom',
    );
    expect(esmUrl('clsx', versions)).toBe('https://esm.sh/clsx?dev&external=react,react-dom');
    expect(packageName('@scope/pkg/sub')).toBe('@scope/pkg');
  });
});

describe('bundleReactPreview', () => {
  it('compiles TypeScript + JSX into a self-contained document', async () => {
    const { html, compileError } = await bundleReactPreview(project);
    expect(compileError).toBeUndefined();

    const map = JSON.parse(/<script type="importmap">(.*?)<\/script>/s.exec(html)![1]!);
    expect(Object.keys(map.imports).sort()).toEqual([
      'lucide-react',
      'react-dom/client',
      'react/jsx-runtime',
    ]);
    expect(map.imports['lucide-react']).toBe(
      'https://esm.sh/lucide-react@0.468.0?dev&external=react,react-dom',
    );
    expect(html).toContain('has no export named');

    // The project's own entry script is replaced by the module registry.
    expect(html).not.toContain('src="/src/main.tsx"');
    expect(html).toContain('"src/App.tsx": function (require, module, exports)');
    expect(html).toContain('const ENTRY = "src/main.tsx";');
    expect(html).not.toContain('vite.config.ts');
    // Types are stripped and inline strings can't close the script.
    expect(html).not.toContain('type P =');
    expect(html).not.toMatch(/'<\/script>'/);
    // CSS goes to Tailwind's browser build, minus package imports.
    expect(html).toContain('<style type="text/tailwindcss">');
    expect(html).toContain('--color-brand: #0d9488');
    expect(html).not.toContain("@import 'tailwindcss'");
    expect(html).not.toContain("@plugin 'x'");
  });

  it('reports compile errors instead of failing', async () => {
    const broken = [...project, { path: 'src/Broken.tsx', content: 'export const x = <div>;' }];
    const { html, compileError } = await bundleReactPreview(broken);
    expect(compileError).toMatch(/^src\/Broken\.tsx:/);
    expect(html).toContain('const COMPILE_ERROR = "src/Broken.tsx:');
  });
});
