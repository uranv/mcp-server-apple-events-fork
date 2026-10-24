import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as handlers from './handlers/index.js';
import { handleToolCall, type ToolInput } from './index.js';

jest.mock('./handlers/index.js', () => ({
  handleCreateReminder: jest.fn(),
  handleReadReminderLists: jest.fn(),
  handleReadReminders: jest.fn(),
  handleUpdateReminder: jest.fn(),
  handleDeleteReminder: jest.fn(),
  handleCreateReminderList: jest.fn(),
  handleUpdateReminderList: jest.fn(),
  handleDeleteReminderList: jest.fn(),
  handleCreateCalendarEvent: jest.fn(),
  handleReadCalendarEvents: jest.fn(),
  handleUpdateCalendarEvent: jest.fn(),
  handleDeleteCalendarEvent: jest.fn(),
  handleReadCalendars: jest.fn(),
  handleReadSubtasks: jest.fn(),
  handleCreateSubtask: jest.fn(),
  handleUpdateSubtask: jest.fn(),
  handleDeleteSubtask: jest.fn(),
  handleToggleSubtask: jest.fn(),
  handleReorderSubtasks: jest.fn(),
}));

const routes = [
  [
    'reminders_tasks_read',
    'read',
    handlers.handleReadReminders,
    { id: 'task' },
  ],
  [
    'reminders_tasks_create',
    'create',
    handlers.handleCreateReminder,
    { title: 'New reminder' },
  ],
  [
    'reminders_tasks_update',
    'update',
    handlers.handleUpdateReminder,
    { id: 'task', completed: true },
  ],
  [
    'reminders_tasks_delete',
    'delete',
    handlers.handleDeleteReminder,
    { id: 'task' },
  ],
  ['reminders_lists_read', 'read', handlers.handleReadReminderLists, {}],
  [
    'reminders_lists_create',
    'create',
    handlers.handleCreateReminderList,
    { name: 'Work' },
  ],
  [
    'reminders_lists_update',
    'update',
    handlers.handleUpdateReminderList,
    { name: 'Work', newName: 'Office' },
  ],
  [
    'reminders_lists_delete',
    'delete',
    handlers.handleDeleteReminderList,
    { name: 'Work' },
  ],
  [
    'calendar_events_read',
    'read',
    handlers.handleReadCalendarEvents,
    { id: 'event' },
  ],
  [
    'calendar_events_create',
    'create',
    handlers.handleCreateCalendarEvent,
    {
      title: 'Meeting',
      startDate: '2026-11-02 14:00:00',
      endDate: '2026-11-02 15:00:00',
    },
  ],
  [
    'calendar_events_update',
    'update',
    handlers.handleUpdateCalendarEvent,
    { id: 'event', title: 'Changed meeting' },
  ],
  [
    'calendar_events_delete',
    'delete',
    handlers.handleDeleteCalendarEvent,
    { id: 'event' },
  ],
  ['calendar_calendars_read', 'read', handlers.handleReadCalendars, {}],
  [
    'reminders_subtasks_read',
    'read',
    handlers.handleReadSubtasks,
    { reminderId: 'task' },
  ],
  [
    'reminders_subtasks_create',
    'create',
    handlers.handleCreateSubtask,
    { reminderId: 'task', title: 'Checklist item' },
  ],
  [
    'reminders_subtasks_update',
    'update',
    handlers.handleUpdateSubtask,
    { reminderId: 'task', subtaskId: 'subtask', completed: true },
  ],
  [
    'reminders_subtasks_delete',
    'delete',
    handlers.handleDeleteSubtask,
    { reminderId: 'task', subtaskId: 'subtask' },
  ],
  [
    'reminders_subtasks_toggle',
    'toggle',
    handlers.handleToggleSubtask,
    { reminderId: 'task', subtaskId: 'subtask' },
  ],
  [
    'reminders_subtasks_reorder',
    'reorder',
    handlers.handleReorderSubtasks,
    { reminderId: 'task', order: ['second', 'first'] },
  ],
] as const;

const mockedHandlers = routes.map(([, , handler]) => handler);

const success: CallToolResult = {
  content: [{ type: 'text', text: 'Success' }],
  isError: false,
};

describe('operation-specific tool routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const handler of mockedHandlers) {
      jest.mocked(handler).mockResolvedValue(success);
    }
  });

  it.each(
    routes,
  )('routes %s only to its fixed operation', async (name, action, handler, args) => {
    const confirm = jest.fn().mockResolvedValue(true);
    const result = await handleToolCall(name, args as ToolInput, confirm);
    expect(result).toEqual(success);
    if (name === 'reminders_lists_read') {
      expect(handler).toHaveBeenCalledWith();
    } else {
      expect(handler).toHaveBeenCalledWith({ ...args, action });
    }
    expect(
      mockedHandlers.filter((fn) => jest.mocked(fn).mock.calls.length),
    ).toEqual([handler]);
    expect(confirm).toHaveBeenCalledTimes(action === 'read' ? 0 : 1);
    if (action !== 'read')
      expect(confirm).toHaveBeenCalledWith(name, { ...args, action });
  });

  it.each(
    routes,
  )('rejects an action override on %s before execution or confirmation', async (name, _action, _handler, args) => {
    const confirm = jest.fn().mockResolvedValue(true);
    const result = await handleToolCall(
      name,
      { ...args, action: 'delete' } as unknown as ToolInput,
      confirm,
    );
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).toContain('action');
    expect(confirm).not.toHaveBeenCalled();
    for (const handler of mockedHandlers)
      expect(handler).not.toHaveBeenCalled();
  });

  it.each([
    'unknown_tool',
    '',
    'toString',
    '__proto__',
    'constructor',
    'reminders_tasks',
    'reminders_lists',
    'reminders_subtasks',
    'calendar_events',
    'calendar_calendars',
  ])('rejects unregistered tool %j', async (name) => {
    const result = await handleToolCall(name, {});
    expect(result).toEqual({
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    });
    for (const handler of mockedHandlers)
      expect(handler).not.toHaveBeenCalled();
  });

  it('requires confirmation for a direct write router call', async () => {
    const result = await handleToolCall('reminders_tasks_delete', {
      id: 'private-item',
    });
    expect(result.isError).toBe(true);
    expect(handlers.handleDeleteReminder).not.toHaveBeenCalled();
  });

  it('dispatches the reviewed snapshot when the caller changes arguments', async () => {
    const args = { id: 'reviewed-item' };
    const result = await handleToolCall(
      'reminders_tasks_delete',
      args,
      async (name, reviewed) => {
        expect(name).toBe('reminders_tasks_delete');
        expect(reviewed).toEqual({ action: 'delete', id: 'reviewed-item' });
        args.id = 'unreviewed-item';
        return true;
      },
    );
    expect(result.isError).toBe(false);
    expect(handlers.handleDeleteReminder).toHaveBeenCalledWith({
      action: 'delete',
      id: 'reviewed-item',
    });
  });

  it('rejects fields belonging to another operation', async () => {
    const result = await handleToolCall(
      'calendar_events_delete',
      { id: 'event', title: 'Unexpected' },
      async () => true,
    );
    expect(result.isError).toBe(true);
    expect(handlers.handleDeleteCalendarEvent).not.toHaveBeenCalled();
  });

  it('propagates handler failures', async () => {
    jest
      .mocked(handlers.handleCreateReminder)
      .mockRejectedValue(new Error('Handler failed'));
    await expect(
      handleToolCall(
        'reminders_tasks_create',
        { title: 'Task' },
        async () => true,
      ),
    ).rejects.toThrow('Handler failed');
  });
});
