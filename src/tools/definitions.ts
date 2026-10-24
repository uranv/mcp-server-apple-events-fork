import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DUE_WITHIN_OPTIONS } from '../types/index.js';
import { TOOLS as TOOL_NAMES } from '../utils/constants.js';

type Properties = NonNullable<Tool['inputSchema']['properties']>;
type Operation = 'read' | 'create' | 'update' | 'delete' | 'toggle' | 'reorder';

function operationTool<T extends Properties>(
  name: string,
  action: Operation,
  description: string,
  fields: T,
  selected: (keyof T & string)[],
  required: string[] = [],
): Tool {
  return {
    name,
    description,
    inputSchema: {
      type: 'object',
      properties: Object.fromEntries(
        selected.map((key) => [key, fields[key]!]),
      ),
      required,
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: action === 'read',
      destructiveHint: action !== 'read' && action !== 'create',
      idempotentHint: action === 'read',
    },
  };
}

const reminderFields = {
  id: { type: 'string', description: 'The unique identifier of the reminder.' },
  title: { type: 'string', description: 'The title of the reminder.' },
  dueDate: {
    type: 'string',
    description:
      'Due date. Use YYYY-MM-DD for an all-day reminder, YYYY-MM-DD HH:mm:ss for local time, or ISO 8601 with a timezone for an exact instant.',
  },
  note: { type: 'string', description: 'Additional notes for the reminder.' },
  url: {
    type: 'string',
    format: 'uri',
    description:
      'A URL to associate with the reminder. App deep links are supported; unsafe schemes and blocked network addresses are rejected.',
  },
  completed: {
    type: 'boolean',
    description: 'Mark the reminder completed or incomplete.',
  },
  priority: {
    type: 'integer',
    enum: [0, 1, 5, 9],
    description: 'Priority: 0=none, 1=high, 5=medium, 9=low.',
  },
  targetList: {
    type: 'string',
    description:
      'Name of the list for the new reminder. Omit to use the default list.',
  },
  filterList: {
    type: 'string',
    description: 'Filter by a reminder list name.',
  },
  showCompleted: {
    type: 'boolean',
    default: false,
    description: 'Include completed reminders.',
  },
  search: { type: 'string', description: 'Search reminder titles and notes.' },
  dueWithin: {
    type: 'string',
    enum: DUE_WITHIN_OPTIONS,
    description: 'Filter reminders by a due date range.',
  },
  startDate: {
    type: 'string',
    description:
      'Set the start date of the existing reminder. Use YYYY-MM-DD for an all-day start, YYYY-MM-DD HH:mm:ss for local time, or ISO 8601 with a timezone.',
  },
  endDate: {
    type: 'string',
    description:
      'Exclusive end day of the due-date window. The tool uses only the date prefix. If you omit startDate, the window spans 14 days.',
  },
  filterPriority: {
    type: 'string',
    enum: ['high', 'medium', 'low', 'none'],
    description: 'Filter by priority.',
  },
  filterRecurring: {
    type: 'boolean',
    description: 'Only include recurring reminders.',
  },
  filterLocationBased: {
    type: 'boolean',
    description: 'Only include location-based reminders.',
  },
  filterTags: {
    type: 'array',
    items: { type: 'string' },
    description: 'Require all of these tags.',
  },
  tags: {
    type: 'array',
    items: { type: 'string' },
    description: 'Set the reminder tags.',
  },
  addTags: {
    type: 'array',
    items: { type: 'string' },
    description: 'Add tags without replacing existing tags.',
  },
  removeTags: {
    type: 'array',
    items: { type: 'string' },
    description: 'Remove these tags.',
  },
  subtasks: {
    type: 'array',
    items: { type: 'string' },
    description: 'Titles of initial checklist subtasks.',
  },
} satisfies Properties;

const listFields = {
  name: { type: 'string', description: 'The reminder list name.' },
  newName: {
    type: 'string',
    description: 'The new name for the reminder list.',
  },
} satisfies Properties;

