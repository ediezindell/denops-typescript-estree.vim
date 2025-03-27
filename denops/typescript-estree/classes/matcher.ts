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

  getCurrentBufCode = async () => {
    const bufnr = await fn.bufnr(this.#denops);
    const buflines = await fn.getbufline(this.#denops, bufnr, 1, "$");
    assert(buflines, is.ArrayOf(is.String));

    return buflines.join("\n");
  };
  getCurrentBufAst = async () => {
    const code = await this.getCurrentBufCode();
    return parseToAst(code);
  };
  requireSelectorInput = async () => {
    try {
      const selector = await fn.input(this.#denops, "input AST selector: ");
      assert(selector, is.String);
      return selector;
    } catch (_e) {
      return "";
    }
  };

  reset = async () => {
    if (this.#matchId < 0) return;
    await fn.matchdelete(this.#denops, this.#matchId);
    this.#matchId = -1;
  };

  highlight = async () => {
    await this.reset();

    const selector = await this.requireSelectorInput();
    if (selector.length === 0) return;

    const ast = await this.getCurrentBufAst();

    await this.highlightSelector(ast, selector);
  };

  highlightSelector = async (ast: TSESTree.Program, selector: string) => {
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
}
