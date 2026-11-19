# Team Adwings UI and design guidelines

Status: required project instructions. Version: 76. Last updated: 2026-11-17.

Read this guide before designing, implementing, changing, or reviewing application UI. Apply it alongside `AGENTS.md`, feature rules, and the installed library versions. This is a living standard, not a claim that every existing screen already complies.

Typography, hierarchy, spacing and density, color and contrast, iconography, consistency and polish, and clarity are mandatory acceptance criteria. A screen is not complete merely because it renders or uses shadcn components.

## Authority and scope

- The user's latest explicit requirements take precedence. This guide is the canonical project design standard; local skills and external inspiration support it rather than replace it.
- Use `shadcn` for composition, `ui-ux-pro-max` for applicable design guidance, and `vercel-react-best-practices` for React implementation. Use `web-design-guidelines` for a requested UI/accessibility review. Follow the Intent discovery requirements in `AGENTS.md`.
- Mobbin, Dribbble, Behance, and other references may inform a specific interaction or layout. Translate useful ideas into the existing Team Adwings system. Do not import unrelated palettes, fonts, icon sets, component libraries, or decorative effects.
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
- Permission/scope restrictions, field help, warnings, and empty/error explanations belong beside the affected control, table, or section. Do not remove information needed to make a safe decision in the name of minimalism.
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

- The sidebar uses one small, diffuse accent halo behind the Team Adwings logo, fading out before the navigation starts. Do not retain diagonal rays or a full-sidebar color wash. Extend the decorative field through the inset shell's padding so no inner rectangular edge is visible, while preserving navigation spacing. Keep it behind content, hidden from assistive technology, pointer-transparent and disabled in forced-colors mode. Derive its hue from the current sidebar primary token and reduce intensity in dark mode. Use one static radial gradient with no continuous animation, pointer tracking, canvas, blur filters or additional dependencies. This branding-only decoration does not authorize accent washes on notification chrome or other content surfaces.

- Keep notification popup headers, footers, borders, header icons and idle actions neutral in both themes. Accent color identifies hover, focus, expanded/selected controls and unread icon/count state; unread-row backgrounds remain neutral. Footer links gain accent color only on hover/focus. Keep the theme selector's surrounding surface neutral and tint only its selected option. Avoid persistent decorative accent washes or shiny surfaces, especially in dark mode. Preserve body/read metadata contrast, red unread dots and existing status variants.

- Keep neutral first in the accent selector and group neighboring hues together. Sort new palette entries automatically through the shared registry, preserving the same DOM and keyboard order. Extend subtle accent treatment to selected select options and checked menu choices. Reserve broad content surfaces, headings, separators and semantic status colors for their established purposes.

- Personal accent colors are selected in გარეგნობა on `/settings/profile`, independently of light/dark/system mode. Keep the existing neutral option as the default alongside საფირონის ლურჯი, ძველი ოქროსფერი, სპილენძისფერი and ზამბახისფერი. Define new palettes only in `src/lib/appearance.ts`; see [adding appearance colors](appearance-colors.md). Use the generated semantic tokens for primary actions, links, focus and selected navigation. Preserve status, schedule and map color meanings.
- The accent registry also includes ნეფრიტის მწვანე, ევკალიპტის მწვანე, ტყის მწვანე, ღვინისფერი, მუქი ლურჯი, ინდიგო, კობალტის ლურჯი, მუქი ნარინჯისფერი and ზეთისხილისფერი. Use each palette's reviewed light/dark primary and foreground pairs for checked switches, checkboxes and radio buttons. Tint current pagination, selected table rows, calendar ranges and text selection subtly. Preserve neutral's existing appearance. Verify button hover contrast as well as resting states; never recolor business-status badges to match the personal accent.

- Use semantic tokens such as `background`, `foreground`, `muted`, `muted-foreground`, `border`, `primary`, and `destructive`, plus existing badge variants. Keep foundations in `src/styles.css` and variants in shared primitives.
- Keep primary emphasis restrained. Use status colors for their established meaning rather than decorating arbitrary rows or headings.
- Verify at least 4.5:1 contrast for normal text, 3:1 for large text, and 3:1 for meaningful control boundaries and graphical indicators against adjacent colors. Check light and dark themes separately.
- Keep visible keyboard focus. Distinguish focus, hover, active, selected, and disabled states. Never remove a focus ring to make a screenshot cleaner.
- Use `@tabler/icons-react`. Let shared controls determine icon size and follow their `data-icon` convention. Match stroke weight and scale in comparable contexts.
- Hide decorative icons from assistive technology. Icon-only actions need concise Georgian accessible names and tooltips where their meaning is not obvious.
- An unread dot is a status indicator, not a numeric badge. Preserve its accessible unread meaning. Notification row dots sit beside the corresponding bell icon, as established in the notification UI.

