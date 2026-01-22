// deno-lint-ignore-file no-import-prefix no-unversioned-import
import { Denops } from "jsr:@denops/std";
import * as fn from "jsr:@denops/std/function";

import {
  byteIndexToCharIndex,
  getCurrentBufAst,
  getCurrentBufCode,
  getLineStartIndices,
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
    const lineStartIndices = await getLineStartIndices(this.#denops);

    // Convert 1-based line/column to 0-based character position
    if (!lineStartIndices) {
      // Fallback if indices are missing (should not happen with updated utils)
      let pos = 0;
      for (let i = 0; i < line - 1; i++) {
        const nextNewline = code.indexOf("\n", pos);
        if (nextNewline === -1) {
          pos = code.length;
          break;
        }
        pos = nextNewline + 1;
      }

      if (pos <= code.length) {
        const nextNewline = code.indexOf("\n", pos);
        const lineEnd = nextNewline === -1 ? code.length : nextNewline;
        const currentLine = code.slice(pos, lineEnd);
        const charOffset = byteIndexToCharIndex(currentLine, col - 1);
        pos += charOffset;
      }
      return pos;
    }

    const lineIndex = line - 1;
    // Safety check for line existence
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
