# Gotchas & Pitfalls

Things to watch out for in this codebase.

## [2026-02-03 07:51]
Project has two parallel file structures: root-level static files (./index.html, ./css/, ./js/) that are NOT served, and Express server files (src/views/, src/public/) that ARE served. Always modify src/views/*.pug for HTML, src/public/css/style.css for CSS, and src/public/js/client.js for JavaScript.

_Context: Discovered during subtask-4-2 manual verification when transit boxes didn't appear despite all tests passing. Server renders Pug templates from src/views/index.pug and serves static assets from src/public/. The root-level files appear to be legacy/test files._