The personal schedule uses a sky-blue daylight-to-night palette. Its today panel has soft sunlight over a blue sky at the top, fading into twilight and a dark blue star-lit bottom. Keep atmospheric layers static, decorative, behind the text, and scoped through the schedule styles in `src/styles.css`. Use dark start-time text and light end-time text, stacked on mobile. Weekday work blocks follow the same light-to-dark direction, with a brighter sky treatment for today and quiet cool accents for days off. These calendar colors describe the schedule, not attendance completion or approval. Preserve explicit today/day-off labels and readable contrast in both themes.

### Map cartography

Dark country borders use a distinct high-contrast stroke, full opacity, and a nonzero width at every zoom. Keep smaller administrative boundaries subordinate and preserve the provider filters and disputed-boundary dash patterns.

The jobs map starts with flat buildings. Its separate 3D buildings control exposes a pressed state and toggles building height without changing the camera or hiding footprints. Preserve the choice across theme/POI changes and full-screen map remounts.

Map cartography has its own reference palette, maintained in `src/components/ui/map-styles.ts`. Dark maps use the approved slate terrain (`#314256`), deep blue water (`#1c347a`), teal parks (`#00615e`), and muted gray road/building hierarchy with colored place labels. Apply the palette to geographic layers rather than tinting the canvas with a CSS filter. Map controls, search, dialogs, job markers and statuses continue to use the existing application tokens. Light map colors remain provider-owned.

## Shared components are the default

Employee management and the attendance directory belong in the management navigation group, labeled `მართვა`. The management attendance directory and employee detail use `/manage/attendance` and `/manage/attendance/$userId`. Company schedule and attendance configuration live on the dedicated `/manage/schedule` page, labeled `სამუშაო განრიგი`, with its own sidebar entry guarded by `attendance.configure`. Omit the rules shortcut from attendance and do not retain the old company-attendance/settings URL aliases. Production teams are managed at `/manage/teams`, labeled `გუნდები`, under an explicit `teams.manage` permission. Team membership is independent of attendance reviewer assignments. Attendance review uses direct employee-to-reviewer assignments. HR receives the explicit permissions for these workflows. Keep company-wide reads distinct from assigned-employee review and correction scope. Platform administration is a separate concern. Its administration group contains working account controls and explicitly requested planned pages with specific future capabilities and a planned badge. Do not show an empty administration group, simulate unavailable actions, or retain old route aliases after moving a workflow.

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

### Announcement reading and delivery

- Omit personal read status from the management announcement table. Keep it on the employee announcement table.

- Personal `/announcements` uses a full-width TanStack Table with Georgian dates, titles, sortable publication date and read status. Omit delivery details from this view. `/manage/announcements` retains its management table and ჩვენება column.
- Modal publications appear immediately for signed-in employees and after sign-in for others. Show one oldest-first announcement at a time with a progress indicator; new arrivals join after the open item. Closing advances the queue and allows a reminder after a later sign-in. Explicit წავიკითხე acknowledgement stops future modal reminders. Suppress the publication toast for modal announcements, and pause automatic delivery while a manual announcement reader is open.

### Toasts

- A new non-modal live announcement shows one informational Sonner toast per open app tab at the bottom right for 6 seconds, with a Georgian ნახვა action. Reconnect snapshots do not replay old announcement toasts. Keep the announcement in its directory after the toast expires; toast dismissal never marks it read. Use an accessible unread dot in personal announcement navigation, without another header icon.

- Use `toast` from `sonner` and the single app-wide `Toaster` from `#/components/ui/sonner`. Do not mount another toaster or introduce the Base UI toast manager alongside it.
- Emit one outcome toast per action. Avoid duplicates from hooks, components, retries, rerenders, and cache invalidation.
- Show success only after the server confirms completion. Never simulate an unavailable workflow or imply that a local draft was saved remotely.
- Say what happened and, for failures, what the user can do next. Reuse the existing green success and red error styling; do not create per-feature palettes.
- Never expose SQL errors, stack traces, tokens, or unnecessary personal data. Preserve user input after failure and vacation controls recoverable.
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
- Use the same `bg-card` table surface and bordered pagination footer across directory tables. Use the shared numbered pagination with the total and current page.
- Sortable headers must be recognizable, keyboard accessible, and explicit about direction through `aria-sort` where applicable.
- Sortable column titles use link styling with sort indicators, without a raised button surface or shadow. Keep the subtle 3D treatment for action buttons rather than table headings.
- Use Tabler's combined up/down `IconArrowsSort` beside sortable titles. Preserve `aria-sort` for the active direction. Account-access row actions belong in the final column's three-dot menu, with existing authorization and confirmation behavior.
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

