# denops-typescript-estree.vim

A Neovim plugin that provides AST (Abstract Syntax Tree) manipulation, search,
and highlighting capabilities using the same parser as ESLint
(@typescript-eslint/typescript-estree).

## Features

- 🔍 **AST Search & Highlight**: Search and highlight AST nodes using ESQuery
  selectors
- 🎯 **Cursor Inspection**: Inspect AST nodes at cursor position
- 🚀 **Navigation**: Navigate between matching nodes
- 📝 **Multi-language Support**: JavaScript, TypeScript, JSX, TSX, and Astro
  files
- ⚡ **Real-time Updates**: Automatic re-highlighting on text changes

## Installation

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
  config = function()
    vim.api.nvim_create_autocmd({
      "BufEnter",
      "TextChanged",
      "TextChangedI",
    }, {
      command = "TSESTreeReHighlight",
      pattern = "*.{js,jsx,ts,tsx,astro}",
      group = vim.api.nvim_create_augroup("TSESTreeReHighlight", { clear = true }),
    })
  end,
}
return spec
```

## Commands

| Command                   | Description                                                      |
| ------------------------- | ---------------------------------------------------------------- |
| `:TSESTreeHighlight`      | Prompt for ESQuery selector and highlight matching nodes         |
| `:TSESTreeReHighlight`    | Re-highlight using the last selector (useful after text changes) |
| `:TSESTreeResetHighlight` | Clear all highlights                                             |
| `:TSESTreeFocusPrev`      | Navigate to previous matching node                               |
| `:TSESTreeFocusNext`      | Navigate to next matching node                                   |
| `:TSESTreeInspect`        | Show AST node information at cursor position                     |

## Usage Examples

### Basic AST Node Selection

```vim
" Highlight all function declarations
:TSESTreeHighlight
" Enter: FunctionDeclaration

" Highlight all variable declarations
:TSESTreeHighlight
" Enter: VariableDeclaration

" Highlight all identifiers
:TSESTreeHighlight
" Enter: Identifier
```

### Advanced ESQuery Selectors

```vim
" Highlight function calls
:TSESTreeHighlight
" Enter: CallExpression

" Highlight arrow functions
:TSESTreeHighlight
" Enter: ArrowFunctionExpression

" Highlight async functions
:TSESTreeHighlight
" Enter: FunctionDeclaration[async=true]

" Highlight exported functions
:TSESTreeHighlight
" Enter: ExportNamedDeclaration > FunctionDeclaration

" Highlight console.log calls
:TSESTreeHighlight
" Enter: CallExpression[callee.object.name="console"][callee.property.name="log"]

" Highlight all string literals
:TSESTreeHighlight
" Enter: Literal[typeof="string"]

" Highlight JSX elements
:TSESTreeHighlight
" Enter: JSXElement

" Highlight React hooks (functions starting with 'use')
:TSESTreeHighlight
" Enter: CallExpression[callee.name=/^use/]
```

### TypeScript Specific Selectors

```vim
" Highlight interface declarations
:TSESTreeHighlight
" Enter: TSInterfaceDeclaration

" Highlight type aliases
:TSESTreeHighlight
" Enter: TSTypeAliasDeclaration

" Highlight generic functions
:TSESTreeHighlight
" Enter: FunctionDeclaration[typeParameters]

