import { describe, expect, it } from 'vitest';
import { createArtifactParser, parseAttributes } from './artifact-parser.js';

const SAMPLE = `I'll build a landing page for you.

<canvasArtifact title="Bright Smile">
<canvasAction type="file" path="index.html">
<!doctype html>
<p>a < b && c > d</p>
</canvasAction>
<canvasAction type="file" path="./styles.css">
body { color: red; }
</canvasAction>
<canvasAction type="delete" path="old.js"></canvasAction>
</canvasArtifact>

Done! Want a pricing section next?`;

function run(chunks: string[]) {
  const out = {
    text: '',
    title: undefined as string | undefined,
    started: [] as string[],
    deltas: {} as Record<string, string>,
    files: {} as Record<string, string>,
    deleted: [] as string[],
  };
  const parser = createArtifactParser({
    onText: (d) => (out.text += d),
    onArtifactOpen: ({ title }) => (out.title = title),
    onFileStart: (p) => out.started.push(p),
    onFileDelta: (p, d) => (out.deltas[p] = (out.deltas[p] ?? '') + d),
    onFileEnd: (p, c) => (out.files[p] = c),
    onDelete: (p) => out.deleted.push(p),
  });
  for (const c of chunks) parser.write(c);
  parser.end();
  return out;
}

function chunk(text: string, size: number): string[] {
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += size) parts.push(text.slice(i, i + size));
  return parts;
}

describe('createArtifactParser', () => {
  it('separates prose from files', () => {
    const out = run([SAMPLE]);
    expect(out.text).toBe(
      "I'll build a landing page for you.\n\n\n\nDone! Want a pricing section next?",
    );
    expect(out.title).toBe('Bright Smile');
    expect(out.started).toEqual(['index.html', 'styles.css']);
    expect(out.files).toEqual({
      'index.html': '<!doctype html>\n<p>a < b && c > d</p>\n',
      'styles.css': 'body { color: red; }\n',
    });
    expect(out.deleted).toEqual(['old.js']);
  });

  it.each([1, 2, 3, 7, 13, 64])('gives the same result when streamed in %i-char chunks', (n) => {
    const whole = run([SAMPLE]);
    const streamed = run(chunk(SAMPLE, n));
    expect(streamed.text).toBe(whole.text);
    expect(streamed.files).toEqual(whole.files);
    expect(streamed.deleted).toEqual(whole.deleted);
    // Deltas concatenate to the raw content.
    expect(streamed.deltas['index.html']).toContain('<p>a < b && c > d</p>');
  });

  it('keeps prose that merely looks like a tag', () => {
    expect(run(['use <b>bold</b> and 1 < 2']).text).toBe('use <b>bold</b> and 1 < 2');
  });

  it('drops a file whose stream ended before its closing tag', () => {
    const out = run(['<canvasArtifact><canvasAction type="file" path="a.html">partial']);
    expect(out.started).toEqual(['a.html']);
    expect(out.files).toEqual({});
  });

  it('accepts self-closing actions and filePath', () => {
    const out = run([
      '<canvasArtifact><canvasAction type="delete" filePath="x.css" /></canvasArtifact>',
    ]);
    expect(out.deleted).toEqual(['x.css']);
  });
});

describe('parseAttributes', () => {
  it('reads single- and double-quoted values', () => {
    expect(parseAttributes(`<a type="file" path='a b.html'`)).toEqual({
      type: 'file',
      path: 'a b.html',
    });
  });
});
