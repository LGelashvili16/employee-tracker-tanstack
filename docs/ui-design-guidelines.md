# Teamwork UI and design guidelines

Status: required project instructions. Version: 8. Last updated: 2026-11-07.

Read this guide before designing, implementing, changing, or reviewing application UI. Apply it alongside `AGENTS.md`, feature rules, and the installed library versions. This is a living standard, not a claim that every existing screen already complies.

Typography, hierarchy, spacing and density, color and contrast, iconography, consistency and polish, and clarity are mandatory acceptance criteria. A screen is not complete merely because it renders or uses shadcn components.

## Authority and scope

- The user's latest explicit requirements take precedence. This guide is the canonical project design standard; local skills and external inspiration support it rather than replace it.
- Use `shadcn` for composition, `ui-ux-pro-max` for applicable design guidance, and `vercel-react-best-practices` for React implementation. Use `web-design-guidelines` for a requested UI/accessibility review. Follow the Intent discovery requirements in `AGENTS.md`.
- Mobbin, Dribbble, Behance, and other references may inform a specific interaction or layout. Translate useful ideas into the existing Teamwork system. Do not import unrelated palettes, fonts, icon sets, component libraries, or decorative effects.
- Existing screens can contain inconsistencies. Their existence does not establish a competing standard. Bring touched UI into alignment within the task's scope instead of copying its inconsistencies.
- This guide does not authorize an unrelated application-wide redesign, dependency installation, or permission change. Improve shared primitives when the requested change calls for it, with verification proportional to their reach.

## Mandatory design quality

| Area                   | Required result                                                                                                       | Avoid                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Typography             | A predictable type scale, readable Georgian text, clear title/content/metadata distinctions.                          | New fonts per feature, tiny operational text, indiscriminate bold text, clipped Georgian characters. |
| Hierarchy              | The page title establishes context, tabs establish the section, and the next useful action is obvious.                | Tabs before the title, repeated headings, several equally prominent primary actions.                 |
| Spacing and density    | Repeated elements share alignment, padding, control height, and rhythm. Data is easy to scan.                         | Arbitrary gaps, oversized empty cards, cramped rows, uneven toolbars.                                |
| Color and contrast     | Semantic tokens communicate state and remain readable in both themes. Text or accessible labels also identify status. | Hardcoded feature palettes, insufficient contrast, color as the only indicator.                      |
| Iconography            | Consistent Tabler icons reinforce meaning with predictable size and placement.                                        | Mixed icon families, decorative icons everywhere, unexplained icon-only actions.                     |
| Consistency and polish | Matching controls look and behave alike across employee, management, and admin pages.                                 | Local substitutes for shared primitives, one-off shadows, mismatched tabs or pagination.             |
| Clarity                | Concise Georgian copy, explicit actions, precise information, and honest loading/empty/error states.                  | Unnecessary descriptions, vague labels, fake success, unexplained empty screens.                     |

## Typography, hierarchy, and page structure

- Use the shared font stack from `src/styles.css`. Verify Georgian coverage and fallback rendering. Do not add a font for one page.
- Use one visible `h1` per page. The default page title treatment is `text-2xl font-semibold tracking-tight`.
- Reuse existing section/card title styles for subordinate headings. Body and table text normally use `text-sm`; `text-xs` is for secondary metadata, not primary records or instructions.
- Reserve medium/semibold weight for headings, labels, and meaningful emphasis. Use tabular numerals for comparable durations and numeric columns where appropriate.
- Keep readable line height. Allow names, Georgian labels, validation messages, and long user content to wrap deliberately. Do not truncate essential information without an accessible way to obtain it.
- Visible page headers contain the title and relevant actions, without a routine descriptive paragraph underneath. Do not add generic sentences that restate the page name.
- When labels, layout, and familiar controls make an interaction intuitive, omit extra instructional text. Add helper copy only to resolve real ambiguity, explain a constraint, or prevent a likely mistake. Preserve accessible names and essential context.
- Necessary timezone information, permission/scope restrictions, field help, warnings, and empty/error explanations belong beside the affected control, table, or section. Do not remove information needed to make a safe decision in the name of minimalism.
- Simple form dialogs, including the job editor, use a title-only header when the fields make the task clear. Omit routine descriptions that repeat the title; retain descriptions needed to understand consequences, permissions, or constraints. Preserve document metadata and relevant field help.
- Mark mandatory form labels with a visible `*` and expose the requirement through native or ARIA semantics. Hide the decorative asterisk from assistive technology to keep accessible names clear. Optional fields use plain labels without an optional suffix.

