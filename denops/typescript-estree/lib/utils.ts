// deno-lint-ignore-file no-import-prefix no-unversioned-import
import type { Denops } from "jsr:@denops/std";
import * as fn from "jsr:@denops/std/function";
import { assert, is } from "jsr:@core/unknownutil";

import { parseToAst } from "../lib/ast.ts";

type AstRoot = NonNullable<ReturnType<typeof parseToAst>>;

let astCache: { bufnr: number; tick: number; ast: AstRoot } | null = null;

export const getCurrentBufCode = async (denops: Denops) => {
  const bufnr = await fn.bufnr(denops);
  const buflines = await fn.getbufline(denops, bufnr, 1, "$");
  assert(buflines, is.ArrayOf(is.String));

  return buflines.join("\n");
};

export const getCurrentBufAst = async (denops: Denops) => {
  try {
    const bufnr = await fn.bufnr(denops);
    const tick = await fn.getbufvar(denops, bufnr, "changedtick") as number;

    if (astCache && astCache.bufnr === bufnr && astCache.tick === tick) {
      return astCache.ast;
    }

    const buflines = await fn.getbufline(denops, bufnr, 1, "$");
    assert(buflines, is.ArrayOf(is.String));
    const code = buflines.join("\n");

    if (!code.trim()) {
      console.warn("Buffer is empty");
      return null;
    }
    const ast = parseToAst(code);
    if (ast) {
      astCache = { bufnr, tick, ast: ast as AstRoot };
    }
    return ast;
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
