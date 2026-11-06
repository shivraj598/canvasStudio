import { describe, expect, it } from 'vitest';
import { isSafePath, normalizePath, sortFiles, summarizePrompt } from './builder.js';
import { EMPTY_PREVIEW_HTML, bundlePreview } from './preview.js';

describe('bundlePreview', () => {
  it('inlines local stylesheets and scripts', () => {
    const html = bundlePreview([
      {
        path: 'index.html',
        content:
          '<head><link rel="stylesheet" href="./styles.css"><link rel="stylesheet" href="https://cdn.example/x.css"></head>' +
          '<body><script type="module" src="app.js"></script><script src="https://cdn.example/x.js"></script></body>',
      },
      { path: 'styles.css', content: 'body{color:red}' },
      { path: 'app.js', content: 'console.log("</script>")' },
    ]);
    expect(html).toContain('<style>\nbody{color:red}\n</style>');
    expect(html).toContain('href="https://cdn.example/x.css"');
    expect(html).toContain('<script type="module">\nconsole.log("<\\/script>")\n</script>');
    expect(html).toContain('<script src="https://cdn.example/x.js"></script>');
  });

  it('falls back to a placeholder without an HTML file', () => {
    expect(bundlePreview([])).toBe(EMPTY_PREVIEW_HTML);
    expect(bundlePreview([{ path: 'about.html', content: 'about' }])).toBe('about');
  });
});

describe('file helpers', () => {
  it('normalises and validates paths', () => {
    expect(normalizePath('./a\\b.css')).toBe('a/b.css');
    expect(isSafePath('assets/app.js')).toBe(true);
    expect(isSafePath('../etc/passwd')).toBe(false);
    expect(isSafePath('a//b')).toBe(false);
    expect(isSafePath('<script>.js')).toBe(false);
  });

  it('sorts index.html first and folders last', () => {
    const sorted = sortFiles([{ path: 'b/x.js' }, { path: 'styles.css' }, { path: 'index.html' }]);
    expect(sorted.map((f) => f.path)).toEqual(['index.html', 'styles.css', 'b/x.js']);
  });

  it('summarises prompts', () => {
    expect(summarizePrompt('  make   it blue ')).toBe('make it blue');
    expect(summarizePrompt('x'.repeat(100), 10)).toBe('xxxxxxxxx…');
  });
});
