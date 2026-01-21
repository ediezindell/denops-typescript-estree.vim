import { assertEquals } from "jsr:@std/assert";
import { getCurrentBufAst } from "./utils.ts";
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
  // This should eventually pass with 1, but will currently be 2
  await getCurrentBufAst(mockDenops);

  // 3. Third call - changed tick
  currentTick = 101;
  await getCurrentBufAst(mockDenops);

  // Current behavior: 3 calls
  // Optimized behavior: 2 calls (1st + 3rd)

  // I'll assert the optimized behavior to see it fail
  assertEquals(getBufLineCallCount, 2, "Should use cache when tick is unchanged");
});
