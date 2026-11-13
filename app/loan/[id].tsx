import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, CircleButton, DetailRows, EmptyState, Header, ProgressBar, Screen, SectionLabel, StatusChip, T } from '../../components/ui';
import { longDate } from '../../lib/dates';
import { useToday } from '../../lib/today';
import { money, percent } from '../../lib/format';
import { loanItem, loanOpenDue, loanProgress, loanSchedule } from '../../lib/schedule';
import { payLoan } from '../../lib/actions';
import { useData } from '../../lib/store';
import { colors, fonts, radius, useTheme } from '../../lib/theme';

// Detalle de préstamo: saldo, avance de cuotas y registro del pago de la cuota.
export default function LoanDetailScreen() {
  useTheme(); // repinta al cambiar el tema
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useData();
  const today = useToday();
  const loan = data.loans.find((l) => l.id === id);

  if (!loan) {
    return (
      <Screen>
        <Header title="Préstamo" />
        <EmptyState icon="coin" title="Préstamo no encontrado" body="Puede que lo hayas eliminado." />
      </Screen>
    );
  }

  const p = loanProgress(loan);
  const due = loanOpenDue(loan, today);
  const item = due ? loanItem(loan, due, today) : null;

  // Número de la cuota abierta según su posición en el calendario (puede no ser la siguiente si hay atrasos).
  const dueNumber = due ? loanSchedule(loan).indexOf(due) + 1 : p.current;
  const pay = () => {
    if (due) payLoan(loan.id, due, dueNumber);
  };

  return (
    <Screen footer={<Button label={due ? `Pagué la cuota ${dueNumber}` : 'Préstamo pagado'} disabled={!due} onPress={pay} />}>
      <Header title={loan.type || 'Préstamo'} right={<CircleButton icon="edit" label="Editar" onPress={() => router.push(`/loan/form?id=${loan.id}`)} />} />
      <View style={{ marginTop: 18, backgroundColor: colors.primary, borderRadius: radius.card, padding: 20 }}>
        <T style={{ fontSize: 13, color: colors.onPrimaryMuted }}>Saldo pendiente</T>
        <T style={{ fontFamily: fonts.sansBold, fontSize: 32, color: colors.onPrimary, marginTop: 2 }}>{money(p.balance)}</T>
        <View style={{ marginTop: 14 }}>
          <ProgressBar value={p.progress} color="#FFFFFF" track="rgba(255,255,255,0.25)" />
        </View>
        <T style={{ fontSize: 12, color: colors.onPrimaryMuted, marginTop: 8 }}>
          {p.remaining === 0 ? 'Todas las cuotas pagadas' : `Cuota ${p.current} de ${loan.totalInstallments} · ${p.paid} pagadas`}
        </T>
      </View>
      {item ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <T style={{ fontSize: 14, color: colors.muted }}>Próxima cuota · {longDate(item.due)}</T>
          <StatusChip status={item.status} />
        </View>
      ) : null}
      <SectionLabel style={{ marginTop: 22 }}>{loan.lender}</SectionLabel>
      <DetailRows
        rows={[
          ['Importe original', money(loan.principal)],
          ['Cuota mensual', money(loan.installment)],
          ['Próximo vencimiento', due ? longDate(due) : '—'],
          ['Tasa anual', loan.rate !== null ? percent(loan.rate) : '—'],
          ['Total a pagar', money(loan.installment * loan.totalInstallments)],
        ]}
      />
    </Screen>
  );
}
