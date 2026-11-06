import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { createClaudeEngine, toMessages } from './claude.js';
import { loadPromptLibrary } from './prompts.js';
import { EngineError } from './types.js';

const library = loadPromptLibrary();

function fakeClient(texts: string[], stopReason = 'end_turn') {
  const stream = vi.fn(() => ({
    async *[Symbol.asyncIterator]() {
      for (const text of texts) {
        yield { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } };
      }
    },
    finalMessage: async () => ({ stop_reason: stopReason }),
  }));
  return { client: { beta: { messages: { stream } } } as unknown as Anthropic, stream };
}

async function run(engine: ReturnType<typeof createClaudeEngine>) {
  let out = '';
  for await (const chunk of engine.stream({
    prompt: 'Make it blue',
    history: [],
    files: [{ path: 'index.html', content: '<h1>Hi</h1>' }],
    signal: new AbortController().signal,
  })) {
    out += chunk;
  }
  return out;
}

describe('Claude engine', () => {
  it('streams text deltas and sends the current files with the request', async () => {
    const { client, stream } = fakeClient(['Sure', ' thing']);
    const out = await run(createClaudeEngine({ client, library }));
    expect(out).toBe('Sure thing');
    const [params] = stream.mock.calls[0] as unknown as [Anthropic.Beta.MessageCreateParams];
    expect(params.model).toBe('claude-opus-5-5');
    expect(params.fallbacks).toBe('default');
    const last = params.messages.at(-1)!;
    expect(last.content).toContain('<file path="index.html">');
    expect(last.content).toContain('<request>\nMake it blue\n</request>');
  });

  it('uses the system prompt file and attaches clinic references to a fresh clinic build', async () => {
    const { client, stream } = fakeClient(['ok']);
    const engine = createClaudeEngine({ client, library });
    for await (const _ of engine.stream({
      prompt: 'A website for my dental clinic',
      history: [],
      files: [],
      signal: new AbortController().signal,
    }))
      void _;
    const [params] = stream.mock.calls[0] as unknown as [Anthropic.Beta.MessageCreateParams];
    expect(JSON.stringify(params.system)).toContain('You are Canvas');
    const content = params.messages.at(-1)!.content as Anthropic.Beta.BetaContentBlockParam[];
    expect(content.filter((b) => b.type === 'image')).toHaveLength(2);
    expect(JSON.stringify(content)).toContain('<design_reference name=\\"Clinic & healthcare\\">');
  });

  it('turns a refusal into a friendly error', async () => {
    const { client } = fakeClient(['No'], 'refusal');
    await expect(run(createClaudeEngine({ client, library }))).rejects.toBeInstanceOf(EngineError);
  });

  it('keeps history short and starting with a user turn', () => {
    const at = '2026-01-01T00:00:00.000Z';
    const messages = toMessages(
      library,
      [
        { id: '1', role: 'assistant', content: 'Restored', createdAt: at },
        { id: '2', role: 'user', content: 'Build a cafe', createdAt: at },
        {
          id: '3',
          role: 'assistant',
          content: 'Built it',
          changes: [{ path: 'index.html', operation: 'create' }],
          createdAt: at,
        },
      ],
      'Add a menu',
      [],
    );
    expect(messages.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
    expect(messages[1]!.content).toContain('(Files written: index.html)');
    expect(messages[2]!.content).toContain('brand new site');
  });
});
