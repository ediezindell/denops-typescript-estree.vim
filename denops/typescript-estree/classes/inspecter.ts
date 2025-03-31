import { Denops } from "jsr:@denops/std";
import * as fn from "jsr:@denops/std/function";

import { TSESTree } from "npm:@typescript-eslint/typescript-estree";

import { getCurrentBufAst, getCurrentBufCode } from "../lib/utils.ts";

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

  #findAstNodeAtPosition = async (pos: number) => {
    const ast = await getCurrentBufAst(this.#denops);
    if (!ast) return [];

    const nodes = this.#findNodesAtPosition(ast, pos);
    return nodes;
  };

  #findNodesAtPosition = (ast: TSESTree.Program, position: number) => {
    const nodes: TSESTree.Node[] = [];

    const traverse = (node: TSESTree.Node) => {
      if (!node.range) return;
      nodes.push(node);

      for (const key in node) {
        const child = node[key as keyof typeof node];
        if (Array.isArray(child)) {
          for (const subChild of child) {
            if (
              subChild &&
              typeof subChild === "object" &&
              "range" in subChild
            ) {
              traverse(subChild);
            }
          }
        } else if (child && typeof child === "object" && "range" in child) {
          traverse(child);
        }
      }
    };

    traverse(ast);

    return nodes
      .map((node) => {
        const [start, end] = node.range;
        return {
          type: node.type,
          start,
          end,
        };
      })
      .filter(({ start, end }) => {
        return start <= position && position <= end;
      })
      .toSorted((a, b) => {
        return a.start === b.start ? a.end - b.end : a.start - b.start;
      });
  };

  inspect = async () => {
    const pos = await this.#getCursorPosition();
    const matchingNodes = await this.#findAstNodeAtPosition(pos);
    console.log(matchingNodes);
  };
}
