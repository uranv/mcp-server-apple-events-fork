import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type {
  CalendarsToolArgs,
  CalendarToolArgs,
  ListsToolArgs,
  RemindersToolArgs,
  SubtasksToolArgs,
} from '../types/index.js';
import { MESSAGES, TOOLS as TOOL_NAMES } from '../utils/constants.js';
import { TOOLS } from './definitions.js';
import {
  handleCreateCalendarEvent,
  handleCreateReminder,
  handleCreateReminderList,
  handleCreateSubtask,
  handleDeleteCalendarEvent,
  handleDeleteReminder,
  handleDeleteReminderList,
  handleDeleteSubtask,
  handleReadCalendarEvents,
  handleReadCalendars,
  handleReadReminderLists,
  handleReadReminders,
  handleReadSubtasks,
  handleReorderSubtasks,
  handleToggleSubtask,
  handleUpdateCalendarEvent,
  handleUpdateReminder,
  handleUpdateReminderList,
  handleUpdateSubtask,
} from './handlers/index.js';

type ToolArgs =
  | RemindersToolArgs
  | ListsToolArgs
  | SubtasksToolArgs
  | CalendarToolArgs
  | CalendarsToolArgs;

export type ToolInput =
  | Omit<RemindersToolArgs, 'action'>
  | Omit<ListsToolArgs, 'action'>
  | Omit<SubtasksToolArgs, 'action'>
  | Omit<CalendarToolArgs, 'action'>
  | Omit<CalendarsToolArgs, 'action'>;

export type ConfirmWrite = (name: string, args: ToolArgs) => Promise<boolean>;
type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];
type ToolRouter = (
  args?: ToolInput,
  confirmWrite?: ConfirmWrite,
) => Promise<CallToolResult>;

function createOperationRouter<TArgs extends ToolArgs>(
  toolName: ToolName,
  action: TArgs['action'],
  handler: (args: TArgs) => Promise<CallToolResult>,
): ToolRouter {
  return async (args = {}, confirmWrite) => {
    const allowedFields = Object.keys(
      TOOLS.find((tool) => tool.name === toolName)?.inputSchema.properties ??
        {},
    );
    const unknownFields = Object.keys(args).filter(
      (key) => !allowedFields.includes(key),
    );
    if (unknownFields.length > 0) {
      return createErrorResponse(
        `Unknown arguments for ${toolName}: ${unknownFields.join(', ')}`,
      );
    }

    // The tool name fixes the operation; caller input cannot select another one.
    // Snapshot before confirmation so approval applies to the executed values.
    const typedArgs = { ...structuredClone(args), action } as TArgs;
    if (action !== 'read') {
      let confirmed = false;
      try {
        confirmed = (await confirmWrite?.(toolName, typedArgs)) === true;
      } catch {
        return createErrorResponse(
          'User confirmation is unavailable. No changes were made. Use a host that supports MCP form elicitation and try again.',
        );
      }
      if (!confirmed) {
        return createErrorResponse(
          'Explicit user confirmation is required for this write. No changes were made.',
        );
      }
    }
    return handler(typedArgs);
  };
}

