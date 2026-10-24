import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  executeEventCliJson,
  executeEventCliPlain,
} from '../utils/eventCli.js';
import { createServer } from './server.js';

jest.mock('../utils/eventCli.js', () => ({
  executeEventCliJson: jest.fn(),
  executeEventCliPlain: jest.fn(),
}));

describe('operation-specific MCP tools', () => {
  let client: Client;
  let server: ReturnType<typeof createServer>;

  beforeEach(async () => {
    jest.clearAllMocks();
    server = createServer({ name: 'tool-permissions-test', version: '1' });
    client = new Client({ name: 'tool-permissions-client', version: '1' });
    const [serverTransport, clientTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  it('advertises every operation separately so a host can grant tools independently', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      'calendar_calendars_read',
      'calendar_events_create',
      'calendar_events_delete',
      'calendar_events_read',
      'calendar_events_update',
      'reminders_lists_create',
      'reminders_lists_delete',
      'reminders_lists_read',
      'reminders_lists_update',
      'reminders_subtasks_create',
      'reminders_subtasks_delete',
      'reminders_subtasks_read',
      'reminders_subtasks_reorder',
      'reminders_subtasks_toggle',
      'reminders_subtasks_update',
      'reminders_tasks_create',
      'reminders_tasks_delete',
      'reminders_tasks_read',
      'reminders_tasks_update',
    ]);
    for (const tool of tools) {
      expect(tool.inputSchema.properties).not.toHaveProperty('action');
      expect(tool.inputSchema.additionalProperties).toBe(false);
      expect(tool.annotations?.readOnlyHint).toBe(tool.name.endsWith('_read'));
    }
    const createEvent = tools.find(
      (tool) => tool.name === 'calendar_events_create',
    );
    expect(createEvent?.inputSchema.required).toEqual([
      'title',
      'startDate',
      'endDate',
    ]);
    expect(createEvent?.inputSchema.properties).not.toHaveProperty('id');
    expect(createEvent?.inputSchema.properties).not.toHaveProperty('attendees');
    const deleteEvent = tools.find(
      (tool) => tool.name === 'calendar_events_delete',
    );
    expect(deleteEvent?.inputSchema.required).toEqual(['id']);
    expect(deleteEvent?.inputSchema.properties).not.toHaveProperty('title');
  });

  it('creates an event through the create tool without an action argument', async () => {
    const event = {
      id: 'created-event',
      title: 'Planning',
      calendar: 'Work',
      startDate: '2026-11-02 14:00:00',
      endDate: '2026-11-02 15:00:00',
      isAllDay: false,
    };
    jest.mocked(executeEventCliJson).mockResolvedValue(event);
    const result = await client.callTool({
      name: 'calendar_events_create',
      arguments: {
        title: 'Planning',
        startDate: '2026-11-02 14:00:00',
        endDate: '2026-11-02 15:00:00',
        targetCalendar: 'Work',
      },
    });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({ records: [event] });
    expect(executeEventCliJson).toHaveBeenCalledWith([
      'calendar',
      'create',
      '--title=Planning',
      '--start=2026-11-02 14:00:00',
      '--end=2026-11-02 15:00:00',
      '--calendar=Work',
      '--json',
    ]);
    expect(executeEventCliPlain).not.toHaveBeenCalled();
  });

  it.each([
    'reminders_tasks',
    'reminders_lists',
    'reminders_subtasks',
    'calendar_events',
    'calendar_calendars',
  ])('rejects calls to the removed combined tool %s', async (name) => {
    const result = await client.callTool({
      name,
      arguments: { action: 'delete', id: 'existing-event' },
    });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).toContain(`Unknown tool: ${name}`);
    expect(executeEventCliJson).not.toHaveBeenCalled();
    expect(executeEventCliPlain).not.toHaveBeenCalled();
  });

  it.each([
    'read',
    'create',
    'update',
    'delete',
  ])('rejects an injected action=%s on a read tool', async (action) => {
    const result = await client.callTool({
      name: 'calendar_events_read',
      arguments: { action, id: 'existing-event' },
    });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).toContain('action');
    expect(executeEventCliJson).not.toHaveBeenCalled();
    expect(executeEventCliPlain).not.toHaveBeenCalled();
  });
});
