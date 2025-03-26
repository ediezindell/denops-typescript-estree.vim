// deno-lint-ignore-file require-await
import type { Denops, Entrypoint } from "jsr:@denops/std";
import * as fn from "jsr:@denops/std/function";

import { assert, is } from "jsr:@core/unknownutil";

import { parse } from "npm:@typescript-eslint/typescript-estree";
import esquery from "npm:esquery";

let id: number = NaN;

const disableHighlightSelector = async (denops: Denops): Promise<void> => {
  if (isNaN(id)) return;
  await fn.matchdelete(denops, id);
  id = NaN;
};

export const main: Entrypoint = (denops) => {
  denops.dispatcher = {
    async px2rem(root: unknown): Promise<void> {
      assert(root, is.Number);
      const pattern = /(.*font-size: )([\d]+)px(.*)/;

      const bufnr = await fn.bufnr(denops);
      const buflines = await fn.getbufline(denops, bufnr, 1, "$");
      assert(buflines, is.ArrayOf(is.String));

      const output = buflines.map((line) => {
        const m = line.match(pattern);
        return m ? `${m[1]}${+m[2] / root}rem${m[3]}` : line;
      });

      if (buflines.join("\n").trim() === output.join("\n").trim()) {
        console.log("no changed");
        return;
      }

      await fn.setbufline(denops, bufnr, 1, output);
    },
    async disableHighlightSelector(): Promise<void> {
      await disableHighlightSelector(denops);
    },
    async highlightSelector(args: unknown): Promise<void> {
      assert(args, is.ArrayOf(is.String));
      const [selector] = args;
      assert(selector, is.String);
      console.log(selector);
      if (selector.length === 0) return;

      const bufnr = await fn.bufnr(denops);
      const buflines = await fn.getbufline(denops, bufnr, 1, "$");
      assert(buflines, is.ArrayOf(is.String));

      const code = buflines.join("\n");
      const ast = parse(code, { loc: true, range: true });

      const matchingNodes = esquery(ast, selector);

      // const group = "SearchAst";
      const group = "Search";
      id = await fn.matchaddpos(
        denops,
        group,
        matchingNodes
          .filter(({ loc }) => loc)
          .map((node) => {
            const { start, end } = node.loc;
            return [start.line, start.column + 1, end.column - start.column];
          }),
      );
      console.log(`highlighted: ${group}`);
    },
  };
  denops.cmd(
    `command! -nargs=* HLS call denops#request('${denops.name}', 'highlightSelector', [[<f-args>]])`,
  );
  denops.cmd(
    `command! DHLS call denops#request('${denops.name}', 'disableHighlightSelector', [])`,
  );
};
