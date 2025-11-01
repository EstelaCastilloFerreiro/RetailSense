# Design Guidelines: KLOB Retail Analytics Platform

## Design Approach

**Selected Approach**: Design System - Carbon Design/Ant Design inspired
**Justification**: This is a data-heavy, enterprise B2B SaaS platform requiring information density, professional polish, and functional clarity. Drawing from Carbon Design's principles for data-rich applications, with visual references from Linear's clean dashboard aesthetics and Stripe's analytics clarity.

**Core Principles**:
- Data-first hierarchy: Information is the hero
- Professional restraint: Corporate polish without unnecessary decoration
- Efficient workflows: Minimize clicks to insight
- Conditional visibility: Show what matters when it matters

---

## Typography

**Font Families**:
- Primary: Inter (via Google Fonts) - UI, labels, body text
- Monospace: JetBrains Mono - numerical data, metrics, codes

**Type Scale**:
- Hero numbers (KPI values): text-4xl / text-5xl, font-bold
- Section headers: text-2xl, font-semibold
- Card titles: text-lg, font-medium
- Body/labels: text-sm, font-normal
- Captions/metadata: text-xs, font-normal
- Table headers: text-xs, font-semibold, uppercase, tracking-wide

**Hierarchy Rules**:
- KPI numbers dominate their cards
- Section headers establish clear content zones
- Data tables use compact, scannable typography
- Filter labels are subtle, values are prominent

---

## Layout System

**Spacing Primitives**: Tailwind units of **2, 3, 4, 6, 8, 12, 16**
- Component padding: p-4, p-6
- Card spacing: p-6, gap-6
- Section margins: mb-8, mt-12
- Tight data spacing: gap-2, gap-3
- Generous dashboard spacing: gap-8

**Grid Architecture**:
```
┌─────────────────────────────────────────┐
│ Top Navigation (h-16)                   │
├──────────┬──────────────────────────────┤
│  Sidebar │  Main Dashboard Area         │
│  Filters │  - Tab Navigation            │
│  (w-64)  │  - KPI Row                   │
│          │  - Charts Grid               │
│          │  - Data Tables               │
└──────────┴──────────────────────────────┘
```

**Responsive Breakpoints**:
- Mobile: Sidebar collapses to overlay drawer
- Tablet (md:): Sidebar persistent but narrower (w-56)
- Desktop (lg:+): Full sidebar (w-64), multi-column chart grids

---

## Component Library

### 1. Navigation & Structure

**Top Header**:
- Fixed position, h-16, border-b
- Left: KLOB logo (text-xl, font-bold) with maroon accent
- Center: Current client/tenant name (text-sm, subtle)
- Right: User avatar, settings icon, logout

**Filter Sidebar**:
- Persistent left panel, w-64
- Sections: Store, Season, Family, Product
- Each filter: Label (text-xs, uppercase) + Multi-select dropdown or checkbox group
- "Apply Filters" button at bottom (full-width, primary action)
- Collapsible sections with chevron icons

**Tab Navigation** (within main area):
- Horizontal tabs below header
- Four tabs: Overview | Stores/Geography | Products/Campaigns | Inventory vs Demand
- Active tab: Bottom border (maroon accent), slightly bolder text
- Inactive tabs: Neutral, hover shows subtle background

### 2. Data Display

**KPI Cards** (Overview section):
- Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- Card structure: p-6, rounded-lg, border
- Layout: Label (top, text-xs) → Value (text-4xl, bold, monospace) → Change indicator (text-sm, with arrow icon)
- Conditional styling: Positive values in success green, negative in warning red
- Example KPIs: Projected Demand, Optimal Price, Inventory Status, Top Product Performance

**Chart Containers**:
- Each chart in a card: p-6, rounded-lg, border
- Header: Title (text-lg, font-medium) + Info icon + Export button
- Chart area: min-h-[300px] for readability
- Grid layouts: 2 columns on desktop (grid-cols-2), stack on mobile
- Mix of bar charts, line charts, and treemaps

