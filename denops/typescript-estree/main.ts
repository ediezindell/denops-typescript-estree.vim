import type { Entrypoint } from "jsr:@denops/std";

import Matcher from "./classes/matcher.ts";
import Inspecter from "./classes/inspecter.ts";

export const main: Entrypoint = (denops) => {
  const matcher = new Matcher(denops);
  const inspecter = new Inspecter(denops);

  denops.dispatcher = {
    highlight: matcher.highlight,
    reHighlight: matcher.reHighlight,
    resetHighlight: matcher.reset,

    inspect: inspecter.inspect,
  };

  denops.cmd(
    `command! H call denops#request('${denops.name}', 'highlight', [])`,
  );
  denops.cmd(
    `command! R call denops#request('${denops.name}', 'reHighlight', [])`,
  );
  denops.cmd(
    `command! D call denops#request('${denops.name}', 'resetHighlight', [])`,
  );

  denops.cmd(`command! I call denops#request('${denops.name}', 'inspect', [])`);
};
