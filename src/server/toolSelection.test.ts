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

describe('startup tool selection over MCP', () => {
  let client: Client | undefined;
  let server: ReturnType<typeof createServer> | undefined;

  async function connect(
    enabledTools: string[],
    requireWriteConfirmation = false,
  ) {
    const config = {
      name: 'selected-tools',
      version: '1',
      enabledTools,
      requireWriteConfirmation,
    };
    server = createServer(config);
    client = new Client({ name: 'selection-test-client', version: '1' });
    const [serverTransport, clientTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    return client;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    client = undefined;
    server = undefined;
  });

  afterEach(async () => {
    await client?.close();
    await server?.close();
  });

  it('advertises only selected tools and snapshots the startup selection', async () => {
    const enabledTools = ['calendar_events_create'];
    const connection = await connect(enabledTools);
    enabledTools[0] = 'calendar_events_delete';
    expect(
      (await connection.listTools()).tools.map((tool) => tool.name),
    ).toEqual(['calendar_events_create']);
    expect(connection.getInstructions()).toContain('Tools (1):');
    expect(connection.getInstructions()).toContain('- calendar_events_create');
    expect(connection.getInstructions()).not.toContain(
      '- calendar_events_delete',
    );
    expect(connection.getInstructions()).not.toContain(
      '- reminders_tasks_read',
    );
  });

  it.each([
    false,
    true,
  ])('rejects unselected direct calls before account access or confirmation (confirmation=%s)', async (required) => {
    const connection = await connect(['calendar_events_create'], required);
    for (const name of [
      'calendar_events_read',
      'calendar_events_update',
      'calendar_events_delete',
      'calendar_calendars_read',
      'reminders_tasks_create',
      'reminders_subtasks_toggle',
    ]) {
      const result = await connection.callTool({
        name,
        arguments: { id: 'private-item' },
      });
      expect(result.isError).toBe(true);
      expect(JSON.stringify(result)).toContain(`Unknown tool: ${name}`);
    }
    expect(executeEventCliJson).not.toHaveBeenCalled();
    expect(executeEventCliPlain).not.toHaveBeenCalled();
  });

  it('keeps the selected create operation usable', async () => {
    const connection = await connect(['calendar_events_create']);
    const event = {
      id: 'created-event',
      title: 'Planning',
      calendar: 'Work',
      startDate: '2026-11-02 14:00:00',
      endDate: '2026-11-02 15:00:00',
      isAllDay: false,
    };
    jest.mocked(executeEventCliJson).mockResolvedValue(event);
    const result = await connection.callTool({
      name: 'calendar_events_create',
      arguments: {
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
      },
    });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({ records: [event] });
    expect(executeEventCliJson).toHaveBeenCalledTimes(1);
    expect(executeEventCliPlain).not.toHaveBeenCalled();
  });

  it('defaults to all tools for an empty programmatic selection', async () => {
    const connection = await connect([]);
    expect((await connection.listTools()).tools).toHaveLength(19);
    expect(connection.getInstructions()).toContain('Tools (19):');
  });

  it.each([
    ['unknown'],
    ['calendar_events_create', 'unknown'],
  ])('rejects invalid programmatic selections %j', (...enabledTools) => {
    const config = { name: 'invalid-selection', version: '1', enabledTools };
    expect(() => createServer(config)).toThrow();
  });
});
