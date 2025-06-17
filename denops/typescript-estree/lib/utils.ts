import type { Denops } from "jsr:@denops/std";
import * as fn from "jsr:@denops/std/function";
import { assert, is } from "jsr:@core/unknownutil";

import { parseToAst } from "../lib/ast.ts";

export const getCurrentBufCode = async (denops: Denops) => {
  const bufnr = await fn.bufnr(denops);
  const buflines = await fn.getbufline(denops, bufnr, 1, "$");
  assert(buflines, is.ArrayOf(is.String));

  return buflines.join("\n");
};

export const getCurrentBufAst = async (denops: Denops) => {
  try {
    const code = await getCurrentBufCode(denops);
    if (!code.trim()) {
      console.warn("Buffer is empty");
      return null;
    }
    return parseToAst(code);
  } catch (error) {
    console.error("Failed to get current buffer AST:", error);
    return null;
  }
};

export const getSourceFilePath = async (denops: Denops) => {
  const path = await fn.expand(denops, "%:p");
  assert(path, is.String);
  return path;
};
