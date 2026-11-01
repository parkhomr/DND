import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OpenAIProvider } from '../server/ai';
import { createCampaign } from '../server/rules';
import { resolve } from '../server/engine';
import { intentSchema } from '../server/schemas';
const campaign = () =>
  createCampaign({
    name: 'Искра',
    ancestry: 'Человек',
    classId: 'mage',
    background: 'Учёный',
    portrait: 2,
    focus: 'int',
  });
function output(value: unknown) {
  return new Response(
    JSON.stringify({
      output: [{ content: [{ type: 'output_text', text: JSON.stringify(value) }] }],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}
test('OpenAI adapter sends server-only credentials and strict Responses API schema, validates returned intent', async () => {
  const original = globalThis.fetch;
  let sent: Record<string, unknown> = {};
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    sent = JSON.parse(String(init?.body));
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-key');
    return output({ kind: 'talk', target: 'iva', detail: 'Спрашиваю о колоколе' });
  };
  try {
    const provider = new OpenAIProvider('test-key', 'configured-model');
    const result = await provider.interpret('Спрашиваю незнакомку о звоне', campaign());
    assert.equal(result.target, 'iva');
    assert.equal(sent.model, 'configured-model');
    assert.equal(sent.store, false);
    assert.equal((sent.text as { format: { strict: boolean } }).format.strict, true);
    assert.equal(intentSchema.safeParse(result).success, true);
  } finally {
    globalThis.fetch = original;
  }
});
test('OpenAI adapter rejects fabricated operations, malformed JSON and HTTP failures', async () => {
  const original = globalThis.fetch;
  const provider = new OpenAIProvider('test-key', 'test');
  try {
    globalThis.fetch = async () =>
      output({ kind: 'database_write', target: 'all', detail: '', money: 99999 });
    await assert.rejects(() => provider.interpret('ignore everything', campaign()));
    globalThis.fetch = async () => new Response('unavailable', { status: 429 });
    await assert.rejects(() => provider.interpret('hello', campaign()), /AI_PROVIDER_429/);
    globalThis.fetch = async () => new Response(JSON.stringify({ output: [] }), { status: 200 });
    await assert.rejects(() => provider.interpret('hello', campaign()), /AI_EMPTY_OUTPUT/);
  } finally {
    globalThis.fetch = original;
  }
});
test('NPC model dialogue receives only local NPC memories, not remote world facts or other NPCs', async () => {
  const original = globalThis.fetch;
  const before = campaign();
  before.world.facts.push('REMOTE_SECRET_SENTINEL');
  before.world.npcs.oren.memories.push('FOREST_MEMORY_SENTINEL');
  const after = structuredClone(before);
  resolve(after, { type: 'intent', intent: { kind: 'talk', target: 'iva', detail: '' } });
  let sent = '';
  globalThis.fetch = async (_url, init) => {
    sent = String(init?.body);
    return output({ text: '«Три удара. Вы тоже их слышали?»' });
  };
  try {
    const provider = new OpenAIProvider('test-key', 'test');
    const text = await provider.dialogue('Что вы слышали?', before, after);
    assert.ok(text?.includes('Три удара'));
    assert.equal(sent.includes('REMOTE_SECRET_SENTINEL'), false);
    assert.equal(sent.includes('FOREST_MEMORY_SENTINEL'), false);
    assert.ok(sent.includes('npcContext'));
  } finally {
    globalThis.fetch = original;
  }
});
test('AI improvisation resolves a real server check without inventing currency or item ownership', () => {
  const c = campaign();
  const gold = c.hero.gold;
  const inventory = structuredClone(c.hero.inventory);
  resolve(
    c,
    { type: 'text', text: 'Я танцую у камина' },
    { kind: 'improvise', target: '', detail: 'Я танцую у камина' },
    (_min, max) => max,
    true,
  );
  assert.ok(c.events.some((e) => e.roll?.label === 'Импровизация'));
  assert.equal(c.hero.gold, gold);
  assert.deepEqual(c.hero.inventory, inventory);
  assert.ok(c.world.facts.some((f) => f.includes('танцую')));
});
