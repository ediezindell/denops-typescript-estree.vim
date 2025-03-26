import type { Entrypoint } from "jsr:@denops/std";

import Matcher from "./matcher.ts";
import { getCurrentBufAst, requireSelectorInput } from "./utils.ts";

export const main: Entrypoint = (denops) => {
  const matcher = new Matcher(denops);
  denops.dispatcher = {
    async disableHighlightSelector(): Promise<void> {
      await matcher.reset();
    },
    async highlightSelector(): Promise<void> {
      await matcher.reset();

      const selector = await requireSelectorInput(denops);
      if (selector.length === 0) return;

      const ast = await getCurrentBufAst(denops);

      await matcher.highlightSelector(ast, selector);
    },
  };

  denops.cmd(
    `command! H call denops#request('${denops.name}', 'highlightSelector', [])`,
  );
  denops.cmd(
    `command! D call denops#request('${denops.name}', 'disableHighlightSelector', [])`,
  );
};
