# ADR-0602: Behaviour requirements

- **Status:** Accepted
- **Decides:** What the app does is a list of EARS requirements with IDs in `docs/requirements/`, a test cites each ID, and tabkit checks the trace.

## Context

Four questions about the app need a home. An ADR says why the app works as it does. The code and its types give the exact shape of the data. A guide says how a person does a task. The fourth question has no home: what the app does. Examples are which actor gets refused, and what a rejected form leaves behind.

That answer lives in handler code, in test names, and in the head of the person who wrote them. A human reader and a coding agent both rebuild it from the code before each change. They rebuild it differently, and a change that breaks an unstated rule passes review.

[ADR-0001](0001-documentation-conventions.md) sets the rule for every repo: behaviour is written as requirements, and a test cites each one. This ADR decides where the requirements of this app live, the form of one requirement, and the check of the trace.

## Decision drivers

1. **Checked.** A requirement and its test cannot drift apart without a red build.
2. **One file for every reader.** Humans and coding agents read the same file, in one sentence form that a tool can parse.
3. **One fact, one place.** A requirement does not repeat the reason of an ADR or the shape of the data.
4. **No new runtime.** The check runs with the tools that the repo already pins.
5. **Standing fact only.** The repo holds what is true now, not planned work, per [ADR-0001](0001-documentation-conventions.md).
6. **The same check everywhere.** A repo that gains behaviour gets the check with no copy of a linter.

## Considered options

### The form of a requirement

| Option | 1 Checked | 2 One file | 3 One place | 4 No new runtime | 5 Standing fact | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Gherkin feature files, run by a step runner | Yes. The runner executes each step | Yes | Yes | No. A step layer and a runner that Bun does not ship | Yes | Rejected. It adds a runner and a second test language |
| Spec Kit or Kiro: a spec, a plan, and a task list for each feature | No. The files are prose | Yes | No. The design file repeats the ADRs | Yes | No. The plan and the tasks are planned work | Rejected |
| OpenSpec: a spec folder and a `changes/` folder of proposals | No. The files are prose | Yes | Yes | No. A CLI merges each change | No. A proposal is planned work, and the pull request diff already holds it | Rejected |
| No requirements: the tests are the requirements | Yes | No. A reader rebuilds the rules from many test files | Yes | Yes | Yes | Rejected. A deleted test removes its rule with no trace |
| **EARS sentences with IDs, and a test that cites each ID** | **Yes, with a check of the trace** | **Yes** | **Yes** | **Yes** | **Yes** | **Chosen** |

Sources:

- The EARS patterns: [Alistair Mavin, EARS](https://alistairmavin.com/ears/).
- Kiro commits `requirements.md` in EARS, `design.md`, and `tasks.md`: [Kiro, specs](https://kiro.dev/docs/specs/).
- Spec Kit commits a spec, a plan, and tasks for each feature: [GitHub Spec Kit](https://github.com/github/spec-kit).
- OpenSpec keeps current specs and a folder of change proposals: [OpenSpec](https://github.com/Fission-AI/OpenSpec).
- Bun selects tests by name: [Bun, the test runner](https://bun.sh/docs/cli/test).

### The check of the trace

| Option | 1 Checked | 4 No new runtime | 6 The same check everywhere | Verdict |
| --- | --- | --- | --- | --- |
| A TypeScript port of the Go linter of the platform template, in this repo | Yes | Yes. Bun runs it | No. Each repo with behaviour copies the script | Rejected. The copies drift |
| The Go linter of the platform template | Yes | No. Go joins the dev shell for one check | No. Each repo copies the tool | Rejected |
| **A rule group of tabkit** | **Yes** | **Yes. Every repo already pins tabkit** | **Yes. It reaches every repo through the pin, and it acts only when a requirements file exists** | **Chosen** |

Sources:

- tabkit runs in every repo through its `lint-prose` check: [ADR-0100](0100-toolchain.md).

## Decision

### Where requirements live

`docs/requirements/<module>.md` holds what one module of the app does. A module of this app spans the routes, the domain, the services, and the repositories, so its behaviour has one file outside the code tree. [`docs/requirements/README.md`](../requirements/README.md) lists each file and its prefix.

### The form of a requirement

A requirement is one row of a table: the ID, then one sentence. The sentence uses one EARS pattern, in the present tense:

| Pattern | Form |
| --- | --- |
| Ubiquitous | `The <subject> <response>.` |
| Event | `When <trigger>, the <subject> <response>.` |
| State | `While <state>, the <subject> <response>.` |
| Unwanted | `If <condition>, the <subject> <response>.` |
| Optional | `Where <feature is on>, the <subject> <response>.` |

A requirement states what a user or a caller can observe: a refusal, a stored record, a message, or what a failure leaves behind. It does not restate a column, a type, or the reason of an ADR.

### Identifiers

An ID is the prefix of the file, a hyphen, and three digits: `NOTE-002`. Each file declares its prefix in its header, as `- **Prefix:** NOTE`. A prefix has two to four capital letters, and no two files share one.

An ID names one meaning. A requirement whose meaning changes gets a new number, and the old number is not used again. So a test that cites the old ID fails the check and gets a new review.

### The trace

A test cites a requirement with its ID at the start of the test name: `test("NOTE-002 rejects a blank title", ...)`. A test can cite more than one ID, and more than one test can cite an ID. `bun test --test-name-pattern NOTE-002` runs the proof of one requirement.

The `requirement` rules of tabkit check the trace in both directions, in `just lint-prose` and in CI. Every requirement has a citing test, and every ID that a test cites exists. A requirement with no test is a claim with no proof, so the build is red until the test exists.

### How behaviour changes

A pull request that changes behaviour changes the requirements file, the tests, and the code together. The diff of the requirements file is the proposal that a reviewer reads first. No proposal, plan, or task file is committed.

## Consequences

A coding agent reads one file to learn what a module does, and runs the tests of one ID to check a change.

A deleted test cannot remove a rule unseen. The requirement with no test turns the build red.

The check sees that a test cites a requirement, not that the test proves it. Review is the only check of that.

Behaviour with no test cannot be written down. A rule that the team knows but has not tested stays unwritten, on purpose.

## Rules

- What a module of the app does is written in `docs/requirements/<module>.md`.
- A requirement is one table row: its ID, then one EARS sentence in the present tense. `(CI: lint-prose)`
- Each requirements file declares one prefix of two to four capital letters, and no two files share it. `(CI: lint-prose)`
- An ID is the prefix, a hyphen, and three digits, and it is unique in the repo. `(CI: lint-prose)`
- An ID names one meaning. A requirement whose meaning changes gets a new ID, and a retired ID is not used again.
- Every requirement has a test that cites its ID at the start of the test name, and every cited ID exists. `(CI: lint-prose)`
- A requirement states observable behaviour. It does not restate the shape of the data or the reason of an ADR.
- A pull request that changes behaviour changes the requirements file, the tests, and the code together.
