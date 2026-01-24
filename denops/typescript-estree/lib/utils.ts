// deno-lint-ignore-file no-import-prefix no-unversioned-import
import type { Denops } from "jsr:@denops/std";
import * as fn from "jsr:@denops/std/function";
import { assert, is } from "jsr:@core/unknownutil";
import { collect } from "jsr:@denops/std/batch";

import { parseToAst } from "../lib/ast.ts";

type AstRoot = NonNullable<ReturnType<typeof parseToAst>>;

export type CacheEntry = {
  bufnr: number;
  tick: number;
  code: string;
  ast?: AstRoot;
  lineStartIndices: number[];
};

let astCache: CacheEntry | null = null;

const computeLineStartIndicesFromLines = (lines: string[]): number[] => {
  const indices = [0];
  let current = 0;
  for (let i = 0; i < lines.length - 1; i++) {
    current += lines[i].length + 1; // +1 for \n
    indices.push(current);
  }
  return indices;
};

export const checkCache = (
  bufnr: number,
  tick: number,
): CacheEntry | null => {
  if (astCache && astCache.bufnr === bufnr && astCache.tick === tick) {
    return astCache;
  }
  return null;
};

export const fetchBufState = async (
  denops: Denops,
  bufnr: number,
  tick: number,
): Promise<CacheEntry> => {
  const buflines = await fn.getbufline(denops, bufnr, 1, "$");
  assert(buflines, is.ArrayOf(is.String));
  const code = buflines.join("\n");
  const lineStartIndices = computeLineStartIndicesFromLines(buflines);

  // Update cache (clearing AST as code changed or it's a new entry)
  astCache = { bufnr, tick, code, lineStartIndices };
  return astCache;
};

export const updateCacheAst = (
  bufnr: number,
  tick: number,
  ast: AstRoot,
): void => {
  if (astCache && astCache.bufnr === bufnr && astCache.tick === tick) {
    astCache.ast = ast;
  }
};

const ensureBufState = async (denops: Denops): Promise<CacheEntry> => {
  // Optimization: Fetch bufnr and changedtick in a single RPC call
  const [bufnr, tick] = await collect(denops, (denops) => [
    fn.bufnr(denops),
    fn.getbufvar(denops, "%", "changedtick"),
  ]) as [number, number];

  const cache = checkCache(bufnr, tick);
  if (cache) {
    return cache;
  }

  return await fetchBufState(denops, bufnr, tick);
};

export const getCurrentBufCode = async (denops: Denops) => {
  const cache = await ensureBufState(denops);
  return cache.code;
};

export const getCurrentBufAst = async (denops: Denops) => {
  try {
    const cache = await ensureBufState(denops);

    if (cache.ast) {
      return cache.ast;
    }

    const code = cache.code;
    if (!code.trim()) {
      console.warn("Buffer is empty");
      return null;
    }

    const ast = parseToAst(code);
    if (ast) {
      updateCacheAst(cache.bufnr, cache.tick, ast as AstRoot);
    }
    return ast;
  } catch (error) {
    console.error("Failed to get current buffer AST:", error);
    return null;
  }
};

export const getLineStartIndices = async (denops: Denops) => {
  const cache = await ensureBufState(denops);
  return cache.lineStartIndices;
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
  const len = str.length;

  while (charIndex < len && byteCount < targetByteIndex) {
    const code = str.charCodeAt(charIndex);

    // Fast path for ASCII
    if (code < 0x80) {
      byteCount += 1;
      charIndex++;
      continue;
    }

    let nextStep = 1;

    if (code < 0x800) {
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
