// deno-lint-ignore-file no-import-prefix no-unversioned-import
import { assert } from "jsr:@std/assert";
import type { Denops, Context, Dispatcher } from "jsr:@denops/std";
import Inspecter from "./inspecter.ts";

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
    if (fn === "getbufvar") return 1; // changedtick
    if (fn === "getbufline") return ["const a = 1;"];
    if (fn === "getcurpos") return [0, 1, 7, 0, 7]; // Line 1, Col 7 (at 'a')
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
     return calls.map(() => null);
  }

  redraw = (_force?: boolean) => Promise.resolve();
  dispatch = (_name: string, _fn: string, _args: unknown[]) => Promise.resolve();
}

Deno.test("Inspecter identifies node at cursor", async () => {
  const denops = new MockDenops();
  const inspecter = new Inspecter(denops);

  await inspecter.inspect();

  // Should output message
  const echoCmd = denops.cmdCalls.find(cmd => cmd.startsWith("echo \"AST Node:"));
  assert(echoCmd, "Should output AST Node info");

  // Verify content
  assert(echoCmd.includes("AST Node: Identifier"), `Expected Identifier, got: ${echoCmd}`);
});
