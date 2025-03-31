# about

# setting example

## for Lazy.nvim

```lua
---@type LazySpec
local spec = {
  "ediezindell/denops-typescript-estree.vim",
  ft = {
    "javascript",
    "javascriptreact",
    "javascript.jsx",
    "typescript",
    "typescriptreact",
    "typescript.tsx",
    "astro",
  },
  dependencies = {
    "vim-denops/denops.vim",
  },
  keys = {
    { "<space>h", "<Cmd>TSESTreeHighlight<CR>",               desc = "highlight selector" },
    { "<space>d", "<Cmd>TSESTreeHighlightResetHighlight<CR>", desc = "reset highlight" },
  },
  init = function()
    vim.api.nvim_create_autocmd({
      "TextChanged",
      "TextChangedI",
    }, {
      command = "TSESTreeReHighlight",
      pattern = "*.{js,jsx,ts,tsx,astro}",
      group = vim.api.nvim_create_augroup("ReHighlight", { clear = true }),
    })
  end,
}
return spec
```
