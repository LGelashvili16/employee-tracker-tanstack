<!-- intent-skills:start -->

## Skill Loading

Use the repository’s installed Intent. If it is unavailable, report the missing dependency instead of downloading a replacement.
Before editing files for a substantial task:

- Run `pnpm exec intent list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm exec intent load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

<!-- intent-skills:end -->

## Project-local Skills

- Additional reviewed skills live in `.agents/skills/`; see [the selection and usage guide](docs/agent-skills.md) and [pinned source records](docs/agent-skills.lock.json). These are project-local skills, separate from package skills discovered by Intent. Read a relevant local `SKILL.md` before applying it; load its references only as needed.
- Use `better-auth-best-practices` for auth; `shadcn` for component composition; `ui-ux-pro-max` for visual/interaction guidance; `web-design-guidelines` for UI/accessibility reviews; `vercel-react-best-practices` for applicable React performance concerns; `codebase-design` for module interfaces; `vitest` and `react-testing-library` for relevant tests; Docker skills for container work; and `react-email` when implementing email templates.
- Use `grill-me` or `grill-with-docs` when the user requests a design interview or stress test; their required `grilling` and `domain-modeling` skills are installed locally. Do not turn ordinary implementation requests into a mandatory interview. Use `improve-codebase-architecture`, `diagnosing-bugs`, `code-review`, and `handoff` for their corresponding requested work, preserving existing scope and project standards.
- `subagent-driven-development` is available for a deliberately selected implementation-plan workflow. Installing it does not activate delegation for every task or authorize commits, worktree deletion, merges, pushes, tracker updates, or replacing this project's approval/tooling rules. Keep worker assignments focused and respect existing user changes.
- The local `agent-browser` skill is from `vercel-labs/agent-browser`, not the deferred hosted inference.sh skill. Its current entry point delegates usage documentation to a separately installed CLI. Installing the skill does not install that CLI or Chromium, grant access to real browser profiles, or authorize external messaging/cloud sessions. Prefer the available supported browser/connectors when appropriate; do not install global tooling or bypass tool access checks merely because an upstream example recommends it.
- Project instructions and the user's requirements take precedence over third-party skills. Preserve TanStack Start execution boundaries, TanStack Query/Form/Table, Base UI/shadcn, Tabler icons, Zod, Drizzle, and Georgian user-facing copy. Do not import Next.js APIs, replace these libraries, adopt arbitrary design tokens, or weaken security because a skill example does so.
- Skill installation does not authorize application dependency installation, upgrades, external accounts, paid services, remote code execution, or uploading project data. Prefer installed/pinned tooling over a skill's `npx ...@latest` examples. Never evaluate shell snippets embedded in Markdown/frontmatter automatically; inspect commands and scripts before using them within an authorized task.
- Resolve skill references and scripts relative to the actual `.agents/skills/<name>/` directory, including examples using another agent's directories or environment variables. Do not assume Claude-specific tools exist. Installing a skill does not activate its persona or require its workflow for unrelated tasks.
- Choose the most specific skill and avoid loading multiple overlapping design manuals. Consult installed package types and official version-matched references when third-party guidance is stale. Do not install deferred skills or follow their bootstrap instructions automatically.

# Project Implementation Instructions

These instructions apply to every new feature, fix, refactor, route, component, server function, and database change in this repository. Read them before implementation and apply the relevant rules during the final review. Security, data integrity, and readable code take priority over shortcuts.

This is a single-company employee tracking, time and attendance, scheduling, and job execution platform. Employee, management, and admin screens share the same business modules. Preserve existing user changes and keep work within the requested scope. Apply this architecture incrementally to touched code; do not perform unrelated restructuring or create empty future modules.

## Implementation Workflow

1. Read the applicable `AGENTS.md` files and run the Intent skill discovery above. If Intent is unavailable, report that fact and do not download a replacement.
2. Inspect the existing implementation, `package.json`, lockfile, `components.json`, reusable components, schemas, and relevant library types before designing a replacement.
3. Identify the owning feature, routes, server entry points, permissions, Zod validation, Georgian user-facing copy, data model, and state transitions. Determine whether existing tables and libraries already satisfy the requirement.
4. Check documentation against the installed library versions. Use local skills and installed types first; consult official documentation when APIs or security behavior are uncertain. Do not copy examples for another major version or framework.
5. Implement the smallest complete solution that follows the boundaries below. Explain non-obvious decisions in focused comments.
6. Verify behavior, authorization, data integrity, accessibility, and relevant performance characteristics. Report what changed, how it was verified, and any remaining limitations.

## Product Scope

- The application name is **Teamwork**, with this exact spelling and capitalization in every locale. Use `APP_NAME` from `src/lib/app.ts` for app branding and document-title suffixes. Keep surrounding interface copy Georgian; the product name is a proper name and is not translated.
- Prefer clear sentences without decorative hyphens. Do not use em dashes or en dashes in authored UI copy, comments, documentation, or agent responses. If a dash is necessary, use the short ASCII hyphen `-`. Preserve required hyphens in identifiers, URLs, commands, code operators, and other machine-readable syntax; do not rewrite third-party source snapshots solely for this style rule.
- Payroll, salaries, finance, CRM, sales, customers, opportunities, and quotes are out of scope. Do not add their routes, navigation, modules, permissions, tables, integrations, or reports unless the user explicitly changes this scope.
- Preserve attendance, timesheets, scheduling, jobs, leave, employee/team management, notifications, account settings, and platform administration. Timesheets remain attendance records and are not a payroll feature.
- The route/module foundation is documented in [the application route inventory](docs/application-routes.md). Page shells must clearly distinguish unavailable workflows from working features; never simulate successful writes or fabricate employee records.

## Architecture and Ownership

Use a feature-based modular monolith: one TanStack Start application with clear internal boundaries. Organize by business capability, not by user role or technical layer alone.

```text
src/
  router.tsx                       # Router and request-scoped QueryClient integration
  start.ts                         # Optional global Start middleware/configuration
  routeTree.gen.ts                 # Generated; do not edit manually
  routes/                          # URLs, layouts, guards, loaders, metadata
    __root.tsx                     # Document shell and global assets
    auth/                          # Public authentication pages and auth layout
    _authenticated/                # Target pathless protected application layout
      route.tsx                    # beforeLoad session check and application shell
      manage/                      # Management pages with scoped permissions
      admin/                       # Platform configuration and access administration
    api/                           # Explicit HTTP endpoints
      auth/$.ts                    # Better Auth handler
  features/
    <feature>/
      pages/                       # Complete screens composed from feature UI
      components/                  # Business-specific components
      hooks/                       # Feature-specific reusable React behavior
      <feature>.functions.ts       # Start server-function entry points
      <feature>.queries.ts         # Query options and cache keys
      <feature>.schemas.ts         # Client-safe Zod input schemas
      <feature>.types.ts           # Shared application contracts when needed
      <feature>.rules.ts           # Pure business rules and calculations
      server/
        <feature>.service.server.ts       # Workflows and transaction ownership
        <feature>.repository.server.ts    # Drizzle queries and persistence
        <feature>.policy.server.ts        # Resource-specific authorization
  components/
    ui/                            # shadcn primitives and their variants
    common/                        # Shared composed UI without domain ownership
    layout/                        # Application/auth shells and navigation
  providers/                       # App-wide React providers and AppProviders composition
  contexts/                        # Shared React context definitions and their contracts
  hooks/                           # Hooks genuinely shared across features
  lib/
    auth/                          # Better Auth configuration, client, session, middleware
    authorization/                 # Permission vocabulary and role definitions
    query/                         # QueryClient factory and shared configuration
    env.server.ts                  # Validated private environment configuration
    env.public.ts                  # Explicitly public configuration
  db/
    client.server.ts               # PostgreSQL pool and Drizzle instance
    schema/
      <feature>/                   # Feature-owned table and relation definitions
        <name>.schema.ts            # Drizzle definitions, e.g. auth.schema.ts
        relations.ts               # When separate relation definitions improve clarity
        index.ts
      index.ts                     # Consistent schema exports for runtime/tooling
  server/
    integrations/                  # Private email and storage adapters
    tasks/                         # Background/scheduled task implementations
