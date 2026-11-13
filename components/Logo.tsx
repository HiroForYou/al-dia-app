import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Logo "Al Día" de docs/design (vista Logo): tarjeta sobre cuadrado verde con check de pagado.
// `background` cambia el fondo del cuadrado (variantes #0E5E63, #0A4A4E, #073638 o blanco).
export function Logo({ size = 96, background = '#0E5E63', ring = '#1C1C1E' }: { size?: number; background?: string; ring?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="Logo Al Día">
      <Rect width={100} height={100} rx={24} fill={background} />
      <Rect x={20} y={24} width={50} height={36} rx={8} fill="#fff" opacity={0.35} transform="rotate(-8 45 42)" />
      <Rect x={26} y={36} width={50} height={36} rx={8} fill="#fff" />
      <Rect x={26} y={45} width={50} height={7} fill="#0E5E63" />
      <Circle cx={70} cy={68} r={14} fill="#22A06B" stroke={ring} strokeWidth={4} />
      <Path d="M63 68l5 5 9-10" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
