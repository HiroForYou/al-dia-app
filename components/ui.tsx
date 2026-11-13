import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fromKey, longDate, shortDate, toKey, type DateKey } from '../lib/dates';
import { currencySymbol, money } from '../lib/format';
import type { DueItem, DueStatus } from '../lib/schedule';
import { quickPay } from '../lib/actions';
import { tapHaptic } from '../lib/haptics';
import { pickOption, type SheetOption } from '../lib/sheet';
import { colors, fonts, radius } from '../lib/theme';
import { Icon, type IconName } from './Icon';

/** Distancia de la barra flotante al borde inferior (20 px del diseño o el área segura si es mayor). */
export function tabBarBottom(insetBottom: number): number {
  return Math.max(20, insetBottom + 4);
}

/** Espacio a dejar al final de las listas para que la barra flotante no tape la última fila. */
export function tabBarSpace(insetBottom: number): number {
  return 64 + tabBarBottom(insetBottom) + 20;
}

/** Ancho máximo del contenido en tablets y pantallas grandes. */
const MAX_CONTENT_WIDTH = 600;
const contentWidth: ViewStyle = { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' };

// ---------------------------------------------------------------------------------------------------------
// Estructura de pantalla
// ---------------------------------------------------------------------------------------------------------

/**
 * Contenedor de cada vista: fondo, márgenes del diseño (20 px a los lados) y desplazamiento.
 * `footer` queda fijo abajo (botones principales); `tabBar` reserva espacio para la barra flotante.
 */
export function Screen({
  children,
  footer,
  tabBar = false,
  scroll = true,
  keyboard = false,
  contentStyle,
}: {
  children: ReactNode;
  footer?: ReactNode;
  tabBar?: boolean;
  scroll?: boolean;
  keyboard?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const bottomSpace = tabBar ? tabBarSpace(insets.bottom) : footer ? 16 : 24 + insets.bottom;
  const content = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[contentWidth, { paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: bottomSpace }, contentStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[contentWidth, { flex: 1, paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: bottomSpace }, contentStyle]}>{children}</View>
  );
  const body = (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>{content}</View>
      {footer ? <View style={[contentWidth, { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 + insets.bottom, gap: 12 }]}>{footer}</View> : null}
    </View>
  );
  if (!keyboard) return body;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {body}
    </KeyboardAvoidingView>
  );
}

export function T({ style, children, numberOfLines }: { style?: StyleProp<TextStyle>; children: ReactNode; numberOfLines?: number }) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: fonts.sans, color: colors.ink }, style]}>
      {children}
    </Text>
  );
}

/** Título de las pantallas principales (24 px) con subtítulo opcional y acción a la derecha. */
export function ScreenTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <T style={{ fontFamily: fonts.sansBold, fontSize: 24, lineHeight: 30 }}>{title}</T>
        {subtitle ? <T style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>{subtitle}</T> : null}
      </View>
      {right}
    </View>
  );
}

/** Botón redondo con borde (Volver, Editar, Recordatorios). */
export function CircleButton({ icon, onPress, label }: { icon: IconName; onPress?: () => void; label: string }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon name={icon} size={20} />
    </Pressable>
  );
}

/** Cabecera de las vistas internas: Volver + título + acción opcional. */
export function Header({ title, right, onBack }: { title: string; right?: ReactNode; onBack?: () => void }) {
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <CircleButton icon="back" label="Volver" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} />
      <T numberOfLines={1} style={{ flex: 1, fontFamily: fonts.sansBold, fontSize: 17 }}>
        {title}
      </T>
      {right}
    </View>
  );
}

export function SectionLabel({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginTop: 24, marginBottom: 2 }, style]}>
      <T style={{ fontFamily: fonts.sansSemi, fontSize: 12, letterSpacing: 0.72, color: colors.muted }}>{children.toUpperCase()}</T>
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.line }} />;
}

// ---------------------------------------------------------------------------------------------------------
// Botones
// ---------------------------------------------------------------------------------------------------------