**Data Tables**:
- Zebra striping for rows
- Fixed headers on scroll
- Compact row height (h-10 to h-12)
- Right-aligned numerical columns
- Sortable columns with arrow indicators
- Sticky first column for product/store names
- Conditional cell coloring for thresholds

**OTB Metrics Display**:
- Horizontal metric strip or grid
- Each metric: Small label + Large value + Unit
- Example: "Options: 245 | Depth: 3.2 | Units: 12,450 | PVP: €184,500"

### 3. Forms & Inputs

**File Upload Zone** (initial screen):
- Large dropzone: min-h-[400px], dashed border, centered content
- Icon: Upload cloud icon (large, maroon)
- Primary text: "Drop Excel or CSV files here"
- Secondary text: "Supports multiple sheets • Max 50MB"
- Browse button as fallback
- After upload: File list with name, size, sheet count, remove option
- Processing indicator: Progress bar + "Detecting structure..."

**Filter Controls**:
- Multi-select dropdowns with checkboxes
- Search within dropdown for long lists
- Selected count badge (e.g., "3 stores selected")
- Clear/Reset option per filter group

**Action Buttons**:
- Primary: Solid maroon background, white text
- Secondary: Border with maroon, maroon text
- Sizes: Default (h-10, px-6), Large (h-12, px-8) for CTAs
- Icons: Leading icon for context (upload, download, filter)

### 4. Feedback & States

**Loading States**:
- Skeleton screens for dashboard sections
- Shimmer effect on loading cards
- Inline spinners for filter updates
- Full-screen loader for file processing with percentage

**Empty States**:
- Centered content with icon
- "Upload your first dataset" or "No data matches filters"
- Clear CTA to take action

**Notifications**:
- Toast messages: Top-right corner
- Success: Green accent with checkmark
- Error: Red accent with alert icon
- Auto-dismiss after 5s, dismissible manually

### 5. Advanced Components

**Comparison Cards** (Campaign Impact):
- Side-by-side layout
- Before/After or Campaign A vs B
- Metric deltas prominently displayed
- Visual separator line

**Forecast Visualization**:
- Historical data (solid line) + Projected demand (dashed line)
- Confidence intervals as shaded area
- Toggle between different forecast models

**Geographic View** (Stores tab):
- Map placeholder or list view toggle
- Store cards with: Name, Region, Sales, Inventory status
- Click to drill into store-specific metrics

**Product Ranking**:
- Top 10 list with ranking badges
- Product image thumbnail (if available) or placeholder
- Metrics: Units sold, Revenue, Margin %

---

## Interaction Patterns

**Dashboard Workflow**:
1. User lands on Overview tab (default)
2. KPI cards load immediately showing company-wide metrics
3. User applies filters in sidebar → All charts/tables update
4. User switches tabs → New visualizations load with same filters applied
5. User exports specific chart → Download modal with format options

**Filter Behavior**:
- All filters start unselected (showing all data)
- Filters are additive (AND logic)
- "Apply Filters" button prevents excessive API calls
- Filter state persists across tabs
- "Reset All" returns to default view

**Data Drill-Down**:
- Click chart segment → Filter updates to that segment
- Click table row → Detail panel slides in from right
- Breadcrumb trail shows current drill-down path

**Responsive Behavior**:
- Mobile: Hamburger menu for filters (drawer overlay)
- Tablet: Collapsible sidebar, single-column charts
- Desktop: Full multi-column layout with persistent sidebar

---

## Accessibility

- High contrast ratios for all text on backgrounds
- Keyboard navigation for all interactive elements
- Tab focus indicators with visible outline
- ARIA labels for icon-only buttons
- Screen reader announcements for dynamic content updates
- Color is never the only indicator (use icons + text for status)

---

## Images

**No hero images required** - This is a dashboard application where data is the hero. All visual content is generated from user data (charts, tables, metrics).

**Icon Usage**: Heroicons (via CDN) for all UI icons - outline style for navigation, solid style for status indicators.