Do not add route-changing tabs that duplicate destinations already shown as separate sidebar links. The `დასწრებები` sidebar item opens the employee directory. Selecting an employee opens one detail page with local attendance and monthly-hours tabs; both tabs keep that sidebar item active. There is no standalone company-timesheets sidebar item or route. Section tabs remain appropriate for related views that are not separately exposed in the sidebar, such as personal attendance and its correction/hour views.

The approved appearance is the existing attendance tab strip shown in the user's reference:

- One compact rounded container with a muted surface, subtle border, and small inset around its triggers.
- Match the inner trigger corners to the outer container, accounting for its border and inset; use the shared tab styles across pages.
- Consistent trigger height and horizontal padding, muted inactive text, and clear hover/focus states.
- A raised selected surface with a slight 3D edge/shadow, stronger text, and stable dimensions.
- Give every tab an appropriate Tabler icon. Selected tab text and icons are fully white, with a contrasting selected surface in both themes.
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
- Show applied filters and provide a clear reset. Make scope, date range and units explicit where they change data interpretation. Do not fabricate absences or conclusions from missing data.
- Keep list/detail navigation predictable. Back/Forward preserves filters, sorting, and pagination; modal dismissal restores focus to a sensible trigger or successor.
- Protect user work: retain valid input after errors, prevent duplicate submissions, and keep pending actions understandable. Warn about unsaved work only when it would actually be lost.
- Use confirmations for consequential, destructive, or product-required actions. Name the target and consequence. Do not confirm every harmless click. Offer undo only when the operation actually supports it.
- Distinguish first use, no records, no matches, insufficient access, and failure in empty states. Provide a useful permitted next step when one exists; do not invent actions the user cannot perform.
- Use specific Georgian action labels. Avoid vague labels when context is ambiguous, generic motivational copy, and implementation terminology in product flows.
- Use motion to explain state changes, not decorate every interaction. Follow existing short transitions, preserve layout stability, and respect reduced motion.
- While an attendance session is running, its action button shows a violet-purple and soft white gradient with visible drifting white particles clipped inside its rounded surface. Keep the dark label and focus ring unobstructed, pause motion during submission, and use a static gradient for reduced motion. The effect follows the active session rather than scheduled hours. Retain the shared raised press feedback and a subtle hover lift.

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

Day-off requests use one date picker labeled `თარიღი`; vacations use separate start and end date pickers. Apply this distinction to employee submissions and reviewer date changes. Switching a vacation to a day off retains the start date as the single selected day.

When the user changes a shared UI standard, update this file instead of creating a competing design manual. Increment its version, update the date, and record the substantive decision below. Update references when files move. Carry accepted rules into shared primitives when implementing them, with verification proportional to their reach.

