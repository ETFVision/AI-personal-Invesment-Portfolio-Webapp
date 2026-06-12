# Portfolio Assistant Architecture

Last updated: 2026-06-12 22:36:00 +08:00

## Purpose

The Portfolio Assistant is a side-panel/chat experience intended to answer portfolio-aware questions using ETFVision data while respecting guardrails. It is positioned as a Personal CIO-style analytical assistant, not an order-entry or advice engine.

## Main Code Paths

- Page: `/assistant`
- API: `/api/assistant`
- Service: `PortfolioAssistantService.ts`
- Provider: `OpenAiPortfolioAssistantProvider.ts`
- Guardrails: `AssistantIntentGuardrailService.ts`, `AssistantResponseGuardrailService.ts`
- Repository: `SupabaseAssistantRepository.ts`
- Usage admin: `/admin/assistant-usage`

## Context Sources

Assistant answers can use:

- Portfolio dashboard and holdings data.
- Look-through exposure data.
- Recommendations and guardrails.
- Market Vision.
- Telemetry evidence.
- Portfolio review.
- News/theme intelligence.
- Instrument details.

## Security Master / Look-Through Context

The assistant context builder can consume issuer-level portfolio look-through exposure after Portfolio Review has been refreshed. This lets it explain hidden overlap and concentration using company/issuer exposure rather than only direct ticker weights.

Current behavior:

- Direct ETF/fund wrappers remain direct product positions.
- Underlying company exposure can combine direct holdings and ETF-derived holdings.
- Share-class variants such as `GOOG` and `GOOGL` should be presented as one issuer-level exposure when issuer links exist.
- `securityBreakdown` preserves underlying securities and source ETF contributions for audit-style explanations.
- Direct stock holdings should be described as direct stocks even if the same company also appears as an ETF underlying.

Assistant responses should use this context when answering about concentration, technology exposure, diversification, risk, and hidden overlap.

## Response Guardrails

The assistant should:

- Avoid direct buy/sell instructions.
- Explain ETFVision classifications as analytical outputs.
- Use dynamic "most important thing" based on question category.
- Include concise executive brief blocks.
- Explain why key observations matter.
- Use indirect holdings when relevant to concentration, technology exposure, diversification, and risk.
- Mention telemetry only when relevant.
- Keep default responses around 250-400 words unless the user asks for detail.

## Conversation Continuity

Follow-up questions should inherit context rather than repeating the full portfolio snapshot.

## Cost Tracking

Assistant conversations and usage/cost metadata are stored in assistant tables and surfaced in Admin > Assistant Usage.

Documentation gap: exact assistant table names and cost formula should be verified in assistant migrations and `SupabaseAssistantRepository.ts`.
