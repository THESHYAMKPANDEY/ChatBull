# UI QA Plan

## Usability Testing (Manual)
- Round 1: discovery of critical friction (Login, Feed, Chat)
- Round 2: validate navigation and error recovery
- Round 3: polish, accessibility checks

Each round:
- 5 users per platform (Android/iOS/Web)
- Capture screen recordings + task completion times
- Track top 10 issues and fix before next round

## Accessibility Audits
- Android: Accessibility Scanner
- iOS: Accessibility Inspector
- Web: Lighthouse + keyboard navigation walkthrough

## Automated Testing
- Unit tests for UI primitives and intent-based UI logic
- Snapshot tests for high-risk components
- Visual regression: Storybook + screenshot baseline per component

