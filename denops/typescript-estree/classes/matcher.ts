import type { Denops } from "jsr:@denops/std";
import * as fn from "jsr:@denops/std/function";
import { batch, collect } from "jsr:@denops/std/batch";

import { getMatchingNodes } from "../lib/ast.ts";
import { assert, is } from "jsr:@core/unknownutil";

import { getCurrentBufAst } from "../lib/utils.ts";

interface MatchPos {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
}

export default class Matcher {
  #group = "SearchAst";

  #nsId: number;
  #matchIds: number[];
  #denops: Denops;
  #selector = "";
  #pos: MatchPos[];
  #isNvim: boolean;

  constructor(denops: Denops) {
    this.#denops = denops;
    this.#nsId = -1;
    this.#matchIds = [];
    this.#pos = [];
    // Only use nvim optimization if explicitly detecting nvim
    this.#isNvim = denops.meta.host === "nvim";

    this.#init();
  }

  #init = async () => {
    await this.#denops.cmd(
      `highlight ${this.#group} guifg=#272822 guibg=#f92672`,
    );
    if (this.#isNvim) {
      this.#nsId = await this.#denops.call(
        "nvim_create_namespace",
        "denops-typescript-estree",
      ) as number;
    }
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
      await this.#denops.cmd(
        `echohl WarningMsg | echo "Failed to parse current buffer" | echohl None`,
      );
      return;
    }

    const matchingNodes = getMatchingNodes(ast, selector);
    if (matchingNodes.length === 0) {
      await this.#denops.cmd(
        `echo "No matches found for selector: ${selector}"`,
      );
      return;
    }

    this.#pos = matchingNodes
      .filter(({ loc }) => loc)
      .map(({ loc }) => {
        const line = loc!.start.line - 1; // 0-based
        const column = loc!.start.column; // 0-based
        const endLine = loc!.end.line - 1; // 0-based
        let endColumn = loc!.end.column; // 0-based

        // Ensure minimum length of 1 if on same line (handle zero-width nodes)
        if (line === endLine && endColumn <= column) {
          endColumn = column + 1;
        }

        return {
          line,
          column,
          endLine,
          endColumn,
        };
      });

    // Sort positions for navigation
    this.#pos.sort((a, b) => {
      if (a.line !== b.line) {
        return a.line - b.line;
      }
      return a.column - b.column;
    });

    if (this.#isNvim) {
      const bufnr = await fn.bufnr(this.#denops);
      await batch(this.#denops, async (denops) => {
        for (const pos of this.#pos) {
          await denops.call(
            "nvim_buf_set_extmark",
            bufnr,
            this.#nsId,
            pos.line,
            pos.column,
            {
              end_row: pos.endLine,
              end_col: pos.endColumn,
              hl_group: this.#group,
            },
          );
        }
      });
    } else {
      // Vim fallback: use matchaddpos with batching (limit 8 per call)
      const positionsToHighlight = this.#pos.map((p) => {
        // matchaddpos expects 1-based line/col
        // For multiline, we fallback to highlighting just the first line part or 1 char
        // to avoid complexity and matchaddpos limitations.
        const len = (p.line === p.endLine) ? (p.endColumn - p.column) : 1;
        return [p.line + 1, p.column + 1, Math.max(1, len)];
      });

      // Use collect to get the return values (match IDs)
      const results = await collect(this.#denops, (denops) => {
        const calls = [];
        for (let i = 0; i < positionsToHighlight.length; i += 8) {
          const chunk = positionsToHighlight.slice(i, i + 8);
          calls.push(denops.call("matchaddpos", this.#group, chunk));
        }
        return calls;
      });
      // Store IDs for cleanup
      this.#matchIds = results as number[];
    }

    // Show match count
    await this.#denops.cmd(`echo "Found ${matchingNodes.length} matches"`);
  };

  #resetHighlight = async () => {
    if (this.#isNvim) {
      if (this.#nsId !== -1) {
        try {
          await this.#denops.call(
            "nvim_buf_clear_namespace",
            0,
            this.#nsId,
            0,
            -1,
          );
        } catch (error) {
          console.debug("Failed to clear namespace:", error);
        }
      }
    } else {
      if (this.#matchIds.length > 0) {
        try {
          await batch(this.#denops, async (denops) => {
            for (const id of this.#matchIds) {
              await fn.matchdelete(denops, id);
            }
          });
        } catch (error) {
          console.debug("Failed to delete matches:", error);
        }
        this.#matchIds = [];
      }
    }
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
      // Reset selector on error to prevent re-highlighting an invalid one
      this.#selector = "";
      await this.#denops.cmd(
        `echohl ErrorMsg | echo "Invalid selector: ${selector}" | echohl None`,
      );
    }
  };

  reHighlight = async () => {
    if (!this.#selector) return;

    try {
      await this.#highlightSelector(this.#selector);
    } catch (error) {
      console.error("Failed to re-highlight:", error);
      const selector = this.#selector;
      // Reset selector on error to prevent re-highlighting an invalid one
      this.#selector = "";
      await this.#denops.cmd(
        `echohl ErrorMsg | echo "Invalid selector: ${selector}" | echohl None`,
      );
    }
  };

  focusPrev = async () => {
    const [, currentLine, currentColumn] = await fn.getcurpos(this.#denops);
    // currentLine is 1-based, currentColumn is 1-based
    const prevIndex = this.#pos.findLastIndex((pos) => {
      if ((pos.line + 1) > currentLine) return false;
      if ((pos.line + 1) < currentLine) return true;
      return (pos.column + 1) < currentColumn;
    });
    await this.#focus(prevIndex);
  };
  focusNext = async () => {
    const [, currentLine, currentColumn] = await fn.getcurpos(this.#denops);
    // currentLine is 1-based, currentColumn is 1-based
    const nextIndex = this.#pos.findIndex((pos) => {
      if ((pos.line + 1) < currentLine) return false;
      if ((pos.line + 1) > currentLine) return true;
      return currentColumn < (pos.column + 1);
    });
    await this.#focus(nextIndex);
  };

  #focus = async (index: number) => {
    if (index < 0 || index >= this.#pos.length) {
      await this.#denops.cmd(`echo "No more matches"`);
      return;
    }

    const pos = this.#pos[index];
    // fn.cursor expects 1-based line, 1-based column
    await fn.cursor(this.#denops, pos.line + 1, pos.column + 1);

    // Show current match position
    await this.#denops.cmd(`echo "Match ${index + 1}/${this.#pos.length}"`);
  };
}
