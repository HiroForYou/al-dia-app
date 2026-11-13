import * as Haptics from 'expo-haptics';

// Vibraciones cortas de confirmación. Si el equipo no las soporta, no pasa nada.

export function tapHaptic(): void {
  Haptics.selectionAsync().catch(() => {});
}

export function successHaptic(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function errorHaptic(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
