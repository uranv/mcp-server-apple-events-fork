/**
 * constants.ts
 * Centralized constants and configuration values to eliminate magic numbers
 */

/**
 * File system and path constants
 */
export const FILE_SYSTEM = {
  /** Maximum directory traversal depth when searching for project root */
  MAX_DIRECTORY_SEARCH_DEPTH: 10,

  /** Package.json filename for project root detection */
  PACKAGE_JSON_FILENAME: 'package.json',

  /** Swift binary filename — points at the vendored `event` CLI (FradSer/event). */
  SWIFT_BINARY_NAME: 'event',
} as const;

/**
 * Validation and security constants
 */
export const VALIDATION = {
  /** Maximum lengths for different text fields */
  MAX_TITLE_LENGTH: 200,
  MAX_NOTE_LENGTH: 20000,
  MAX_LIST_NAME_LENGTH: 100,
  MAX_SEARCH_LENGTH: 100,
  MAX_URL_LENGTH: 500,
  MAX_LOCATION_LENGTH: 200,
  MAX_ATTENDEES: 50,
  /**
   * Shape check for attendee addresses. Deliberately permissive on the local
   * part — the job is rejecting anything that plainly is not an address before
   * it reaches AppleScript interpolation, not full RFC 5322 validation.
   */
  ATTENDEE_EMAIL_PATTERN: /^[^\s@"\\]+@[^\s@"\\]+\.[^\s@"\\]+$/,
} as const;

/**
 * Tool names for MCP server operations
 */
export const TOOLS = {
  REMINDERS_TASKS_READ: 'reminders_tasks_read',
  REMINDERS_TASKS_CREATE: 'reminders_tasks_create',
  REMINDERS_TASKS_UPDATE: 'reminders_tasks_update',
  REMINDERS_TASKS_DELETE: 'reminders_tasks_delete',
  REMINDERS_LISTS_READ: 'reminders_lists_read',
  REMINDERS_LISTS_CREATE: 'reminders_lists_create',
  REMINDERS_LISTS_UPDATE: 'reminders_lists_update',
  REMINDERS_LISTS_DELETE: 'reminders_lists_delete',
  REMINDERS_SUBTASKS_READ: 'reminders_subtasks_read',
  REMINDERS_SUBTASKS_CREATE: 'reminders_subtasks_create',
  REMINDERS_SUBTASKS_UPDATE: 'reminders_subtasks_update',
  REMINDERS_SUBTASKS_DELETE: 'reminders_subtasks_delete',
  REMINDERS_SUBTASKS_TOGGLE: 'reminders_subtasks_toggle',
  REMINDERS_SUBTASKS_REORDER: 'reminders_subtasks_reorder',
  CALENDAR_EVENTS_READ: 'calendar_events_read',
  CALENDAR_EVENTS_CREATE: 'calendar_events_create',
  CALENDAR_EVENTS_UPDATE: 'calendar_events_update',
  CALENDAR_EVENTS_DELETE: 'calendar_events_delete',
  CALENDAR_CALENDARS_READ: 'calendar_calendars_read',
} as const;

/**
 * Time and date constants for consistent time-based logic
 */
export const TIME = {
  /** Working hours boundaries */
  WORKING_HOURS_START: 9,
  WORKING_HOURS_END: 18,

  /** Time of day boundaries for categorization */
  MORNING_START: 5,
  NOON: 12,
  AFTERNOON_END: 17,
  EVENING_START: 17,
  NIGHT_START: 21,

  /** Default time suggestions */
  LATER_TODAY_HOURS: 4,
  END_OF_WEEK_HOUR: 17,
  DEFAULT_MORNING_HOUR: 9,

  /** Day of week constants (0 = Sunday, 6 = Saturday) */
  SUNDAY: 0,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;

/**
 * Error message templates
 */
export const MESSAGES = {
  ERROR: {
    UNKNOWN_TOOL: (name: string) => `Unknown tool: ${name}`,
    UNKNOWN_ACTION: (tool: string, action: string) =>
      `Unknown ${tool} action: ${action}`,
  },
} as const;
