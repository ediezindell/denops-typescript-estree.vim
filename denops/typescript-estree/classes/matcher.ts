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

  constructor(denops: Denops) {
    this.#denops = denops;
    this.#matchId = -1;
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
    if (!ast) return;

    const matchingNodes = getMatchingNodes(ast, selector);
    if (matchingNodes.length === 0) {
      console.warn("no matching");
      return;
    }

    const pos = matchingNodes
      .filter(({ loc }) => loc)
      .map(({ loc: { start, end } }) => [
        start.line,
        start.column + 1,
        end.column - start.column,
      ]);

    this.#matchId = await fn.matchaddpos(this.#denops, this.#group, pos);
  };

  #resetHighlight = async () => {
    if (this.#matchId > 0) {
      await fn.matchdelete(this.#denops, this.#matchId);
    }
    this.#matchId = -1;
  };

  reset = async () => {
    this.#selector = "";
    await this.#resetHighlight();
  };

  highlight = async (selector: unknown) => {
    selector = await this.#requireSelectorInput();
    assert(selector, is.String);
    await this.#highlightSelector(selector);
  };

  reHighlight = async () => {
    await this.#highlightSelector(this.#selector);
  };

  focusPrev = async () => {};
  focusNext = async () => {};
  #focus = async () => {};
}
