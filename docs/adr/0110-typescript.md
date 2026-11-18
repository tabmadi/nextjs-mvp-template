# ADR-0110: TypeScript

- **Status:** Accepted
- **Decides:** Node.js runs Next.js, Bun installs and tests, Biome lints and formats, and bun2nix gives Nix the locked dependencies.

## Context

The shared toolchain of [ADR-0100](0100-toolchain.md) holds no language. This ADR adds the tools of TypeScript and Next.js: the runtime, the package manager and the test runner, the linter and the formatter, and how Nix gets the dependencies of `bun.lock`.

## Decision drivers

1. **The documented runtime.** Production runs Next.js on the runtime that Next.js documents and tests.
2. **Fast loop.** Install and tests take seconds.
3. **Few tools.** One tool for several jobs where it can.
4. **Stable.** The tool has a stable release.
5. **Pinned.** The tool comes from `nixpkgs`, and a build gets the locked dependencies without network.

## Considered options

### The runtime of Next.js

| Option | 1 The documented runtime | Verdict |
| --- | --- | --- |
| Bun | No. Next.js documents Node.js. A pilot measured Bun 1.3 fail to load the Next.js 16.3 runtime, and Bun 1.4 load it | Rejected on driver 1 |
| Deno | No | Rejected on driver 1 |
| **Node.js 24** | **Yes** | **Chosen** |

Sources:

- Next.js runs on Node.js: [Next.js deploying](https://nextjs.org/docs/app/getting-started/deploying).
- The measurement of Bun 1.3 and 1.4 is our own, on a private pilot project. It has no public source.

### The package manager and the test runner

| Option | 2 Fast loop | 3 Few tools | Verdict |
| --- | --- | --- | --- |
| npm or pnpm, with Vitest | Slower install | Two tools | Rejected on drivers 2 and 3 |
| **Bun, with `bun:test`** | **Yes** | **One tool** | **Chosen. Tests run on Bun, and the app runs on Node.js** |

Sources:

- [Bun install](https://bun.sh/docs/cli/install), [bun:test](https://bun.sh/docs/cli/test).

### The linter and the formatter

| Option | 3 Few tools | 4 Stable | Verdict |
| --- | --- | --- | --- |
| ESLint with `eslint-config-next`, and Prettier | Two tools, two configs, and a graph of plugins | Yes | Rejected on driver 3 |
| oxlint and oxfmt | Two tools | oxlint 1.0 since June 2025. oxfmt is in beta | Rejected on driver 4 |
| **Biome, with its `next` and `react` domains** | **One tool for TypeScript, JavaScript, and CSS** | **Yes** | **Chosen** |

Sources:

- [Biome domains](https://biomejs.dev/linter/domains/), [Oxlint v1.0 stable](https://oxc.rs/blog/2025-06-10-oxlint-stable), [Oxfmt beta](https://oxc.rs/blog/2026-02-24-oxfmt-beta).

### The dependencies in Nix

| Option | 5 Pinned | Verdict |
| --- | --- | --- |
| A fixed-output derivation that runs `bun install` | One hash for all of `node_modules` | Rejected. The hash tells nothing about what changed |
| **bun2nix, which writes `bun.nix` from `bun.lock`** | **One hash for each package** | **Chosen** |

Sources:

- [bun2nix](https://github.com/nix-community/bun2nix).

## Decision

Node.js runs Next.js in development, in the build, and in production. Bun installs the dependencies, runs the tests, and runs the scripts. The dev shell takes `bun` and `nodejs_24` from `nixpkgs`, and `packageManager` in `package.json` names the same Bun version.

Biome is both the linter and the formatter, for TypeScript, JavaScript, and CSS. Its `next` and `react` domains cover the rules of the framework. dprint keeps JSON, per [ADR-0104](0104-formatters-and-linters.md).

| File type | Formatter |
| --- | --- |
| TypeScript, JavaScript, and CSS | Biome |

Biome reads a config in `.config/` only with `--config-path .config`, and only when the config excludes `.config` from its own files. Biome does not support this layout officially. If a release breaks it, the config moves back to the root.

The `package.json` scripts only call the `just` recipes. A new command is a recipe in `justfile`, not a script.

The build and the checks need the dependencies, and the Nix sandbox has no network. So `bun2nix` writes `bun.nix` from `bun.lock`, and a hook fails when they differ. The fonts come from the `geist` package, because `next/font/google` downloads them at build time.

`next typegen` and `next build` both write `.next/`, so `just check` runs its steps in order.

Sources:

- Biome does not support a config in `.config/`: [biomejs/biome#13263](https://github.com/biomejs/biome/issues/13263).

## Consequences

- The rule set of Biome is narrower than the rule set of ESLint. The `next` domain of Biome covers the Next-specific rules of `eslint-config-next`, but not one for one.
- Next.js generates route types into `.next/types`. So `tsc --noEmit` fails on a clean checkout until `next typegen` runs. `lint-ts` runs it first.
- Tests run on Bun and the app on Node.js. A difference between the two runtimes can pass the tests and fail in production.
- A dependency change also changes `bun.nix`. `just bun-nix` writes it.

## Rules

- Node.js runs Next.js. Bun installs, tests, and runs scripts.
- A Biome rule is disabled by name with a reason in `.config/biome.jsonc`. `(CI: lint-ts)`
- Every Biome call passes `--config-path .config`, and the config excludes `.config` from its files.
- `bun.nix` matches `bun.lock` in every commit.
