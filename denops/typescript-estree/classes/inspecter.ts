// deno-lint-ignore-file no-import-prefix no-unversioned-import
import { Denops } from "jsr:@denops/std";
import * as fn from "jsr:@denops/std/function";

import {
  byteIndexToCharIndex,
  getCurrentBufAst,
  getCurrentBufCode,
} from "../lib/utils.ts";
import { findNodesAtPosition } from "../lib/ast.ts";

export default class Inspecter {
  #denops: Denops;

  constructor(denops: Denops) {
    this.#denops = denops;
  }

  #getCursorPosition = async () => {
    const [, line, col] = await fn.getcurpos(this.#denops);
    const code = await getCurrentBufCode(this.#denops);

    // Convert 1-based line/column to 0-based character position
    let pos = 0;

    // Add characters for all lines before current line
    // Find the start index of the current line (0-based index)
    for (let i = 0; i < line - 1; i++) {
      const nextNewline = code.indexOf("\n", pos);
      if (nextNewline === -1) {
        pos = code.length;
        break;
      }
      pos = nextNewline + 1;
    }

    // Add characters for columns in current line (col is 1-based byte index)
    // Extract current line for byteIndexToCharIndex
    if (pos <= code.length) {
      const nextNewline = code.indexOf("\n", pos);
      const lineEnd = nextNewline === -1 ? code.length : nextNewline;
      const currentLine = code.slice(pos, lineEnd);

      // col is 1-based byte index, so col-1 is 0-based byte index
      const charOffset = byteIndexToCharIndex(currentLine, col - 1);
      pos += charOffset;
    }

    return pos;
  };

  inspect = async () => {
    try {
      const ast = await getCurrentBufAst(this.#denops);
      if (!ast) {
        await this.#denops.cmd(
          `echohl WarningMsg | echo "Failed to parse current buffer" | echohl None`,
        );
        return;
      }

      const pos = await this.#getCursorPosition();
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
