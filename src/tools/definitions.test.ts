import { TOOLS as TOOL_NAMES } from '../utils/constants.js';
import { TOOLS } from './definitions.js';

describe('operation-specific tool definitions', () => {
  it('registers each tool once under the public constants', () => {
    const names = TOOLS.map((tool) => tool.name);
    expect(new Set(names).size).toBe(19);
    expect(names.sort()).toEqual(Object.values(TOOL_NAMES).sort());
  });

  it.each(
    TOOLS.map((tool) => [tool.name, tool] as const),
  )('describes the permission of %s without an action selector', (name, tool) => {
    expect(name).toMatch(/^[a-zA-Z0-9_-]+$/);
    expect(tool.description).toBeTruthy();
    expect(tool.inputSchema.properties).not.toHaveProperty('action');
    expect(tool.inputSchema.additionalProperties).toBe(false);
    expect(tool.annotations?.readOnlyHint).toBe(name.endsWith('_read'));
    expect(tool.annotations?.destructiveHint).toBe(
      !name.endsWith('_read') && !name.endsWith('_create'),
    );
    for (const required of tool.inputSchema.required ?? []) {
      expect(tool.inputSchema.properties).toHaveProperty(required);
    }
  });

  it.each([
    ['reminders_tasks_create', ['title']],
    ['reminders_tasks_update', ['id']],
    ['reminders_tasks_delete', ['id']],
    ['reminders_lists_create', ['name']],
    ['reminders_lists_update', ['name', 'newName']],
    ['reminders_lists_delete', ['name']],
    ['calendar_events_create', ['title', 'startDate', 'endDate']],
    ['calendar_events_update', ['id']],
    ['calendar_events_delete', ['id']],
    ['reminders_subtasks_read', ['reminderId']],
    ['reminders_subtasks_create', ['reminderId', 'title']],
    ['reminders_subtasks_update', ['reminderId', 'subtaskId']],
    ['reminders_subtasks_delete', ['reminderId', 'subtaskId']],
    ['reminders_subtasks_toggle', ['reminderId', 'subtaskId']],
    ['reminders_subtasks_reorder', ['reminderId', 'order']],
  ])('requires the operation inputs for %s', (name, required) => {
    expect(
      TOOLS.find((tool) => tool.name === name)?.inputSchema.required,
    ).toEqual(required);
  });

  it('keeps create, read, update, and delete fields separate', () => {
    const properties = (name: string) =>
      TOOLS.find((tool) => tool.name === name)?.inputSchema.properties ?? {};
    expect(properties('reminders_tasks_create')).toHaveProperty('subtasks');
    expect(properties('reminders_tasks_create')).not.toHaveProperty(
      'completed',
    );
    expect(properties('reminders_tasks_create')).not.toHaveProperty(
      'startDate',
    );
    expect(properties('reminders_tasks_update')).toHaveProperty('completed');
    expect(properties('reminders_tasks_update')).toHaveProperty('startDate');
    expect(properties('calendar_events_create')).toHaveProperty(
      'targetCalendar',
    );
    expect(properties('calendar_events_create')).not.toHaveProperty(
      'attendees',
    );
    expect(properties('calendar_events_update')).toHaveProperty('attendees');
    expect(properties('calendar_events_update')).not.toHaveProperty('span');
    expect(properties('calendar_events_update')).not.toHaveProperty(
      'targetCalendar',
    );
    expect(Object.keys(properties('calendar_events_delete'))).toEqual([
      'id',
      'span',
      'occurrenceDate',
    ]);
    expect(Object.keys(properties('reminders_subtasks_toggle'))).toEqual([
      'reminderId',
      'subtaskId',
    ]);
    expect(Object.keys(properties('reminders_subtasks_reorder'))).toEqual([
      'reminderId',
      'order',
    ]);
  });

  it('documents date-window and default-calendar behavior', () => {
    const read = TOOLS.find((tool) => tool.name === 'calendar_events_read');
    const properties = read?.inputSchema.properties as Record<
      string,
      { description: string }
    >;
    expect(properties.startDate?.description).toContain('defaults to today');
    expect(properties.startDate?.description).toContain('truncated');
    expect(properties.endDate?.description).toContain(
      'defaults to today + 14 days',
    );
    expect(properties.endDate?.description).toContain('exclusive boundary');
    const create = TOOLS.find((tool) => tool.name === 'calendar_events_create');
    expect(
      JSON.stringify(create?.inputSchema.properties?.targetCalendar),
    ).toContain('default calendar');
  });
});
