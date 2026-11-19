# TPL-0001: Hosting modes

- **Status:** Accepted
- **Decides:** The template has two hosting modes, `managed` and `self-hosted`, and one rule draws the line to sovereign-platform-template.

## Context

Some products of the size of this template must run on a machine that they own. The app, the data, and the ADRs of the product stay the same. Only the delivery differs.

[sovereign-platform-template](https://github.com/tabmadi/sovereign-platform-template) is self-hosted too, on Kubernetes with many services. A product of one deployable pays for a platform there that it does not need.

The drivers:

1. **No drift.** A fix to the app, the docs, or the toolchain reaches every self-hosted project and every managed one.
2. **The right size.** A product of one deployable runs nothing that it does not need.
3. **A clear line.** A reader knows which template to start from with one question.

## Considered options

| Option | 1 No drift | 2 The right size | 3 A clear line | Verdict |
| --- | --- | --- | --- | --- |
| A third template for one self-hosted machine | No. It copies most of this template, and the copies drift | Yes | Yes | Rejected on driver 1 |
| Self-hosted projects start from sovereign-platform-template | Yes | No. One deployable runs on a Kubernetes platform | Yes | Rejected on driver 2 |
| **A hosting mode of this template** | **Yes. One template holds both modes, and only `infra/` differs** | **Yes. One machine, two microVMs, and no orchestrator** | **Yes. The boundary rule below** | **Chosen** |

Sources:

- Copied code drifts, and a fix in one copy never reaches the others: [blueprints README, keeping the copies in sync](https://github.com/tabmadi/blueprints#keeping-the-copies-in-sync).
- sovereign-platform-template sets its modes with the same pattern: [its setup modes](https://github.com/tabmadi/sovereign-platform-template/blob/master/docs/reference/modes.md).

## Decision

**The `hosting` answer decides whether `infra/` exists.**

| Answer | `nix flake new -t` | `just init` | Keeps |
| --- | --- | --- | --- |
| `managed`, the default | `github:tabmadi/nextjs-mvp-template` | `just init managed` | No `infra/`. A provider runs the image |
| `self-hosted` | `github:tabmadi/nextjs-mvp-template#self-hosted` | `just init self-hosted` | `infra/`, the host on NixOS of ADR-0201 |

`template/scope.nix` sets both outputs through the `exclude` and `variants` options of the template module of tabnix. `flake.nix` loads `infra/flake-module.nix` only when it exists, so the rest of a project is the same in both modes.

**The boundary rule.** One machine without an orchestrator is the self-hosted mode of this template. More than one machine, or Kubernetes, is sovereign-platform-template.

## Consequences

The project ADRs describe both modes. ADR-0201 holds the self-hosted mode, and it states that a project without `infra/` runs on a provider.

A change to `infra/` reaches only new projects in the self-hosted mode, and the projects that update from the template.

## Rules

- The template has two outputs: `default` without `infra/`, and `self-hosted` with it.
- `just init` asks for the hosting mode and removes `infra/` for `managed`.
- One machine without an orchestrator is this template. More than one machine, or Kubernetes, is sovereign-platform-template.
