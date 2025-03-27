import type { Denops } from "jsr:@denops/std";
import * as fn from "jsr:@denops/std/function";

import { TSESTree } from "npm:@typescript-eslint/typescript-estree";
import { getMatchingNodes } from "../lib/ast.ts";
import { assert, is } from "jsr:@core/unknownutil";

import { parseToAst } from "../lib/ast.ts";

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

  #getCurrentBufCode = async () => {
    const bufnr = await fn.bufnr(this.#denops);
    const buflines = await fn.getbufline(this.#denops, bufnr, 1, "$");
    assert(buflines, is.ArrayOf(is.String));

    return buflines.join("\n");
  };

  #getCurrentBufAst = async () => {
    const code = await this.#getCurrentBufCode();
    return parseToAst(code);
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

  #highlightSelector = async () => {
    const selector = this.#selector;
    await this.#resetHighlight();
    if (selector.length === 0) return;

    const ast = await this.#getCurrentBufAst();

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
    this.#selector = selector;

    await this.#highlightSelector();
  };

  reHighlight = async () => {
    await this.#highlightSelector();
  };
}
