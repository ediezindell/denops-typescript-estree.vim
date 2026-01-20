## 2025-01-20 - Batching in Denops
**Learning:** `matchaddpos` in Vim has a hard limit of 8 items, and iterative RPC calls in Denops are expensive. Neovim's `extmarks` offer a superior, unlimited API that can be batched efficiently.
**Action:** Always prefer `extmarks` for Neovim highlighting. For Vim/Denops compatibility, use batched `matchaddpos` calls and handle the chunking manually. Use `collect` instead of `batch` when return values (like match IDs) are needed.
