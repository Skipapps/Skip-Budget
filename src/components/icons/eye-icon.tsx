import Svg, { Circle, Line, Path } from 'react-native-svg';

import { useColors } from '@/providers/theme-provider';

type EyeIconProps = {
  /** True when the password is currently visible. */
  open: boolean;
  size?: number;
  color?: string;
};

/** Eye / eye-with-slash toggle for password fields. */
export function EyeIcon({ open, size = 22, color }: EyeIconProps) {
  const colors = useColors();
  // Defaulted here rather than in the signature: the fallback follows the
  // theme, and a default parameter is evaluated before any hook has run.
  const stroke = color ?? colors.muted;

  if (open) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
          stroke={stroke}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={12} cy={12} r={3} stroke={stroke} strokeWidth={1.8} />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1={1} y1={1} x2={23} y2={23} stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
