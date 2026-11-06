import { describe, expect, it, vi } from 'vitest';
import { buildGeminiInput, createGeminiEngine } from './gemini.js';
import { loadPromptLibrary } from './prompts.js';
import { EngineError, type EngineChunk } from './types.js';

const library = loadPromptLibrary();

/** An Interactions API event stream, split mid-line to exercise buffering. */
function sse(events: object[]) {
  const encoder = new TextEncoder();
  const text =
    events
      .map((e) => {
        const type = (e as { event_type?: string }).event_type ?? 'message';
        return `event: ${type}\ndata: ${JSON.stringify(e)}\n\n`;
      })
      .join('') + 'event: done\ndata: [DONE]\n\n';
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text.slice(0, 23)));
      controller.enqueue(encoder.encode(text.slice(23)));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

const errorResponse = (status: number, message: string) =>
  new Response(JSON.stringify({ error: { message, code: 'x' } }), { status });

const completed = (status = 'completed') => ({
  event_type: 'interaction.completed',
  interaction: { status, usage: { total_tokens: 10 } },
});

const answer = (texts: string[], status = 'completed') => [
  { event_type: 'interaction.created', interaction: { object: 'interaction' } },
  { event_type: 'step.start', index: 0, step: { type: 'thought' } },
  { event_type: 'step.delta', index: 0, delta: { content: { text: 'Planning the hero…' } } },
  { event_type: 'step.delta', index: 0, delta: { signature: 'abc' } },
  { event_type: 'step.stop', index: 0 },
  { event_type: 'step.start', index: 1, step: { type: 'model_output' } },
  ...texts.map((text) => ({
    event_type: 'step.delta',
    index: 1,
    delta: { type: 'text', text },
  })),
  { event_type: 'step.stop', index: 1 },
  completed(status),
];

async function collect(engine: ReturnType<typeof createGeminiEngine>, prompt = 'A bakery') {
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

describe('Gemini engine', () => {
  it('streams answer text and thought summaries from the Interactions API', async () => {
    const fetch = vi.fn(async () => sse(answer(['Hello ', 'world'])));
    const engine = createGeminiEngine({ apiKey: 'gem-test', library, fetch });
    expect(await collect(engine)).toEqual([{ reasoning: 'Planning the hero…' }, 'Hello ', 'world']);
    expect(engine.info).toEqual({ id: 'gemini', label: 'Gemini 3.8 Flash · Google' });

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/interactions');
    expect(new Headers(init.headers).get('x-goog-api-key')).toBe('gem-test');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      model: 'gemini-3.8-flash',
      store: false,
      stream: true,
      system_instruction: library.system,
      generation_config: { max_output_tokens: 65536, thinking_summaries: 'auto' },
    });
    expect(body.generation_config).not.toHaveProperty('temperature');
    expect(body.input.at(-1).type).toBe('user_input');
  });

  it('sends history as steps and design screenshots as inline images', () => {
    const input = buildGeminiInput(
      library,
      'A website for my clinic',
      [
        { id: '1', role: 'user', content: 'Hi', createdAt: '' },
        { id: '2', role: 'assistant', content: 'Hello!', createdAt: '' },
      ],
      [],
    );
    expect(input.map((s) => s.type)).toEqual(['user_input', 'model_output', 'user_input']);
    expect(input[0]!.content).toEqual([{ type: 'text', text: 'Hi' }]);
    const images = input.at(-1)!.content.filter((c) => c.type === 'image');
    expect(images.length).toBeGreaterThan(0);
    expect(images[0]).toMatchObject({ type: 'image', mime_type: 'image/jpeg' });
    expect((images[0] as { data: string }).data).not.toMatch(/^data:/);
  });

  it('falls through to the next model when one is overloaded or out of quota', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(errorResponse(503, 'high demand'))
      .mockResolvedValueOnce(errorResponse(429, 'limit: 0'))
      .mockResolvedValueOnce(sse(answer(['Done'])));
    const engine = createGeminiEngine({
      apiKey: 'k',
      library,
      model: 'gemini-a',
      fallbackModels: ['gemini-b', 'gemini-c'],
      fetch,
    });
    const out = await collect(engine);
    expect(out.at(-1)).toBe('Done');
    expect(out[0]).toEqual({ reasoning: expect.stringContaining('Gemini C is answering') });
    const models = fetch.mock.calls.map(([, init]) => JSON.parse(init!.body as string).model);
    expect(models).toEqual(['gemini-a', 'gemini-b', 'gemini-c']);
  });

  it('turns HTTP failures into friendly errors', async () => {
    const run = (status: number, message = 'nope') =>
      collect(
        createGeminiEngine({
          apiKey: 'k',
          library,
          fallbackModels: [],
          fetch: async () => errorResponse(status, message),
        }),
      );
    await expect(run(403)).rejects.toThrow(/GEMINI_API_KEY/);
    await expect(run(404)).rejects.toThrow(/GEMINI_MODEL/);
    await expect(run(429, 'limit: 0 requests per day')).rejects.toThrow(/limit: 0 requests/);
    await expect(run(503)).rejects.toThrow(/overloaded/);
    await expect(run(400, 'bad input')).rejects.toBeInstanceOf(EngineError);
  });

  it('does not fall through on errors that another model would not fix', async () => {
    const fetch = vi.fn(async () => errorResponse(400, 'bad input'));
    const engine = createGeminiEngine({ apiKey: 'k', library, fetch });
    await expect(collect(engine)).rejects.toThrow(/bad input/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('notes when the response hits the length limit', async () => {
    const engine = createGeminiEngine({
      apiKey: 'k',
      library,
      fetch: async () => sse(answer(['Partial'], 'incomplete')),
    });
    const out = await collect(engine);
    expect(out.at(-1)).toMatch(/length limit/);
  });

  it('surfaces errors sent inside the stream', async () => {
    const engine = createGeminiEngine({
      apiKey: 'k',
      library,
      fetch: async () =>
        sse([
          { event_type: 'interaction.created' },
          { event_type: 'error', error: { message: 'Deadline expired', code: 'gateway_timeout' } },
        ]),
    });
    await expect(collect(engine)).rejects.toThrow('Deadline expired');
  });

  it('reports a dropped connection', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('event: step.start\n'));
        controller.error(new Error('socket hang up'));
      },
    });
    const engine = createGeminiEngine({
      apiKey: 'k',
      library,
      fetch: async () => new Response(body),
    });
    await expect(collect(engine)).rejects.toThrow(/dropped/);
  });
});
