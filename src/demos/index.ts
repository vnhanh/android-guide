import React from 'react';
import { CooperativeCancellationDemo } from './CooperativeCancellationDemo';

/**
 * Demo registry — `demo:` frontmatter slugs (src/types.ts DocItem.demo) resolve
 * here. See .agents/rules/demonstration_assets.md: "Demo — an interactive page
 * in this site ... src/demos/<slug>.tsx, routed."
 */
export const DEMOS: Record<string, React.FC> = {
  'concurrency-cooperative-cancellation': CooperativeCancellationDemo,
};
