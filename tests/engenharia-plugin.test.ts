import { readFileSync } from 'node:fs';

import { noBrandKit } from '@tyto/core';
import { NO_SHIPPED_FILES } from '@tyto/plugin-api';
import { testPlugin } from '@tyto/plugin-api/testing';
import { afterAll, describe, expect, it } from 'vitest';

import type { SlotValue, TemplateCall } from '@tyto/core';
import type { IsolatedPackBuild } from '@tyto/plugin-api';
import type { PluginHarness } from '@tyto/plugin-api/testing';

/**
 * questao-engenharia drawn from the built bundle across the isolation protocol, as
 * `plugin.test.ts` draws questao-estrategica (Tyto ADR 0150). Run after `pnpm build`.
 */

const manifest = readFileSync(new URL('../tyto-plugin.json', import.meta.url), 'utf8');
const entry = new URL('../dist/index.js', import.meta.url).href;

const opened = await testPlugin({ manifest, load: () => import(entry) });
if (!opened.ok) throw new Error(opened.error.map((item) => item.message).join('\n'));
const harness: PluginHarness = opened.value;
afterAll(() => harness.close());

const rich = (value: string): SlotValue => ({
  kind: 'rich-text',
  text: [{ kind: 'text', value, range: { start: 0, end: value.length } }],
});

const call: TemplateCall = {
  format: 'grid',
  size: { w: 1080, h: 1350 },
  idPrefix: 'artwork-0-grid',
  artwork: { id: 'artwork-0', index: 0, count: 1 },
  slots: {
    lamina: { name: 'lamina', value: rich('Enunciado inventado'), adjustments: [] },
  },
  adjustments: {},
  brand: noBrandKit,
};

describe('the plugin', () => {
  it('draws questao-engenharia from the bundle, a 1080×1350 frame', async () => {
    const build = harness.host.registry.templatePacks()[0]!.build as unknown as IsolatedPackBuild;
    const answer = await build('questao-engenharia', call, [], NO_SHIPPED_FILES);
    if (!answer.ok) throw new Error(answer.error.map((item) => item.message).join('\n'));

    expect(answer.value.frame.size).toEqual({ w: 1080, h: 1350 });
    expect(answer.value.frame.children.length).toBeGreaterThan(0);
  });
});