const calendarFields = {
  id: {
    type: 'string',
    description: 'The event identifier.',
  },
  title: { type: 'string', description: 'The event title.' },
  startDate: {
    type: 'string',
    description:
      'Event start: YYYY-MM-DD for all-day, YYYY-MM-DD HH:mm:ss for local time, or ISO 8601 with a timezone.',
  },
  endDate: {
    type: 'string',
    description:
      'Event end: YYYY-MM-DD for all-day, YYYY-MM-DD HH:mm:ss for local time, or ISO 8601 with a timezone.',
  },
  note: { type: 'string', description: 'Additional notes for the event.' },
  location: { type: 'string', description: 'Location text for the event.' },
  timezone: {
    type: 'string',
    description:
      'IANA timezone for a timed event, such as Asia/Shanghai. Start and end are interpreted in this timezone. Omit for all-day events.',
  },
  url: {
    type: ['string', 'null'],
    description:
      'Set the event URL. Use null to remove the current URL. The tool rejects unsafe schemes and blocked network addresses.',
  },
  alarms: {
    type: 'array',
    items: { type: 'integer', minimum: 0 },
    description:
      'Replace the event alarms with these minutes before the event starts. Use an empty array to remove all alarms.',
  },
  addAlarms: {
    type: 'array',
    items: { type: 'integer', minimum: 0 },
    description: 'Append alarms without removing existing ones.',
  },
  clearAlarms: { type: 'boolean', description: 'Remove all alarms.' },
  availability: {
    type: 'string',
    enum: ['busy', 'free', 'tentative', 'unavailable'],
    description:
      'Scheduling availability. The calendar must support the requested value.',
  },
  attendees: {
    type: 'array',
    items: { type: 'string' },
    description:
      'Email addresses to invite. This sends real invitations and requires Calendar.app Automation permission. Supply only id and attendees.',
  },
  span: {
    type: 'string',
    enum: ['this-event', 'future-events'],
    description:
      'Delete this event or this and future occurrences. Do not combine with occurrenceDate.',
  },
  occurrenceDate: {
    type: 'string',
    description:
      'Delete one specific recurring occurrence. Requires iCloud CalDAV credentials; do not combine with span.',
  },
  targetCalendar: {
    type: 'string',
    description:
      'Calendar name for creation. Omit to use the default calendar.',
  },
  filterCalendar: { type: 'string', description: 'Filter by a calendar name.' },
  search: {
    type: 'string',
    description: 'Search event titles, notes, and locations.',
  },
} satisfies Properties;

const calendarReadFields = {
  ...calendarFields,
  id: {
    ...calendarFields.id,
    description:
      'Read this event by its identifier. When you supply id, the tool ignores date ranges and search filters.',
  },
  startDate: {
    type: 'string',
    description:
      'Read-window start. Only the date prefix is used; time and timezone are truncated. If both bounds are omitted, defaults to today; if only endDate is provided, defaults to a 14-day window ending at that bound.',
  },
  endDate: {
    type: 'string',
    description:
      'Read-window end. A date-only or non-midnight end includes its named day; a midnight end is an exclusive boundary. If both bounds are omitted, defaults to today + 14 days; if only startDate is provided, defaults to startDate + 14 days.',
  },
  availability: {
    type: 'string',
    enum: ['not-supported', 'busy', 'free', 'tentative', 'unavailable'],
    description: 'Filter by scheduling availability.',
  },
} satisfies Properties;

const subtaskFields = {
  reminderId: {
    type: 'string',
    description: 'The identifier of the parent reminder.',
  },
  subtaskId: { type: 'string', description: 'The identifier of the subtask.' },
  title: { type: 'string', description: 'The subtask title.' },
  completed: {
    type: 'boolean',
    description:
      'Set true to mark the subtask complete, or false to mark it incomplete.',
  },
  order: {
    type: 'array',
    items: { type: 'string' },
    description: 'All existing subtask IDs in the requested order.',
  },
} satisfies Properties;

