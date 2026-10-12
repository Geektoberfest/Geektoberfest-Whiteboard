const AVATAR_LIMIT = 6;

/**
 * Returns the number of participants not represented by visible avatars.
 * This is the pure function tested by PresenceBar.test.js.
 */
export function overflowCount(participants) {
  if (!Array.isArray(participants)) return 0;
  return Math.max(0, participants.length - AVATAR_LIMIT);
}

export { AVATAR_LIMIT };