| Version | Date       | Decision                                                                                                                                                                                                               |
| ------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | 2026-11-06 | Established mandatory design quality, shadcn Data Tables and pagination, debounced server lists with URL state, title-first approved tabs, title-only page headers, and shared subtle 3D buttons.                      |
| 2       | 2026-11-06 | Added explicit Sonner success/error feedback, semantic badge colors, persistent alerts, shared-component requirements, task-flow safeguards, visual restraint, realistic edge cases, and rendered-UI evidence.         |
| 3       | 2026-11-06 | Use link-style sortable table headings with direction indicators instead of raised button surfaces.                                                                                                                    |
| 4       | 2026-11-06 | Omit redundant instructional text from intuitive interfaces; retain helper copy only for meaningful ambiguity, constraints, or error prevention.                                                                       |
| 5       | 2026-11-06 | Use title-only headers for simple form dialogs, visible required-field asterisks with accessible semantics, and plain optional-field labels.                                                                           |
| 6       | 2026-11-06 | Added the shared orange warning Alert variant; address-lookup fallback uses its compact layout and polite status semantics.                                                                                            |
| 7       | 2026-11-06 | Show address-verification info alerts only for automatic fills; manual edits and existing saved jobs do not show this reminder.                                                                                        |
| 8       | 2026-11-07 | Give job types distinct blue/purple/neutral colors while retaining a separate status indicator and accessible labels on map pins.                                                                                      |
| 9       | 2026-11-09 | Place employees, company attendance, company timesheets, and attendance rules in team management with explicit HR access; omit empty administration navigation and obsolete route aliases.                             |
| 10      | 2026-11-09 | Expose platform account access and role permissions under administration; label planned platform pages and list concrete future capabilities without simulated controls.                                               |
| 11      | 2026-11-09 | Use the combined Tabler up/down sort icon and a three-dot menu for account-access row actions, preserving accessible sort state and protected account rules.                                                           |
| 12      | 2026-11-09 | Remove teams and team-management workflows; name management navigation for employees and retain direct employee-to-reviewer assignments.                                                                               |
| 13      | 2026-11-09 | Omit route-changing tabs that duplicate separate sidebar destinations; retain section tabs where sidebar navigation does not already expose those views.                                                               |
| 14      | 2026-11-09 | Consolidate attendance and monthly hours under the selected employee in დასწრებები; remove the standalone company-timesheets route and use local detail tabs.                                                          |
| 15      | 2026-11-09 | Use one attendance directory and employee detail for company and assigned-manager workflows; omit duplicate management attendance, exceptions, and timesheet pages while retaining scoped review controls.             |
| 16      | 2026-11-09 | Shorten the employee-management sidebar group label to მართვა.                                                                                                                                                         |
| 17      | 2026-11-09 | Move attendance rules from the sidebar to a permission-gated top-right action on დასწრებები, preserving the protected rules route. Configuration-only users can reach that action without requesting employee records. |
| 18      | 2026-11-09 | Use /manage/attendance for attendance and employee detail; replace the scheduling placeholder with the working work-schedule/settings page at /manage/schedule and remove the attendance shortcut.                     |
| 19      | 2026-11-09 | Organize employee attendance around one work date, defaulting to company-local today; use shared date controls and one table instead of repeated day cards and sorting controls.                                       |
| 20      | 2026-11-09 | Use one calendar date for day-off requests and date ranges for vacations, including reviewer date changes.                                                                                                             |
| 27      | 2026-11-10 | Use coordinated blue and purple accents for the personal schedule, with a restrained gradient for today and matching mobile colors.                                                                                    |
| 28      | 2026-11-10 | Associate the today panel start time with warm morning colors and the end time with evening blue, preserving readable text and vertical order in both themes.                                                          |
| 29      | 2026-11-10 | Use a sunlit sky-to-night today panel with quiet stars and matching daylight-to-evening weekday blocks.                                                                                                                |
| 30      | 2026-11-10 | Keep jobs-map buildings flat initially and provide an independent 3D toggle that survives map style and full-screen changes.                                                                                           |
| 31      | 2026-11-10 | Keep dark-map country borders high contrast and fully opaque across zoom levels, preserving provider boundary data and disputed-line patterns.                                                                         |
| 32      | 2026-11-10 | Use the full available width for employee profiles, matching right-side sheets for employee creation and profile editing, and რედაქტირება for the leave-balance action.                                                |
| 33      | 2026-11-10 | Use a four-second bottom-right toast for live announcements and an accessible unread navigation dot, without replaying historical alerts on reconnect.                                                                 |
| 34      | 2026-11-10 | Extend live announcement toasts to 6 seconds while retaining bottom-right placement.                                                                                                                                   |
| 35      | 2026-11-10 | Use an employee announcement reading feed, preserve the management delivery table, and queue immediate/sign-in modal announcements with next-sign-in reminders after dismissal.                                        |
| 36      | 2026-11-10 | Restore the employee announcement table while keeping delivery details exclusive to management.                                                                                                                        |
| 37      | 2026-11-11 | Remove personal read status from the management announcement table while retaining it for employees.                                                                                                                   |
| 38      | 2026-11-11 | Remove employee control over complaint visibility and recipients; route submissions through the server-owned HR workflow.                                                                                              |
| 39      | 2026-11-11 | Show complaint live toasts and persistent unread dots in the management navigation, including the collapsed group; include administrators in ordinary review delivery.                                                 |
| 40      | 2026-11-11 | Exclude closed and resolved complaints from the management unread dot while retaining unread inbox history; reopening restores eligible unread state.                                                                  |
| 41      | 2026-11-11 | Simplify complaint sheets to status and one shared comment composer, remove assignment UI and redundant metadata, and guarantee Georgian complaint dates.                                                              |
| 42      | 2026-11-11 | Omit explanatory visibility text from the complaint submission form.                                                                                                                                                   |
| 43      | 2026-11-11 | Acknowledge notifications atomically with successful review actions for the acting account only; preserve other unread complaints and recipients.                                                                      |
| 44      | 2026-11-11 | Put the complainant name and shared avatar in the first column of both complaint tables, matching employee table spacing.                                                                                              |
| 45      | 2026-11-11 | Group complaint detail sheets into a details card and one conversation card containing status controls, comment input and history.                                                                                     |
| 46      | 2026-11-11 | Open complaint details from the whole table row while preserving title links, text selection and nested control behavior.                                                                                              |

