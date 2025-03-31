import type { Dispatcher, Entrypoint } from "jsr:@denops/std";

import Matcher from "./classes/matcher.ts";
import Inspecter from "./classes/inspecter.ts";

export const main: Entrypoint = (denops) => {
  const matcher = new Matcher(denops);
  const inspecter = new Inspecter(denops);

  const dispatcher = {
    highlight: matcher.highlight,
    reHighlight: matcher.reHighlight,
    resetHighlight: matcher.reset,

    focusPrev: matcher.focusPrev,
    focusNext: matcher.focusNext,

    inspect: inspecter.inspect,
  } as const satisfies Dispatcher;
  denops.dispatcher = dispatcher;

  const registerCommand = (
    command: string,
    endpoint: keyof typeof dispatcher,
  ) => {
    denops.cmd(
      `command! ${command} call denops#request('${denops.name}', '${endpoint}', [])`,
    );
  };
  registerCommand("TSESTreeHighlight", "highlight");
  registerCommand("TSESTreeReHighlight", "reHighlight");
  registerCommand("TSESTreeResetHighlight", "resetHighlight");

  registerCommand("TSESTreeFocusPrev", "focusPrev");
  registerCommand("TSESTreeFocusNext", "focusNext");

  registerCommand("TSESTreeInspect", "inspect");
};
