# Change Log

All notable changes to the "jaiva" extension will be documented in this file.

(MAJOR version is dependant on the current MAJOR version of Jaiva)

## 1.0.0

- Initial release

## 2.0.0

- Add support for `tsea` keyword
- Match new token types for Jaiva release 1.0.0
- Fix some operators finally.

## 5.0.3

- Revamp the entire extension
- Remove indexing of all jaiva files. only the one youre open on once you save will index
- Revamp colouring to be more consistent
    - `tsea` strings are different colours
    - blocks are now properly handled and scoped by the IDE
- Change dynamic snippets to all be static in a JSON file.
    - Add all missing support from v2 to v5 snippets and highlighting, which include:
        - Variadic Arguments, Array Spreading, Lambdas, Array Length, Functional Argument Syntax, Ternary Syntax, Cima Syntax
        - The rest of `jaiva/arrays`, `jaiva/math`
        - The newer utils such as `jaiva/math/utils`, `jaiva/file`, `jaiva/time`, `jaiva/time/zone`, `jaiva/types`, `jaiva/debug`
- Store built in libraries in a json
- Add tokenizer errors
- Fix multiple extension freezing problems (by having a single CLI isntance)
- Fix stupid types in da typescript
- Bump alot of versions in da package.json