## Employee creation and day-off allowance

- Open employee creation in a right shadcn Sheet from the page action; the employee list uses the full available width. Keep the form scrollable and preserve the one-time activation-code dialog.
- Employee profiles also use the full available content width. Profile editing opens in a matching right shadcn Sheet, with the same desktop width, full width on mobile, a fixed title header, and a scrollable form. Label the leave-balance action რედაქტირება.
- Schedule settings define the starting day-off allowance (initially 4) and a toggle for calendar-year resets. Employee creation inherits the company default with an optional override. Employee profiles show remaining days and permit authorized HR adjustments. Approved day offs consume one day; vacations are separate.

## Schedule settings organization

- Group `/manage/schedule` into the rounded tabs განრიგი, დასვენება და შვებულება, and დასწრების წესები below the page title. Show one settings group at a time and preserve unsaved form values while switching tabs. Keep each form save action beside its own content.
- Keep settings cards concise: use clear labels and at most a short, decision-relevant helper. Avoid introductory paragraphs that repeat the fields. Preserve essential consequences such as annual reset timing and continued attendance tracking. Bound narrow policy forms rather than stretching them across the page.

- The personal vacation page shows დასვენების დღეები in a compact blue shadcn Badge and available paid შვებულება in a purple Badge, measured in working days. Omit annual-limit, reset-date, and approval-deduction explanations from this summary.

- The allowance settings tab includes the annual paid-vacation default, initially 24 working days and never below 24. January 1 adds each employee annual vacation allowance while preserving unused days. Keep the vacation addition separate from the day-off reset toggle.
- Do not request a change reason when saving company leave limits, attendance warning thresholds, or attendance reviewer assignments. Record these changes in the audit log with an automatic reason.
- Security policy settings and device approval, rejection, and revocation dialogs have no reason textarea. Retain actor, target, status changes, and automatic descriptions in the audit log.
- Admins, owners, and HR can explicitly approve their own pending browser through the existing device review confirmation dialog, using `attendance.devices.approve.self` alongside device-management permission. Label the row action `საკუთარი მოწყობილობის დადასტურება`; never approve automatically on sign-in. Keep other self-review actions restricted. Record self-approval in the audit log and preserve IP, Passkey, account-status, and current-permission checks.
- Account security uses a bounded layout with the current browser summary before the device history Data Table and a compact password Card. Show device approval and Passkey status separately. When required by company policy, offer the same Passkey setup directly on the clock screen; enrollment must retain HR approval and must never automatically record attendance. Start native enrollment only after the employee selects its action.
- The clock setup prompt contains a contextual Alert and a `მოწყობილობის აქტივაციის მოთხოვნა` button for every new browser, including the first. Sign-in automatically identifies the browser but never submits an HR activation request. Clicking the action submits it; afterward show a disabled `მოთხოვნა გაგზავნილია` button while HR review is pending. In Passkey mode, also offer `Passkey-ის დამატება` after the activation request when no key is saved. Omit browser identity, device-state badges, and configuration links from the clock prompt. The full device summary belongs on account security. Reapplication is explicit for rejected and revoked browsers, with existing keys retained.
- Token-only verification never asks employees to create a key or enter a browser name. Newly identified inactive browsers do not appear in the HR request list or device history until an employee requests activation; they remain visible in their own current-browser summary. Use two switches labeled `ტოკენით გადამოწმება` and `დამატებითი გადამოწმება (Passkey)`. Passkey adds to token verification and is unavailable until token verification is enabled. Turning token verification off also turns Passkey off; turning token verification back on leaves Passkey off. IP rules apply independently. When enabled, Passkey requires both checks and never falls back to token-only verification.
- Bound security settings to a readable content width, with separate Cards for verification settings and network access. Default new policies to automatic browser approval with Passkeys off. Use compact setting descriptions and a right-aligned save action. Device management opens with all devices and uses rounded status tabs, including active registrations with a revocation action. Its Type column reflects the active server policy: blue `Token`, purple `Token + Passkey`, or a secondary `გამორთულია` Badge. Show saved credential presence separately; a retained Passkey must not make a token-only activation appear to require Passkey.