Required vertical order:

```text
Page title and primary actions
Higher-level section tabs
Search, filters, and contextual actions
Content or data table
Pagination and result count
```

Place the page title outside and above a route-aware tabs wrapper when that wrapper currently renders its tabs first. Do not duplicate titles inside tab panels to work around incorrect ordering.

## Spacing, density, and responsive behavior

- Reuse the existing spacing scale and shell gutters. Default page sections use `gap-6`, related groups use `gap-4`, and controls or label/input groups use `gap-2` unless an existing shared pattern specifies otherwise.
- Prefer the established 4px/8px rhythm. New arbitrary pixel values require a concrete alignment or accessibility need.
- Use the shell's content padding instead of nesting another full set of page gutters. Align headings, toolbars, tables, and pagination to common content edges.
- Keep consistent density within tables and forms. Do not make rows much taller solely to make a feature look more designed.
- Match control heights within a toolbar. Expand touch targets where needed without shrinking labels or crowding adjacent controls.
- On narrow screens, wrap toolbars in a deliberate order and contain horizontal scrolling within tables or tab rails. Do not create page-wide overflow or hide essential columns without an alternative.
- Preserve dimensions during loading. Use the existing shadcn Skeleton and Spinner with Georgian accessible status, as required by `AGENTS.md`.

## Color, contrast, and iconography

- Use semantic tokens such as `background`, `foreground`, `muted`, `muted-foreground`, `border`, `primary`, and `destructive`, plus existing badge variants. Keep foundations in `src/styles.css` and variants in shared primitives.
- Keep primary emphasis restrained. Use status colors for their established meaning rather than decorating arbitrary rows or headings.
- Verify at least 4.5:1 contrast for normal text, 3:1 for large text, and 3:1 for meaningful control boundaries and graphical indicators against adjacent colors. Check light and dark themes separately.
- Keep visible keyboard focus. Distinguish focus, hover, active, selected, and disabled states. Never remove a focus ring to make a screenshot cleaner.
- Use `@tabler/icons-react`. Let shared controls determine icon size and follow their `data-icon` convention. Match stroke weight and scale in comparable contexts.
- Hide decorative icons from assistive technology. Icon-only actions need concise Georgian accessible names and tooltips where their meaning is not obvious.
- An unread dot is a status indicator, not a numeric badge. Preserve its accessible unread meaning. Notification row dots sit beside the corresponding bell icon, as established in the notification UI.

### Map cartography

Map cartography has its own reference palette, maintained in `src/components/ui/map-styles.ts`. Dark maps use the approved slate terrain (`#314256`), deep blue water (`#1c347a`), teal parks (`#00615e`), and muted gray road/building hierarchy with colored place labels. Apply the palette to geographic layers rather than tinting the canvas with a CSS filter. Map controls, search, dialogs, job markers and statuses continue to use the existing application tokens. Light map colors remain provider-owned.

## Shared components are the default

- Use the existing Base UI/shadcn components for buttons, inputs, fields, selects, date pickers, checkboxes, switches, tabs, tables, pagination, badges, alerts, cards, dialogs, sheets, tooltips, Skeleton, and Spinner. Inspect their actual composition APIs before use.
- Do not recreate shared controls with raw interactive HTML or add a competing UI library. Normal semantic HTML remains appropriate for page structure, text, lists, and genuine links.
- Pick the component for its behavior: navigation uses links, actions use buttons, persistent status uses a badge, persistent contextual feedback uses an alert, and a temporary action outcome uses a toast.
- Reuse variants and shared compositions instead of accumulating page-specific overrides. Add a missing variant or primitive only for a concrete need, in its shared owner, using existing tokens and accessible behavior.
- Consistency does not mean wrapping everything in a card. Use cards for coherent groups; use headings, layout, and spacing when another bordered container adds no meaning.

## Feedback: toasts, alerts, validation, and badges

Choose feedback by purpose and lifetime. These components complement one another; they are not interchangeable.

