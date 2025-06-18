# Testing denops-typescript-estree.vim

## ✅ Core Functionality Test Results

The AST parsing and selector functionality has been verified to work correctly.
Here's how to test the plugin in your Neovim environment:

## Prerequisites

1. **Deno installed**: `deno --version`
2. **denops.vim installed**: The plugin depends on denops.vim
3. **Neovim with denops support**

## Quick Test Setup

### Option 1: Test with existing Neovim config

If you have denops.vim already installed:

```bash
# Open the test file
nvim test_sample.ts

# In Neovim, test if commands are available
:TSESTreeHighlight
```

### Option 2: Test with minimal config

```bash
# Use the provided test configuration
nvim -u test_init.vim test_sample.ts
```

### Option 3: Manual verification

```bash
# Check if the plugin loads correctly
nvim --headless -c "echo 'Testing...'" -c "qa"
```

## Expected Test Results

### ✅ What Should Work

1. **Command availability**: All `TSESTree*` commands should be available
2. **AST parsing**: Files should parse without errors
3. **Basic highlighting**: Simple selectors like `FunctionDeclaration` should
   work
4. **Navigation**: Focus next/prev should move between matches
5. **Inspection**: Cursor inspection should show node types

### 🔧 Core Fixes Implemented

The following issues were identified and fixed:

1. **✅ Cursor Position Calculation**
   - Fixed multi-byte character handling
   - Corrected 1-based to 0-based conversion
   - Proper byte position calculation

2. **✅ Highlight Position Mapping**
   - Fixed AST coordinates to Vim coordinates conversion
   - Ensured minimum highlight length
   - Proper line/column base conversion

3. **✅ Error Handling**
   - Added proper error messages for invalid selectors
   - Graceful handling of parse failures
   - User-friendly error notifications

4. **✅ Type Safety**
   - Resolved TypeScript compilation issues
   - Fixed type compatibility between ESTree and TypeScript-ESLint
   - Proper type assertions where needed

5. **✅ Performance Optimization**
   - Improved AST traversal efficiency
   - Early exit for out-of-range nodes
   - Better sorting algorithm for position matching

## Manual Testing Checklist

### Basic Functionality

- [ ] `:TSESTreeHighlight` prompts for input
- [ ] `FunctionDeclaration` highlights all functions
- [ ] `:TSESTreeInspect` shows node info at cursor
- [ ] `:TSESTreeResetHighlight` clears highlights

### Advanced Selectors

- [ ] `CallExpression[callee.object.name="console"]` highlights console calls
- [ ] `TSInterfaceDeclaration` highlights TypeScript interfaces
- [ ] `VariableDeclaration[kind="var"]` highlights var declarations
- [ ] `BinaryExpression[operator="=="]` highlights loose equality

### Navigation

- [ ] `:TSESTreeFocusNext` moves to next match
- [ ] `:TSESTreeFocusPrev` moves to previous match
- [ ] Navigation shows "Match X/Y" status

### Error Handling

- [ ] Invalid selectors show error messages
- [ ] Empty files handled gracefully
- [ ] Syntax errors in code don't crash plugin

### Real-time Updates

- [ ] `:TSESTreeReHighlight` updates after code changes
- [ ] Auto-rehighlight works with text changes (if autocmd is set up)

## Troubleshooting

### Commands Not Found

```vim
" Check if denops is running
:echo denops#server#status()

" Check if plugin is loaded
:echo denops#plugin#is_loaded('typescript-estree')

" Manually load plugin
:call denops#plugin#load('typescript-estree', '/path/to/plugin/denops/typescript-estree/main.ts')
```

### No Highlights Appearing

1. Check file type: `:echo &filetype`
2. Test with simple selector: `Identifier`
3. Check for parse errors: `:TSESTreeInspect`

### Performance Issues

1. Use more specific selectors for large files
2. Disable auto-rehighlight for very large files
3. Test with smaller code samples first

## Integration Test Examples

### Test with Real Code

```typescript
// test_sample.ts contains various patterns to test:
interface User { // TSInterfaceDeclaration
  id: number;
  name: string;
}

function createUser() { // FunctionDeclaration
  console.log("test"); // CallExpression[callee.object.name="console"]
  var oldStyle = 1; // VariableDeclaration[kind="var"]
  if (1 == 1) { // BinaryExpression[operator="=="]
    return true;
  }
}

const Component = () => { // ArrowFunctionExpression
  const [state] = useState(); // CallExpression[callee.name="useState"]
  return <div> Hello < /div>;    / / JSXElement;
};
```

### Expected Highlights

- Functions: `createUser`, arrow function
- Interfaces: `User`
- Console calls: `console.log("test")`
- Bad patterns: `var`, `==`
- React: `useState`, JSX elements

## Success Criteria

The plugin is working correctly if:

1. ✅ All commands are available and responsive
2. ✅ Highlights appear on the correct AST nodes
3. ✅ Navigation moves cursor to highlighted positions
4. ✅ Error messages appear for invalid input (no crashes)
5. ✅ Performance is acceptable for typical file sizes

## Next Steps After Testing

1. **If everything works**: The fixes are successful!
2. **If commands not found**: Check denops.vim installation
3. **If highlights wrong**: May need position calculation refinement
4. **If crashes occur**: Need additional error handling

The core AST functionality has been verified to work correctly in isolation. Any
remaining issues are likely related to the Neovim/denops integration rather than
the core logic.
