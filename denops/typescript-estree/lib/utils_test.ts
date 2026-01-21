// deno-lint-ignore-file no-import-prefix no-unversioned-import
import { assertEquals } from "jsr:@std/assert";
import {
  byteIndexToCharIndex,
  getCurrentBufAst,
  getCurrentBufCode,
} from "./utils.ts";
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

Deno.test("byteIndexToCharIndex", async (t) => {
  await t.step("ASCII string", () => {
    const str = "hello";
    // 'h' (0) -> 0
    assertEquals(byteIndexToCharIndex(str, 0), 0);
    // 'e' (1) -> 1
    assertEquals(byteIndexToCharIndex(str, 1), 1);
    // 'o' (4) -> 4
    assertEquals(byteIndexToCharIndex(str, 4), 4);
    // End of string
    assertEquals(byteIndexToCharIndex(str, 5), 5);
  });

  await t.step("Multi-byte string (UTF-8 3 bytes)", () => {
    // 'a' (1 byte) + '★' (3 bytes) + 'b' (1 byte)
    // '★' is U+2605
    const str = "a★b";

    // 'a' at 0 -> 0
    assertEquals(byteIndexToCharIndex(str, 0), 0);

    // '★' at 1 (byte 1) -> 1 (char 1)
    assertEquals(byteIndexToCharIndex(str, 1), 1);

    // 'b' at 1+3 = 4 (byte 4) -> 2 (char 2)
    assertEquals(byteIndexToCharIndex(str, 4), 2);

    // End at 5 bytes -> 3 chars
    assertEquals(byteIndexToCharIndex(str, 5), 3);
  });

  await t.step("Surrogate pair (UTF-8 4 bytes)", () => {
    // 'a' + 💩 (pile of poo, U+1F4A9) + 'b'
    // 💩 is 4 bytes in UTF-8: F0 9F 92 A9
    // In UTF-16, it is \uD83D\uDCA9 (2 code units)
    const str = "a💩b";

    // 'a' at 0 -> 0
    assertEquals(byteIndexToCharIndex(str, 0), 0);

    // 💩 starts at byte 1. Char index 1.
    assertEquals(byteIndexToCharIndex(str, 1), 1);

    // 'b' starts at byte 1+4 = 5.
    // In chars: 'a' (1) + 💩 (2) = 3.
    assertEquals(byteIndexToCharIndex(str, 5), 3);

    // End at 6 bytes -> 4 chars
    assertEquals(byteIndexToCharIndex(str, 6), 4);
  });
});
