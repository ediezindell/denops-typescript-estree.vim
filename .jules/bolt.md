## 2025-05-20 - [Debouncing AST Updates]
**Learning:** High-frequency events like `TextChangedI` trigger expensive AST parsing and querying operations.
**Action:** Always debounce event handlers that trigger expensive computations, especially those bound to text changes.

## 2025-05-20 - [Optimizing RPC with Caching]
**Learning:** Frequent RPC calls to fetch buffer content for AST parsing are expensive.
**Action:** Use `changedtick` to validate cache invalidation instead of fetching content every time, especially for operations that might be triggered frequently or redundantly.
