## 2025-05-20 - [Debouncing AST Updates]
**Learning:** High-frequency events like `TextChangedI` trigger expensive AST parsing and querying operations.
**Action:** Always debounce event handlers that trigger expensive computations, especially those bound to text changes.

## 2025-05-20 - [Efficient Highlighting in Denops]
**Learning:** `matchaddpos` is inefficient and limited (chunks of 8) for high-volume highlighting. Neovim's `extmarks` combined with `denops.batch` avoids RPC overhead and rendering limits.
**Action:** Prefer `nvim_buf_set_extmark` with `denops.batch` for Neovim backends; use `matchaddpos` only as a Vim fallback.
