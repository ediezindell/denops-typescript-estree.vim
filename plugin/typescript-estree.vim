" typescript-estree.vim - AST manipulation for JavaScript/TypeScript
" Author: ediezindell
" License: Same terms as Vim itself

if exists('g:loaded_typescript_estree')
  finish
endif
let g:loaded_typescript_estree = 1

" Check requirements
if !has('nvim-0.8.0')
  echohl ErrorMsg
  echomsg 'typescript-estree.vim requires Neovim 0.8.0 or later'
  echohl None
  finish
endif

if !executable('deno')
  echohl ErrorMsg
  echomsg 'typescript-estree.vim requires Deno to be installed'
  echohl None
  finish
endif

" Plugin will be loaded by denops when needed
" Commands are registered in the main.ts file

" Help tags generation
if exists(':helptags')
  silent! helptags ALL
endif