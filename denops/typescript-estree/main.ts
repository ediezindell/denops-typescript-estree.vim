import type { Entrypoint } from "jsr:@denops/std";

import Matcher from "./classes/matcher.ts";

export const main: Entrypoint = (denops) => {
  const matcher = new Matcher(denops);
  denops.dispatcher = {
    highlight: matcher.highlight,
    resetHighlight: matcher.reset,
  };

  denops.cmd(
    `command! H call denops#request('${denops.name}', 'highlight', [])`,
  );
  denops.cmd(
    `command! D call denops#request('${denops.name}', 'resetHighlight', [])`,
  );
};
