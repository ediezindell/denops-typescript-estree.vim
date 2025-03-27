import { Denops } from "jsr:@denops/std";
import * as fn from "jsr:@denops/std/function";

import { TSESTree } from "npm:@typescript-eslint/typescript-estree";

import { getCurrentBufAst } from "../lib/utils.ts";

type Pos = {
  line: number;
  col: number;
};

export default class Inspecter {
  #denops: Denops;

  constructor(denops: Denops) {
    this.#denops = denops;
  }

  #getCursorPosition = async (): Promise<Pos> => {
    const [, line, col] = await fn.getcurpos(this.#denops);
    return {
      line,
      col,
    };
  };

  // #searchNode = (ast: TSESTree.Node, pos: Pos): TSESTree.Node[] => {
  //   return [];
  // };

  findAstNodeAtPosition(
    node: TSESTree.Node,
    position: number,
  ): TSESTree.Node | null {
    if (!("range" in node)) return null;

    if (!(node.range[0] <= position && position <= node.range[1])) {
      return null;
    }
    let closestMatch: TSESTree.Node | null = node;

    for (const key in node) {
      const child = node[key as keyof TSESTree.Node];

      if (typeof child === "object" && child !== null) {
        if (Array.isArray(child)) {
          for (const item of child) {
            if (typeof item === "object" && item !== null && "range" in item) {
              const match = this.findAstNodeAtPosition(item, position);
              if (match) closestMatch = match;
            }
          }
        } else if ("range" in child) {
          const match = this.findAstNodeAtPosition(child, position);
          if (match) closestMatch = match;
        }
      }
    }

    return closestMatch;
  }

  inspect = async () => {
    const pos = await this.#getCursorPosition();
    console.log(pos);
    const ast = await getCurrentBufAst(this.#denops);
    const node = this.findAstNodeAtPosition(ast, 4);
    console.log(JSON.stringify(node, undefined, 2));
    // this.#searchNode(ast, pos);
    // console.log(ast);
  };
}
