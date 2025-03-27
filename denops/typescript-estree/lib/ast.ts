import { parse, TSESTree } from "npm:@typescript-eslint/typescript-estree";
import esquery from "npm:esquery";

export const parseToAst = (code: string) =>
  parse(code, { jsx: true, loc: true, range: true });
export const getMatchingNodes = (ast: TSESTree.Program, selector: string) =>
  esquery(ast, selector);
