# Stack: Claude API (Anthropic SDK)

Import this file only in projects using the Anthropic SDK / Claude API.

## Domain Signals → Auto-Activate

| Signal | Auto-activated skills |
|---|---|
| Anthropic SDK, `anthropic` / `@anthropic-ai/sdk` imports | `claude-api` |
| Prompt caching, model migration (4.6 → 4.7), tool use tuning | `claude-api` |

## Exceptions

- Skip when OpenAI / other provider SDK is imported
- Skip when filename suggests provider-neutral code (`*-openai.py`, `*-generic.py`)
