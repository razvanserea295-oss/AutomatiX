# Automatix Builder.io Implementation Guide

This document describes how Builder.io ERP UI concepts have been implemented in the Automatix application.

## Overview

Automatix implements an "AI-first, production-code" approach to ERP UI development, following the principles outlined in the Builder.io study. The implementation focuses on:

1. **Speed of thought** → Prototyping directly against production code
2. **Design system context** → Components and tokens indexed for AI consumption
3. **Reduced handoffs** → Direct code generation with fewer translation steps
4. **Collaborative review** → Branch-based workflows with PR previews

## Implemented Features

### 1. Tiered Audience Architecture (Standard ↔ Expert)

**Files:**
- `src/store/viewTierStore.ts` - Zustand store for tier state
- `src/redesign/ui/TierToggle.tsx` - UI toggle component

**Usage:**
```tsx
const tier = useViewTier(); // 'standard' | 'expert'

// Gates advanced features
{tier === 'expert' && <EditLayoutButton />}
```

**Pages using this pattern:**
- `DashboardPage.tsx` - Expert gets editable CardGrid, Standard gets curated view
- `FinancePage.tsx` - Expert shows Conformitate rail card, Standard hides it
- `ProjectsPage.tsx` - Master-detail layout, Expert gates enhancements
- `KanbanPage.tsx` - Expert gates KanbanEnhancements
- `SalesHubPage.tsx` - Expert shows EditLayoutButton

### 2. Context Drawer (Narrative Depth)

**Files:**
- `src/store/contextDrawerStore.ts` - Store with DrawerPayload interface
- `src/redesign/ui/ContextDrawer.tsx` - Global right-hand slide-in panel
- `src/redesign/ui/insightKit.tsx` - ClickableKpi, IntentCard, DrawerRow, MarginBar building blocks

**Pattern:**
```tsx
// Clickable KPI → opens drawer with breakdown
<ClickableKpi onOpen={openProfit}>
  <KpiCard label="Profit" value={money(profit)} />
</ClickableKpi>

// Intent band → surfaces what needs attention first
<IntentBand items={intents} />
```

**Key principle:** Never a page reload — the drawer reveals the granular story underneath any metric.

### 3. Intent-Driven Design

**Pattern:** Every page has an "intent band" that surfaces critical issues:

| Page | Intent Triggers |
|------|---------------|
| Dashboard | Critical stock, overdue projects, active alerts |
| Finance | Overdue receivables (30+ days), at-risk projects |
| Kanban | Overdue projects, near-deadline projects |
| Sales Hub | Stale leads (7+ days), uncontacted leads |
| Projects | Late projects, blocked projects |

### 4. Design System Indexing (Auto-Documentation)

**Files:**
- `scripts/design-system-indexer.ts` - Scans codebase and generates documentation

**Generated artifacts:**
- `public/design-system-index.json` - JSON index of components and tokens
- `docs/design-system/*.md` - Individual component documentation

**What's indexed:**
- All components in `src/redesign/ui/`
- Design tokens from CSS variables
- Usage patterns and relationships

### 5. Branch-Based Development

**Files:**
- `src/store/devBranchStore.ts` - Branch state management
- `src/redesign/ui/BranchWorkspace.tsx` - Branch selector UI (in Titlebar)

**Branch lifecycle:**
```
draft → in-progress → review → testing → merged/archived
```

**Features:**
- Branch selector in Titlebar for quick switching
- Isolated sandbox mode (feature flags per branch)
- PR-ready state management
- Local persistence of branch state

**Usage:**
```tsx
// Check if a feature is enabled in current branch
const isEnabled = useBranchFeature('new-feature');
if (isEnabled) {
  // Show branch-specific UI
}

// Create branch from PRD
const branch = createBranchFromPRD('Feature: sorting', 'Allow custom sort order');
```

### 6. Responsive Preview Mode

**Files:**
- `src/redesign/ui/ResponsivePreview.tsx` - Viewport selector and constraints

**Supported viewports:**
- Desktop (1280px)
- Laptop (1024px)
- Tablet (768px)
- Mobile (375px)
- iPhone 17 (430px)
- iPad Pro (1024px)

**Usage:**
- Click the Maximize2 icon in Titlebar to enter preview mode
- Select viewport from dropdown to constrain app width
- Esc key or clicking Maximize2 again exits preview mode

**Integration:**
- `ResponsivePreviewProvider` wraps the entire app in `src/App.tsx`
- `ViewportSelector` appears in top-right when previewing
- CSS class `.responsive-preview` constrains the main container

### 7. Aspect Customization (Visual Knobs)

**Files:**
- `src/store/shellLayoutStore.ts` - Shell layout preferences
- `src/store/layoutModeStore.ts` - Global Tiles/Flat layout toggle
- `src/redesign/pages/settings/SettingsPage.tsx` - Aspect settings UI

**Knobs available:**
- Card corners: sharp | normal | rounded
- Card padding: tight | normal | loose
- Card shadows: none | subtle | normal | dramatic
- Content width: narrow | normal | full
- Global layout: tiled | flat

### 8. Multi-UI Mode Architecture

**Files:**
- `src/store/uiModeStore.ts` - UI mode selection
- `src/components/shell/AppShell.tsx` - Shell branching
- `src/redesign/shell/CodeShell.tsx` - VS Code-inspired shell
- `src/fiori/` - SAP Fiori UI5 shell

**Modes:**
- `saas` (default) - Modern design with glass cards
- `fiori` - SAP UI5 components
- `code` - IDE-inspired dark shell
- `hybrid` - VS Code structure + modern styling

## Component Library (Insight Kit)

Located in `src/redesign/ui/insightKit.tsx`:

### ClickableKpi
Wraps any KpiCard to make it open a ContextDrawer on click.

```tsx
<ClickableKpi onOpen={openContextDrawer} disabled={editMode}>
  <KpiCard label="Venituri" value={money(revenue)} />
</ClickableKpi>
```

### IntentCard
Bold triage card for "where to look first" sections.

```tsx
<IntentCard item={{
  id: 'stock',
  icon: PackageX,
  accent: 'red',
  title: 'Stoc sub minim',
  value: 5,
  unit: 'materiale',
  onOpen: () => openContextDrawer(payload),
}} />
```

### IntentBand
Container for IntentCards, conditionally rendered.

```tsx
{intents.length > 0 && <IntentBand items={intents} />}
```

### DrawerRow & MarginBar
Standard building blocks for drawer content.

## Workflow Integration

### Creating from PRD
1. User inputs PRD in chat or form
2. System creates branch via `createBranchFromPRD()`
3. Branch activates feature flags via `useBranchFeature()`
4. Changes are isolated to that branch

### Review & Collaboration
- Share preview URL for each branch
- Click-to-review on any element
- Comment threads attached to branches
- Auto-generated PR descriptions

### Deploying Changes
```bash
# Build for production
npm run build:web
npm run build:server

# Ship with version bump
npm run ship
```

## Design System Principles

1. **One layer of truth** - Code IS the design, not a Figma approximation
2. **Context everywhere** - All pages use shared primitives from `insightKit`
3. **Progressive disclosure** - Standard tier hides complexity, Expert reveals it
4. **Narrative first** - Every metric has a story (drawer) and action (navigation)

## Next Steps

Potential enhancements:
- [ ] Figma MCP integration for design sync
- [ ] Team collaboration features (comments, annotations)
- [ ] Visual regression testing per branch
- [ ] AI review agent integration with GitHub PRs