const calendarCollectionFields = {
  startDate: {
    type: 'string',
    description:
      'Optional start for scoped calendar discovery. Uses only the date prefix; if one bound is omitted, defaults to a 14-day window.',
  },
  endDate: {
    type: 'string',
    description:
      'Optional end for scoped calendar discovery. A date-only or non-midnight end includes its day; midnight is exclusive. Must be on or after startDate.',
  },
} satisfies Properties;

export function selectTools(names?: readonly string[]): Tool[] {
  const selectedNames = names?.map((name) => name.trim()).filter(Boolean);
  if (!selectedNames?.length) return [...TOOLS];
  const unknown = selectedNames.filter(
    (name) => !TOOLS.some((tool) => tool.name === name),
  );
  if (unknown.length > 0) {
    throw new Error(
      `Unknown MCP tools: ${unknown.join(', ')}. See --help for available tools.`,
    );
  }
  return TOOLS.filter((tool) => selectedNames.includes(tool.name));
}

export const TOOLS: Tool[] = [
  operationTool(
    TOOL_NAMES.REMINDERS_TASKS_READ,
    'read',
    'Read or search reminders. Returns structured records. This tool makes no changes.',
    {
      ...reminderFields,
      id: {
        ...reminderFields.id,
        description:
          'Read this reminder by its identifier. When you supply id, the tool ignores other filters.',
      },
      startDate: {
        ...reminderFields.startDate,
        description:
          'Inclusive start day of the due-date window. The tool uses only the date prefix. If you omit endDate, the window spans 14 days.',
      },
    },
    [
      'id',
      'filterList',
      'showCompleted',
      'search',
      'dueWithin',
      'filterPriority',
      'filterRecurring',
      'filterLocationBased',
      'filterTags',
      'startDate',
      'endDate',
    ],
  ),
  operationTool(
    TOOL_NAMES.REMINDERS_TASKS_CREATE,
    'create',
    'Create a reminder, optionally with tags and checklist subtasks. Alarms, recurrence, and location triggers must be configured in Reminders.app.',
    reminderFields,
    [
      'title',
      'dueDate',
      'note',
      'url',
      'targetList',
      'priority',
      'tags',
      'subtasks',
    ],
    ['title'],
  ),
  operationTool(
    TOOL_NAMES.REMINDERS_TASKS_UPDATE,
    'update',
    'Update an existing reminder, including completion and tags. Cross-list moves, alarms, recurrence, and location triggers are unsupported.',
    {
      ...reminderFields,
      targetList: {
        ...reminderFields.targetList,
        description:
          'The reminder must already belong to this list. Omit to skip this check. This tool cannot move reminders between lists.',
      },
    },
    [
      'id',
      'title',
      'startDate',
      'dueDate',
      'note',
      'url',
      'completed',
      'targetList',
      'priority',
      'tags',
      'addTags',
      'removeTags',
    ],
    ['id'],
  ),
  operationTool(
    TOOL_NAMES.REMINDERS_TASKS_DELETE,
    'delete',
    'Delete an existing reminder.',
    reminderFields,
    ['id'],
    ['id'],
  ),

  operationTool(
    TOOL_NAMES.REMINDERS_LISTS_READ,
    'read',
    'Read reminder lists. Makes no changes.',
    listFields,
    [],
  ),
  operationTool(
    TOOL_NAMES.REMINDERS_LISTS_CREATE,
    'create',
    'Create a reminder list.',
    listFields,
    ['name'],
    ['name'],
  ),
  operationTool(
    TOOL_NAMES.REMINDERS_LISTS_UPDATE,
    'update',
    'Rename a reminder list.',
    {
      ...listFields,
      name: {
        ...listFields.name,
        description: 'The current name of the reminder list to rename.',
      },
    },
    ['name', 'newName'],
    ['name', 'newName'],
  ),
  operationTool(
    TOOL_NAMES.REMINDERS_LISTS_DELETE,
    'delete',
    'Delete a reminder list.',
    listFields,
    ['name'],
    ['name'],
  ),

  operationTool(
    TOOL_NAMES.CALENDAR_EVENTS_READ,
    'read',
    'Read or search calendar events. Timed records include UTC startDateISO/endDateISO when the source timezone resolves unambiguously. Use those fields to compare instants. This tool makes no changes.',
    calendarReadFields,
    ['id', 'filterCalendar', 'search', 'availability', 'startDate', 'endDate'],
  ),
  operationTool(
    TOOL_NAMES.CALENDAR_EVENTS_CREATE,
    'create',
    'Create a calendar event. Bare YYYY-MM-DD dates specify an all-day event. The tool supports URLs, alarms, and availability. Configure recurrence and structured locations in Calendar.app.',
    {
      ...calendarFields,
      url: {
        ...calendarFields.url,
        type: 'string',
        description:
          'Event URL. Unsafe schemes and blocked network addresses are rejected.',
      },
      alarms: {
        ...calendarFields.alarms,
        description:
          'Minutes before the new event starts. Use 0 for an alarm at the start.',
      },
    },
    [
      'title',
      'startDate',
      'endDate',
      'note',
      'location',
      'timezone',
      'url',
      'alarms',
      'availability',
      'targetCalendar',
    ],
    ['title', 'startDate', 'endDate'],
  ),
  operationTool(
    TOOL_NAMES.CALENDAR_EVENTS_UPDATE,
    'update',
    'Update an existing event. Attendee invitations must be updated alone. Cross-calendar moves, all-day toggles, recurrence, and structured locations are unsupported.',
    calendarFields,
    [
      'id',
      'title',
      'startDate',
      'endDate',
      'note',
      'location',
      'timezone',
      'url',
      'alarms',
      'addAlarms',
      'clearAlarms',
      'availability',
      'attendees',
    ],
    ['id'],
  ),
  operationTool(
    TOOL_NAMES.CALENDAR_EVENTS_DELETE,
    'delete',
    'Delete an event or recurring occurrence. Without occurrenceDate, a this-event delete targets the series start. Deleting a specific occurrence needs iCloud CalDAV credentials.',
    calendarFields,
    ['id', 'span', 'occurrenceDate'],
    ['id'],
  ),
  operationTool(
    TOOL_NAMES.CALENDAR_CALENDARS_READ,
    'read',
    'Read calendar collections with source and write permissions. Without a date range, returns every calendar; with a range, returns calendars containing events and their event counts. Makes no changes.',
    calendarCollectionFields,
    ['startDate', 'endDate'],
  ),

  operationTool(
    TOOL_NAMES.REMINDERS_SUBTASKS_READ,
    'read',
    'Read checklist subtasks from a reminder. Makes no changes.',
    subtaskFields,
    ['reminderId'],
    ['reminderId'],
  ),
  operationTool(
    TOOL_NAMES.REMINDERS_SUBTASKS_CREATE,
    'create',
    'Append a checklist subtask to an existing reminder. Subtasks are stored in the reminder notes.',
    subtaskFields,
    ['reminderId', 'title'],
    ['reminderId', 'title'],
  ),
  operationTool(
    TOOL_NAMES.REMINDERS_SUBTASKS_UPDATE,
    'update',
    'Update the title or completion status of a checklist subtask.',
    subtaskFields,
    ['reminderId', 'subtaskId', 'title', 'completed'],
    ['reminderId', 'subtaskId'],
  ),
  operationTool(
    TOOL_NAMES.REMINDERS_SUBTASKS_DELETE,
    'delete',
    'Delete a checklist subtask from a reminder.',
    subtaskFields,
    ['reminderId', 'subtaskId'],
    ['reminderId', 'subtaskId'],
  ),
  operationTool(
    TOOL_NAMES.REMINDERS_SUBTASKS_TOGGLE,
    'toggle',
    'Change an existing subtask from complete to incomplete, or from incomplete to complete. This modifies the parent reminder notes.',
    subtaskFields,
    ['reminderId', 'subtaskId'],
    ['reminderId', 'subtaskId'],
  ),
  operationTool(
    TOOL_NAMES.REMINDERS_SUBTASKS_REORDER,
    'reorder',
    'Change the order of existing checklist subtasks. This modifies the parent reminder notes.',
    subtaskFields,
    ['reminderId', 'order'],
    ['reminderId', 'order'],
  ),
];
