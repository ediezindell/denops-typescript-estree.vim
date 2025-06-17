import { Denops } from "jsr:@denops/std";
import * as fn from "jsr:@denops/std/function";

import { getCurrentBufAst, getCurrentBufCode } from "../lib/utils.ts";
import { findNodesAtPosition } from "../lib/ast.ts";

export default class Inspecter {
  #denops: Denops;

  constructor(denops: Denops) {
    this.#denops = denops;
  }

  #getCursorPosition = async () => {
    const [, line, col] = await fn.getcurpos(this.#denops);
    const code = await getCurrentBufCode(this.#denops);
    
    // Convert 1-based line/column to 0-based byte position
    const lines = code.split("\n");
    let pos = 0;
    
    // Add bytes for all lines before current line
    for (let i = 0; i < line - 1; i++) {
      pos += new TextEncoder().encode(lines[i] + "\n").length;
    }
    
    // Add bytes for columns in current line (col is 1-based)
    if (lines[line - 1]) {
      const currentLinePrefix = lines[line - 1].substring(0, col - 1);
      pos += new TextEncoder().encode(currentLinePrefix).length;
    }
    
    return pos;
  };

  inspect = async () => {
    try {
      const ast = await getCurrentBufAst(this.#denops);
      if (!ast) {
        await this.#denops.cmd(`echohl WarningMsg | echo "Failed to parse current buffer" | echohl None`);
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
      const message = `AST Node: ${mostSpecific.type} (${mostSpecific.start}-${mostSpecific.end})`;
      await this.#denops.cmd(`echo "${message}"`);
      
      console.log("All matching nodes:", matchingNodes);
    } catch (error) {
      console.error("Failed to inspect AST:", error);
      await this.#denops.cmd(`echohl ErrorMsg | echo "Failed to inspect AST" | echohl None`);
    }
  };
}
