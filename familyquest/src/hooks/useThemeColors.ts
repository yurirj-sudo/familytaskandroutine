import { useCurrentMember } from '../store/authStore';
import { PRIMARY_HEX, PRIMARY_CURSOR } from '../utils/theme';

type ThemeKey = 'default' | 'male' | 'female';

/**
 * Returns the current member's themed primary hex color and cursor fill.
 * Used primarily for Recharts components that cannot consume Tailwind/CSS variables.
 */
export const useThemeColors = () => {
  const member = useCurrentMember();
  const key: ThemeKey = (member?.gender as ThemeKey) ?? 'default';
  return {
    primary:       PRIMARY_HEX[key],
    primaryCursor: PRIMARY_CURSOR[key],
  };
};
