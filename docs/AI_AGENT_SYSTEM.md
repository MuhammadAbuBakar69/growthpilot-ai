# AI agent system

Status: **contracts implemented and tested; no live model calls, no orchestration runtime.** Everything
below is code in the repository, and every claim is covered by a test that runs offline.

## Layers

```
contracts.ts   strict JSON schema validation, the finding shape, no coercion
registry.ts    ten AgentSpec records + planAgents(): which specialists a request needs
providers.ts   one Provider interface: openai | gemini | unavailable; timeout, retry, usage
cost.ts        price table, per-run ledger, budgets that refuse rather than overspend
```

## Why an explicit unavailable state

`createProvider(null)` returns a provider whose `complete()` throws `ProviderUnavailable`. It does not
return an empty finding list, and it does not return canned text. The UI path this implies is: try the
model, catch `ProviderUnavailable`, render the deterministic analysis with a labelled note that AI
interpretation is off. A missing key is a state, not an error to hide.

## Validation at the boundary

`completeStructured()` parses, then validates against the agent's `outputSchema`, and returns
`{ ok: false, errors }` on failure. Consequences, all tested:

- A finding with an empty `evidence` array is rejected. This is the mechanical implementation of "no
  evidence, no finding".
- An unknown key is rejected rather than dropped, so a model cannot smuggle a metric into a record.
- `insufficient_data` is required on every output, so "nothing found" is a statement rather than silence.

## Registry rules

- `tools` is an allowlist and defaults to empty: an agent reasons over supplied context, it does not fetch.
- The growth manager deliberately has no tools and its system prompt forbids it from calling other
  agents. Orchestration belongs to a runtime with depth and tool-call limits, not to a model's discretion.
- `planAgents()` selects specialists from data that exists. No site facts means no website or SEO agent
  runs at all, rather than one inventing findings about a page it never saw.

## Cost control

`charge()` returns an error once the run ledger would cross either the token or the cost budget, and it
refuses outright for a model with no published price. An unpriced model is a spend you cannot see.

## What is not built

| Missing | Why it is missing |
| --- | --- |
| Orchestration runtime (checkpoints, cancellation, tracing) | Needs a server process; static host cannot hold state between steps |
| Live provider calls | No credential configured |
| Retrieval / context assembly | Follows from the runtime |
| Evaluation harness with fixtures | Designed in the plan, not implemented |
| Persistence of agent runs | Needs the database decision (D1) |

## Adding an agent

1. Add an `AgentSpec` to `AGENTS` with a unique `AgentId`.
2. Give it a schema. Reuse `FINDINGS_OUTPUT_SCHEMA` unless it produces a different artefact.
3. Add it to `planAgents()` only behind a data condition it can actually satisfy.
4. Add a registry test: id matches key, system rules present, tools minimal.
5. Nothing calls it until the runtime exists. Declaring an agent is not shipping one, and the registry says
   so in its `status` field.
