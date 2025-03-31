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
    const pos = code.split("\n").slice(0, line).join("\n").length + col;
    return pos;
  };

  inspect = async () => {
    const ast = await getCurrentBufAst(this.#denops);
    if (!ast) return;

    const pos = await this.#getCursorPosition();
    const matchingNodes = findNodesAtPosition(ast, pos);
    console.log(matchingNodes);
  };
}
