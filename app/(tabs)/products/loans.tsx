import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button, DetailRows, EmptyState, ProgressBar, Screen, ScreenTitle, SectionLabel, T } from '../../../components/ui';
import { longDate } from '../../../lib/dates';
import { money, percent } from '../../../lib/format';
import { loanOpenDue, loanProgress } from '../../../lib/schedule';
import { useData } from '../../../lib/store';
import { colors, fonts, radius, useTheme } from '../../../lib/theme';

// Vista "Préstamos": por cada préstamo, bloque verde con el saldo y avance de cuotas, y sus datos.
export default function LoansScreen() {
  useTheme(); // repinta al cambiar el tema
  const router = useRouter();
  const { loans } = useData();

  return (
    <Screen tabBar>
      <ScreenTitle title="Préstamos" />
      {loans.length === 0 ? (
        <EmptyState icon="coin" title="Sin préstamos" body="Registra tus préstamos para seguir el saldo y no olvidar ninguna cuota.">
          <Button label="Agregar préstamo" onPress={() => router.push('/loan/form')} />
        </EmptyState>
      ) : (
        <>
          {loans.map((loan) => {
            const p = loanProgress(loan);
            const next = loanOpenDue(loan);
            return (
              <View key={loan.id}>
                <Pressable
                  onPress={() => router.push(`/loan/${loan.id}`)}
                  style={({ pressed }) => ({
                    marginTop: 18,
                    backgroundColor: colors.primary,
                    borderRadius: radius.card,
                    padding: 20,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <T style={{ fontSize: 13, color: colors.onPrimaryMuted }}>Saldo pendiente</T>
                  <T style={{ fontFamily: fonts.sansBold, fontSize: 32, color: colors.onPrimary, marginTop: 2 }}>{money(p.balance)}</T>
                  <View style={{ marginTop: 14 }}>
                    <ProgressBar value={p.progress} color="#FFFFFF" track="rgba(255,255,255,0.25)" />
                  </View>
                  <T style={{ fontSize: 12, color: colors.onPrimaryMuted, marginTop: 8 }}>
                    {p.remaining === 0 ? 'Préstamo pagado' : `Cuota ${p.current} de ${loan.totalInstallments}`}
                  </T>
                </Pressable>
                <SectionLabel style={{ marginTop: 22 }}>{`${loan.type || 'Préstamo'} · ${loan.lender}`}</SectionLabel>
                <DetailRows
                  rows={[
                    ['Importe original', money(loan.principal)],
                    ['Cuota mensual', money(loan.installment)],
                    ['Próximo vencimiento', next ? longDate(next) : '—'],
                    ['Tasa anual', loan.rate !== null ? percent(loan.rate) : '—'],
                  ]}
                />
              </View>
            );
          })}
          <Button label="Agregar préstamo" variant="outline" style={{ marginTop: 18 }} onPress={() => router.push('/loan/form')} />
        </>
      )}
    </Screen>
  );
}
