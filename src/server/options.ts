import { parseArgs } from 'node:util';
import { selectTools, TOOLS } from '../tools/definitions.js';

export const CLI_HELP = `Usage: mcp-server-apple-events [options]

Options:
  --tools [name,...]             Expose only these tools (repeatable; default: all).
  --require-write-confirmation  Require a fresh MCP form for every write (default: off).
  -h, --help                    Show this help and exit.

By default, writes including deletions and attendee invitations execute without
server confirmation, including on hosts without MCP form elicitation. This removes
the per-write confirmation barrier against prompt injection. Host authorization
and macOS permissions still apply. With --require-write-confirmation, rejected,
cancelled, failed or unavailable confirmation blocks the write.

The confirmation flag takes no value and has no --no- form.
No environment variable controls this policy.

--tools accepts exact names separated by commas. Unselected tools cannot be
called. Unknown names are errors; whitespace and empty entries are ignored.
Without --tools, or when its list is empty, all tools are enabled.

Available tools:
${TOOLS.map((tool) => `  ${tool.name}`).join('\n')}
`;

export function parseServerOptions(args: string[]): {
  requireWriteConfirmation: boolean;
  help: boolean;
  enabledTools?: string[];
} {
  const normalizedArgs = args.flatMap((arg, index) =>
    arg === '--tools' &&
    (args[index + 1] === undefined || args[index + 1]?.startsWith('-'))
      ? [arg, '']
      : [arg],
  );
  const { values } = parseArgs({
    args: normalizedArgs,
    options: {
      tools: { type: 'string', multiple: true },
      'require-write-confirmation': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    strict: true,
    allowPositionals: false,
    allowNegative: false,
  });
  const enabledTools =
    values.tools === undefined
      ? undefined
      : selectTools(values.tools.flatMap((value) => value.split(','))).map(
          (tool) => tool.name,
        );
  return {
    requireWriteConfirmation: values['require-write-confirmation'],
    help: values.help,
    ...(enabledTools === undefined ? {} : { enabledTools }),
  };
}
