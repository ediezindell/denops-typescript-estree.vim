import { Denops } from "jsr:@denops/std";
import * as fn from "jsr:@denops/std/function";
import type { TSESTree } from "npm:@typescript-eslint/typescript-estree@^8.28.0";

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

  #generateSelectors = (node: TSESTree.Node): string[] => {
    const selectors: string[] = [node.type];

    // Helper to add a selector if it's not already in the list
    const addSelector = (selector: string) => {
      if (!selectors.includes(selector)) {
        selectors.push(selector);
      }
    };

    // Generic attribute selectors
    if ("name" in node && typeof node.name === "string" && node.name) {
      addSelector(`${node.type}[name="${node.name}"]`);
    }
    if (
      "value" in node && node.value !== null && node.value !== undefined
    ) {
      if (typeof node.value === "string") {
        addSelector(`${node.type}[value="${node.value}"]`);
      } else {
        addSelector(`${node.type}[value=${node.value}]`);
      }
    }

    // Type-specific selectors
    switch (node.type) {
      case "MemberExpression":
        if (node.property.type === "Identifier") {
          addSelector(`${node.type}[property.name="${node.property.name}"]`);
        }
        break;
      case "CallExpression":
        if (node.callee.type === "Identifier") {
          addSelector(`${node.type}[callee.name="${node.callee.name}"]`);
        } else if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.type === "Identifier" &&
          node.callee.property.type === "Identifier"
        ) {
          addSelector(
            `${node.type}[callee.object.name="${node.callee.object.name}"][callee.property.name="${node.callee.property.name}"]`,
          );
        }
        break;
      case "JSXAttribute":
        if (node.name.type === "JSXIdentifier") {
          addSelector(`${node.type}[name.name="${node.name.name}"]`);
        }
        break;
      case "JSXOpeningElement":
        if (node.name.type === "JSXIdentifier") {
          addSelector(`${node.type}[name.name="${node.name.name}"]`);
        }
        break;
    }

    return selectors;
  };

  #promptUserToSelect = async (
    choices: string[],
  ): Promise<string | null> => {
    const choice = await this.#denops.call("inputlist", [
      "Select a selector to copy:",
      choices,
    ]);
    if (typeof choice === "number" && choice > 0 && choice <= choices.length) {
      return choices[choice - 1];
    }
    return null;
  };

  inspect = async () => {
    try {
      const ast = await getCurrentBufAst(this.#denops);
      if (!ast) {
        await this.#denops.cmd(
          `echohl WarningMsg | echo "Failed to parse current buffer" | echohl None`,
        );
        return;
      }

      const pos = await this.#getCursorPosition();
      const matchingNodes = findNodesAtPosition(ast, pos);

      if (matchingNodes.length === 0) {
        await this.#denops.cmd(`echo "No AST nodes found at cursor position"`);
        return;
      }

      const selectors = matchingNodes.flatMap((item) =>
        this.#generateSelectors(item.node)
      );
      const uniqueSelectors = [...new Set(selectors)];

      if (uniqueSelectors.length === 0) {
        await this.#denops.cmd(
          `echo "No selectors could be generated for the node at cursor."`,
        );
        return;
      }

      const selectedSelector = await this.#promptUserToSelect(uniqueSelectors);

      if (selectedSelector) {
        await fn.setreg(this.#denops, '"', selectedSelector);
        await this.#denops.cmd(
          `echo "Copied to register: ${selectedSelector.replace(/"/g, '\\"')}"`,
        );
      }
    } catch (error) {
      console.error("Failed to inspect AST:", error);
      await this.#denops.cmd(
        `echohl ErrorMsg | echo "Failed to inspect AST" | echohl None`,
      );
    }
  };
}
