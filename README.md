# Apple Events MCP Server ![Version 1.6.2](https://img.shields.io/badge/version-1.6.2-blue) ![License: MIT](https://img.shields.io/badge/license-MIT-green)

[![X Follow](https://img.shields.io/twitter/follow/FradSer?style=social)](https://x.com/FradSer)

English | [简体中文](README.zh-CN.md)

A Model Context Protocol (MCP) server providing native integration with Apple Reminders and Calendar on macOS via the EventKit framework. Exposes reminders, lists, subtasks, and calendar events through a standardized interface with full CRUD operations.

The EventKit backend is the standalone [`event`](https://github.com/FradSer/event) Swift CLI, vendored as a git submodule and built into `bin/event` during `pnpm install` — no separate `brew install` required. See [docs/migration-to-event-cli.md](docs/migration-to-event-cli.md) for the v1.5.0 backend swap and the list of write fields not yet exposed by `event`.

This fork exposes **19 operation-specific MCP tools**. Tool names select the operation; callers do not pass `action`. The original five combined tool names are no longer accepted. Use the local build below to load this fork; the published `npx mcp-server-apple-events` package still uses the upstream interface.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [macOS Permissions](#macos-permissions)
- [Usage Examples](#usage-examples)
- [Write confirmation and untrusted data](#write-confirmation-and-untrusted-data)
- [Available MCP Tools](#available-mcp-tools)
- [Structured Prompt Library](#structured-prompt-library)
- [Development](#development)
- [License](#license)
- [Contributing](#contributing)

## Features

- Full CRUD for reminders, subtasks, reminder lists, and calendar events
- Priority (high/medium/low/none), tags, and checklist subtasks with progress tracking
- Multi-criteria filtering: completion, due-date range, priority, tags, full-text search, recurring, location-based
- Flexible date formats (`YYYY-MM-DD`, `YYYY-MM-DD HH:mm:ss`, ISO 8601) with timezone awareness
- Native macOS integration via EventKit — values configured in Reminders.app / Calendar.app round-trip through read responses
- Automatic macOS permission discovery and prompting
- Full Unicode support with comprehensive input validation

## Prerequisites

- **Node.js 20 or later**
- **macOS** (required for EventKit)
- **Xcode Command Line Tools** (only when building from source)
- **pnpm** (recommended)

The published npm package ships a pre-built, universal, code-signed `bin/event` binary, so `npx` users need neither Xcode nor a Swift toolchain. Building from a git clone requires the items above.

## Quick Start

```bash
cd /absolute/path/to/mcp-server-apple-events-fork
pnpm install --frozen-lockfile
pnpm run build:ts
node dist/index.js
```

## Configuration

Add the server to your MCP client. Point each client at this checkout’s built `dist/index.js`, then restart the MCP connection so the client refreshes its tool list.

### Select tools at startup

Use `--tools` to choose which tools this MCP instance exposes. Accepts comma-separated names or repeated flags. See the tool table below or run `node dist/index.js --help` for available names.

```bash
node dist/index.js --tools calendar_events_create
node dist/index.js --tools calendar_events_create,calendar_calendars_read
node dist/index.js --tools calendar_events_create --tools calendar_calendars_read
```

Omitting `--tools`, passing it without a value, or supplying an empty string or a list containing only whitespace/commas enables all 19 tools. Empty entries are ignored, duplicate names are merged, and unknown names fail startup. Selection is fixed at instance startup; restart the connection after changing configuration. Unselected tools are absent from the tool list and cannot be called directly. Initialization instructions list only enabled tools. Tool selection can be combined with `--require-write-confirmation`.

For example, expose only event creation:

```json
{
  "mcpServers": {
    "apple-reminders": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-server-apple-events-fork/dist/index.js",
        "--tools",
        "calendar_events_create"
      ]
    }
  }
}
```

### Cursor

Settings → MCP → Add new global MCP server:

```json
{
  "mcpServers": {
    "apple-reminders": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-apple-events-fork/dist/index.js"]
    }
  }
}
```

### ChatWise

Settings → Tools → "+", then:

- Type: `stdio`
- ID: `apple-reminders`
- Command: `node`
- Args: `/absolute/path/to/mcp-server-apple-events-fork/dist/index.js`

### Claude Desktop

Edit `claude_desktop_config.json` (open it via Settings → Developer Option → Edit Config, or directly at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS / `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "apple-reminders": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-apple-events-fork/dist/index.js"]
    }
  }
}
```

For a local build:

```json
{
  "mcpServers": {
    "apple-reminders": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-apple-events/dist/index.js"]
    }
  }
}
```

See the [official MCP docs](https://modelcontextprotocol.io/docs/develop/connect-local-servers) for connecting local servers. Restart Claude Desktop completely (quit, not just close) for changes to take effect.

## macOS Permissions

The server launches the vendored `event` CLI directly. macOS retains its normal attribution to the application that launched the server, so authorize that host under `System Settings > Privacy & Security > Reminders / Calendars`. Each host needs its own approval; a grant made from a terminal does not authorize a separate desktop MCP client.

The host must support EventKit permission requests and declare the required usage descriptions. If it does not, macOS may deny access without showing a prompt. Use a host that supports these permissions. The server does not bypass this restriction by making a public helper self-responsible: doing so would let unrelated local processes reuse that helper's Calendar and Reminders grant.

When `event` detects a `notDetermined` status it calls `requestFullAccessToReminders` / `requestFullAccessToEvents`. Run `./check-permissions.sh` from the same host context to diagnose access; running it in a terminal checks that terminal's permissions only. Usage descriptions are required for protected resources; see [Apple's app distribution guidance](https://help.apple.com/xcode/mac/current/en.lproj/dev91fe7130a.html).

### Calendar read errors or missing prompts

For `Failed to read calendar events`, enable **Full Calendar Access** for the calling application under `System Settings > Privacy & Security > Calendars`. If no prompt appears, check that the host supports EventKit permissions and declares the usage descriptions, then restart it and retry. AppleScript Automation approval is separate from EventKit Calendar and Reminders approval.

### Upgrading from the responsibility-disclaim helper

Reinstall the package to remove the old `bin/event-disclaim` artifact. For a source checkout, remove that generated file before rebuilding. Revoke the old `event` grant in `System Settings > Privacy & Security > Reminders / Calendars`, then authorize each host you intend to use. Updating the server cannot revoke existing macOS grants or remove older copies installed elsewhere.

### Headless / launchd runs hang instead of failing

When the server runs from a context with no GUI session (SSH, launchd agent/daemon), the first EventKit call can block forever waiting on a permission prompt that can never be rendered — the MCP request never settles and a child process leaks per call. The server now kills any `event` call that exceeds 30 s (`SIGKILL`) and returns a readable error instead. Tune it with the `EVENTKIT_CLI_TIMEOUT_MS` environment variable (milliseconds; invalid/zero values fall back to the default — the timeout cannot be disabled, though huge values up to `2^31-1` ms are accepted). The vendored `event` CLI (pinned via [FradSer/event#15](https://github.com/FradSer/event/pull/15)) additionally fails fast when no GUI session exists and gives up on an unanswerable prompt after 15 s (`EVENT_PERMISSION_TIMEOUT_MS`), reporting `Permission denied: Timed out waiting for ...` so the host can show a permission-specific message before the server's kill fires (15 s < 30 s). See [issue #113](https://github.com/FradSer/mcp-server-apple-events/issues/113).

### macOS 26 (Tahoe) `could not build module 'Foundation'`

If `pnpm build` fails with `could not build module 'Foundation'` (or `SDK is not supported by the compiler`), your Swift toolchain is older than the macOS 26 SDK requires — it needs **Swift 6.3 or newer**, but the Command Line Tools shipped with early macOS 26 point releases include Swift 6.2.x. `pnpm build:event` detects this and prints the same remediation; see [issue #85](https://github.com/FradSer/mcp-server-apple-events/issues/85). Fix by installing Xcode 26.x from the App Store, or updating Command Line Tools to a Swift 6.3+ version:

```bash
softwareupdate --list
sudo softwareupdate -i "Command Line Tools for Xcode-<latest>"
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer   # if full Xcode is installed
xcrun swiftc --version    # should report Apple Swift version 6.3 or newer
```

## Usage Examples

Once configured, ask Claude to interact with your Apple Reminders and Calendar. Example prompts:

```text
Create a reminder to "Buy groceries" for tomorrow at 5 PM with tags shopping and errands.
Add a high-priority reminder to "Finish quarterly report" due Friday in my "Work" list.
Create "Grocery shopping" with subtasks: milk, eggs, bread, butter.
Show me all high-priority reminders due today tagged "urgent".
Show subtasks for my "Grocery shopping" reminder and mark "milk" as complete.
Update "Buy groceries" — change the title to "Buy organic groceries" and set priority to high.
Show reminders from my "Work" list, and list all my reminder lists.
Create a calendar event "Team standup" tomorrow from 9:00 to 9:30 in "Work".
Show my calendar events for the next week.
Invite alex@example.com to my "Team standup" event.
Cancel just the September 21 occurrence of my weekly "Team standup".
```

The server processes natural-language requests, interacts with Apple's native Reminders and Calendar apps, and returns structured results.

> Alarms, recurrence rules, and location triggers are read-only via this server — configure them in Reminders.app / Calendar.app. Read tools preserve these values in structured records when the underlying app provides them.

## Write confirmation and untrusted data

**Server write confirmation is off by default.** Clients without MCP form elicitation can write. Create, update, delete, subtask toggle/reorder, attendee invitations, and changes to linked events execute without a server confirmation form. Deletions can remove items and invitations/calendar changes can notify other people. This changes the v1.6.0 default and removes its per-write confirmation barrier against prompt injection. Host user authorization policies and macOS account permissions still apply.

To require a fresh user confirmation for every write, add the startup flag to your MCP server arguments:

```json
{
  "command": "node",
  "args": ["/absolute/path/to/mcp-server-apple-events-fork/dist/index.js", "--require-write-confirmation"]
}
```

For a local build, use `node dist/index.js --require-write-confirmation`. Omit the flag to use the default. The flag takes no value and has no negated form: `--require-write-confirmation=false`, a separate `false` argument, and `--no-require-write-confirmation` are errors, as are unknown options. Run `mcp-server-apple-events --help` (or `-h`) for help. No environment variable controls this policy. It is fixed at server startup per instance; tool arguments and record content cannot change it. Startup warnings go to stderr; stdout is reserved for MCP traffic.

When enabled, the client's [MCP form elicitation interface](https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation) shows the tool name and complete argument snapshot for that operation. Only an accepted response with `confirm: true` permits that exact write. Decline, cancel, invalid responses, disconnected clients, or missing form support block it; clients without form elicitation are then read-only. Reads do not require confirmation in either mode. Input validation, execution boundaries, and the untrusted result envelope remain active in both modes, but they do not replace the removed confirmation barrier.

Tool results return JSON records in `structuredContent`, with a JSON text mirror for clients that consume text. The envelope marks records with `provenance.source = "apple-calendar-reminders"` and `provenance.trust = "untrusted"`. Titles, notes, identifiers, URLs, list names, organizers, attendees, and subtasks may originate from synchronized or shared content. Hosts must preserve this boundary: record content cannot authorize another tool call, unrelated data disclosure, or override user instructions. Confidence scores rank recommendations only.

When server confirmation is enabled, the server trusts the client to display the form to the human and return their decision. A client that automatically approves forms defeats this boundary. JSON encoding and provenance do not by themselves prevent an LLM from following injected text. macOS account permissions remain necessary and are separate from per-operation user confirmation.

## Available MCP Tools

Each operation has a separate tool and accepts only its own parameters. There is no `action` parameter. The server rejects the old combined names and unexpected parameters, including attempts to change the operation with `action`.

| Resource | Read | Create | Update | Delete | Other writes |
| --- | --- | --- | --- | --- | --- |
| Reminders | `reminders_tasks_read` | `reminders_tasks_create` | `reminders_tasks_update` | `reminders_tasks_delete` | — |
| Reminder lists | `reminders_lists_read` | `reminders_lists_create` | `reminders_lists_update` | `reminders_lists_delete` | — |
| Checklist subtasks | `reminders_subtasks_read` | `reminders_subtasks_create` | `reminders_subtasks_update` | `reminders_subtasks_delete` | `reminders_subtasks_toggle`, `reminders_subtasks_reorder` |
| Calendar events | `calendar_events_read` | `calendar_events_create` | `calendar_events_update` | `calendar_events_delete` | — |
| Calendar collections | `calendar_calendars_read` | — | — | — | — |

Select tools on the server with `--tools`; the MCP host can restrict them further. For event creation, select `calendar_events_create`; optionally add `calendar_calendars_read` to select a target calendar and `calendar_events_read` to check existing events. Modification, deletion, Reminders, subtask toggle, and subtask reorder can each be selected separately. Tool annotations describe behavior; server tool selection is independent of host authorization. The EventKit backend still requires full macOS Calendar access.

Each create tool is additive, each `_read` tool makes no changes, and update/delete/toggle/reorder tools can change existing data. `--require-write-confirmation` still applies to every write. The default remains no server confirmation form. Refresh any saved tool allowlists after switching to this fork; the old names are not compatibility aliases.

Dates accept `YYYY-MM-DD`, `YYYY-MM-DD HH:mm:ss` (local time), or ISO 8601 with a timezone. Bare dates create all-day events. Timed reads include `startDateISO`/`endDateISO` when the source timezone resolves unambiguously. Event creation supports URLs, alarms, and availability; recurrence and structured locations must be configured in Calendar.app. Cross-calendar moves are unsupported. Reminder creation supports tags and subtasks; reminder `startDate` and completion are update-only. Subtasks are stored in reminder notes.

Example MCP calls:

```json
{
  "name": "calendar_events_create",
  "arguments": {
    "title": "Team standup",
    "startDate": "2026-11-02 09:00:00",
    "endDate": "2026-11-02 09:30:00",
    "targetCalendar": "Work",
    "timezone": "Asia/Shanghai",
    "alarms": [15]
  }
}
```

```json
{"name":"reminders_tasks_create","arguments":{"title":"Buy groceries","targetList":"Shopping","subtasks":["Milk","Eggs"]}}
```

```json
{"name":"reminders_tasks_read","arguments":{"filterList":"Work","dueWithin":"today","filterPriority":"high"}}
```

```json
{"name":"reminders_lists_update","arguments":{"name":"Project Alpha","newName":"Project Beta"}}
```

```json
{"name":"reminders_subtasks_toggle","arguments":{"reminderId":"reminder-123","subtaskId":"a1b2c3d4"}}
```

```json
{"name":"calendar_events_update","arguments":{"id":"event-123","attendees":["alex@example.com"]}}
```

```json
{"name":"calendar_events_delete","arguments":{"id":"event-123","occurrenceDate":"2026-11-09T09:00:00"}}
```

### Attendees and single occurrences

The `attendees` parameter of `calendar_events_update` and the `occurrenceDate` parameter of `calendar_events_delete` are the only writes that do not go through the `event` CLI, because EventKit cannot express either one. Each needs setup the rest of the server does not.

**`attendees` (update)** — invites email addresses to an existing event. `EKCalendarItem.attendees` is read-only in the macOS SDK and EventKit has no invitation API, so the write goes through Calendar.app's scripting interface; adding the attendee locally is what makes iCloud send the invitation.

- Requires an **Automation** grant: the first call prompts, and the entry appears under `System Settings > Privacy & Security > Automation`. Needs a GUI session, so it does not work headless.
- Attendees must be updated **alone**. They travel through Calendar.app while every other field travels through EventKit, and the two share no concurrency token — a combined update has no safe ordering, so it is refused. Issue two calls.
- Two events sharing a title and a start date are **refused, not guessed between**. Calendar.app can only be queried by title and date, and writing to the wrong one would send a real invitation for it.

**`occurrenceDate` (delete)** — excepts one occurrence of a recurring series. Every occurrence shares one EventKit identifier, so `span: "this-event"` can only ever except the series start; aimed at a later occurrence it writes nothing and still reports success. Supplying `occurrenceDate` routes the delete over CalDAV, which can address the instance directly.

- Requires iCloud credentials. Set `ICLOUD_APPLE_ID` and `ICLOUD_APP_PASSWORD`, or set `ICLOUD_APPLE_ID` and store the password in the Keychain:

  ```bash
  security add-generic-password -a "you@icloud.com" -s "icloud-caldav-mcp" -w
  ```

  Use an [app-specific password](https://support.apple.com/en-us/102654), never your account password. Credentials are read from the environment first, then the Keychain, never from MCP client config, and are never logged.
- Only iCloud-synced events qualify — an event with no external identifier has no CalDAV resource to locate.
- CalDAV requests have a 30-second deadline across redirects and response reads, and a 2 MiB response limit. Calendar editing also limits resources to 20000 physical/content lines, 64 KiB per unfolded UTF-8 line, 16 nested components, 2000 events, and 1000 recurrence IDs. Oversized or overly complex resources fail with an actionable error before a calendar write; serialized output must fit the same size and line-count limits.

### Read response shape

Read tools return a `structuredContent` envelope whose `records` array contains the domain objects returned by that tool. Native values are preserved, including numeric reminder priorities (`0`, `1`, `5`, or `9`) rather than presentation labels. For example:

```json
{
  "provenance": {
    "source": "apple-calendar-reminders",
    "trust": "untrusted"
  },
  "records": [
    {
      "id": "reminder-123",
      "title": "Buy groceries",
      "isCompleted": false,
      "list": "Shopping",
      "notes": "Don't forget milk and eggs",
      "url": "https://example.com",
      "dueDate": "2024-03-25T18:00:00Z",
      "priority": 1,
      "tags": ["shopping", "errands"],
      "subtasks": [
        { "id": "a1b2c3d4", "title": "Milk", "isCompleted": true },
        { "id": "e5f6a7b8", "title": "Eggs", "isCompleted": false },
        { "id": "c9d0e1f2", "title": "Bread", "isCompleted": false }
      ],
      "subtaskProgress": { "completed": 1, "total": 3, "percentage": 33 }
    }
  ]
}
```

The accompanying `content` array contains a static text summary first (for example, `Read reminders.`), followed by a text item containing the serialized JSON mirror of the same `structuredContent` object. Clients that consume text can parse the second item; clients that support structured results should use `structuredContent`.

Reminder URLs are stored in the native `url` property and in the structured `URLs:` notes block. Calendar event URLs are stored in EventKit's native URL property. Both reject unsafe URI schemes and blocked HTTP(S) addresses.

> **Read-only fields**: reminder alarms, reminder recurrence and location triggers, calendar recurrence rules and structured locations, all-day toggles, and cross-calendar moves are not writable via this server. Calendar event alarms, URLs, and scheduling availability can be set through create/update. Calendar availability writes require a calendar that supports the selected value. See [docs/migration-to-event-cli.md](docs/migration-to-event-cli.md) for the remaining gaps.

## Structured Prompt Library

The server ships a prompt registry exposed via the MCP `ListPrompts` / `GetPrompt` endpoints. Each template shares a mission, context inputs, numbered process, constraints, output format, and quality bar so downstream assistants get predictable scaffolding.

- **daily-task-organizer** — optional `today_focus`; produces a same-day execution blueprint, balances priority work with recovery, auto-creates calendar time blocks for due-today reminders.
- **smart-reminder-creator** — optional `task_idea`; generates an optimally scheduled reminder structure.
- **reminder-review-assistant** — optional `review_focus` (e.g. `overdue` or a list name); audits and optimizes existing reminders.
- **weekly-planning-workflow** — optional `user_ideas`; guides a Monday-through-Sunday reset with time blocks tied to existing lists.

Prompts are constrained to native Apple Reminders capabilities and ask for missing context before irreversible actions. Run `pnpm test -- src/server/prompts.test.ts` after amending prompt copy.

## Development

```bash
pnpm install        # postinstall builds bin/event from vendor/event on macOS
pnpm build          # TypeScript + vendored event CLI
pnpm test           # Jest suite: repositories, schemas, build script, prompt templates
pnpm exec biome check   # lint + format
```

The CLI entry point walks up to ten directories to find `package.json`, so the server can start from nested paths (e.g. `dist/` or editor task runners) without losing `bin/event`. Keep the manifest reachable within that depth if you customize the folder layout.

### Scripts

- `pnpm build` — TypeScript + vendored `event` CLI (required before running from source)
- `pnpm build:ts` — TypeScript only
- `pnpm build:event` — vendored `event` CLI only (`swift build -c release` → `bin/event`)
- `pnpm build:release` — build plus notarization (release packaging)
- `pnpm test` / `pnpm test:ci` — Jest suite / with coverage
- `pnpm lint` — Biome format/fix + TypeScript type check
- `pnpm check` — lint + tests with coverage

## License

MIT

## Contributing

Contributions welcome! Please read the contributing guidelines first.
