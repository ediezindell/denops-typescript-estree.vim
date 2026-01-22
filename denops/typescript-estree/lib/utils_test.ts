// deno-lint-ignore-file no-import-prefix no-unversioned-import
import { assert, assertEquals } from "jsr:@std/assert";
import {
  byteIndexToCharIndex,
  getCurrentBufAst,
  getCurrentBufCode,
  getLineStartIndices,
} from "./utils.ts";
import type { Denops } from "jsr:@denops/std";

Deno.test("getCurrentBufAst caches AST based on changedtick", async () => {
  let getBufLineCallCount = 0;
  let currentTick = 100;

  const handleCall = (name: string, ...args: unknown[]) => {
    if (name === "bufnr") return 1;
    if (name === "getbufline") {
      getBufLineCallCount++;
      return ["const a = 1;"];
    }
    if (name === "getbufvar") {
      // args[0] is bufnr or "%", args[1] is varname
      if (args[1] === "changedtick") {
        return currentTick;
      }
    }
    return null;
  };

  const mockDenops = {
    name: "mock-denops",
    call: handleCall,
    cmd: (_cmd: string) => Promise.resolve(),
    eval: (_expr: string) => Promise.resolve(),
    batch: (...calls: [string, ...unknown[]][]) => {
      return Promise.all(calls.map(([name, ...args]) => handleCall(name, ...args)));
    },
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

  const handleCall = (name: string, ...args: unknown[]) => {
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
  };

  const mockDenops = {
    name: "mock-denops",
    call: handleCall,
    cmd: (_cmd: string) => Promise.resolve(),
    eval: (_expr: string) => Promise.resolve(),
    batch: (...calls: [string, ...unknown[]][]) => {
      return Promise.all(calls.map(([name, ...args]) => handleCall(name, ...args)));
    },
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

Deno.test("getLineStartIndices returns correct indices", async () => {
  let getBufLineCallCount = 0;
  const currentTick = 300;

  const handleCall = (name: string, ...args: unknown[]) => {
    if (name === "bufnr") return 1;
    if (name === "getbufline") {
      getBufLineCallCount++;
      return ["line1", "line2", "line3"];
    }
    if (name === "getbufvar") {
      if (args[1] === "changedtick") {
        return currentTick;
      }
    }
    return null;
  };

  const mockDenops = {
    name: "mock-denops",
    call: handleCall,
    cmd: (_cmd: string) => Promise.resolve(),
    eval: (_expr: string) => Promise.resolve(),
    batch: (...calls: [string, ...unknown[]][]) => {
      return Promise.all(
        calls.map(([name, ...args]) => handleCall(name, ...args)),
      );
    },
  } as unknown as Denops;

  const indices = await getLineStartIndices(mockDenops);
  // line1 (5) + \n (1) = 6
  // line2 (5) + \n (1) = 6
  // line3 (5)
  // Indices:
  // line1: 0
  // line2: 0 + 6 = 6
  // line3: 6 + 6 = 12
  assertEquals(indices, [0, 6, 12]);
  assertEquals(getBufLineCallCount, 1);

  // Test cache usage
  await getLineStartIndices(mockDenops);
  assertEquals(getBufLineCallCount, 1);
});

Deno.test("getCurrentBufCode populates cache for getCurrentBufAst", async () => {
  let getBufLineCallCount = 0;
  const currentTick = 400;

  const handleCall = (name: string, ...args: unknown[]) => {
    if (name === "bufnr") return 1;
    if (name === "getbufline") {
      getBufLineCallCount++;
      return ["const c = 3;"];
    }
    if (name === "getbufvar") {
      if (args[1] === "changedtick") {
        return currentTick;
      }
    }
    return null;
  };

  const mockDenops = {
    name: "mock-denops",
    call: handleCall,
    cmd: (_cmd: string) => Promise.resolve(),
    eval: (_expr: string) => Promise.resolve(),
    batch: (...calls: [string, ...unknown[]][]) => {
      return Promise.all(
        calls.map(([name, ...args]) => handleCall(name, ...args)),
      );
    },
  } as unknown as Denops;

  // 1. call getCurrentBufCode first
  await getCurrentBufCode(mockDenops);
  assertEquals(getBufLineCallCount, 1);

  // 2. call getCurrentBufAst
  // Should use cached code and parse AST without fetching buffer again
  const ast = await getCurrentBufAst(mockDenops);
  assertEquals(getBufLineCallCount, 1, "Should reuse code from cache");
  assert(ast !== null);
});
