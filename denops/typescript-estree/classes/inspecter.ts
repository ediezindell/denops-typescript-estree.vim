// deno-lint-ignore-file no-import-prefix no-unversioned-import
import { Denops } from "jsr:@denops/std";
import * as fn from "jsr:@denops/std/function";
import type { TSESTree } from "npm:@typescript-eslint/typescript-estree@^8.28.0";

import {
  byteIndexToCharIndex,
  getCurrentBufAst,
  getCurrentBufCode,
} from "../lib/utils.ts";
import { findNodesAtPosition } from "../lib/ast.ts";

export default class Inspecter {
  #denops: Denops;

  constructor(denops: Denops) {
    this.#denops = denops;
  }

  #getCursorPosition = async () => {
    const [, line, col] = await fn.getcurpos(this.#denops);
    const code = await getCurrentBufCode(this.#denops);

    // Convert 1-based line/column to 0-based character position
    const lines = code.split("\n");
    let pos = 0;

    // Add characters for all lines before current line
    for (let i = 0; i < line - 1; i++) {
      // +1 for newline character
      pos += lines[i].length + 1;
    }

    // Add characters for columns in current line (col is 1-based byte index)
    if (lines[line - 1]) {
      const currentLine = lines[line - 1];
      // col is 1-based byte index, so col-1 is 0-based byte index
      const charOffset = byteIndexToCharIndex(currentLine, col - 1);
      pos += charOffset;
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
    // For debugging the "empty list" issue
    console.log("Selector choices being passed to inputlist:", choices);

    if (choices.length === 0) {
      await this.#denops.cmd(
        `echohl WarningMsg | echo "No unique selectors could be generated." | echohl None`,
      );
      return null;
    }

    try {
      const prompt = "Type number to select a selector to copy:";
      const numberedChoices = choices.map((c, i) => `${i + 1}: ${c}`);
      const choicesWithPrompt = [prompt, ...numberedChoices];
      const choiceIndex = await this.#denops.call(
        "inputlist",
        choicesWithPrompt,
      ) as number;

      // inputlist() returns 1-based index. 0 for cancel.
      // choiceIndex > 1 because index 1 is the prompt.
      if (choiceIndex > 1 && choiceIndex <= choicesWithPrompt.length) {
        // Return the selected item from the original choices array
        return choices[choiceIndex - 2];
      }
      return null;
    } catch (e) {
      // User cancelled the inputlist, which can throw an error in Deno/Vim.
      // We can safely ignore it and return null.
      console.log("Input cancelled by user.");
      return null;
    }
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

      const selectors = matchingNodes.reduce((acc: string[], item) => {
        const generated = this.#generateSelectors(item.node);
        for (const s of generated) {
          if (!acc.includes(s)) {
            acc.push(s);
          }
        }
        return acc;
      }, []);

      const selectedSelector = await this.#promptUserToSelect(selectors);

      if (selectedSelector) {
        await fn.setreg(this.#denops, '"', selectedSelector);
        await this.#denops.cmd(
          `echo "Copied to register \\" (default): ${
            selectedSelector.replace(/"/g, '\\"')
          }"`,
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
