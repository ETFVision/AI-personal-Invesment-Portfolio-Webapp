-- Expand deterministic fundamental trend labels.
-- This is separated from migration 036 for deployments where the trend table already exists.

alter table fundamental_trends drop constraint if exists fundamental_trends_short_term_trend_direction_check;
alter table fundamental_trends drop constraint if exists fundamental_trends_short_term_trend_strength_check;
alter table fundamental_trends drop constraint if exists fundamental_trends_long_term_trend_direction_check;
alter table fundamental_trends drop constraint if exists fundamental_trends_long_term_trend_strength_check;
alter table fundamental_trends drop constraint if exists fundamental_trends_overall_trend_direction_check;
alter table fundamental_trend_summaries drop constraint if exists fundamental_trend_summaries_overall_trend_direction_check;

alter table fundamental_trends
  add constraint fundamental_trends_short_term_trend_direction_check
    check (short_term_trend_direction in ('accelerating', 'improving', 'rebounding', 'stable', 'decelerating', 'deteriorating', 'volatile', 'mixed', 'insufficient_data', 'not_applicable')),
  add constraint fundamental_trends_short_term_trend_strength_check
    check (short_term_trend_strength in ('weak', 'moderate', 'strong', 'insufficient_data', 'not_applicable')),
  add constraint fundamental_trends_long_term_trend_direction_check
    check (long_term_trend_direction in ('accelerating', 'improving', 'rebounding', 'stable', 'decelerating', 'deteriorating', 'volatile', 'mixed', 'insufficient_data', 'not_applicable')),
  add constraint fundamental_trends_long_term_trend_strength_check
    check (long_term_trend_strength in ('weak', 'moderate', 'strong', 'insufficient_data', 'not_applicable')),
  add constraint fundamental_trends_overall_trend_direction_check
    check (overall_trend_direction in ('accelerating', 'improving', 'rebounding', 'stable', 'decelerating', 'deteriorating', 'volatile', 'mixed', 'insufficient_data', 'not_applicable'));

alter table fundamental_trend_summaries
  add constraint fundamental_trend_summaries_overall_trend_direction_check
    check (overall_trend_direction in ('accelerating', 'improving', 'rebounding', 'stable', 'decelerating', 'deteriorating', 'volatile', 'mixed', 'insufficient_data', 'not_applicable'));
