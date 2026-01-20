## 2025-05-20 - [Debouncing AST Updates]
**Learning:** High-frequency events like `TextChangedI` trigger expensive AST parsing and querying operations.
**Action:** Always debounce event handlers that trigger expensive computations, especially those bound to text changes.
