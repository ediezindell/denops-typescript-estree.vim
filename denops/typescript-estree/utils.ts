import type { Denops } from "jsr:@denops/std";
import { assert, is } from "jsr:@core/unknownutil";
import * as fn from "jsr:@denops/std/function";

import { parseToAst } from "./ast.ts";

export const getCurrentBufCode = async (denops: Denops) => {
  const bufnr = await fn.bufnr(denops);
  const buflines = await fn.getbufline(denops, bufnr, 1, "$");
  assert(buflines, is.ArrayOf(is.String));

  return buflines.join("\n");
};

export const getCurrentBufAst = async (denops: Denops) => {
  const code = await getCurrentBufCode(denops);
  return parseToAst(code);
};

export const requireSelectorInput = async (denops: Denops) => {
  try {
    const selector = await fn.input(denops, "input AST selector: ");
    assert(selector, is.String);
    return selector;
  } catch (_e) {
    return "";
  }
};