" Highlight optional properties
:TSESTreeHighlight
" Enter: TSPropertySignature[optional=true]
```

### Navigation Workflow

1. Use `:TSESTreeHighlight` to highlight nodes of interest
2. Use `:TSESTreeFocusNext` and `:TSESTreeFocusPrev` to navigate between matches
3. Use `:TSESTreeInspect` to get detailed information about the node at cursor
4. Use `:TSESTreeReHighlight` after making changes to update highlights

## ESQuery Selector Reference

ESQuery uses CSS-like selectors to query AST nodes. Here are some common
patterns:

### Basic Selectors

- `FunctionDeclaration` - Select all function declarations
- `VariableDeclaration` - Select all variable declarations
- `Identifier` - Select all identifiers
- `CallExpression` - Select all function calls

### Attribute Selectors

- `[name="foo"]` - Nodes with name property equal to "foo"
- `[async=true]` - Nodes with async property set to true
- `[name*="test"]` - Nodes with name containing "test"
- `[name^="use"]` - Nodes with name starting with "use"
- `[name$="Hook"]` - Nodes with name ending with "Hook"

### Combinators

- `A > B` - B is a direct child of A
- `A B` - B is a descendant of A
- `A + B` - B immediately follows A
- `A ~ B` - B follows A (not necessarily immediately)

### Pseudo-selectors

- `:first-child` - First child node
- `:last-child` - Last child node
- `:nth-child(n)` - nth child node
- `:has(selector)` - Nodes that contain matching descendants

### Common AST Node Types

#### JavaScript/TypeScript

- `Program` - Root node
- `FunctionDeclaration` - Function declarations
- `ArrowFunctionExpression` - Arrow functions
- `VariableDeclaration` - Variable declarations
- `CallExpression` - Function calls
- `MemberExpression` - Property access (obj.prop)
- `BinaryExpression` - Binary operations (+, -, etc.)
- `IfStatement` - If statements
- `ForStatement` - For loops
- `ReturnStatement` - Return statements

#### TypeScript Specific

- `TSInterfaceDeclaration` - Interface declarations
- `TSTypeAliasDeclaration` - Type aliases
- `TSEnumDeclaration` - Enum declarations
- `TSModuleDeclaration` - Module declarations

#### JSX/React

- `JSXElement` - JSX elements
- `JSXAttribute` - JSX attributes
- `JSXExpressionContainer` - JSX expressions

## Tips

1. **Start Simple**: Begin with basic node types like `FunctionDeclaration` or
   `Identifier`
2. **Use Inspection**: Use `:TSESTreeInspect` to understand the AST structure
3. **Combine Selectors**: Use combinators to create more specific queries
4. **Save Common Selectors**: Create key mappings for frequently used selectors
5. **Real-time Updates**: The autocmd setup ensures highlights update as you
   type

## Troubleshooting

### No Matches Found

- Check if the file type is supported (js, ts, jsx, tsx, astro)
- Verify the selector syntax using ESQuery documentation
- Use `:TSESTreeInspect` to understand the AST structure

### Highlights Not Updating

- Ensure the autocmd is set up correctly
- Manually run `:TSESTreeReHighlight` to refresh

### Parse Errors

- Check for syntax errors in your code
- The plugin will show warnings for unparseable files

## Advanced Usage Examples

### Code Refactoring Workflows

```vim
" Find all TODO comments in code
:TSESTreeHighlight
" Enter: Comment[value*="TODO"]

" Find all deprecated function calls
:TSESTreeHighlight
" Enter: CallExpression[callee.name="deprecatedFunction"]

" Find all unused variables (basic detection)
:TSESTreeHighlight
" Enter: VariableDeclarator[id.name]:not(:has(~ * Identifier[name=attr(id.name)]))

" Find all magic numbers (numeric literals not 0 or 1)
:TSESTreeHighlight
" Enter: Literal[typeof="number"]:not([value=0]):not([value=1])
```

### React/JSX Development

```vim
" Find components with missing key props in lists
:TSESTreeHighlight
" Enter: JSXElement:has(JSXAttribute[name.name="map"]) JSXElement:not(:has(JSXAttribute[name.name="key"]))

" Find inline styles (should be extracted to CSS)
:TSESTreeHighlight
" Enter: JSXAttribute[name.name="style"]

" Find components using deprecated lifecycle methods
:TSESTreeHighlight
" Enter: MethodDefinition[key.name="componentWillMount"]

" Find useState hooks
:TSESTreeHighlight
" Enter: CallExpression[callee.name="useState"]

" Find useEffect hooks with empty dependency arrays
:TSESTreeHighlight
" Enter: CallExpression[callee.name="useEffect"][arguments.1.type="ArrayExpression"][arguments.1.elements.length=0]
```

### TypeScript Code Quality

```vim
" Find any types (should be specific types)
:TSESTreeHighlight
" Enter: TSAnyKeyword

" Find non-null assertions (potentially unsafe)
:TSESTreeHighlight
" Enter: TSNonNullExpression

" Find type assertions (should be avoided when possible)
:TSESTreeHighlight
" Enter: TSTypeAssertion, TSAsExpression

" Find empty interfaces (should extend or be type aliases)
:TSESTreeHighlight
" Enter: TSInterfaceDeclaration[body.body.length=0]

" Find functions without return type annotations
:TSESTreeHighlight
" Enter: FunctionDeclaration:not([returnType])
```

### Performance and Best Practices

```vim
" Find console.log statements (should be removed in production)
:TSESTreeHighlight
" Enter: CallExpression[callee.object.name="console"]

" Find eval usage (security risk)
:TSESTreeHighlight
" Enter: CallExpression[callee.name="eval"]

" Find == instead of === (loose equality)
:TSESTreeHighlight
" Enter: BinaryExpression[operator="=="], BinaryExpression[operator="!="]

" Find var declarations (should use let/const)
:TSESTreeHighlight
" Enter: VariableDeclaration[kind="var"]

" Find function declarations inside blocks (hoisting issues)
:TSESTreeHighlight
" Enter: BlockStatement FunctionDeclaration
```

## Custom Key Mappings

Add these to your Neovim configuration for faster access:

```lua
-- Quick selectors for common patterns
vim.keymap.set('n', '<leader>af', function()
  vim.cmd('TSESTreeHighlight')
  vim.fn.feedkeys('FunctionDeclaration\n')
end, { desc = 'Highlight functions' })

vim.keymap.set('n', '<leader>av', function()
  vim.cmd('TSESTreeHighlight')
  vim.fn.feedkeys('VariableDeclaration\n')
end, { desc = 'Highlight variables' })

