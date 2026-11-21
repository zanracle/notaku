import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme';

/**
 * Ilustrasi doodle flat duotone: satu bidang warna kategori + garis tinta.
 * Digambar di grid 24x24 agar tetap terbaca di 20 px.
 */
export function CategoryIcon({
  icon,
  color,
  size = 22,
  ink,
}: {
  icon: string;
  color: string;
  size?: number;
  ink?: string;
}) {
  const theme = useTheme();
  const stroke = ink ?? theme.text;
  const sw = 1.7;

  const common = {
    stroke,
    strokeWidth: sw,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (icon) {
    case 'food':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M3.6 12.2h16.8c-.4 4-3.9 6.9-8.4 6.9S4 16.2 3.6 12.2Z" fill={color} {...common} />
          <Path d="M3 12.2h18" {...common} />
          <Path d="M9 8.6c-.8-1.1.7-1.9 0-3.1M13.2 8.6c-.8-1.1.7-1.9 0-3.1" {...common} />
        </Svg>
      );
    case 'car':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4.2 15.4h15.6l-1.9-4.2c-.25-.7-.95-1.2-1.75-1.2H7.85c-.8 0-1.5.5-1.75 1.2l-1.9 4.2Z"
            fill={color}
            {...common}
          />
          <Circle cx="7.6" cy="16.6" r="1.7" fill="none" {...common} />
          <Circle cx="16.4" cy="16.6" r="1.7" fill="none" {...common} />
          <Path d="M8.8 12.6h6.4" {...common} />
        </Svg>
      );
    case 'bag':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M5.4 9.2h13.2l.9 9.4c.06.6-.39 1.1-.99 1.1H5.5c-.6 0-1.05-.5-.99-1.1l.89-9.4Z"
            fill={color}
            {...common}
          />
          <Path d="M8.9 9V7.9a3.1 3.1 0 0 1 6.2 0V9" {...common} />
          <Circle cx="11" cy="13.7" r="0.9" fill={stroke} />
          <Circle cx="14.2" cy="13.7" r="0.9" fill={stroke} />
        </Svg>
      );
    case 'bed':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M3.6 18.2V9.2" {...common} />
          <Path d="M3.6 13.2h16.8v5" fill={color} {...common} />
          <Rect x="6" y="10.2" width="4.6" height="3" rx="1" fill="none" {...common} />
          <Path d="M11.4 12.4h6.4" {...common} />
        </Svg>
      );
    case 'parking':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="5" y="3.6" width="14" height="16.8" rx="2.4" fill={color} {...common} />
          <Path d="M9.6 16.6V8h3.1a2.6 2.6 0 0 1 0 5.2H9.6" {...common} strokeWidth={1.9} />
        </Svg>
      );
    case 'fuel':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M6.4 10.2h6.2V19H6.4z" fill={color} {...common} />
          <Path d="M7.6 10.2V5.6h3.8v4.6" {...common} />
          <Path d="M12.6 12.6h2.2v3.2h1.8v-5l-2-2" {...common} />
          <Path d="M5.4 19.4h8.2" {...common} />
        </Svg>
      );
    case 'pencil':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M6 18.4l1.5-4.6L15.9 5.4a2.2 2.2 0 0 1 3.1 3.1l-8.3 8.4L6 18.4Z"
            fill={color}
            {...common}
          />
          <Path d="M14.4 7.2l3 3" {...common} />
          <Path d="M6.6 17.8l-.6.6" {...common} />
        </Svg>
      );
    case 'tag':
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M3.8 11.4 11.2 4h7.2v7.2L11.2 18.6l-7.4-7.2Z" fill={color} {...common} />
          <Circle cx="15" cy="7.4" r="1.5" fill="none" {...common} />
        </Svg>
      );
  }
}

