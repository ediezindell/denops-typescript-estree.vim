## 2025-05-20 - [Debouncing AST Updates]
**Learning:** High-frequency events like `TextChangedI` trigger expensive AST parsing and querying operations.
**Action:** Always debounce event handlers that trigger expensive computations, especially those bound to text changes.

## 2025-05-20 - [Optimizing RPC with Caching]
**Learning:** Frequent RPC calls to fetch buffer content for AST parsing are expensive.
**Action:** Use `changedtick` to validate cache invalidation instead of fetching content every time, especially for operations that might be triggered frequently or redundantly.

## 2025-05-22 - Optimizing buffer access in Denops
**Learning:** In Denops plugins, fetching buffer content (`getbufline`) is expensive due to RPC overhead and data transfer. Caching buffer content alongside ASTs using `changedtick` allows verifying cache validity cheaply (one integer RPC) and avoiding large transfers.
**Action:** When working with Denops, always look for opportunities to cache buffer state using `changedtick`, especially for operations that read the whole buffer.
