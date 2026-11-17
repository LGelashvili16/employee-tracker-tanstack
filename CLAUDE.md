# Claude Code project instructions

Follow the shared repository instructions:

@AGENTS.md

Keep project rules in `AGENTS.md` and the linked guides rather than duplicating them here. Read any applicable nested `AGENTS.md` before changing files in its scope.

Use these existing references as required by the task:

- [UI and design guidelines](docs/ui-design-guidelines.md): required before UI changes or reviews.
- [Application routes](docs/application-routes.md): route inventory and feature ownership.
- [Local skill guide](docs/agent-skills.md) and [pinned sources](docs/agent-skills.lock.json): skill selection and installation records. Skill instructions live in `.agents/skills/`; do not assume a separate `.claude/skills/` copy exists.
- [Authorization](docs/authorization.md): permissions and access rules.
- [Employee accounts](docs/employee-accounts.md): onboarding, account management and audit behavior.
- [Attendance review](docs/attendance-review.md) and [timesheets](docs/timesheets.md): attendance workflows and recorded hours.
- [Global dialog](docs/global-dialog.md): shared dialog composition and pending-action behavior.