| Situation                                                                            | Required treatment                                                                                                 |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| A user-triggered save, create, update, delete, submit, or explicit refresh completes | One Georgian Sonner success toast after confirmed completion.                                                      |
| A user-triggered asynchronous action fails                                           | One safe, actionable Georgian Sonner error toast; retain a persistent form/page error when recovery needs context. |
| A field or form is invalid                                                           | Field-level and form-level validation near the input, rather than only a disappearing toast.                       |
| A page cannot load, or a workflow has a persistent restriction/warning               | A shadcn Alert near the affected content, with a real recovery action when available.                              |
| A record has a persistent state                                                      | A shadcn Badge with an established semantic color and explicit Georgian label.                                     |
| Ordinary navigation, pagination, debounced search, filtering, or background fetching | Appropriate local loading/error state, without routine success toasts.                                             |

### Toasts

- Use `toast` from `sonner` and the single app-wide `Toaster` from `#/components/ui/sonner`. Do not mount another toaster or introduce the Base UI toast manager alongside it.
- Emit one outcome toast per action. Avoid duplicates from hooks, components, retries, rerenders, and cache invalidation.
- Show success only after the server confirms completion. Never simulate an unavailable workflow or imply that a local draft was saved remotely.
- Say what happened and, for failures, what the user can do next. Reuse the existing green success and red error styling; do not create per-feature palettes.
- Never expose SQL errors, stack traces, tokens, or unnecessary personal data. Preserve user input after failure and leave controls recoverable.
- Critical information, required decisions, and long-lived errors must remain available in the interface. A toast must not be their only presentation.

### Badges and status colors

Use variants from `src/components/ui/badge.tsx`. Map each feature's states to labels and variants in one feature-owned presentation mapping, reused in lists, details, and popups.

| Meaning                                            | Existing badge treatment           | Examples                                                 |
| -------------------------------------------------- | ---------------------------------- | -------------------------------------------------------- |
| Positive, active, approved, successfully completed | `green`                            | Active account, approved attendance.                     |
| Failure, rejected, blocked, suspended              | `red` or established `destructive` | Rejected record, suspended access.                       |
| Pending, awaiting review, incomplete decision      | `yellow`                           | Attendance awaiting review.                              |
| Caution or unusual condition needing attention     | `orange`                           | An established attendance deviation requiring attention. |
| Neutral metadata, draft, category, ordinary count  | `secondary` or `outline`           | Non-urgent count, neutral category.                      |

- Map actual business state, not an assumption. Recorded hours, a successful fetch, or a green check icon do not prove approval. Do not label a draft or open session completed.
- Keep colors consistent across features, labels explicit, and contrast sufficient in both themes. Never rely on color alone.
- A count is not inherently success or danger. Reserve strong color for meaningful state rather than coloring every number.
- Do not invent colors for every status. If a new semantic variant is necessary, implement it once in the shared component and verify both themes.
- Job map pins identify installation with blue, measurement with purple and other work with neutral tokens. Keep a separate status badge visible on each pin so category colors do not hide completion, rejection or progress. Reuse the shared type mapping for badges and the map legend; include type and status in accessible labels.

### Alerts

- Compose existing `Alert`, `AlertTitle`, `AlertDescription`, and `AlertAction` as appropriate. Use supported variants: `destructive` for errors, `warning` for orange cautions, `info` for relevant information, and default for neutral context. The address-lookup fallback uses a compact `warning` alert beside its field, with polite status semantics.
- Place alerts beside affected content. Keep messages concise and give a supported next step, such as retrying, correcting input, or returning to an available view.
- Automatically filled map addresses show a compact info Alert asking users to verify the street and building number. Hide it after manual address editing and when editing an existing saved job; keep the orange warning for missing or ambiguous lookup results.
- Do not substitute an inline success banner for the required action toast. Avoid decorative alerts and permanently repeated information.
- Reserve assertive announcements for urgent errors. Routine informational notes must not repeatedly interrupt screen readers; use suitable non-urgent semantics when composing them.
- Add a shared semantic variant for a genuinely missing warning treatment instead of coloring a custom page callout.

## Tables: shadcn Data Table pattern

