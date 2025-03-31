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
