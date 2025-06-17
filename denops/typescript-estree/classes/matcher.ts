import type { Denops } from "jsr:@denops/std";
import * as fn from "jsr:@denops/std/function";

import { getMatchingNodes } from "../lib/ast.ts";
import { assert, is } from "jsr:@core/unknownutil";

import { getCurrentBufAst } from "../lib/utils.ts";

export default class Matcher {
  #group = "SearchAst";

  #matchId: number;
  #denops: Denops;
  #selector = "";
  #pos: [number, number, number][];

  constructor(denops: Denops) {
    this.#denops = denops;
    this.#matchId = -1;
    this.#pos = [];

    this.#init();
  }

  #init = async () => {
    await this.#denops.cmd(
      `highlight ${this.#group} guifg=#272822 guibg=#f92672`,
    );
  };

  #requireSelectorInput = async () => {
    try {
      const selector = await fn.input(this.#denops, "input AST selector: ");
      assert(selector, is.String);
      return selector;
    } catch (_e) {
      return "";
    }
  };

  #highlightSelector = async (selector: string) => {
    await this.#resetHighlight();
    this.#selector = selector;
    if (selector.length === 0) return;

    const ast = await getCurrentBufAst(this.#denops);
    if (!ast) {
      await this.#denops.cmd(`echohl WarningMsg | echo "Failed to parse current buffer" | echohl None`);
      return;
    }

    const matchingNodes = getMatchingNodes(ast, selector);
    if (matchingNodes.length === 0) {
      await this.#denops.cmd(`echo "No matches found for selector: ${selector}"`);
      return;
    }

    this.#pos = matchingNodes
      .filter(({ loc }) => loc)
      .map(({ loc }) => loc!)
      .map(({ start, end }) => [
        start.line + 1, // Convert 0-based to 1-based line
        start.column + 1, // Convert 0-based to 1-based column
        Math.max(1, end.column - start.column), // Ensure minimum length of 1
      ]);
    
    // Sort positions for navigation
    this.#pos.sort((a, b) => {
      if (a[0] !== b[0]) {
        return a[0] - b[0];
      }
      if (a[1] !== b[1]) {
        return a[1] - b[1];
      }
      return a[2] - b[2];
    });

    this.#matchId = await fn.matchaddpos(this.#denops, this.#group, this.#pos);
    
    // Show match count
    await this.#denops.cmd(`echo "Found ${matchingNodes.length} matches"`);
  };

  #resetHighlight = async () => {
    if (this.#matchId > 0) {
      try {
        await fn.matchdelete(this.#denops, this.#matchId);
      } catch (error) {
        // Match might already be deleted, ignore error
        console.debug("Failed to delete match:", error);
      }
    }
    this.#matchId = -1;
    this.#pos = [];
  };

  reset = async () => {
    this.#selector = "";
    await this.#resetHighlight();
  };

  highlight = async () => {
    const selector = await this.#requireSelectorInput();
    if (!selector) return;
    
    try {
      await this.#highlightSelector(selector);
      await this.focusNext();
    } catch (error) {
      console.error("Failed to highlight selector:", error);
      await this.#denops.cmd(`echohl ErrorMsg | echo "Invalid selector: ${selector}" | echohl None`);
    }
  };

  reHighlight = async () => {
    if (!this.#selector) return;
    
    try {
      await this.#highlightSelector(this.#selector);
    } catch (error) {
      console.error("Failed to re-highlight:", error);
      await this.#denops.cmd(`echohl ErrorMsg | echo "Failed to re-highlight" | echohl None`);
    }
  };

  focusPrev = async () => {
    const [, currentLine, currentColumn] = await fn.getcurpos(this.#denops);
    const prevIndex = this.#pos.findLastIndex(([line, column]) => {
      if (line > currentLine) return false;
      if (line < currentLine) return true;
      return column < currentColumn;
    });
    await this.#focus(prevIndex);
  };
  focusNext = async () => {
    const [, currentLine, currentColumn] = await fn.getcurpos(this.#denops);
    const nextIndex = this.#pos.findIndex(([line, column]) => {
      if (line < currentLine) return false;
      if (line > currentLine) return true;
      return currentColumn < column;
    });
    await this.#focus(nextIndex);
  };

  #focus = async (index: number) => {
    if (index < 0 || index >= this.#pos.length) {
      await this.#denops.cmd(`echo "No more matches"`);
      return;
    }

    const pos = this.#pos[index];
    const [line, column] = pos;
    await fn.cursor(this.#denops, line, column);
    
    // Show current match position
    await this.#denops.cmd(`echo "Match ${index + 1}/${this.#pos.length}"`);
  };
}
