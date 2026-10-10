// Shared palette so a user keeps the same colour on every collaborator's screen.
const USER_COLORS = [
  '#e11d48',
  '#db2777',
  '#9333ea',
  '#4f46e5',
  '#0284c7',
  '#0891b2',
  '#059669',
  '#65a30d',
  '#ca8a04',
  '#ea580c',
];

export function pickUserColor(seed) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return USER_COLORS[hash % USER_COLORS.length];
}