drizzle/                           # Versioned migrations and migration metadata
scripts/                           # Seed and operational scripts
tests/                             # Integration and end-to-end tests
public/                            # Public static assets; never secrets
```

- Feature examples include auth UI, dashboard, attendance, timesheets, employees, teams, scheduling, jobs, leave, invitations, reports, company settings, locations, integrations, account settings, and audit logs. Create only those required by actual functionality.
- Routes select and compose features. An employee attendance page and a management attendance page must reuse attendance services and rules rather than duplicate them under role folders.
- Keep `__root.tsx` concerned with the document, global assets, and truly global providers. Put auth and application navigation in their respective layouts.
- Directory and flat-file routing are both acceptable when consistent. A pathless `_authenticated` layout does not add a URL segment. Use `-` prefixes for non-route files colocated under `routes/`.
- Preserve working existing route URLs unless the task requires changing them. The tree is a target ownership model, not a mandate to rename every existing path immediately.
- Dependency direction: routes/pages -> feature UI/query options -> server-function wrappers -> services -> policies/repositories/integrations -> database/providers.
- Shared UI must not import business features. Services must not import React, page components, or routes. Avoid circular feature dependencies.
- Cross-feature workflows use deliberate service interfaces or shared contracts; do not reach into another feature's private repository. Reporting may own authorized read queries spanning multiple features.
- Do not add a separate backend, generic repository framework, dependency injection container, event bus, or duplicate API abstraction without a concrete requirement.

## Execution Boundaries and Server Entry Points

- TanStack Start route loaders and `beforeLoad()` can execute during SSR and browser navigation. Never access Drizzle, private environment values, filesystem APIs, or private SDKs directly from those callbacks or React code.
- Put UI-callable `createServerFn` wrappers in `*.functions.ts`. Keep private implementations in `*.server.ts`; use `import '@tanstack/react-start/server-only'` on private infrastructure and entry modules where appropriate.
- A folder called `server/` alone does not enforce a runtime boundary. Do not leak server imports through mixed client/server barrel exports.
- Client code may statically import server-function wrappers. Private imports in those wrappers must be used only inside compiler-recognized server handlers/middleware. Do not mark the wrapper module itself server-only if the UI imports it.
- Keep `.client.ts` for genuinely browser-only utilities. Ordinary interactive React components still participate in SSR; interaction alone is not a reason to mark a module browser-only.
- Server functions validate input, establish authenticated context through middleware, invoke the service, and return minimal safe results. Services own business workflows, authorization policies, transaction boundaries, and coordination.
- Use server functions for internal application calls. Do not create matching REST endpoints and fetch wrappers for every server function.
- Use HTTP server routes for Better Auth, provider callbacks/webhooks, downloads, and actual external/mobile API contracts. Reuse the same services and enforce the appropriate HTTP authentication independently.
- Use read-only methods for reads and POST server functions for mutations. Never change business data through route loading, preloading, or GET requests.
- Keep outbound provider calls in server integration adapters with explicit timeouts, safe errors, and bounded retries. Avoid retrying non-idempotent operations blindly.

## Authentication, RBAC, and ABAC

- Better Auth is the authentication/session authority. Reuse its supported SDK and security features rather than implementing password hashing, cookies, reset flows, or session tokens yourself.
- Every protected page must be covered by a `beforeLoad()` authentication check, preferably inherited from a shared protected layout. Add route-level or inherited permission checks for restricted management/admin sections. Preserve this protection when adding child routes.
- `beforeLoad()` guards, hidden navigation, and disabled controls are navigation/UX protections, not authorization for data access. Every protected server function and API handler must independently check the current valid session and the operation's role/permission/resource scope.
- Use reusable TanStack Start function middleware to establish a trusted actor and common permissions. Use request/server-route middleware for HTTP endpoints as appropriate. Keep resource-specific ABAC and workflow checks in feature policies/services.
- Read the session from server request context through Better Auth. Never trust a client-provided user ID, role, employee ID, permission array, team scope, or `sendContext` value as proof of identity or authority.
- Use an explicit permission vocabulary and centralized role-to-permission mapping. Support multiple roles when required. Check permissions instead of scattering role-name comparisons throughout components and handlers.
- Apply least privilege and deny access by default. Apply record ownership, managed-team scope, job assignment, active employment, and workflow conditions in addition to RBAC.
- Scope list/detail queries, counts, searches, joins, reports, and exports as well as writes. A well-formed ID or unguessable ID does not authorize access to that record.
- Self-service actions derive the subject employee from the authenticated actor. Administrative actions targeting another employee require explicit permission and scope checks.
- Do not let users approve their own timesheets, grant themselves privileges, or change locked or approved attendance records unless an explicitly authorized product rule permits it. Recheck mutable workflow conditions atomically with the write.
- Platform account administration does not automatically grant attendance approval or unrestricted attendance modification. Keep grants explicit and protect high-privilege role assignment.
- Account suspension, employment termination, and permission changes must take effect server-side; revoke sessions or refresh authorization state as appropriate. Do not rely indefinitely on stale role data in a client/session cache.
- Return a minimal current-user/session projection for the UI. Never return raw session tokens, password hashes, provider credentials, or entire private auth/database records.
- Use Better Auth's client SDK for ordinary login, logout, registration, and recovery flows. Preserve the `/api/auth/*` handler. When using `tanstackStartCookies()`, keep it last in the plugin array as required by the integration.
- This is a single-company platform. Do not add organizations, tenant switching, organization route prefixes, or the organizations plugin merely to implement roles or teams. Introduce them only for a justified requirement.
- Default employee onboarding is invitation-only. Enforce invitations in the server-side signup/provisioning flow, not just by hiding registration. Match and verify the invited identity, assign roles server-side, expire/revoke invitations, and make acceptance atomic and single-use. Hash custom invitation tokens at rest. Bootstrap the first privileged account separately.
- Prefer fixed role definitions initially. Add dynamic role-management tables/UI only when editable roles are actually required.

## Security at Trust Boundaries

- Validate untrusted input with Zod at every server boundary: payloads, route/search identifiers, sort/filter choices, pagination, uploads, and relevant external responses. Client validation is for feedback; repeat it on the server.
- Shape validation is separate from authorization. Explicitly select writable fields; do not spread arbitrary input into inserts, updates, role assignments, or account records.
- Preserve Better Auth and Start origin/CSRF protections; configure required protections for cookie-authenticated mutations according to the installed versions. Do not disable them, widen trusted origins/CORS, or weaken cookies to make an integration work.
- Validate redirect/callback destinations against same-origin paths or a strict allowlist, including protocol-relative URL cases. Never redirect directly to an unchecked `returnTo` parameter.
- Keep session cookies HttpOnly and secure in HTTPS production deployments, with appropriate SameSite behavior. Support legitimate local HTTP development without weakening production configuration.
- Configure appropriate rate limits for login, recovery, verification, invitations, and sensitive actions. Use generic unauthenticated recovery responses to avoid account enumeration. Use library-managed expiring, single-use reset/verification flows.
- Keep secrets server-only and validate required environment variables. Public/Vite configuration is observable. Never print, commit, send to the browser, or store credentials/session tokens in localStorage or sessionStorage.
- Render untrusted strings through React escaping. Avoid raw HTML, `eval`, dynamic code execution, and unsafe DOM sinks. If rich HTML is required, use a vetted sanitizer and narrow policy rather than homemade filtering.
- Validate uploads and server-side URL fetching when introduced; enforce ownership, size/type limits, safe storage access, and allowed destinations. Verify webhook signatures using the provider's required raw payload and reject replays where applicable.
- Keep logs and user-facing errors free of secrets, session contents, SQL details, and unnecessary employee/location data. Distinguish validation, unauthenticated, forbidden, not-found, and conflict cases safely.
- Audit privileged access changes, attendance corrections, approvals, attendance exports, and important settings changes with actor, target, action, timestamp, and required reason. Persist audit changes atomically with related writes when necessary; never audit secrets.
- Keep personalized SSR/server responses out of shared/public caches. Do not serialize unnecessary sensitive fields into HTML, query caches, or browser state.

## Mandatory Zod Validation

- Every application form MUST have Zod validation, including authentication, search/filter, settings, modal/dialog, and dynamically generated forms. Integrate the schema with TanStack Form and display field-level and form-level errors. HTML attributes and TypeScript types alone are not validation.
- Every application-owned request carrying input MUST validate that input with Zod before using it: server-function arguments, HTTP JSON bodies, FormData, URL/path parameters, query/search parameters, and application-consumed header/cookie values. Validate route parameters and search state through the supported TanStack Router APIs as well as at the receiving server boundary; never trust browser-side parsing as server validation.
- Keep reusable, client-safe schemas in the owning feature's `*.schemas.ts`. Reuse the appropriate schema or shared field definitions between forms, routes, and server functions instead of allowing their rules to drift. Keep private checks and database-dependent validation on the server.
- Use runtime parsing or the installed Start server-function validator API with a Zod schema; a type assertion or a validator that simply returns unchecked input is insufficient. Normalize/coerce values deliberately, enforce bounds and allowed values, and add cross-field checks such as valid date ranges. Handle malformed input without leaking internals or silently accepting unsafe values.
- Preserve Better Auth and provider-owned protocol validation. Use supported hooks for additional application rules; do not replace auth handlers or consume signed webhook bodies before signature verification merely to add a duplicate parsing layer. Validate application-defined inputs and verified webhook payloads with Zod at their appropriate boundary.
- All displayed validation messages MUST be Georgian, including messages originating from Zod, Better Auth, or external services. Configure explicit messages or a consistent error-code mapping; never expose raw English library errors. Validation does not replace permission checks or database constraints.

## Georgian Language and Localization

- Georgian is the primary and currently the only required product language. All application-authored user-facing text MUST be in Georgian. Do not introduce English copy or untranslated placeholders in new or modified interfaces.
- This includes navigation, headings, buttons, labels, placeholders, form/validation messages, alerts, toasts, dialogs, loading/empty/error/forbidden states, table headers, status/role display names, tooltips, accessible names, image descriptions, page titles/metadata, notifications, emails, and application-generated report/export labels.
- Configure third-party UI labels and formatters so calendars, date pickers, pagination, and similar controls display Georgian text. Set the document language to `ka`; use supported Georgian locales with `date-fns` and `Intl` for consistent SSR/client formatting. Language does not determine a timezone; continue to apply explicit company/site timezone rules.
- Keep code identifiers, route paths, database names, enum/API values, and machine-readable error codes stable; translate their displayed labels. Preserve user-entered content, proper names, and external identifiers rather than automatically translating them.
- Keep repeated product terminology consistent and reuse existing shared copy/error mappings where present. Do not add another language, language switcher, translation service, or a full internationalization framework unless required. Keep copy organized so future localization is practical.
- When verifying a changed screen or flow, check all its states and generated messages for accidental English defaults, including accessibility text and server-originated errors.

## Installed Libraries and UI Reuse

- Inspect existing dependencies and implementations before adding a package or writing custom infrastructure. Prefer the installed library that already solves the requirement; do not introduce competing date, icon, form, table, state, auth, or ORM libraries without a demonstrated gap.
- Use the installed TanStack libraries when their functionality is needed:
  - Router/Start for routing, loaders, search parameters, server functions, and middleware.
  - Query for shared server state, caching, mutations, invalidation, and refetching.
  - Form with Zod for application forms and validation.
  - Table for tables needing sorting, filtering, selection, pagination, or other data-grid behavior.
  - Hotkeys for application shortcuts, with appropriate focus/input scoping and cleanup.
- Use Zod for runtime schemas, `date-fns` for supported date operations, and `@tabler/icons-react` for icons. Verify timezone support before assuming a date helper handles named zones; add a dependency only for an actual uncovered requirement.
- Use shadcn components from `src/components/ui` for all corresponding UI controls and patterns: calendar/date picker, input, label/field/form, card, table, badge, button, switch, checkbox, radio group, select, dialog, sheet, tabs, alerts, and other available primitives.
- Do not recreate existing shadcn controls using raw interactive elements or a second component library. Normal semantic HTML for page structure/content and the internals of shared primitives remains appropriate.
- Inspect `components.json` and honor the configured Base UI/shadcn style, aliases, icon library, tokens, and established composition APIs. Do not paste incompatible Radix or older-version examples.
- If a required shadcn primitive is missing, add/adapt only that component using the installed tooling and project conventions. Do not install the entire catalog or add unused components.
- Compose shadcn presentation with TanStack behavior, such as shadcn Table + TanStack Table and shadcn Field/Input + TanStack Form. Preserve labels, validation messages, keyboard access, focus management, and accessible names.
- Do not add a library to a feature solely to demonstrate its use when its functionality is unnecessary. Reuse existing variants/styles and responsive patterns instead of accumulating ad hoc overrides.

## React, Components, and Readability

- Organize app-wide React state consistently: provider components belong in `src/providers/`, context definitions and their contracts in `src/contexts/`, and consumer hooks such as `useModal()` and `usePwa()` in `src/hooks/`. Keep feature-specific providers, contexts, and hooks inside their owning `src/features/<feature>/` module unless they are genuinely shared.
- Compose app-wide providers in `src/providers/app-providers.tsx` and mount `AppProviders` from the root document. Preserve provider dependency order and keep context definitions independent of their provider implementations to avoid circular imports. Do not add empty providers or contexts for hypothetical future use.
- Reuse the global dialog through `useModal()` from `#/hooks/use-modal` when a dialog must open from different parts of the app. It accepts complete JSX components with children; follow [the global dialog usage guide](docs/global-dialog.md). Keep feature-owned dialogs local when global coordination is unnecessary.
- Use the existing shadcn `Skeleton` component for page, section, card, and table loading states. Compose reusable, feature-appropriate skeleton layouts that match the loaded content's dimensions, preserve layout, and include one Georgian accessible status with `aria-busy`; hide decorative placeholders from assistive technology and respect reduced motion. Reuse `src/components/common/page-skeleton.tsx` for the generic route fallback. Show skeletons only while loading, never as a substitute for an empty/error/unimplemented state or with an artificial delay.
- Async action buttons MUST use the existing shadcn `Spinner` while pending, retain a meaningful Georgian label, expose `aria-busy`, and disable repeat submission as appropriate without changing button dimensions. Do not use a page skeleton inside a button or recreate spinner icons ad hoc.
- Keep shadcn Skeleton as the default loading primitive. Skullet was reviewed as a sample-content measurement alternative; the current shared layouts do not justify another dependency or rendering sample components merely to calculate placeholders. Reconsider it only for a demonstrated layout-consistency problem after verifying Start SSR/hydration, accessibility, reduced motion, and the absence of side effects or private data in sample content.
- Follow React best practices on every React implementation, fix, and refactor. Load the installed `vercel-react-best-practices` skill and its task-relevant references, applying the React guidance compatible with TanStack Start and the installed React version. Do not copy Next.js-specific APIs or introduce competing data libraries from its examples.
- Write strict, human-readable TypeScript with descriptive domain names, narrow types, explicit data flow, and early returns. Avoid `any`, unsafe casts/non-null assertions, and non-explanatory suppressions when a correct type or runtime check is possible.
- Keep route files and page components focused on composition. Keep components small and responsible for one coherent task; split large forms, tables, dialogs, and mixed data/mutation/render logic into meaningful units. Aim for roughly 150-200 lines for ordinary components; this is a review signal, not a reason to create arbitrary tiny files.
- Keep business rules and persistence out of React components. Extract hooks for reusable or substantial React behavior, not every callback.
- Use explanation comments for non-obvious business rules, security boundaries, concurrency decisions, timezone behavior, and integration quirks. Explain why and the constraint being preserved; avoid comments that merely restate obvious code.
- Keep helpers and constants feature-local unless genuinely shared. Use specific names such as `calculateWorkedMinutes` instead of broad miscellaneous helper files. Do not create duplicate global `types`, `utils`, or `services` dumping grounds.
- Use one import alias convention consistently with touched code; prefer the existing `#/` application alias without unrelated alias churn or breaking shadcn generation.
- Keep server data in Query, shareable filters/pagination in validated Router search parameters, form state in Form, and transient UI state locally. Use context for appropriate shared UI concerns. Do not add Redux/Zustand without a real state-management requirement.
- Avoid `useEffect` whenever it is unnecessary. Before adding an effect, first consider render-time derivation, event handlers, Router loaders/guards/search state, Query options/mutations, TanStack Form, or an existing subscription hook. Do not use effects for routine fetching, copying query/prop data into state, deriving values, responding to a known user action, or chaining state updates that can be expressed directly.
- Use an effect only when genuine synchronization with an external system is required, such as an imperative third-party widget, subscription, or timer not already handled by an existing hook/library. Add a focused explanation comment identifying that external system and why an effect is needed. Provide complete dependencies and cleanup, and make setup/cleanup safe under Strict Mode and remounting.
- Do not evade this rule by moving unnecessary effects into custom hooks, replacing them with `useLayoutEffect`, suppressing dependency lint rules, or adding run-once ref flags. Keep necessary effects narrowly scoped; preserve correct behavior when removing existing effects.
- Browser APIs must be SSR-safe. Keep initial rendering deterministic and avoid timezone, locale, random-value, or current-time hydration mismatches. The server remains authoritative for attendance timestamps.
- Include loading, empty, error, forbidden, and pending states where applicable. Prevent duplicate submissions while still enforcing concurrency and idempotency server-side. Maintain responsive layouts and accessible keyboard behavior.

## Page Head and Titles

- Every new or modified page MUST define or update its route-appropriate head metadata and a meaningful, distinct Georgian document title using TanStack Router's supported `head` API. Keep a consistent application-name suffix where appropriate. The root title is a fallback, not the title for every screen.
- Keep document-wide defaults such as charset, viewport, and document language in the root route. Own page-specific titles and relevant descriptions in the corresponding page route; avoid conflicting or duplicate metadata. Update metadata when a page's purpose changes.
- For detail pages, derive titles from authorized loader data when appropriate, with a safe fallback for unavailable data. Do not disclose private employee, attendance, or other sensitive details in titles, descriptions, or social metadata.
- Ensure head content is correct during SSR, hydration, and client-side navigation, including navigation between nested pages. Do not set `document.title` or inject metadata through `useEffect` or manual DOM manipulation.
- Verify the browser title and relevant head content when implementing or changing a page. Include a focused assertion in existing relevant route/browser tests when warranted; do not add a test suite merely to mirror static metadata.

## Query and Cache Architecture

- Define feature query keys and `queryOptions` in `<feature>.queries.ts`. Reuse the same options in route loaders and components; do not maintain independent fetching implementations or redundant caches for the same data.
- Create a fresh QueryClient inside `getRouter()` for each SSR request. Integrate the documented Router/Query SSR mechanism for installed versions; do not create a process-wide cache that can mix users' data or duplicate providers/dehydration.
- Include identity/scope and all result-affecting filters in query keys and appropriate `loaderDeps`. Cache keys do not authorize access. Clear account-specific caches on logout or identity change and invalidate affected data after permission changes.
- Choose stale times, retries, polling, and invalidation intentionally. Avoid accidental duplicate reads, aggressive refetch loops, and retrying forbidden/validation failures. Keep ordinary Query state separate from Better Auth's auth authority.
- After mutations, update or invalidate every affected feature summary/list/detail as needed. Use optimistic updates only when correctness, rollback, and reconciliation are clear; do not misrepresent attendance/approval/clock state.

## Drizzle Schemas and Documentation

- Drizzle ORM is required for application persistence. Use its typed query builders and parameterized `sql` helpers when necessary; do not introduce another ORM or interpolate untrusted values into SQL/identifiers.
- New Drizzle table-definition files MUST use the singular dotted suffix `<name>.schema.ts`, such as `auth.schema.ts`, `employees.schema.ts`, or `attendance.schema.ts`, inside the owning feature's schema directory. Do not name new definitions `tables.ts`, `auth-schema.ts`, or `<name>.schemas.ts`. Reserve the plural `<feature>.schemas.ts` suffix for Zod validation schemas. Schema indexes, shared column helpers, and separate relation files keep their descriptive names. Keep generator output paths and index exports aligned with this convention when adding or renaming schema files; do not rename unrelated existing files solely to enforce it.
- Prefer UUIDv7 instead of UUIDv4 for new application/domain primary keys when UUID identifiers are appropriate. Do not add a UUID merely where an existing natural/composite key is sufficient, and do not use `uuid().defaultRandom()` or `crypto.randomUUID()` as an accidental UUIDv4 fallback for these primary keys.
- Shared column factories are available in `src/db/schema/_shared/columns.ts`: `uuidv7PrimaryKey()`, `createdAt()`, `updatedAt()`, and `timestamps()`. Import them explicitly from `#/db/schema/_shared/columns` and reuse them for matching new domain columns instead of duplicating definitions. Each call returns fresh builders; use `...timestamps()` per table rather than a shared instantiated object. Keep beginner-friendly domain explanation comments at each table's field declarations as well.
- `uuidv7PrimaryKey()` generates ``uuid('id').default(sql`uuidv7()`).primaryKey()``. The configured Docker database is PostgreSQL 18. Verify native `uuidv7()` availability in every actual deployment target before introducing a migration using this default; older PostgreSQL requires an explicitly chosen compatible implementation or upgrade, not a silent UUIDv4 fallback or an unreviewed extension install.
- Preserve existing IDs, Better Auth/provider-managed generation, and foreign-key type compatibility. Do not convert auth text IDs or existing UUIDv4 records just to adopt the helper. Any required ID/type conversion needs a separately scoped migration and data/reference plan. Use the existing Zod library's supported UUIDv7 validation when a boundary specifically requires a new UUIDv7 identifier; keep validation compatible with legitimate existing IDs.
- UUIDv7 identifiers expose approximate creation order/time. They do not replace ownership/permission checks and must not be used as session, invitation, password-reset, or other secret bearer tokens.
- The timestamp factories use timezone-aware columns. `createdAt()` defaults to database time; `updatedAt()` defaults on insert and uses the application server clock through Drizzle's `$onUpdate`. This is an ORM runtime hook, not a database trigger: raw SQL, external writers, and explicit timestamp overrides require deliberate handling. Do not treat `updatedAt` as a tamper-proof audit trail or apply these instant helpers to date-only values or every specialized timestamp automatically.
- Organize schemas by business feature under `src/db/schema/<feature>/`, including an auth directory for Better Auth tables when organizing that area. Keep relations beside the owning tables or in a clear `relations.ts`. Maintain consistent exports for runtime and Drizzle Kit discovery.
- Create only tables, columns, enums, join tables, and PostgreSQL schemas required by a concrete workflow or integrity constraint. A feature directory does not imply creating a PostgreSQL namespace. Do not add speculative history/EAV tables, duplicate auth identities, or generic abstractions.
- Every schema/table definition MUST have an explanation comment describing its purpose, what one row represents, ownership, and important lifecycle behavior in beginner-friendly language.
- Every column MUST have an adjacent explanation comment describing what it stores. Explain nullability, defaults, units, timezone, references, generated values, and sensitive information where applicable. Document status values and non-obvious constraints/indexes as well. Apply this to all new/changed definitions and bring a touched existing table's columns into compliance.
- Example: `/** UTC instant when this working session ended; null while the employee is clocked in. */` above an `endedAt` column. Explain the domain meaning, not just the SQL type.
- Keep auth users, employee records, team memberships, role grants, and job assignments conceptually separate. Reuse existing entities; an employee can exist before an account is activated.
- Define correct primary keys, unique constraints, nullability, check constraints, foreign-key references, and deliberate delete/update actions. Drizzle relation metadata supports querying; it does not replace database foreign-key constraints.
- Do not cascade-delete attendance or audit history merely because an auth account is deleted. Model deactivation/retention behavior deliberately; avoid soft-delete columns on every table without a requirement.
- Infer persistence types from Drizzle and input types from Zod where appropriate. Expose explicit minimal application DTOs instead of returning complete rows or duplicating every database type manually.
- Preserve required Better Auth schema contracts and adapter compatibility. When generating auth schema, review output and retain required explanation comments through the supported source/regeneration workflow. Do not run unpinned latest generators against an older installed auth version.

## Database Integrity and Performance

- Reuse the PostgreSQL pool and Drizzle client within a server process; do not create a new pool per request. Keep database initialization server-only.
- Use transactions for multi-step operations that must succeed together. Services own transaction boundaries, and participating repositories must use the same transaction client.
- Prevent races with database constraints, conditional writes, or appropriate locking. A separate read-then-write check alone does not prevent concurrent clock-ins, double approvals, or conflicting corrections. Handle conflicts as understandable application results.
- Index actual access patterns: selective filters, relevant foreign-key joins, ordering, and uniqueness. PostgreSQL does not automatically index referencing foreign-key columns. Evaluate needed indexes rather than blindly indexing every column.
- Choose composite column order, partial indexes, and unique partial indexes deliberately; for example, enforce one open attendance session per employee. Avoid indexes duplicating primary-key or unique-constraint indexes, and account for write/storage cost.
- Use `pg_trgm` with a suitable GIN/GiST index only when substring/fuzzy search and realistic data justify it. Add the extension/index through a reviewed migration and use matching query operators. Do not enable trigram search on every text column; use simpler equality/prefix search when sufficient.
- Select only needed columns, apply authorization/filtering in SQL, bound page sizes and date ranges, and use deterministic ordering. Use cursor/keyset pagination for large/deep lists when justified. Avoid unbounded exports loading everything into memory.
- Avoid N+1 queries; use appropriate joins, batched reads, and SQL aggregation. Do not fetch entire tables to filter, sort, or sum them in JavaScript. Validate/allowlist dynamic sort columns and operators.
- Investigate important slow queries using realistic non-production data and query plans, including `EXPLAIN (ANALYZE, BUFFERS)` when safe. Do not claim performance based only on adding an index or a cache.
- Store instants consistently with timezone-aware PostgreSQL timestamps where appropriate and clear UTC application semantics. Distinguish date-only values from instants. Company/site timezones, overnight shifts, daylight saving, break rules, and reporting-period boundaries must be explicit.
- Keep attendance clock state, job-time allocation, and job completion distinct. Compute authoritative durations from persisted server timestamps and business rules, not a browser counter or client clock.
- Commit and inspect generated migrations and required backfills. Verify schema discovery when moving files, preserve existing data, and use staged changes for new required columns. Do not use destructive pushes/resets or unreviewed production migrations as a shortcut.

## Background Work, Verification, and Delivery

- Background tasks reuse services with an explicit trusted system actor where necessary. Use an actual scheduler/worker and idempotent processing for durable jobs, bounded retries, and safe provider interactions; do not rely on request-lifetime timers or silently add queue infrastructure without need.
- Add meaningful tests for new business rules, permissions/scopes, untrusted input, and state transitions. For auth-protected work, test unauthenticated, forbidden, allowed, and out-of-scope access, including direct server calls rather than only guarded navigation.
- When tests are needed, use Vitest for unit/integration tests and React Testing Library for React component and hook behavior. Load the corresponding local skills. Use user-event and DOM matchers where appropriate, prefer accessible role/label queries and Georgian visible text, and assert observable behavior rather than internal state or implementation details.
- Cover critical database behavior with integration tests: concurrent clock-in, atomic corrections/audits, duplicate actions, and locked attendance periods. Cover representative employee and manager browser workflows when their behavior changes.
- Reuse existing test setup and helpers; Vitest and React Testing Library are the required defaults when introducing this coverage. If they are missing and the implementation warrants tests, add only the minimal compatible test dependencies/configuration required for the task. Keep browser end-to-end testing in the appropriate browser tooling. Do not add trivial tests mirroring implementation or install test tooling for a documentation-only/cosmetic change. If required coverage cannot run because infrastructure is missing, state that clearly rather than claiming it passed.
- Run checks appropriate to the change using repository tooling: targeted lint/format, TypeScript checking, relevant tests, and a production build when runtime boundaries, routes, or integration behavior change. Check generated route/schema artifacts through their tools; never hand-edit `routeTree.gen.ts`.
- Avoid whole-repository format/fix commands that rewrite unrelated files. Preserve the lockfile unless dependencies actually change. Do not install or upgrade packages silently to solve a version mismatch.
- Before finishing, inspect the diff for accidental scope changes, missing protection or Zod validation, leaked fields, missing schema/column comments, inefficient queries, duplicate components, unnecessary effects, missing meaningful tests, missing/outdated page titles or head metadata, untranslated user-facing text, and broken imports. Summarize validation and unresolved issues accurately.

## Official References

Consult versions compatible with the installed packages; current websites may describe newer APIs.

- [TanStack Start execution model](https://tanstack.com/start/latest/docs/framework/react/guide/execution-model)
- [Server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions), [middleware](https://tanstack.com/start/latest/docs/framework/react/guide/middleware), and [import protection](https://tanstack.com/start/latest/docs/framework/react/guide/import-protection)
- [TanStack Router file conventions](https://tanstack.com/router/latest/docs/routing/file-naming-conventions) and [Start/Query integration](https://tanstack.com/start/latest/docs/framework/react/guide/tanstack-query)
- [Better Auth TanStack integration](https://better-auth.com/docs/integrations/tanstack) and [security](https://better-auth.com/docs/reference/security)
- [Drizzle indexes and constraints](https://orm.drizzle.team/docs/indexes-constraints) and [transactions](https://orm.drizzle.team/docs/transactions)
