import { describe, expect, it, vi } from 'vitest';
import { buildNimMessages, createNimEngine, modelLabel } from './nim.js';
import { loadPromptLibrary } from './prompts.js';
import { EngineError, type EngineChunk } from './types.js';

const library = loadPromptLibrary();

function sse(lines: string[], status = 200) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      // Split mid-line to exercise buffering.
      const text = lines.map((l) => `data: ${l}\n\n`).join('');
      controller.enqueue(encoder.encode(text.slice(0, 17)));
      controller.enqueue(encoder.encode(text.slice(17)));
      controller.close();
    },
  });
  return new Response(body, { status, headers: { 'content-type': 'text/event-stream' } });
}

const delta = (d: Record<string, string>, finish: string | null = null) =>
  JSON.stringify({ choices: [{ index: 0, delta: d, finish_reason: finish }] });

async function collect(engine: ReturnType<typeof createNimEngine>, prompt = 'A dental clinic') {
  const out: EngineChunk[] = [];
  for await (const chunk of engine.stream({
    prompt,
    history: [],
    files: [],
    signal: new AbortController().signal,
  })) {
    out.push(chunk);
  }
  return out;
}

describe('NVIDIA NIM engine', () => {
  it('streams content and reasoning from the chat completions API', async () => {
    const fetch = vi.fn(async () =>
      sse([
        delta({ reasoning_content: 'Planning…' }),
        delta({ content: 'Hello ' }),
        delta({ content: 'world' }, 'stop'),
        '[DONE]',
      ]),
    );
    const engine = createNimEngine({ apiKey: 'nvapi-test', library, fetch });
    expect(await collect(engine)).toEqual([{ reasoning: 'Planning…' }, 'Hello ', 'world']);
    expect(engine.info).toEqual({ id: 'nim', label: 'Minimax M3.1 Flash · NVIDIA' });

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://integrate.api.nvidia.com/v1/chat/completions');
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer nvapi-test');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      model: 'minimaxai/minimax-m3.1-flash',
      stream: true,
      max_tokens: 16384,
      temperature: 1,
      top_p: 0.95,
    });
    expect(body.messages[0]).toEqual({ role: 'system', content: library.system });
  });

  it('sends design reference screenshots to vision models', () => {
    const messages = buildNimMessages(library, 'A website for my clinic', [], []);
    const last = messages.at(-1)!;
    expect(Array.isArray(last.content)).toBe(true);
    const parts = last.content as { type: string; image_url?: { url: string } }[];
    expect(parts.filter((p) => p.type === 'image_url')).toHaveLength(2);
    expect(parts[1]!.image_url!.url).toMatch(/^data:image\/jpeg;base64,/);

    const textOnly = buildNimMessages(library, 'A website for my clinic', [], [], false);
    expect(typeof textOnly.at(-1)!.content).toBe('string');
  });

  it('uses the recommended sampling for Step 5', async () => {
    const fetch = vi.fn(async () => sse(['[DONE]']));
    await collect(
      createNimEngine({ apiKey: 'k', library, fetch, model: 'stepfun-ai/step-5-preview' }),
    );
    const body = JSON.parse(
      (fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body).toMatchObject({ temperature: 0.5, top_p: 1 });
  });

  it('explains auth and model errors', async () => {
    const unauthorized = createNimEngine({
      apiKey: 'bad',
      library,
      fetch: async () => new Response('nope', { status: 401 }),
    });
    await expect(collect(unauthorized)).rejects.toThrow(/NVIDIA API key was rejected/);
    const missing = createNimEngine({
      apiKey: 'k',
      library,
      model: 'nope/nope',
      fetch: async () => new Response('', { status: 404 }),
    });
    await expect(collect(missing)).rejects.toBeInstanceOf(EngineError);
  });

  it('notes when the output was cut off', async () => {
    const engine = createNimEngine({
      apiKey: 'k',
      library,
      fetch: async () => sse([delta({ content: 'partial' }, 'length')]),
    });
    expect((await collect(engine)).at(-1)).toMatch(/length limit/);
  });

  it('labels models readably', () => {
    expect(modelLabel('stepfun-ai/step-5-preview')).toBe('Step 5 Preview');
  });
});
