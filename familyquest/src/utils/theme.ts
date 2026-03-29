// Theme color constants — indexed by member.gender
// Keeps Recharts chart colors in sync with the CSS variable theme system.

type ThemeKey = 'default' | 'male' | 'female';

export const PRIMARY_HEX: Record<ThemeKey, string> = {
  default: '#4647d3', // indigo — no gender set
  male:    '#0057bd', // blue
  female:  '#b00d6a', // pink/magenta
};

export const PRIMARY_CURSOR: Record<ThemeKey, string> = {
  default: 'rgba(70, 71, 211, 0.05)',
  male:    'rgba(0, 87, 189, 0.05)',
  female:  'rgba(176, 13, 106, 0.05)',
};
