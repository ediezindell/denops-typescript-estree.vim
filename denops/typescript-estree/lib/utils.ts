// deno-lint-ignore-file no-import-prefix no-unversioned-import
import type { Denops } from "jsr:@denops/std";
import * as fn from "jsr:@denops/std/function";
import { assert, is } from "jsr:@core/unknownutil";
import { collect } from "jsr:@denops/std/batch";

import { parseToAst } from "../lib/ast.ts";

type AstRoot = NonNullable<ReturnType<typeof parseToAst>>;

let astCache: { bufnr: number; tick: number; ast: AstRoot; code: string } | null =
  null;

export const getCurrentBufCode = async (denops: Denops) => {
  // Optimization: Fetch bufnr and changedtick in a single RPC call
  const [bufnr, tick] = await collect(denops, (denops) => [
    fn.bufnr(denops),
    fn.getbufvar(denops, "%", "changedtick"),
  ]) as [number, number];

  if (astCache && astCache.bufnr === bufnr && astCache.tick === tick) {
    return astCache.code;
  }

  const buflines = await fn.getbufline(denops, bufnr, 1, "$");
  assert(buflines, is.ArrayOf(is.String));

  return buflines.join("\n");
};

export const getCurrentBufAst = async (denops: Denops) => {
  try {
    // Optimization: Fetch bufnr and changedtick in a single RPC call
    const [bufnr, tick] = await collect(denops, (denops) => [
      fn.bufnr(denops),
      fn.getbufvar(denops, "%", "changedtick"),
    ]) as [number, number];

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
      astCache = { bufnr, tick, ast: ast as AstRoot, code };
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

/**
 * Converts a byte index (UTF-8) to a character index (UTF-16) in a string.
 * This is efficient and avoids creating TextEncoder instances.
 */
export const byteIndexToCharIndex = (
  str: string,
  targetByteIndex: number,
): number => {
  let byteCount = 0;
  let charIndex = 0;

  while (charIndex < str.length && byteCount < targetByteIndex) {
    const code = str.charCodeAt(charIndex);
    let nextStep = 1;

    if (code < 0x80) {
      nextStep = 1;
    } else if (code < 0x800) {
      nextStep = 2;
    } else if (code < 0xd800 || code >= 0xe000) {
      nextStep = 3;
    } else {
      // Surrogate pair: 4 bytes total (high surrogate + low surrogate)
      // High surrogate is 0xD800-0xDBFF
      nextStep = 4;
    }

    // Check if adding this character exceeds the target byte index
    if (byteCount + nextStep > targetByteIndex) {
      break;
    }

    byteCount += nextStep;
    if (nextStep === 4) {
      charIndex++; // Skip the low surrogate
    }
    charIndex++;
  }

  return charIndex;
};

/**
 * Efficiently calculates the character index (0-based) in a code string
 * given a 1-based line number and a 1-based byte column (Neovim style).
 * This avoids splitting the entire string into lines.
 */
export const getCharIndexFromLineCol = (
  code: string,
  line: number,
  col: number,
): number => {
  let lineStart = 0;
  const targetLineIndex = line - 1;

  if (targetLineIndex > 0) {
    let idx = 0;
    let linesSkipped = 0;
    while (linesSkipped < targetLineIndex) {
      idx = code.indexOf("\n", idx);
      if (idx === -1) {
        throw new Error(`Line number ${line} out of bounds`);
      }
      idx++; // Skip \n
      linesSkipped++;
    }
    lineStart = idx;
  }

  const lineEnd = code.indexOf("\n", lineStart);
  const currentLine = lineEnd === -1
    ? code.slice(lineStart)
    : code.slice(lineStart, lineEnd);

  // col is 1-based byte index, convert to 0-based for calculation
  return lineStart + byteIndexToCharIndex(currentLine, col - 1);
};
