// deno-lint-ignore-file no-import-prefix no-unversioned-import
import { assertEquals, assertThrows } from "jsr:@std/assert";
import {
  byteIndexToCharIndex,
  getCharIndexFromLineCol,
  getCurrentBufAst,
  getCurrentBufCode,
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

Deno.test("getCharIndexFromLineCol", async (t) => {
  await t.step("Single line", () => {
    const code = "hello world";
    // line 1, col 1 ('h') -> 0
    assertEquals(getCharIndexFromLineCol(code, 1, 1), 0);
    // line 1, col 7 ('w') -> 6
    assertEquals(getCharIndexFromLineCol(code, 1, 7), 6);
  });

  await t.step("Multiple lines", () => {
    const code = "foo\nbar\nbaz";
    // line 1: foo (3 chars) + \n (1) = 4
    // line 2: bar (3 chars) + \n (1) = 4
    // line 3: baz

    // line 1, col 1 ('f') -> 0
    assertEquals(getCharIndexFromLineCol(code, 1, 1), 0);

    // line 2, col 1 ('b') -> 4
    assertEquals(getCharIndexFromLineCol(code, 2, 1), 4);

    // line 3, col 2 ('a') -> 4 + 4 + 1 = 9
    assertEquals(getCharIndexFromLineCol(code, 3, 2), 9);
  });

  await t.step("With multibyte characters", () => {
    // '★' is 3 bytes (U+2605)
    const code = "a\n★b";
    // line 1: 'a' (1) + \n (1) = 2 chars
    // line 2 starts at index 2.

    // line 2, col 1 ('★') -> 2
    assertEquals(getCharIndexFromLineCol(code, 2, 1), 2);

    // line 2, col 4 ('b') -> 1 + 3 bytes = 4 bytes.
    // char index: 2 (start) + 1 (byteIndexToCharIndex('★b', 3) = 1 char offset) = 3
    assertEquals(getCharIndexFromLineCol(code, 2, 4), 3);
  });

  await t.step("Out of bounds line", () => {
    const code = "foo\nbar";
    assertThrows(() => {
      getCharIndexFromLineCol(code, 3, 1);
    }, Error, "Line number 3 out of bounds");
  });
});