## Sick leave

- Use leave as the umbrella feature. Personal navigation is არყოფნა and management navigation is არყოფნების მართვა. The request type ბიულეტენი means დროებითი შრომისუუნარობა.
- Sick leave opens with a start date and displays მიმდინარე until an end is recorded. Use a local shadcn dialog to record ბიულეტენის ბოლო დღე. Keep diagnosis optional and unnecessary, retain the shared HR review flow, and show sick-leave-specific dashboard and work-confirmation copy. Preserve day-off and paid-vacation badges without introducing a sick-leave allowance.

## Complaint submission

Employees submit the complaint topic, description and category. Do not expose visibility or recipient selectors to employees. The server routes new complaints to HR, administrators and the owner; supervisors receive access only after explicit assignment. Do not show explanatory visibility text in the submission form.

Omit the visibility and assignee columns from the employee complaint table. Retain the underlying access and assignment rules and the management table's review context.

Complaint live notifications use one generic six-second Sonner toast with a view action and an accessible unread red dot beside the management complaint entry and its collapsed management group. Restore unread state on reconnect without historical toast replay. The management dot counts only unread active complaints. Closing or resolving a complaint removes it from that dot, while unread notification history remains in the bell. Marking active complaint notifications read also clears their contribution; toast dismissal does not mark them read.

Complaint sheets use a consistent medium width, a fixed title header and a padded scrollable body. Keep the original complaint, one status-and-comment review form, and a compact conversation/history. Omit action menus, reviewer assignment controls, redundant visibility/assignee metadata and duplicate comment forms. Employee detail has one comment field. Display complaint timestamps with explicit Georgian month names and company-local 24-hour time; do not rely on browser Georgian ICU support. Show history pagination only when multiple pages are needed.

Successful complaint review actions mark existing notifications for the acting account and that complaint read. Clear that account's management dot when no other active complaint has unread notifications. Preserve other recipients and unread complaints, and show the dot again for new replies.

Personal and management complaint tables put the complainant first, using the existing employee avatar plus full-name composition. Show the profile image when present and Georgian initials otherwise. Match the employee tables for column padding and row density.

Both management and employee complaint detail sheets use two shared shadcn Cards: the first groups title, description, author, date and status/category details; the second groups status controls (when authorized), the comment composer and existing comments/review history. Keep the conversation inside one card rather than separating its form from its entries.

Complaint table rows open the detail sheet when clicked on non-interactive content. Preserve real title links for keyboard access and native new-tab behavior. Ignore modified clicks, text selection and nested interactive controls; retain semantic table rows and use the title link as the keyboard target.

## Job details

Group job information, nonempty instructions and change history in separate cards in both the map panel and list sheet. Keep the next permitted progress action visible, and place editing, directions and other permitted transitions in an accessible actions menu. Show the latest three history entries by default and let users expand the remaining loaded entries. Do not repeat the latest change in the information card.

## Notification acknowledgement

The notification bell toolbar uses ყველა შეტყობინების ნანახად მონიშვნა and marks all of the signed-in account's unread notifications read, including older pages. Its enabled state follows the full unread count. The bell dot remains only while unread notifications exist; row controls continue to mark individual entries.

## Attendance directory navigation

The management device table shows the latest decision actor and timestamp together in a `გადაწყვეტილება მიიღო` column, alongside the existing status. Pending requests show that a decision is awaited; never infer a reviewer from the employee identity or current viewer. Preserve approval, rejection, revocation, and self-approval attribution from the persisted decision fields.

The attendance clock enforces an 18-hour combined limit for its retained work date, excluding clocked-out gaps and preserving the total across midnight. When a closed workday reaches the limit, disable another check-in for that date and show a persistent warning Alert explaining why. Automatic checkout is provisional and remains subject to review.

Clicking non-interactive content anywhere in an employee attendance directory row opens /manage/attendance/$userId. Keep semantic table rows and real employee/detail links for keyboard and native new-tab navigation. Ignore modified clicks, text selections and nested interactive controls.

