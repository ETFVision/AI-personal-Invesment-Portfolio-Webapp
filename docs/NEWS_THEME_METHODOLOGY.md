# News and Theme Methodology

Last updated: 2026-06-11 20:11:07 +08:00

## Purpose

News intelligence turns raw articles into asset-class, instrument, macro, and canonical theme signals. These signals support News & Themes, Market Vision inputs, recommendation context, and assistant answers.

## Sources

- FMP: instrument and general financial news.
- NewsData.io: macro/world news query groups, preferred scheduled source.
- GDELT: manual separate macro/world news source due to rate-limit instability.

## Ingestion Flow

1. Provider job fetches articles by query group/source.
2. Provider normalization maps article fields into internal format.
3. Deduplication prevents repeated URLs/headlines.
4. Source quality is assigned.
5. News classification assigns asset bucket, theme, instrument links, confidence, and review flags.
6. Weekly reconciliation builds summarized asset and theme views.

## Important Services

- `NewsIngestionService.ts`
- `GlobalNewsIngestionService.ts`
- `NewsDataIngestionService.ts`
- `NewsDeduplicationService.ts`
- `NewsClassificationService.ts`
- `NewsThemeClassificationService.ts`
- `ThemeIntelligenceService.ts`
- `SourceQualityService.ts`
- `WeeklyNewsReconciliationService.ts`

## Source Quality

Source quality is stored on news items:

- Tier 1 examples: Reuters, Bloomberg, Financial Times, Wall Street Journal.
- Tier 2 examples: CNBC, MarketWatch, Barron's.
- Tier 3 examples: general blogs and unknown publishers.

Source quality is used to filter or weight news in weekly reconciliation and downstream intelligence.

## Theme Classification

Theme classification is deterministic plus AI-assisted where configured. It should avoid hardcoding individual article titles and instead classify by reusable keywords, source context, article text, macro relevance, and canonical taxonomy.

## Weekly Reconciliation

Weekly reconciliation separates:

- Asset-class buckets such as equities, bonds, gold/commodities, crypto, macro, rates, inflation, currency, geopolitical.
- Canonical themes such as Technology, AI, Growth, Inflation, Energy, Geopolitical.

Quality filters can exclude low-source-quality or low-confidence articles from summaries.

## Current UI Rule

News & Themes should show current fetched articles with links, then theme summaries and weekly reconciliation. Detailed ingestion diagnostics live under Admin > Data Sources.

## Current Limitations

- Non-English article filtering should be kept strict for Market Vision inputs unless multilingual support is intentionally added.
- GDELT can return repeated 429s and should remain manual-only.
- News source quality lists should be reviewed periodically.