export function Button({
  label,
  onPress,
  variant = 'solid',
  disabled,
  compact,
  danger,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'solid' | 'outline' | 'text';
  disabled?: boolean;
  compact?: boolean;
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const solid = variant === 'solid';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          minHeight: compact ? 48 : 52,
          paddingHorizontal: 16,
          borderRadius: compact ? radius.field : radius.button,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: solid ? colors.primary : 'transparent',
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: colors.primary,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: fonts.sansSemi,
          fontSize: compact ? 15 : 16,
          color: solid ? colors.onPrimary : danger ? colors.dangerText : colors.ink,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Pastilla de filtro (Todos / Tarjetas / ...). */
export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={{ top: 6, bottom: 6 }}
      onPress={onPress}
      style={{
        minHeight: 34,
        paddingHorizontal: 14,
        borderRadius: radius.chip,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primary : colors.card,
        justifyContent: 'center',
      }}
    >
      <Text maxFontSizeMultiplier={1.4} style={{ fontFamily: fonts.sansSemi, fontSize: 13, color: active ? colors.onPrimary : colors.primaryOnSoft }}>
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Estados e ítems de lista
// ---------------------------------------------------------------------------------------------------------

const STATUS_STYLE = () =>
  ({
    vencido: { label: 'Vencido', bg: colors.dangerBg, fg: colors.dangerText, border: colors.dangerBorder, dot: colors.dangerText },
    por_vencer: { label: 'Por vencer', bg: colors.warnBg, fg: colors.warnText, border: colors.warnBorder, dot: colors.warnText },
    pagado: { label: 'Pagado', bg: colors.okBg, fg: colors.okText, border: colors.okBorder, dot: colors.success },
  }) as const;

export function statusDot(status: DueStatus): string {
  return STATUS_STYLE()[status].dot;
}

export function StatusChip({ status, label }: { status: DueStatus; label?: string }) {
  const s = STATUS_STYLE()[status];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        marginTop: 4,
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: radius.chip,
        backgroundColor: s.bg,
        borderWidth: 1,
        borderColor: s.border,
      }}
    >
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.sansSemi, fontSize: 12, color: s.fg }}>
        {label ?? s.label}
      </Text>
    </View>
  );
}

export function IconBubble({ icon, size = 44, iconSize = 20, tone = 'soft' }: { icon: IconName; size?: number; iconSize?: number; tone?: 'soft' | 'solid' | 'plain' }) {
  const bg = tone === 'solid' ? colors.primary : colors.primarySoft;
  const fg = tone === 'solid' ? colors.onPrimary : tone === 'plain' ? colors.ink : colors.primaryOnSoft;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={iconSize} color={fg} />
    </View>
  );
}

/** Fila de lista del diseño: ícono, nombre, línea secundaria, importe y estado. */
export function ListRow({
  icon,
  title,
  subtitle,
  amount,
  status,
  statusLabel,
  onPress,
  onLongPress,
  hint,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  amount?: string;
  status?: DueStatus;
  statusLabel?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  hint?: string;
}) {
  const stateLabel = status ? (statusLabel ?? STATUS_STYLE()[status].label) : '';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, amount, stateLabel, subtitle].filter(Boolean).join(', ')}
      accessibilityHint={hint}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, opacity: pressed ? 0.6 : 1 })}
    >
      <IconBubble icon={icon} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T numberOfLines={1} style={{ fontFamily: fonts.sansSemi, fontSize: 15 }}>
          {title}
        </T>
        <T numberOfLines={1} style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
          {subtitle}
        </T>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {amount ? <T style={{ fontFamily: fonts.sansBold, fontSize: 15 }}>{amount}</T> : null}
        {status ? <StatusChip status={status} label={statusLabel} /> : null}
      </View>
    </Pressable>
  );
}

export function dueSubtitle(item: DueItem): string {
  if (item.subtitle) return item.subtitle;
  if (item.status === 'pagado') return `${item.kind === 'subscription' ? 'Cobrado' : 'Pagó'}: ${shortDate(item.paidAt ?? item.due)}`;
  return `${item.status === 'vencido' ? 'Venció' : item.kind === 'subscription' ? 'Cobro' : 'Vence'}: ${shortDate(item.due)}`;
}

/** Fila de vencimiento. Con pulsación larga registra el pago sin abrir el detalle. */
export function DueRow({ item, onPress }: { item: DueItem; onPress?: () => void }) {
  const payable = item.status !== 'pagado' && (item.kind === 'card' || item.kind === 'service' || item.kind === 'loan');
  return (
    <ListRow
      icon={item.icon}
      title={item.title}
      subtitle={dueSubtitle(item)}
      amount={item.amountLabel ?? (item.amount !== null ? money(item.amount) : 'Sin monto')}
      status={item.status}
      statusLabel={item.kind === 'exoneration' && item.status === 'pagado' ? 'Cumplido' : undefined}
      onPress={onPress}
      onLongPress={payable ? () => quickPay(item) : undefined}
      hint={payable ? 'Mantén presionado para registrar el pago' : undefined}
    />
  );
}

/** Lista con separadores entre filas. */
export function RowList({ children }: { children: ReactNode[] }) {
  const rows = children.filter(Boolean);
  return (
    <View>
      {rows.map((child, i) => (
        <View key={i}>
          {i > 0 ? <Divider /> : null}
          {child}
        </View>
      ))}
    </View>
  );
}