## Weekly employee attendance

The employee detail attendance tab at `/manage/attendance/$userId` defaults to the full current company-local Monday-to-Sunday week and supports a full calendar-month view. Reuse the shared calendar control with previous week, next week and მიმდინარე კვირა actions. Show the complete date range, one session table ordered by check-in time newest first and weekly totals. Today's latest session appears above earlier sessions; past weeks also use newest-first ordering. Preserve validated date URL state, independent hours-tab filters, authorized review controls and overnight session ownership. Missing days are not fabricated absence records.

## Attendance correction transparency

HR and owners can correct other employees' attendance company-wide through an explicit correction permission. Supervisors retain assignment-based correction scope. Show correction and approval controls independently; company-wide correction rights do not imply approval rights. Admins and owners may correct their own attendance only with the explicit attendance.correct.self permission. Self-approval remains forbidden; retain optional reasons, corrected markers, pending review and atomic before/after audits. Employees see a read-only, paginated correction history on their own attendance page, with exact before/after check-in and checkout times including seconds, editor, reason and change timestamp. Preserve every edit, including repeated changes. Use shared Cards and pagination, Georgian labels, and the existing SSE connection to refresh the history.

Do not show a separate correction requests tab while employee-submitted requests are unavailable. Keep correction history on the attendance page.

## Attendance correction sheet

Time corrections open in a right-side shadcn Sheet, full width on mobile and matching the employee sheet width on desktop. Keep a fixed title header and scrollable body. Use one shadcn Card for the employee name, date/time fields, optional reason and save/cancel actions; use a second Card for change history. Date fields use the shared Georgian shadcn Calendar with separately labeled time inputs. Keep the check-in date fixed to its retained work date and permit overnight checkout dates. Omit duplicate current/original-time summaries and explanatory paragraphs. Preserve field errors, required markers, keyboard access and pending-save protection. Attendance approval remains a separate action.

## Timezone presentation

Do not display routine timezone names, labels, footnotes or tooltips in the application. Continue using the configured or historically retained timezone for calculations, date selection, validation and formatting. Keep the company schedule's timezone selector as a functional configuration control, without repeating its value elsewhere.

Display full dates with Georgian month names, for example 10 ნოემბერი, 2026. Retain times and seconds where relevant, and keep machine-readable date values unchanged.

## Employee session details

Keep personal working-hours rows as daily summaries. Mark days containing attendance corrections and provide a სესიები action opening a right-side, read-only shadcn Sheet. Show every clock-in/out as its own Card with exact current timestamps, seconds and status. Mark corrected sessions individually and show the original value beneath each changed time. Preserve overnight dates and paginate sessions server-side, with the selected day and page in validated URL state. Read only the signed-in employee's sessions. Use the existing SSE connection to refresh open details after corrections; show no timezone labels or edit controls.

Attendance and working-hours lists and session sheets omit waiting-for-review badges. Keep corrected, active, approved, rejected and meaningful deviation indicators. Pending state still governs review actions, filtering and operational totals; do not infer approval from the absence of a badge.

## Sidebar group navigation

Personal-space and management sections use static shadcn SidebarGroupLabel titles with their links always visible on desktop and mobile. Section titles do not collapse or open popups. Reserve animated Accordion expansion for navigation items with actual nested children. Administration retains its desktop hover/click popup and mobile Accordion. Preserve permission filtering, active destinations and accessible unread indicators. Accordion transitions and popup animations respect reduced motion.

## Application loading layout

Private-route reload fallbacks reserve the responsive inset shell, sidebar width, header height and content gutters with shared shadcn Skeleton primitives. Keep the authenticated shell mounted while page data loads. Dashboard route and data fallbacks reuse the attendance overview skeleton and its widget grid. Public route fallbacks remain separate. Announce loading once in Georgian, hide decorative placeholders and respect reduced motion; never mount private subscriptions or sample employee records to measure loading layouts.

The management attendance directory shows employee name, company-maintained job position and username, with a link to attendance details. Omit lifetime session counts and the account-status column. Display არ არის მითითებული for missing positions. This directory selects employees; period-based attendance records and worked-hour totals belong in their attendance detail views.

The attendance directory also shows today's recorded attendance state and the latest check-in date/time. An open session, including an overnight one, means სამუშაოზეა. A session belonging to today's company work date means დაფიქსირებულია; no record means არ დაფიქსირებულა, never inferred absence. Attendance-only facts require attendance read permission even for timesheet reviewers. Refresh visible directory data every minute.