vim.keymap.set('n', '<leader>ac', function()
  vim.cmd('TSESTreeHighlight')
  vim.fn.feedkeys('CallExpression\n')
end, { desc = 'Highlight function calls' })

vim.keymap.set('n', '<leader>ai', function()
  vim.cmd('TSESTreeHighlight')
  vim.fn.feedkeys('TSInterfaceDeclaration\n')
end, { desc = 'Highlight interfaces' })

-- Navigation shortcuts
vim.keymap.set('n', '<leader>an', '<Cmd>TSESTreeFocusNext<CR>', { desc = 'Next AST match' })
vim.keymap.set('n', '<leader>ap', '<Cmd>TSESTreeFocusPrev<CR>', { desc = 'Previous AST match' })
vim.keymap.set('n', '<leader>ar', '<Cmd>TSESTreeReHighlight<CR>', { desc = 'Re-highlight AST' })
vim.keymap.set('n', '<leader>ax', '<Cmd>TSESTreeResetHighlight<CR>', { desc = 'Clear AST highlights' })
vim.keymap.set('n', '<leader>as', '<Cmd>TSESTreeInspect<CR>', { desc = 'Inspect AST at cursor' })
```

## Integration with Other Tools

### With Telescope (fuzzy finder)

```lua
-- Create a custom Telescope picker for common selectors
local function ast_selector_picker()
  local pickers = require('telescope.pickers')
  local finders = require('telescope.finders')
  local conf = require('telescope.config').values
  local actions = require('telescope.actions')
  local action_state = require('telescope.actions.state')

  local selectors = {
    { 'Functions', 'FunctionDeclaration' },
    { 'Arrow Functions', 'ArrowFunctionExpression' },
    { 'Variables', 'VariableDeclaration' },
    { 'Function Calls', 'CallExpression' },
    { 'Interfaces', 'TSInterfaceDeclaration' },
    { 'Type Aliases', 'TSTypeAliasDeclaration' },
    { 'JSX Elements', 'JSXElement' },
    { 'Console Logs', 'CallExpression[callee.object.name="console"]' },
    { 'React Hooks', 'CallExpression[callee.name=/^use/]' },
    { 'Async Functions', 'FunctionDeclaration[async=true]' },
  }

  pickers.new({}, {
    prompt_title = 'AST Selectors',
    finder = finders.new_table({
      results = selectors,
      entry_maker = function(entry)
        return {
          value = entry,
          display = entry[1],
          ordinal = entry[1],
        }
      end,
    }),
    sorter = conf.generic_sorter({}),
    attach_mappings = function(prompt_bufnr, map)
      actions.select_default:replace(function()
        actions.close(prompt_bufnr)
        local selection = action_state.get_selected_entry()
        vim.cmd('TSESTreeResetHighlight')
        vim.cmd('TSESTreeHighlight')
        vim.fn.feedkeys(selection.value[2] .. '\n')
      end)
      return true
    end,
  }):find()
end

vim.keymap.set('n', '<leader>at', ast_selector_picker, { desc = 'AST Telescope picker' })
```

### With Which-key (key binding helper)

```lua
local wk = require('which-key')
wk.register({
  a = {
    name = 'AST Operations',
    f = { '<Cmd>TSESTreeHighlight<CR>', 'Highlight AST nodes' },
    r = { '<Cmd>TSESTreeReHighlight<CR>', 'Re-highlight' },
    x = { '<Cmd>TSESTreeResetHighlight<CR>', 'Clear highlights' },
    s = { '<Cmd>TSESTreeInspect<CR>', 'Inspect at cursor' },
    n = { '<Cmd>TSESTreeFocusNext<CR>', 'Next match' },
    p = { '<Cmd>TSESTreeFocusPrev<CR>', 'Previous match' },
  },
}, { prefix = '<leader>' })
```

## Performance Considerations

- **Large Files**: The plugin performs well on files up to ~10,000 lines. For
  larger files, consider using more specific selectors.
- **Complex Selectors**: Very complex selectors with multiple combinators may be
  slower. Start simple and add complexity as needed.
- **Real-time Updates**: The autocmd for re-highlighting can be disabled for
  very large files if performance is an issue.

## ESQuery Resources

- [ESQuery Documentation](https://github.com/estools/esquery)
- [AST Explorer](https://astexplorer.net/) - Visualize AST structure
- [TypeScript ESLint AST Spec](https://typescript-eslint.io/packages/types/) -
  Complete AST node reference

## Changelog

### v1.0.0

- Initial release with basic AST highlighting and navigation
- Support for JavaScript, TypeScript, JSX, TSX, and Astro
- ESQuery selector support
- Real-time highlighting updates

## Contributing

Feel free to open issues or submit pull requests to improve the plugin!

### Development Setup

```bash
git clone https://github.com/ediezindell/denops-typescript-estree.vim
cd denops-typescript-estree.vim
deno check denops/typescript-estree/main.ts
```

### Adding New Features

1. Fork the repository
2. Create a feature branch
3. Add your changes with proper error handling
4. Update documentation
5. Submit a pull request