/** Fila etiqueta / valor (detalles de tarjeta, préstamo, servicio). */
export function DetailRows({ rows }: { rows: [string, string][] }) {
  return (
    <View>
      {rows.map(([label, value], i) => (
        <View key={label}>
          {i > 0 ? <Divider /> : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, gap: 12 }}>
            <T style={{ fontSize: 14, color: colors.muted, flexShrink: 1 }}>{label}</T>
            <T style={{ fontSize: 14, fontFamily: fonts.sansSemi }}>{value}</T>
          </View>
        </View>
      ))}
    </View>
  );
}

export function ProgressBar({ value, color = colors.primary, track = colors.line }: { value: number; color?: string; track?: string }) {
  return (
    <View style={{ height: 8, borderRadius: 99, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`, height: 8, borderRadius: 99, backgroundColor: color }} />
    </View>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const base: ViewStyle = { backgroundColor: colors.card, borderRadius: radius.card, padding: 16 };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [base, style, { opacity: pressed ? 0.75 : 1 }]}>
      {children}
    </Pressable>
  );
}

export function EmptyState({ icon, title, body, children }: { icon: IconName; title: string; body: string; children?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', marginTop: 80, paddingHorizontal: 12 }}>
      <IconBubble icon={icon} size={88} iconSize={40} tone="plain" />
      <T style={{ fontFamily: fonts.sansBold, fontSize: 20, marginTop: 22, textAlign: 'center' }}>{title}</T>
      <T style={{ fontSize: 14, color: colors.muted, marginTop: 8, lineHeight: 21, textAlign: 'center' }}>{body}</T>
      {children ? <View style={{ alignSelf: 'stretch', gap: 12, marginTop: 28 }}>{children}</View> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Formularios
// ---------------------------------------------------------------------------------------------------------

function FieldShell({ label, children, style, error }: { label: string; children: ReactNode; style?: StyleProp<ViewStyle>; error?: string | null }) {
  return (
    <View style={[{ marginTop: 14 }, style]}>
      <T style={{ fontSize: 12, color: colors.muted, marginBottom: 6 }}>{label}</T>
      {children}
      {error ? <T style={{ fontSize: 12, color: colors.dangerText, marginTop: 4 }}>{error}</T> : null}
    </View>
  );
}

const boxStyle = (focused: boolean, error?: boolean): ViewStyle => ({
  minHeight: 48,
  borderWidth: 1,
  borderColor: error ? colors.dangerText : focused ? colors.primary : colors.border,
  borderRadius: radius.field,
  backgroundColor: colors.card,
  paddingHorizontal: 14,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
});

/** Campo de texto del diseño. `prefix` para la moneda ("S/") y `suffix` para "%". */
export function Field({
  label,
  prefix,
  suffix,
  error,
  style,
  ...props
}: TextInputProps & { label: string; prefix?: string; suffix?: string; error?: string | null; style?: StyleProp<ViewStyle> }) {
  const [focused, setFocused] = useState(false);
  return (
    <FieldShell label={label} style={style} error={error}>
      <View style={boxStyle(focused, !!error)}>
        {prefix ? <T style={{ fontSize: 15, color: colors.muted }}>{prefix}</T> : null}
        <TextInput
          accessibilityLabel={label}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor={colors.faint}
          style={{ flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.ink, paddingVertical: 10 }}
        />
        {suffix ? <T style={{ fontSize: 15, color: colors.muted }}>{suffix}</T> : null}
      </View>
    </FieldShell>
  );
}

export function MoneyField(props: Omit<TextInputProps, 'keyboardType'> & { label: string; error?: string | null; style?: StyleProp<ViewStyle> }) {
  return <Field {...props} prefix={currencySymbol()} keyboardType="decimal-pad" placeholder={props.placeholder ?? '0.00'} />;
}

/** Campo que abre la hoja de opciones. */
export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  style,
  sheetTitle,
}: {
  label: string;
  value: T;
  options: SheetOption<T>[];
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
  sheetTitle?: string;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <FieldShell label={label} style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${current?.label ?? String(value)}`}
        onPress={() => pickOption({ title: sheetTitle ?? label, options, selected: value, onPick: onChange })}
        style={({ pressed }) => [boxStyle(false), { justifyContent: 'space-between', opacity: pressed ? 0.7 : 1 }]}
      >
        <T numberOfLines={1} style={{ fontSize: 15, flex: 1 }}>
          {current?.label ?? String(value)}
        </T>
        <View style={{ transform: [{ rotate: '90deg' }] }}>
          <Icon name="chevron" size={16} color={colors.muted} />
        </View>
      </Pressable>
    </FieldShell>
  );
}

/** Fecha con el selector nativo. */
export function DateField({
  label,
  value,
  onChange,
  style,
  minimumDate,
}: {
  label: string;
  value: DateKey;
  onChange: (v: DateKey) => void;
  style?: StyleProp<ViewStyle>;
  minimumDate?: DateKey;
}) {
  const [iosOpen, setIosOpen] = useState(false);
  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: fromKey(value),
        mode: 'date',
        minimumDate: minimumDate ? fromKey(minimumDate) : undefined,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(toKey(date));
        },
      });
    } else {
      setIosOpen((v) => !v);
    }
  };
  return (
    <FieldShell label={label} style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${longDate(value)}`}
        onPress={open}
        style={({ pressed }) => [boxStyle(iosOpen), { justifyContent: 'space-between', opacity: pressed ? 0.7 : 1 }]}
      >
        <T style={{ fontSize: 15 }}>{longDate(value)}</T>
        <Icon name="calendar" size={18} color={colors.muted} />
      </Pressable>
      {iosOpen ? (
        <DateTimePicker
          value={fromKey(value)}
          mode="date"
          display="inline"
          minimumDate={minimumDate ? fromKey(minimumDate) : undefined}
          onChange={(_, date) => {
            if (date) onChange(toKey(date));
          }}
        />
      ) : null}
    </FieldShell>
  );
}

/** Interruptor del diseño (44×26, verde cuando está activo). */
export function Toggle({
  value,
  onChange,
  disabled,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => {
        tapHaptic();
        onChange(!value);
      }}
      hitSlop={10}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        backgroundColor: value ? colors.primary : colors.track,
        padding: 3,
        alignItems: value ? 'flex-end' : 'flex-start',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.white }} />
    </Pressable>
  );
}

export function ToggleRow({ label, value, onChange, style }: { label: string; value: boolean; onChange: (v: boolean) => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, gap: 12 }, style]}>
      <T style={{ fontSize: 15, flex: 1 }}>{label}</T>
      <Toggle value={value} onChange={onChange} label={label} />
    </View>
  );
}

/** Fila de Ajustes: ícono en burbuja, nombre y valor o interruptor. */
export function SettingsRow({
  icon,
  label,
  value,
  toggle,
  onPress,
}: {
  icon: IconName;
  label: string;
  value?: string;
  toggle?: { value: boolean; onChange: (v: boolean) => void };
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? [label, value].filter(Boolean).join(', ') : undefined}
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, opacity: pressed ? 0.6 : 1 })}
    >
      <IconBubble icon={icon} size={36} iconSize={18} tone="plain" />
      <T style={{ flex: 1, fontSize: 15, fontFamily: fonts.sansMedium }}>{label}</T>
      {toggle ? (
        <Toggle value={toggle.value} onChange={toggle.onChange} label={label} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {value ? <T style={{ fontSize: 13, color: colors.muted }}>{value}</T> : null}
          <Icon name="chevron" size={16} color={colors.muted} />
        </View>
      )}
    </Pressable>
  );
}

/** Fila de dos campos lado a lado. */
export function FieldRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 12 }}>{children}</View>;
}

export const DAY_OPTIONS: SheetOption<number>[] = Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: String(i + 1) }));

// ---------------------------------------------------------------------------------------------------------
// Búsqueda y orden de listas
// ---------------------------------------------------------------------------------------------------------

/** Quita tildes y mayúsculas para comparar ("Cálidda" coincide con "calidda"). */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Campo de búsqueda + pastillas de orden. Se muestra en listas largas (ver LIST_TOOLS_MIN). */
export function ListTools<K extends string>({
  query,
  onQuery,
  placeholder,
  sort,
  sorts,
  onSort,
}: {
  query: string;
  onQuery: (q: string) => void;
  placeholder: string;
  sort: K;
  sorts: { key: K; label: string }[];
  onSort: (k: K) => void;
}) {
  return (
    <View style={{ marginTop: 16, gap: 10 }}>
      <View style={[boxStyle(false), { minHeight: 44 }]}>
        <Icon name="search" size={18} color={colors.muted} />
        <TextInput
          accessibilityLabel={placeholder}
          value={query}
          onChangeText={onQuery}
          placeholder={placeholder}
          placeholderTextColor={colors.faint}
          autoCorrect={false}
          returnKeyType="search"
          style={{ flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.ink, paddingVertical: 8 }}
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Borrar búsqueda" hitSlop={10} onPress={() => onQuery('')}>
            <Icon name="close" size={16} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {sorts.map((s) => (
          <Chip key={s.key} label={s.label} active={s.key === sort} onPress={() => onSort(s.key)} />
        ))}
      </ScrollView>
    </View>
  );
}

/** Cantidad mínima de elementos para mostrar la búsqueda y el orden. */
export const LIST_TOOLS_MIN = 4;