Employee attendance detail uses an avatar/name/position/username header, with one attendance workspace and no separate attendance/hour tabs. Attendance shows weekly recorded-time, recorded-day and late-start-day summaries and a seven-day activity strip based only on real sessions. Empty days are not absence. Keep week/month controls above period summaries and history below. Assisted clock actions open in a right-side shadcn Sheet with its default transitions; retain reasons, confirmations and server authorization. Historical corrections continue to use the existing correction Sheet.

Employee attendance uses one page for period totals and detailed sessions, with validated week/month URL state. Existing timesheet bookmarks open the matching month for attendance readers. Summary-only reviewers keep their authorized monthly hour-summary workspace on the same route without a tab strip or detailed session access. Keep historical correction and assisted-action Sheets.

The seven-column attendance activity grid runs Monday through Sunday. Offset the first day of a month to its weekday column, leaving preceding cells blank without inventing out-of-month records. Compact narrow-screen lists retain chronological order.

Correction reasons are optional; blank reasons still retain the full actor/timestamp/before-and-after audit. Manual attendance entry uses a separate attendance.record.manage permission for administrators, owners and HR, and stays separate from device-verified punches. Its Sheet shows employee identity, check-in date/time, an off-by-default checkout Switch and optional note. Enabled checkout requires a valid later time. Reject future times, overlaps and daily-limit violations; mark entries as ხელით აღრიცხული and leave them pending review.

## Network access error documents

Network-blocked document requests show a centered, Georgian Team Adwings error card with the correct 403 status and guidance to use an allowed network or contact an administrator. Access-check failures show a separate 503 message and retry action. These pre-app documents use shadcn Card/Button, Tabler icons and self-contained fallback CSS because application assets may also be blocked. They work without JavaScript, respect the system color scheme and expose no session, IP or database details. API and server-function failures keep their plain-text response contract and all errors remain private and uncached.

Error pages distinguish sign-in, permission, missing-resource, rate-limit, temporary-service, and unexpected failures where a safe status is available. Show Georgian recovery guidance and support references for unexpected failures. Diagnostic console records contain only generated reference IDs, UTC timestamps, source, status, and explicitly allowed technical categories. Never log raw errors, stacks, request URLs, tokens, SQL, IP addresses, or employee details. Expected 404s and permission denials do not need error-level logs. Offline guidance must clarify that writes require a connection.

## Production teams

Use the jobs map for future crew locations. `/manage/teams` owns team names, specialist rosters, optional leaders and deactivation. Transfers explicitly identify the previous team and preserve history. Teams with members must be emptied before deactivation. Device configuration and GPS tracking are separate workflows.

Version 70 (2026-11-17): Added the authorized production-team management workflow and navigation.

Version 71 (2026-11-17): Employee navigation uses a single-person icon; teams retain the multi-person icon. Team creation and management share one right-side sheet with a fixed header/footer and scrollable sections. Transfers are confirmed inline within the sheet, without nested modals.

Version 72 (2026-11-17): Team creation and editing use one complete draft containing the name, roster and optional leader. One footer Save commits all changes atomically. Member selection, transfers, leader changes and deactivation remain local until Save; cancellation discards the draft.

Version 73 (2026-11-17): Team sheets group team information, selected members and employee selection in shared shadcn cards. The specialist picker loads 20 active eligible employees initially, supports debounced name/username and job-title filters, and loads further pages near the end of its scroll area. Keep a keyboard-accessible load-more/retry fallback and preserve the existing single-save draft.

Version 74 (2026-11-17): The team employee picker starts with production specialists selected and offers a labeled checkbox group for Employee, Production Supervisor and Sales Manager roles. Roles combine with name and job-title filters and restart infinite results at page one. HR and platform-administration accounts remain excluded even when they hold another selectable role.

Version 75 (2026-11-17): Place employee role checkboxes in a shadcn filter popover with an icon trigger and selected-role count. Keep name search and job-title inputs compact, icon-assisted and individually clearable, with accessible Georgian labels.

Version 76 (2026-11-17): Preserve the teams directory while an editor loads. Team removal and deactivation use destructive styling and Tabler icons; permanent deletion requires a clear confirmation, retains an audit snapshot and releases members. Disabled teams can be restored. Team history uses the shared collapsible with a Tabler disclosure icon.
