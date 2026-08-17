/**
 * Greeting Utility Engine for HANARA SMS
 * Schedules contextual greetings by specific time and day for all staff accounts,
 * automatically rotating to a fresh greeting on each login session.
 */

export const GREETINGS_CATALOG = {
  // Day-of-week specific greetings
  days: {
    1: [ // Monday
      'Happy Monday',
      'Happy Monday, {name}',
    ],
    2: [ // Tuesday
      'Happy Tuesday',
      'Happy Tuesday, {name}',
    ],
    3: [ // Wednesday
      'Happy Wednesday',
      'Happy Wednesday, {name}',
    ],
    4: [ // Thursday
      'Happy Thursday',
      'Happy Thursday, {name}',
    ],
    5: [ // Friday
      'Happy Friday',
      'Happy Friday, {name}',
      'That Friday feeling',
      'That Friday feeling, {name}',
    ],
    6: [ // Saturday
      'Happy Saturday, {name}',
      'Happy Saturday!',
      'Welcome to the weekend',
      'Welcome to the weekend, {name}',
    ],
    0: [ // Sunday
      'Happy Sunday',
      'Happy Sunday, {name}',
      'Sunday session, {name}?',
      'Sunday session?',
      'Welcome to the weekend',
      'Welcome to the weekend, {name}',
    ],
  },

  // Time-of-day specific greetings
  times: {
    // 05:00 - 11:59 Morning
    morning: [
      'Good morning',
      'Good morning, {name}',
      'Coffee and Hanara time?',
    ],
    // 12:00 - 16:59 Afternoon
    afternoon: [
      'Good afternoon',
      'Good afternoon, {name}',
      'How was your day, {name}?',
      'How was your day?',
    ],
    // 17:00 - 21:59 Evening
    evening: [
      'Evening',
      'Evening, {name}',
      'Good evening',
      'Good evening, {name}',
      'How was your day, {name}?',
      'How was your day?',
      'What’s on your mind tonight?',
    ],
    // 22:00 - 04:59 Late Night / Night Owl
    late_night: [
      'Hello, night owl',
      'What’s on your mind tonight?',
      'Good evening',
      'Good evening, {name}',
      'Burning the midnight oil, {name}?',
      'Burning the midnight oil?',
      'Still up, {name}?',
      'Late night grind, {name}!',
      'Late night grind!',
      'Working late, {name}?',
      'Working late tonight?',
      'Midnight productivity, {name}',
      'Burning bright in the dark, {name}',
      'Up late making magic happen!',
      'Quiet hours, sharp mind, {name}',
      'Late night check-in, {name}',
      'Late night dedication, {name}',
      'Peace and quiet for deep work, {name}',
      'Midnight oil mode activated!',
    ],
  },

  // General / Anytime greetings
  general: [
    '{name} returns!',
    'Back at it, {name}',
    'Back at it!',
    'Greetings, {name}',
    'Hey there',
    'Hey there, {name}',
    'Hi {name}, how are you?',
    'Hi, how are you?',
    'How’s it going, {name}?',
    'How’s it going?',
    'Welcome',
    'Welcome, {name}',
    'What’s new, {name}?',
    'What’s new?',
    'What’s on your mind, {name}?',
    'What’s on your mind?',
    'Let’s work incognito',
    'You’re incognito',
  ],
};

/**
 * Returns time period key for the specified hour.
 * @param {number} hour 0-23
 */
export const getTimePeriod = (hour) => {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'late_night';
};

/**
 * Get all candidate greeting templates for a specific Date.
 * Combines day-specific, time-of-day specific, and general greetings.
 * @param {Date} [date]
 * @returns {string[]} List of eligible greeting template strings
 */
