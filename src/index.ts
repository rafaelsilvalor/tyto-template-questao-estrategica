/**
 * The plugin's entry: one template pack with two code templates, `questao-estrategica` and
 * `questao-engenharia` (TYTO-608), which share the statement and the answer.
 *
 * Tyto reads the manifests from `templates/` itself (Tyto ADR 0046), so the pack lists none.
 * The folder holds no `template.ts`: the code is this bundle's, and Tyto calls `build` in the
 * plugin's own process by the template's manifest name (Tyto ADR 0048).
 */

import { build as buildEngineering } from './engenharia.js';
import { build as buildQuestion } from './template.js';

import type { TemplateContext } from '@tyto/core';
import type { PluginHost } from '@tyto/plugin-api';

const BUILDS = {
  'questao-estrategica': buildQuestion,
  'questao-engenharia': buildEngineering,
} as const;

export function activate(host: PluginHost): void {
  host.registerTemplatePack({
    id: 'questao-estrategica',
    templates: [],
    directory: 'templates',
    build: (template: string, context: TemplateContext) => {
      const build = BUILDS[template as keyof typeof BUILDS];
      if (build === undefined) {
        throw new Error(`questao-estrategica draws no template named '${template}'.`);
      }
      return build(context);
    },
  });
}