const TOOL_ROUTER_MAP = {
  [TOOL_NAMES.REMINDERS_TASKS_READ]: createOperationRouter<RemindersToolArgs>(
    TOOL_NAMES.REMINDERS_TASKS_READ,
    'read',
    handleReadReminders,
  ),
  [TOOL_NAMES.REMINDERS_TASKS_CREATE]: createOperationRouter<RemindersToolArgs>(
    TOOL_NAMES.REMINDERS_TASKS_CREATE,
    'create',
    handleCreateReminder,
  ),
  [TOOL_NAMES.REMINDERS_TASKS_UPDATE]: createOperationRouter<RemindersToolArgs>(
    TOOL_NAMES.REMINDERS_TASKS_UPDATE,
    'update',
    handleUpdateReminder,
  ),
  [TOOL_NAMES.REMINDERS_TASKS_DELETE]: createOperationRouter<RemindersToolArgs>(
    TOOL_NAMES.REMINDERS_TASKS_DELETE,
    'delete',
    handleDeleteReminder,
  ),
  [TOOL_NAMES.REMINDERS_LISTS_READ]: createOperationRouter<ListsToolArgs>(
    TOOL_NAMES.REMINDERS_LISTS_READ,
    'read',
    () => handleReadReminderLists(),
  ),
  [TOOL_NAMES.REMINDERS_LISTS_CREATE]: createOperationRouter<ListsToolArgs>(
    TOOL_NAMES.REMINDERS_LISTS_CREATE,
    'create',
    handleCreateReminderList,
  ),
  [TOOL_NAMES.REMINDERS_LISTS_UPDATE]: createOperationRouter<ListsToolArgs>(
    TOOL_NAMES.REMINDERS_LISTS_UPDATE,
    'update',
    handleUpdateReminderList,
  ),
  [TOOL_NAMES.REMINDERS_LISTS_DELETE]: createOperationRouter<ListsToolArgs>(
    TOOL_NAMES.REMINDERS_LISTS_DELETE,
    'delete',
    handleDeleteReminderList,
  ),
  [TOOL_NAMES.CALENDAR_EVENTS_READ]: createOperationRouter<CalendarToolArgs>(
    TOOL_NAMES.CALENDAR_EVENTS_READ,
    'read',
    handleReadCalendarEvents,
  ),
  [TOOL_NAMES.CALENDAR_EVENTS_CREATE]: createOperationRouter<CalendarToolArgs>(
    TOOL_NAMES.CALENDAR_EVENTS_CREATE,
    'create',
    handleCreateCalendarEvent,
  ),
  [TOOL_NAMES.CALENDAR_EVENTS_UPDATE]: createOperationRouter<CalendarToolArgs>(
    TOOL_NAMES.CALENDAR_EVENTS_UPDATE,
    'update',
    handleUpdateCalendarEvent,
  ),
  [TOOL_NAMES.CALENDAR_EVENTS_DELETE]: createOperationRouter<CalendarToolArgs>(
    TOOL_NAMES.CALENDAR_EVENTS_DELETE,
    'delete',
    handleDeleteCalendarEvent,
  ),
  [TOOL_NAMES.CALENDAR_CALENDARS_READ]:
    createOperationRouter<CalendarsToolArgs>(
      TOOL_NAMES.CALENDAR_CALENDARS_READ,
      'read',
      handleReadCalendars,
    ),
  [TOOL_NAMES.REMINDERS_SUBTASKS_READ]: createOperationRouter<SubtasksToolArgs>(
    TOOL_NAMES.REMINDERS_SUBTASKS_READ,
    'read',
    handleReadSubtasks,
  ),
  [TOOL_NAMES.REMINDERS_SUBTASKS_CREATE]:
    createOperationRouter<SubtasksToolArgs>(
      TOOL_NAMES.REMINDERS_SUBTASKS_CREATE,
      'create',
      handleCreateSubtask,
    ),
  [TOOL_NAMES.REMINDERS_SUBTASKS_UPDATE]:
    createOperationRouter<SubtasksToolArgs>(
      TOOL_NAMES.REMINDERS_SUBTASKS_UPDATE,
      'update',
      handleUpdateSubtask,
    ),
  [TOOL_NAMES.REMINDERS_SUBTASKS_DELETE]:
    createOperationRouter<SubtasksToolArgs>(
      TOOL_NAMES.REMINDERS_SUBTASKS_DELETE,
      'delete',
      handleDeleteSubtask,
    ),
  [TOOL_NAMES.REMINDERS_SUBTASKS_TOGGLE]:
    createOperationRouter<SubtasksToolArgs>(
      TOOL_NAMES.REMINDERS_SUBTASKS_TOGGLE,
      'toggle',
      handleToggleSubtask,
    ),
  [TOOL_NAMES.REMINDERS_SUBTASKS_REORDER]:
    createOperationRouter<SubtasksToolArgs>(
      TOOL_NAMES.REMINDERS_SUBTASKS_REORDER,
      'reorder',
      handleReorderSubtasks,
    ),
} satisfies Record<ToolName, ToolRouter>;

function createErrorResponse(message: string): CallToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

export async function handleToolCall(
  name: string,
  args?: ToolInput,
  confirmWrite?: ConfirmWrite,
): Promise<CallToolResult> {
  if (!Object.keys(TOOL_ROUTER_MAP).includes(name)) {
    return createErrorResponse(MESSAGES.ERROR.UNKNOWN_TOOL(name));
  }
  return TOOL_ROUTER_MAP[name as ToolName](args, confirmWrite);
}

export { TOOLS };
