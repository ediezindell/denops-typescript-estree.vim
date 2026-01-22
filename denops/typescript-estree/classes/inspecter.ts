// deno-lint-ignore-file no-import-prefix no-unversioned-import
import { Denops } from "jsr:@denops/std";
import * as fn from "jsr:@denops/std/function";
import { collect } from "jsr:@denops/std/batch";

import {
  byteIndexToCharIndex,
  checkCache,
  fetchBufState,
  updateCacheAst,
} from "../lib/utils.ts";
import { findNodesAtPosition, parseToAst } from "../lib/ast.ts";

export default class Inspecter {
  #denops: Denops;

  constructor(denops: Denops) {
    this.#denops = denops;
  }

  // Refactored to accept code/indices and cursor position directly
  #getCursorPosition = (
    line: number,
    col: number,
    code: string,
    lineStartIndices: number[],
  ) => {
    // Convert 1-based line/column to 0-based character position

    // Safety check for line existence
    const lineIndex = line - 1;
    if (lineIndex >= lineStartIndices.length) {
      return code.length;
    }

    let pos = lineStartIndices[lineIndex];

    // Add characters for columns in current line (col is 1-based byte index)
    // Extract current line for byteIndexToCharIndex
    if (pos <= code.length) {
      // Find end of line using next line start index
      const nextLineStart = lineStartIndices[lineIndex + 1];
      // If next line exists, it starts after \n. So current line ends at nextLineStart - 1.
      const lineEnd = nextLineStart !== undefined
        ? nextLineStart - 1
        : code.length;

      const currentLine = code.slice(pos, lineEnd);

      // col is 1-based byte index, so col-1 is 0-based byte index
      const charOffset = byteIndexToCharIndex(currentLine, col - 1);
      pos += charOffset;
    }

    return pos;
  };

  inspect = async () => {
    try {
      // Optimization: Fetch bufnr, changedtick and cursor pos in a single RPC call
      const [bufnr, tick, cursor] = await collect(this.#denops, (denops) => [
        fn.bufnr(denops),
        fn.getbufvar(denops, "%", "changedtick"),
        fn.getcurpos(denops),
      ]) as [number, number, [number, number, number, number, number]];

      let state = checkCache(bufnr, tick);
      if (!state) {
        state = await fetchBufState(this.#denops, bufnr, tick);
      }

      let ast = state.ast;
      if (!ast) {
        if (!state.code.trim()) {
          await this.#denops.cmd(
            `echohl WarningMsg | echo "Buffer is empty" | echohl None`,
          );
          return;
        }
        // Parse AST if missing
        const newAst = parseToAst(state.code);
        if (newAst) {
          updateCacheAst(bufnr, tick, newAst);
          ast = newAst;
        }
      }

      if (!ast) {
        await this.#denops.cmd(
          `echohl WarningMsg | echo "Failed to parse current buffer" | echohl None`,
        );
        return;
      }

      const [, line, col] = cursor;
      const pos = this.#getCursorPosition(
        line,
        col,
        state.code,
        state.lineStartIndices,
      );

      const matchingNodes = findNodesAtPosition(ast, pos);

      if (matchingNodes.length === 0) {
        await this.#denops.cmd(`echo "No AST nodes found at cursor position"`);
        return;
      }

      // Display the most specific node (first in sorted array)
      const mostSpecific = matchingNodes[0];
      const message =
        `AST Node: ${mostSpecific.type} (${mostSpecific.start}-${mostSpecific.end})`;
      await this.#denops.cmd(`echo "${message}"`);

      console.log("All matching nodes:", matchingNodes);
    } catch (error) {
      console.error("Failed to inspect AST:", error);
      await this.#denops.cmd(
        `echohl ErrorMsg | echo "Failed to inspect AST" | echohl None`,
      );
    }
  };
}
