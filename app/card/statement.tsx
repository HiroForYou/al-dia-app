import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { Button, DateField, EmptyState, Header, MoneyField, Screen, T } from '../../components/ui';
import { dayOfMonth, diffDays, fromKey, shortDate, todayKey } from '../../lib/dates';
import { parseAmount, plain } from '../../lib/format';
import { cardOpenDue, cardTitle, cycleEnd, exonerationInfo } from '../../lib/schedule';
import { findCard, updateCard } from '../../lib/store';
import { colors, fonts, useTheme } from '../../lib/theme';
import { showToast } from '../../lib/toast';
import { useUnsavedGuard } from '../../lib/forms';

// Vista "Actualizar estado de cuenta": se copian las cifras del banco después del cierre.
export default function StatementScreen() {
  useTheme(); // repinta al cambiar el tema
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const card = findCard(id);
  const today = todayKey();

  const defaultDue = (() => {
    if (!card) return today;
    if (card.statement && !card.payments[card.statement.dueDate]) return card.statement.dueDate;
    const open = cardOpenDue(card, today);
    if (open) return open;
    const t = fromKey(today);
    return dayOfMonth(t.getFullYear(), t.getMonth() + 1, card.dueDay);
  })();
  const sameCycle = card?.statement?.dueDate === defaultDue;
  const exo = card ? exonerationInfo(card, today) : null;

  const [total, setTotal] = useState(sameCycle && card?.statement ? plain(card.statement.total) : '');
  const [minimum, setMinimum] = useState(sameCycle && card?.statement ? plain(card.statement.minimum) : '');
  const [due, setDue] = useState(defaultDue);
  const [spent, setSpent] = useState(exo && exo.spent ? plain(exo.spent) : '');
  const [tried, setTried] = useState(false);
  const allowLeave = useUnsavedGuard(JSON.stringify([total, minimum, due, spent]));

  if (!card) {
    return (
      <Screen>
        <Header title="Estado de cuenta" />
        <EmptyState icon="card" title="Tarjeta no encontrada" body="Puede que la hayas eliminado." />
      </Screen>
    );
  }

  const totalN = parseAmount(total);
  const minN = parseAmount(minimum);
  const hasStatementInput = total.trim() !== '' || minimum.trim() !== '';
  const statementError = tried && hasStatementInput && (totalN === null || minN === null || minN > totalN) ? 'Revisa el total y el mínimo' : null;
  // La fecha debe caer cerca de un vencimiento de la tarjeta para asociarse a él (ver STATEMENT_MATCH_DAYS).
  const dateError = hasStatementInput && Math.abs(diffDays(due, defaultDue)) > 15 ? `Usa una fecha cercana al vencimiento del ${shortDate(defaultDue)}` : null;

  const save = () => {
    setTried(true);
    if (dateError || statementError || (hasStatementInput && (totalN === null || minN === null || minN > totalN))) return;
    const spentN = parseAmount(spent);
    updateCard(card.id, (c) => ({
      ...c,
      statement: hasStatementInput && totalN !== null && minN !== null ? { total: totalN, minimum: minN, dueDate: due } : c.statement,
      ...(c.minSpend > 0 ? { spent: spentN ?? 0, spendCycleEnd: cycleEnd(c, today) } : {}),
    }));
    showToast('Estado de cuenta guardado');
    allowLeave();
    router.back();
  };

  return (
    <Screen keyboard footer={<Button label="Guardar" onPress={save} />}>
      <Header title="Estado de cuenta" />
      <T style={{ fontFamily: fonts.sansSemi, fontSize: 15, marginTop: 22 }}>
        {cardTitle(card)} •••• {card.last4}
      </T>
      <T style={{ fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 19 }}>Copia estas cifras desde la app de tu banco después del cierre.</T>
      <MoneyField label="Total a pagar" value={total} onChangeText={setTotal} error={statementError} />
      <MoneyField label="Pago mínimo" value={minimum} onChangeText={setMinimum} />
      <DateField label="Fecha de vencimiento" value={due} onChange={setDue} />
      {dateError ? <T style={{ fontSize: 12, color: colors.dangerText, marginTop: 4 }}>{dateError}</T> : null}
      {card.minSpend > 0 ? (
        <>
          <MoneyField label="Consumo acumulado para exonerar" value={spent} onChangeText={setSpent} />
          <T style={{ fontSize: 12, color: colors.muted, marginTop: 6 }}>
            Meta del ciclo: {plain(card.minSpend)} · cierra el {cycleEnd(card, today).slice(8, 10)}/{cycleEnd(card, today).slice(5, 7)}
          </T>
        </>
      ) : null}
    </Screen>
  );
}