export const getEligibleGreetings = (date = new Date()) => {
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ...
  const hour = date.getHours();
  const period = getTimePeriod(hour);

  const candidates = [];

  // Add day-specific greetings
  if (GREETINGS_CATALOG.days[day]) {
    candidates.push(...GREETINGS_CATALOG.days[day]);
  }

  // Add weekend anticipation on Friday evening (from 4pm onwards)
  if (day === 5 && hour >= 16) {
    candidates.push('Welcome to the weekend', 'Welcome to the weekend, {name}');
  }

  // Add time-specific greetings
  if (GREETINGS_CATALOG.times[period]) {
    candidates.push(...GREETINGS_CATALOG.times[period]);
  }

  // Add general greetings
  candidates.push(...GREETINGS_CATALOG.general);

  // Return unique templates
  return Array.from(new Set(candidates));
};

/**
 * Extract a friendly first/display name for a staff user.
 * @param {object} user
 * @returns {string}
 */
export const getStaffDisplayName = (user) => {
  if (!user) return 'there';

  if (user.refStaff) {
    const staff = user.refStaff;
    if (staff.firstName) {
      return staff.firstName.trim();
    }
  }

  if (user.firstName) {
    return user.firstName.trim();
  }

  if (user.name) {
    const parts = user.name.trim().split(' ');
    return parts[0] || user.name;
  }

  if (user.email) {
    const emailPrefix = user.email.split('@')[0];
    return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
  }

  return 'there';
};

const STORAGE_KEY_SESSION_GREETING = 'staff_session_greeting';
const STORAGE_KEY_LAST_TEMPLATE = 'staff_last_greeting_template';

/**
 * Generates and stores a new greeting template for the session.
 * Always tries to select a different greeting from the previous one.
 * @param {object} [user]
 * @param {Date} [date]
 * @returns {string} The selected template string
 */
export const generateNewLoginGreeting = (user, date = new Date()) => {
  const eligible = getEligibleGreetings(date);
  if (!eligible || eligible.length === 0) {
    return 'Welcome, {name}';
  }

  const lastTemplate = localStorage.getItem(STORAGE_KEY_LAST_TEMPLATE);
  const filtered = eligible.filter((tpl) => tpl !== lastTemplate);
  const pool = filtered.length > 0 ? filtered : eligible;

  const randomIndex = Math.floor(Math.random() * pool.length);
  const selectedTemplate = pool[randomIndex];

  try {
    sessionStorage.setItem(STORAGE_KEY_SESSION_GREETING, selectedTemplate);
    localStorage.setItem(STORAGE_KEY_LAST_TEMPLATE, selectedTemplate);
  } catch (e) {
    // Ignore storage quota/permission issues in restricted environments
  }

  return selectedTemplate;
};

/**
 * Clears the active session greeting (e.g. on logout).
 */
export const clearSessionGreeting = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY_SESSION_GREETING);
  } catch (e) {
    // Ignore
  }
};

/**
 * Format a greeting template with the staff's name.
 * @param {string} template
 * @param {string} name
 * @returns {string}
 */
export const formatGreeting = (template, name) => {
  if (!template) return `Welcome, ${name || 'there'}`;
  return template.replace(/\{name\}/g, name || 'there');
};

/**
 * Main function to get the current staff greeting for display.
 * Resolves the session's active greeting (or picks a fresh one if unset).
 * @param {object} user User object from AuthContext
 * @param {string} [customName] Optional override for name
 * @param {Date} [date] Optional date override
 * @returns {string} Formatted greeting ready for display
 */
export const getStaffGreeting = (user, customName, date = new Date()) => {
  let template = null;
  try {
    template = sessionStorage.getItem(STORAGE_KEY_SESSION_GREETING);
  } catch (e) {
    // Ignore
  }

  // If no template is saved for this session, generate one now
  if (!template) {
    template = generateNewLoginGreeting(user, date);
  }

  const name = customName || getStaffDisplayName(user);
  return formatGreeting(template, name);
};

export default {
  GREETINGS_CATALOG,
  getTimePeriod,
  getEligibleGreetings,
  getStaffDisplayName,
  generateNewLoginGreeting,
  clearSessionGreeting,
  formatGreeting,
  getStaffGreeting,
};
