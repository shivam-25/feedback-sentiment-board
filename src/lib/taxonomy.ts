/**
 * Display labels only.
 *
 * The canonical theme taxonomy is defined in two authoritative places:
 *   1. supabase/functions/analyze/index.ts  (Gemini responseSchema enum)
 *   2. supabase/migrations/0001_init.sql    (Postgres CHECK constraint)
 *
 * The UI deliberately does NOT hold a third copy of the enum. It renders whatever
 * themes the database returns, so it can never disagree with stored data. Any theme
 * without a label here is humanised at render time rather than dropped.
 */

export const THEME_LABELS: Record<string, string> = {
  delivery_delay: 'Delivery delay',
  packaging_damage: 'Packaging damage',
  product_quality: 'Product quality',
  wrong_item: 'Wrong / missing item',
  refund_returns: 'Refunds & returns',
  customer_service: 'Customer service',
  pricing: 'Pricing & billing',
  app_website: 'App / website',
  other: 'Unclassified',
}

export function themeLabel(theme: string): string {
  return (
    THEME_LABELS[theme] ??
    theme.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
  )
}

export const SENTIMENT_LABELS: Record<string, string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
}
