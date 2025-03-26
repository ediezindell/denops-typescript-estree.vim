import type { Denops } from "jsr:@denops/std";
import * as fn from "jsr:@denops/std/function";

import { TSESTree } from "npm:@typescript-eslint/typescript-estree";
import { getMatchingNodes } from "./ast.ts";

export default class Matcher {
  #group = "SearchAst";
  #matchId: number;
  #denops: Denops;

  constructor(denops: Denops) {
    this.#denops = denops;
    this.#matchId = -1;
    this.#init();
  }
  async #init() {
    await this.#denops.cmd(
      `highlight ${this.#group} guifg=#272822 guibg=#f92672`,
    );
  }

  async reset() {
    if (this.#matchId < 0) return;
    await fn.matchdelete(this.#denops, this.#matchId);
    this.#matchId = -1;
  }

  async highlightSelector(ast: TSESTree.Program, selector: string) {
    const matchingNodes = getMatchingNodes(ast, selector);
    if (matchingNodes.length === 0) {
      console.warn("no matching");
      return;
    }

    this.#matchId = await fn.matchaddpos(
      this.#denops,
      this.#group,
      matchingNodes
        .filter(({ loc }) => loc)
        .map(({ loc: { start, end } }) => [
          start.line,
          start.column + 1,
          end.column - start.column,
        ]),
    );
  }
}