- Application tables must follow the shadcn Data Table pattern: shared `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, and `TableCell` primitives composed with installed TanStack Table behavior.
- Data Table is a composition pattern, not a requirement to install a second grid package or invent an import named `DataTable`. Reuse an existing suitable composition; extract shared behavior when repeated needs justify it.
- Use the installed TanStack Table version and types. Do not paste incompatible v8 or Radix examples into this Base UI project.
- Keep headers, row padding, borders, hover states, badges, sort indicators, and action placement consistent. Place row actions in a predictable final column; do not make every cell look like a button.
- Sortable headers must be recognizable, keyboard accessible, and explicit about direction through `aria-sort` where applicable.
- Sortable column titles use link styling with sort indicators, without a raised button surface or shadow. Keep the subtle 3D treatment for action buttons rather than table headings.
- Align numeric comparisons consistently. Format durations, dates, statuses, and missing values with shared helpers and Georgian labels.
- Distinguish initial loading, no records, no matches, forbidden access, and failed loading. No search matches must not imply that the company has no employees.
- Overall totals must cover the full authorized filter scope, not just the currently displayed page.

## Growing lists: server data and URL state

Treat employee, attendance, timesheet, job, audit, notification archive, and comparable persisted lists as potentially growing. Pagination, search, filters, and sorting must run on the server and update TanStack Router search parameters. Bounded popup previews are not substitutes for full list pages.

- The URL represents the applied page, search query, filters, and sort. Links, refresh, direct navigation, and browser Back/Forward must reconstruct the same view.
- Keep only the in-progress search draft locally. Use TanStack Form with Zod for search/filter forms; validate the applied request again at the server boundary.
- Debounce text search with a 300ms default. Do not request on every keystroke or require a separate Search button for ordinary list search. Enter may commit immediately when useful.
- Cancel pending debounce work on unmount, navigation, or a superseding input. A stale draft must not overwrite restored URL state after Back/Forward navigation.
- Replace history for debounced text edits so every character does not become a history entry. Use normal navigation history for deliberate pagination and sort/filter changes.
- Reset to page 1 when the applied query, filters, page size, or sort changes. Preserve them when changing pages. Do not reset pagination during ordinary refetches.
- Prefer `page`, `q`, `sort`, and explicit domain filter names. New pagination URLs use one-based pages; deliberately adapt existing zero-based contracts instead of silently mixing conventions.
- Validate page bounds, query length, filters, and sort enums with feature-owned Zod schemas at route and server boundaries. Map allowed sort values to known columns; never interpolate raw URL sort values into SQL.
- Apply authorization, search, filters, sort, and pagination in persistence queries before returning records. Do not fetch an entire collection and hide unauthorized rows, filter, sort, or slice them in the browser.
- Add a stable unique tie-breaker to ordering. Counts and totals use the same authorization/filter scope as the returned rows. Use a consistent snapshot when rows and totals must agree.
- Include identity/scope and all result-affecting parameters in TanStack Query keys. Superseded requests must not replace the current view with stale results.
- Keep the search field mounted and focused while results refresh. Use skeletons for initial loading and preserve layout during subsequent fetches with an appropriate busy state.
- Handle pagination boundaries, empty results, invalid parameters, and out-of-range pages honestly. Never render active-looking navigation that cannot work.

For grouped records, paginate the meaningful group when the UI promises complete groups. A work day's attendance sessions stay together; do not split them across pages without an explicit product decision.

## Pagination: shared shadcn controls

- Use `src/components/ui/pagination.tsx`: `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationPrevious`, `PaginationNext`, and `PaginationEllipsis` as needed.
- Compose URL navigation with TanStack Router links through the project's Base UI-compatible API. Preserve applied search/filter/sort parameters in page links.
- Do not substitute unrelated Previous/Next buttons, custom numbered pills, or a second paginator implementation.
- Keep result count, active page, disabled boundaries, number range, and ellipsis behavior consistent. Use bounded page links instead of rendering every page number.
- Use Georgian accessible labels and `aria-current="page"`. Disabled controls must not navigate or remain misleadingly focusable.
- Apply the shared raised-button treatment to pagination links styled as buttons, including code that calls `buttonVariants` directly.

## Tabs: one approved appearance

Use shadcn `Tabs`, `TabsList`, `TabsTrigger`, and `TabsContent` for tabbed sections. Higher-level tabs must appear below the page's main title.

The approved appearance is the existing attendance tab strip shown in the user's reference:

- One compact rounded container with a muted surface, subtle border, and small inset around its triggers.
- Consistent trigger height and horizontal padding, muted inactive text, and clear hover/focus states.
- A raised selected surface with a slight 3D edge/shadow, stronger text, and stable dimensions.
- No page-specific underline, separate button row, or alternate palette in place of this pattern. Do not use the primitive's line variant as an alternative page-level style.
- Preserve keyboard behavior, selected state, accessible names, and route-link semantics. Derive route-backed selection from the route and retain relevant filters deliberately.
- Let long tab rails scroll inside their own container without clipping focus rings or forcing page overflow.

Use `src/features/attendance/components/attendance-navigation.tsx` for the strip's appearance and `src/components/ui/tabs.tsx` for primitive behavior. The existing wrapper's title placement is not an exception to the title-first rule. Reuse or extract an appropriate shared composition instead of copying its classes into every feature.

## Buttons: shared subtle 3D treatment

- All action buttons and button-styled controls must use the restrained raised treatment from the supplied reference: a soft top highlight, lower edge, shallow shadow, and inset pressed state.
- Use `src/components/ui/button.tsx` and existing `shadow-control-raised`, `shadow-control-pressed`, and primary-button shadow tokens. Do not add custom shadow values to individual pages.
- The primary variant already owns its elevation. Other variants currently expose `depth="raised"`; use that shared treatment when composing them. A future default change belongs in the shared primitive and must be verified across variants rather than patched separately in each feature.
- Keep outline, secondary, ghost, destructive, icon, pagination, and selected-tab treatments visually related. Depth must not make every control look primary or weaken destructive meaning.
- Disabled controls lose misleading elevation. Hover and pressed states must not change dimensions or make surrounding content jump.
- Keep focus rings distinct from elevation. Respect reduced motion; avoid large scaling, springy movement, and long transitions for basic controls.
- Real text links remain links. Do not turn ordinary navigation text into a raised button merely to apply the effect.
- Async actions retain their Georgian label, dimensions, Spinner, and `aria-busy`; prevent duplicate submission and use existing Sonner outcome feedback.

## Product judgment and interaction quality

Before implementation, identify the user, their immediate task, the decision the screen supports, and the next action. Use existing task context; do not turn routine changes into a mandatory design interview. Every visible section or control should help that task or communicate necessary state.

- Prefer familiar workflows and recognizable controls. Do not invent navigation, gestures, or hidden interactions merely to make a business screen distinctive.
- Give each context a clear primary action when needed, with subordinate secondary actions. Read-only pages do not need an invented action, chart, or summary card.
- Use progressive disclosure for genuinely advanced controls. Keep common actions discoverable; do not hide essentials behind hover-only controls, unexplained icons, or unnecessary menus.
- Show applied filters and provide a clear reset. Make scope, date range, units, and timezone explicit where they change data interpretation. Do not fabricate absences or conclusions from missing data.
- Keep list/detail navigation predictable. Back/Forward preserves filters, sorting, and pagination; modal dismissal restores focus to a sensible trigger or successor.
- Protect user work: retain valid input after errors, prevent duplicate submissions, and keep pending actions understandable. Warn about unsaved work only when it would actually be lost.
- Use confirmations for consequential, destructive, or product-required actions. Name the target and consequence. Do not confirm every harmless click. Offer undo only when the operation actually supports it.
- Distinguish first use, no records, no matches, insufficient access, and failure in empty states. Provide a useful permitted next step when one exists; do not invent actions the user cannot perform.
- Use specific Georgian action labels. Avoid vague labels when context is ambiguous, generic motivational copy, and implementation terminology in product flows.
- Use motion to explain state changes, not decorate every interaction. Follow existing short transitions, preserve layout stability, and respect reduced motion.

## Visual restraint and evidence

- Avoid generic dashboard ornaments: unnecessary metric cards, oversized headings, redundant descriptions, arbitrary charts, repeated icons, decorative gradients, and nested cards without a grouping purpose.
- Improve alignment, hierarchy, spacing, feedback, and interaction behavior before adding decoration. Preserve subtle 3D controls without spreading heavy shadows to every surface.
- Do not impose arbitrary symmetry or a preset grid when content needs a different hierarchy. Let real tasks, record structure, and reading order determine the layout.
- Use realistic, explicitly labeled fixtures in isolated previews and tests. Check long Georgian names, long labels, missing values, zero records, large counts, unusual durations, and narrow screens. Never fabricate live employee records to populate a screenshot.
- Review the rendered result when UI changes. Inspect the main task flow, both themes, keyboard focus, narrow layouts, zoom, overflow, loading, and errors. Code review and passing tests alone do not establish visual quality.
- Report what was actually inspected. If visual verification is blocked, state that limitation instead of declaring the screen visually verified. Resolve material visual issues before presenting the change as complete.
- Explain design choices through concrete user benefits and tradeoffs. Modern, beautiful, professional, and clean are goals, not evidence that an implementation meets them.

## Repository references

| Concern             | Reference                                                               | Reuse                                                          |
| ------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------- |
| Foundations         | `src/styles.css`                                                        | Fonts, semantic colors, radius and elevation tokens.           |
| Component setup     | `components.json`                                                       | Base UI/shadcn style, aliases, Tabler configuration.           |
| Buttons             | `src/components/ui/button.tsx`                                          | Variants, sizes, `depth="raised"`, focus and pressed behavior. |
| Tabs                | `src/components/ui/tabs.tsx`                                            | Selection, focus and raised active styling.                    |
| Approved tab strip  | `src/features/attendance/components/attendance-navigation.tsx`          | Rounded segmented appearance; compose the title above it.      |
| Tables              | `src/components/ui/table.tsx`                                           | Shared table structure and styling.                            |
| Data table behavior | `src/features/attendance/components/company-attendance-users-table.tsx` | Installed TanStack Table composition and server sort links.    |
| Pagination          | `src/components/ui/pagination.tsx`                                      | Shared navigation primitives and composition.                  |

References are not blanket approval of every surrounding implementation. For example, an existing submit-only list search still needs the debounced URL behavior above when that search is updated.

Feedback references: `src/components/ui/sonner.tsx` owns the shared Sonner styling, `src/components/ui/badge.tsx` owns status variants, and `src/components/ui/alert.tsx` owns persistent callouts. Reuse them rather than reproducing their styling inside features.

## Review before delivery

- Check the seven mandatory quality areas on the changed screen, including narrow layouts and both themes.
- Confirm one title, higher-level tabs below it, no routine page description, consistent gutters, and aligned controls.
- Confirm Data Table composition, shared pagination, raised buttons, approved tabs, Tabler icons, and semantic tokens.
- Confirm one toast per completed/failed action, truthful success timing, consistent badge meanings, appropriate persistent alerts, and inline validation. Verify that important information remains available after a toast disappears.
- Exercise loading, refetching, empty records, no matches, validation failure, forbidden access, failed requests, and pending actions as applicable.
- For growing lists, verify debounce, filter/sort resets, stable server ordering, totals, direct URLs, refresh, Back/Forward, page boundaries, and server authorization.
- Check keyboard access, focus, contrast, accessible names, Georgian copy, zoom, overflow, and reduced motion.
- Run task-appropriate checks. Prefer behavior tests for URL state and server scope; do not add tests that only mirror styling classes. Report verification and limitations accurately.

## Updating this guide

When the user changes a shared UI standard, update this file instead of creating a competing design manual. Increment its version, update the date, and record the substantive decision below. Update references when files move. Carry accepted rules into shared primitives when implementing them, with verification proportional to their reach.

| Version | Date       | Decision                                                                                                                                                                                                       |
| ------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | 2026-11-06 | Established mandatory design quality, shadcn Data Tables and pagination, debounced server lists with URL state, title-first approved tabs, title-only page headers, and shared subtle 3D buttons.              |
| 2       | 2026-11-06 | Added explicit Sonner success/error feedback, semantic badge colors, persistent alerts, shared-component requirements, task-flow safeguards, visual restraint, realistic edge cases, and rendered-UI evidence. |
| 3       | 2026-11-06 | Use link-style sortable table headings with direction indicators instead of raised button surfaces.                                                                                                            |
| 4       | 2026-11-06 | Omit redundant instructional text from intuitive interfaces; retain helper copy only for meaningful ambiguity, constraints, or error prevention.                                                               |
| 5       | 2026-11-06 | Use title-only headers for simple form dialogs, visible required-field asterisks with accessible semantics, and plain optional-field labels.                                                                   |
| 6       | 2026-11-06 | Added the shared orange warning Alert variant; address-lookup fallback uses its compact layout and polite status semantics.                                                                                    |
| 7       | 2026-11-06 | Show address-verification info alerts only for automatic fills; manual edits and existing saved jobs do not show this reminder.                                                                                |
| 8       | 2026-11-07 | Give job types distinct blue/purple/neutral colors while retaining a separate status indicator and accessible labels on map pins.                                                                              |
