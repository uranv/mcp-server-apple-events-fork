import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

describe('MCP server over stdio', () => {
  let client: Client;

  beforeAll(async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ['dist/index.js'],
      stderr: 'pipe',
      cwd: process.cwd(),
    });
    client = new Client({ name: 'e2e-test-client', version: '1.0.0' });
    await client.connect(transport);
  });

  afterAll(async () => {
    await client?.close();
  });

  it('initializes with the server version and tools/prompts capabilities', () => {
    expect(client.getServerVersion()?.name).toBe('mcp-server-apple-events');
    expect(client.getServerVersion()?.version).toBeDefined();
    expect(client.getServerCapabilities()?.tools).toBeDefined();
    expect(client.getServerCapabilities()?.prompts).toBeDefined();
  });

  it('lists 19 independent operation tools without action selectors', async () => {
    const result = await client.listTools();
    expect(result.tools).toHaveLength(19);
    expect(result.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        'reminders_tasks_read',
        'reminders_tasks_create',
        'reminders_tasks_update',
        'reminders_tasks_delete',
        'reminders_lists_read',
        'calendar_events_read',
        'calendar_events_create',
        'calendar_events_update',
        'calendar_events_delete',
        'calendar_calendars_read',
        'reminders_subtasks_toggle',
        'reminders_subtasks_reorder',
      ]),
    );
    for (const tool of result.tools) {
      expect(tool.inputSchema.properties).not.toHaveProperty('action');
    }
    const create = result.tools.find(
      (tool) => tool.name === 'calendar_events_create',
    );
    expect(create?.inputSchema.required).toEqual([
      'title',
      'startDate',
      'endDate',
    ]);
  });

  it('still lists the four prompt templates', async () => {
    expect((await client.listPrompts()).prompts).toHaveLength(4);
  });

  it.each([
    ['reminders_tasks_create', {}],
    ['calendar_events_create', { title: 'Missing dates' }],
    ['calendar_events_delete', {}],
    ['reminders_subtasks_update', { reminderId: 'parent' }],
  ])('validates %s before touching system accounts', async (name, args) => {
    const result = await client.callTool({ name, arguments: args });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).toContain('Input validation failed');
  });

  it.each([
    'reminders_tasks',
    'reminders_lists',
    'reminders_subtasks',
    'calendar_events',
    'calendar_calendars',
    'invalid_tool_name',
  ])('rejects the unavailable tool %s', async (name) => {
    const result = await client.callTool({ name, arguments: {} });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).toContain(`Unknown tool: ${name}`);
  });

  it('cannot change a read tool into a deletion by passing action', async () => {
    const result = await client.callTool({
      name: 'calendar_events_read',
      arguments: { action: 'delete', id: 'existing-event' },
    });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).toContain('Unknown arguments');
  });
});
