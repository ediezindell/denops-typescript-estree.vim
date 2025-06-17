import { parse, TSESTree } from "@typescript-eslint/typescript-estree";
import esquery from "esquery";

export const parseToAst = (code: string) => {
  try {
    return parse(code, { 
      jsx: true, 
      loc: true, 
      range: true,
      errorOnUnknownASTType: false,
      errorOnTypeScriptSyntacticAndSemanticIssues: false
    });
  } catch (error) {
    console.error("Failed to parse AST:", error);
    return null;
  }
};

export const getMatchingNodes = (ast: TSESTree.Program, selector: string) => {
  try {
    // Type assertion needed due to AST type differences between typescript-eslint and estree
    return esquery(ast as any, selector) as TSESTree.Node[];
  } catch (error) {
    console.error("Invalid selector:", selector, error);
    throw new Error(`Invalid ESQuery selector: ${selector}`);
  }
};

export const findNodesAtPosition = (
  ast: TSESTree.Program,
  position: number,
) => {
  const matchingNodes: Array<{
    type: string;
    start: number;
    end: number;
    node: TSESTree.Node;
  }> = [];

  const traverse = (node: TSESTree.Node) => {
    if (!node.range) return;
    
    const [start, end] = node.range;
    
    // Early exit if position is outside this node's range
    if (position < start || position > end) return;
    
    // This node contains the position
    matchingNodes.push({
      type: node.type,
      start,
      end,
      node,
    });

    // Traverse children only if they might contain the position
    for (const key in node) {
      const child = node[key as keyof typeof node];
      if (Array.isArray(child)) {
        for (const subChild of child) {
          if (subChild && typeof subChild === "object" && "range" in subChild) {
            traverse(subChild as TSESTree.Node);
          }
        }
      } else if (child && typeof child === "object" && "range" in child) {
        traverse(child as TSESTree.Node);
      }
    }
  };

  traverse(ast);

  return matchingNodes
    .toSorted((a, b) => {
      // Sort by specificity: smaller ranges (more specific) first
      const aSize = a.end - a.start;
      const bSize = b.end - b.start;
      if (aSize !== bSize) {
        return aSize - bSize;
      }
      // If same size, sort by start position
      return a.start - b.start;
    });
};
