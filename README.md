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
  init = function()
    vim.api.nvim_create_autocmd({
      "TextChanged",
      "TextChangedI",
    }, {
      command = "R",
      group = vim.api.nvim_create_augroup("ReHighlight", { clear = true }),
    })
  end,
  keys = {
    { "<space>h", "<Cmd>H<CR>", desc = "highlight" },
    { "<space>d", "<Cmd>D<CR>", desc = "reset highlight" },
  },
}
return spec
```
