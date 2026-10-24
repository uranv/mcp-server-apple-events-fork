import { CLI_HELP, parseServerOptions } from './options.js';

describe('server startup options', () => {
  it('defaults to no server write confirmation', () => {
    expect(parseServerOptions([])).toEqual({
      requireWriteConfirmation: false,
      help: false,
    });
  });

  it('enables confirmation only with the explicit flag', () => {
    expect(parseServerOptions(['--require-write-confirmation'])).toEqual({
      requireWriteConfirmation: true,
      help: false,
    });
  });

  it.each([
    '--require-write-confirmation=false',
    '--require-write-confirmation=true',
    '--require-write-confirmation=1',
    '--no-require-write-confirmation',
    '--unknown',
    'false',
    '--help=false',
  ])('rejects invalid option %s', (arg) => {
    expect(() => parseServerOptions([arg])).toThrow();
  });

  it('rejects a separate value rather than silently interpreting it', () => {
    expect(() =>
      parseServerOptions(['--require-write-confirmation', 'false']),
    ).toThrow();
  });

  it('selects exact tool names from a comma-separated list', () => {
    expect(
      parseServerOptions([
        '--tools',
        'calendar_events_create, calendar_calendars_read',
      ]),
    ).toEqual({
      requireWriteConfirmation: false,
      help: false,
      enabledTools: ['calendar_events_create', 'calendar_calendars_read'],
    });
  });

  it('combines repeated tool selections without duplicates', () => {
    expect(
      parseServerOptions([
        '--tools=calendar_events_create',
        '--tools',
        'calendar_calendars_read,calendar_events_create',
        '--require-write-confirmation',
      ]),
    ).toEqual({
      requireWriteConfirmation: true,
      help: false,
      enabledTools: ['calendar_events_create', 'calendar_calendars_read'],
    });
  });

  it.each([
    ['--tools'],
    ['--tools='],
    ['--tools', ''],
    ['--tools', '--require-write-confirmation'],
    ['--tools', ' '],
    ['--tools', ','],
    ['--tools', ' , , '],
  ])('defaults to all tools for an empty selection %j', (...args) => {
    const options = parseServerOptions(args);
    expect(options.enabledTools).toHaveLength(19);
    expect(options.enabledTools).toContain('calendar_events_create');
    expect(options.enabledTools).toContain('reminders_tasks_delete');
  });

  it('ignores empty entries when non-empty tools are selected', () => {
    expect(
      parseServerOptions(['--tools=', '--tools', 'calendar_events_create, ,'])
        .enabledTools,
    ).toEqual(['calendar_events_create']);
  });

  it.each([
    ['--tools', 'calendar_events'],
    ['--tools', 'calendar_events_creat'],
    ['--tools', '*'],
    ['--tools', 'calendar_events_create,unknown'],
  ])('rejects invalid tool selection %j', (...args) => {
    expect(() => parseServerOptions(args)).toThrow();
  });

  it.each([
    '--help',
    '-h',
  ])('supports %s without starting the server', (arg) => {
    expect(parseServerOptions([arg]).help).toBe(true);
    expect(CLI_HELP).toContain('--require-write-confirmation');
    expect(CLI_HELP).toContain('default: off');
    expect(CLI_HELP).toContain('invitations');
  });
});
