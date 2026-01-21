// deno-lint-ignore-file no-import-prefix no-unversioned-import
import { assertEquals, assert } from "jsr:@std/assert";
import type { Denops, Context, Dispatcher } from "jsr:@denops/std";
import Matcher from "./matcher.ts";

class MockDenops implements Denops {
  name = "mock";
  // deno-lint-ignore no-explicit-any
  meta: any = { host: "vim", version: "9.0", platform: "linux" };
  context: Record<string, unknown> = {};
  dispatcher: Dispatcher = {};

  callCalls: [string, ...unknown[]][] = [];
  cmdCalls: string[] = [];
  batchCalls: [string, ...unknown[]][] = [];

  // deno-lint-ignore require-await
  async call(fn: string, ...args: unknown[]): Promise<unknown> {
    this.callCalls.push([fn, ...args]);
    if (fn === "bufnr") return 1;
    if (fn === "getbufline") return ["const a = 1;"];
    if (fn === "input") return "VariableDeclaration";
    if (fn === "matchaddpos") return 10;
    if (fn === "matchdelete") return 0;
    if (fn === "expand") return "/tmp/test.ts";
    if (fn === "getcurpos") return [0, 1, 1, 0, 1];
    if (fn === "cursor") return 0;
    if (fn === "nvim_create_namespace") return 5; // ns_id
    if (fn === "nvim_buf_clear_namespace") return 0;
    if (fn === "nvim_buf_set_extmark") return 1;
    return null;
  }

  // deno-lint-ignore require-await
  async cmd(cmd: string, _ctx: Context = {}): Promise<void> {
    this.cmdCalls.push(cmd);
  }

  // deno-lint-ignore require-await
  async eval(_expr: string, _ctx: Context = {}): Promise<unknown> {
      return null;
  }

  // deno-lint-ignore require-await
  async batch(...calls: [string, ...unknown[]][]): Promise<unknown[]> {
     this.batchCalls.push(...calls);
     // We need to return results for each call.
     return calls.map(() => null);
  }

  redraw = (_force?: boolean) => Promise.resolve();
  dispatch = (_name: string, _fn: string, _args: unknown[]) => Promise.resolve();
}

Deno.test("Matcher highlights using matchaddpos in Vim", async () => {
  const denops = new MockDenops();
  denops.meta.host = "vim";

  const matcher = new Matcher(denops);

  // Trigger highlight
  await matcher.highlight();

  // Check if matchaddpos was called
  const matchAddPosCall = denops.callCalls.find(c => c[0] === "matchaddpos");
  assert(matchAddPosCall, "Should call matchaddpos in Vim");

  // Check matchaddpos arguments
  // deno-lint-ignore no-explicit-any
  const pos = matchAddPosCall[2] as any[];
  assertEquals(pos.length, 1);
  assertEquals(pos[0], [1, 1, 12]);
});

Deno.test("Matcher highlights using nvim_buf_set_extmark in Neovim", async () => {
  const denops = new MockDenops();
  denops.meta.host = "nvim";

  const matcher = new Matcher(denops);

  // Wait for init (namespace creation)
  await new Promise(r => setTimeout(r, 10));

  // Trigger highlight
  await matcher.highlight();

  // Check if nvim_create_namespace was called (during init)
  const createNsCall = denops.callCalls.find(c => c[0] === "nvim_create_namespace");
  assert(createNsCall, "Should call nvim_create_namespace in Neovim");

  // Check if nvim_buf_set_extmark was called via batch
  const setExtmarkCall = denops.batchCalls.find(c => c[0] === "nvim_buf_set_extmark");
  assert(setExtmarkCall, "Should call nvim_buf_set_extmark in Neovim");

  // Check arguments
  // nvim_buf_set_extmark(0, ns_id, line, col, opts)
  assertEquals(setExtmarkCall![3], 0); // line
  assertEquals(setExtmarkCall![4], 0); // col
  // deno-lint-ignore no-explicit-any
  const opts = setExtmarkCall![5] as any;
  assertEquals(opts.end_line, 0);
  assertEquals(opts.end_col, 12);

  // Ensure matchaddpos was NOT called
  const matchAddPosCall = denops.callCalls.find(c => c[0] === "matchaddpos");
  assertEquals(!!matchAddPosCall, false, "Should NOT call matchaddpos in Neovim");
});
