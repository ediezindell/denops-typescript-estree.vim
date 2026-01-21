// deno-lint-ignore-file no-import-prefix no-unversioned-import
import { assertEquals } from "jsr:@std/assert";
import { getCurrentBufAst, getCurrentBufCode } from "./utils.ts";
import type { Denops } from "jsr:@denops/std";

Deno.test("getCurrentBufAst caches AST based on changedtick", async () => {
  let getBufLineCallCount = 0;
  let currentTick = 100;

  const mockDenops = {
    name: "mock-denops",
    call: (name: string, ...args: unknown[]) => {
      if (name === "bufnr") return 1;
      if (name === "getbufline") {
        getBufLineCallCount++;
        return ["const a = 1;"];
      }
      if (name === "getbufvar") {
        // args[0] is bufnr, args[1] is varname
        if (args[1] === "changedtick") {
            return currentTick;
        }
      }
      return null;
    },
    cmd: (_cmd: string) => Promise.resolve(),
    eval: (_expr: string) => Promise.resolve(),
    batch: (_calls: unknown[]) => Promise.resolve(),
  } as unknown as Denops;

  // 1. First call - should fetch buffer
  await getCurrentBufAst(mockDenops);
  assertEquals(getBufLineCallCount, 1, "Should fetch buffer on first call");

  // 2. Second call - same tick
  await getCurrentBufAst(mockDenops);

  // 3. Third call - changed tick
  currentTick = 101;
  await getCurrentBufAst(mockDenops);

  // 1 (first) + 1 (changed tick) = 2
  assertEquals(getBufLineCallCount, 2, "Should use cache when tick is unchanged");
});

Deno.test("getCurrentBufCode uses cached code from getCurrentBufAst", async () => {
  let getBufLineCallCount = 0;
  const currentTick = 200;

  const mockDenops = {
    name: "mock-denops",
    call: (name: string, ...args: unknown[]) => {
      if (name === "bufnr") return 1;
      if (name === "getbufline") {
        getBufLineCallCount++;
        return ["const b = 2;"];
      }
      if (name === "getbufvar") {
        if (args[1] === "changedtick") {
            return currentTick;
        }
      }
      return null;
    },
    cmd: (_cmd: string) => Promise.resolve(),
    eval: (_expr: string) => Promise.resolve(),
    batch: (_calls: unknown[]) => Promise.resolve(),
  } as unknown as Denops;

  // 1. First, populate cache with getCurrentBufAst
  await getCurrentBufAst(mockDenops);
  assertEquals(getBufLineCallCount, 1, "getCurrentBufAst should fetch buffer");

  // 2. call getCurrentBufCode
  const code = await getCurrentBufCode(mockDenops);
  assertEquals(code, "const b = 2;");

  // EXPECTATION: With optimization, count should remain 1.
  // Without optimization, count becomes 2.
  assertEquals(getBufLineCallCount, 1, "getCurrentBufCode should use cached code");
});
