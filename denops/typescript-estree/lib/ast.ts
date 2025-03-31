import { parse, TSESTree } from "npm:@typescript-eslint/typescript-estree";
import esquery from "npm:esquery";

export const parseToAst = (code: string) => {
  try {
    return parse(code, { jsx: true, loc: true, range: true });
  } catch (_e) {
    return null;
  }
};

export const getMatchingNodes = (ast: TSESTree.Program, selector: string) =>
  esquery(ast, selector);

export const findNodesAtPosition = (
  ast: TSESTree.Program,
  position: number,
) => {
  const nodes: TSESTree.Node[] = [];

  const traverse = (node: TSESTree.Node) => {
    if (!node.range) return;
    nodes.push(node);

    for (const key in node) {
      const child = node[key as keyof typeof node];
      if (Array.isArray(child)) {
        for (const subChild of child) {
          if (subChild && typeof subChild === "object" && "range" in subChild) {
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
      if (a.start === b.start) {
        return a.end - b.end;
      }
      return a.start - b.start;
    });
};
