import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { Button, DateField, Field, FieldRow, Header, MoneyField, Screen, SelectField, T, ToggleRow } from '../../components/ui';
import { askConfirm } from '../../lib/confirm';
import { addMonths, todayKey } from '../../lib/dates';
import { money, parseAmount, plain } from '../../lib/format';
import { leaveAfterDelete, optionalNumberError, useSubmitOnce, useUnsavedGuard } from '../../lib/forms';
import { rekeyLoan } from '../../lib/rekey';
import { loanProgress } from '../../lib/schedule';
import { deleteLoan, findLoan, newId, saveLoan } from '../../lib/store';
import { colors, useTheme } from '../../lib/theme';
import { showToast } from '../../lib/toast';
import { BANKS, type Loan } from '../../lib/types';

const TYPES = ['Préstamo personal', 'Préstamo vehicular', 'Hipotecario', 'Compra de deuda', 'Préstamo informal', 'Otro'];

// Formulario de préstamo (nuevo o edición con ?id=).
export default function LoanFormScreen() {
  useTheme(); // repinta al cambiar el tema
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = id ? findLoan(id) : undefined;
  const today = todayKey();

  const [lender, setLender] = useState(existing?.lender ?? 'Scotiabank');
  const [type, setType] = useState(existing?.type ?? 'Préstamo personal');
  const [principal, setPrincipal] = useState(existing ? plain(existing.principal) : '');
  const [installment, setInstallment] = useState(existing ? plain(existing.installment) : '');
  const [total, setTotal] = useState(existing ? String(existing.totalInstallments) : '');
  const [paid, setPaid] = useState(existing ? String(loanProgress(existing).paid) : '0');
  const [firstDue, setFirstDue] = useState(existing?.firstDue ?? addMonths(today, 1));
  const [rate, setRate] = useState(existing?.rate ? plain(existing.rate) : '');
  const [notify, setNotify] = useState(existing?.notify ?? true);
  const [tried, setTried] = useState(false);
  const allowLeave = useUnsavedGuard(JSON.stringify([lender, type, principal, installment, total, paid, firstDue, rate, notify]));

  const p = parseAmount(principal);
  const q = parseAmount(installment);
  const n = Number(total);
  const already = Math.floor(Number(paid) || 0);
  const paidError = Number.isInteger(n) && n > 0 && already > n ? `No puede ser mayor que ${n}` : null;
  const rateN = parseAmount(rate);
  const valid = p !== null && p > 0 && q !== null && q > 0 && Number.isInteger(n) && n > 0 && !paidError && !optionalNumberError(rate, rateN);

  const save = useSubmitOnce(() => {
    setTried(true);
    if (!valid) return false;
    // Las primeras `already` cuotas quedan pagadas. Si cambió la primera cuota o el conteo, los pagos reales se
    // reasignan en orden a las nuevas fechas (conservan fecha e importe) y solo se crean los que falten.
    const unchanged = existing && existing.firstDue === firstDue && loanProgress(existing).paid === already;
    const payments = unchanged ? existing.payments : rekeyLoan(existing?.payments ?? {}, firstDue, already, q!);
    const loan: Loan = {
      id: existing?.id ?? newId(),
      lender,
      type,
      principal: p!,
      installment: q!,
      totalInstallments: n,
      firstDue,
      rate: rateN,
      notify,
      payments,
      createdAt: existing?.createdAt ?? today,
    };
    saveLoan(loan);
    showToast(existing ? 'Préstamo actualizado' : 'Préstamo guardado');
    allowLeave();
    router.back();
  });

  const remove = () =>
    askConfirm({
      title: 'Eliminar préstamo',
      message: `Se borrará el préstamo de ${existing?.lender} y sus cuotas registradas.`,
      onConfirm: () => {
        deleteLoan(existing!.id);
        showToast('Préstamo eliminado', 'trash');
        allowLeave();
        leaveAfterDelete(router);
      },
    });

  return (
    <Screen
      keyboard
      footer={
        <>
          <Button label="Guardar préstamo" onPress={save} />
          {existing ? <Button label="Eliminar préstamo" variant="text" danger onPress={remove} /> : null}
        </>
      }
    >
      <Header title={existing ? 'Editar préstamo' : 'Agregar préstamo'} />
      <FieldRow>
        <SelectField label="Entidad" value={lender} options={BANKS.map((b) => ({ value: b, label: b }))} onChange={setLender} style={{ flex: 1 }} />
        <SelectField label="Tipo" value={type} options={TYPES.map((t) => ({ value: t, label: t }))} onChange={setType} style={{ flex: 1 }} />
      </FieldRow>
      <FieldRow>
        <MoneyField label="Importe original" value={principal} onChangeText={setPrincipal} style={{ flex: 1 }} error={tried && !(p && p > 0) ? 'Requerido' : null} />
        <MoneyField label="Cuota mensual" value={installment} onChangeText={setInstallment} style={{ flex: 1 }} error={tried && !(q && q > 0) ? 'Requerido' : null} />
      </FieldRow>
      <FieldRow>
        <Field
          label="N.º de cuotas"
          value={total}
          onChangeText={(t) => setTotal(t.replace(/\D/g, ''))}
          keyboardType="number-pad"
          placeholder="24"
          style={{ flex: 1 }}
          error={tried && !(Number.isInteger(n) && n > 0) ? 'Requerido' : null}
        />
        <Field
          label="Cuotas ya pagadas"
          value={paid}
          onChangeText={(t) => setPaid(t.replace(/\D/g, ''))}
          keyboardType="number-pad"
          style={{ flex: 1 }}
          error={paidError}
        />
      </FieldRow>
      <FieldRow>
        <DateField label="Primera cuota" value={firstDue} onChange={setFirstDue} style={{ flex: 1 }} />
        <Field label="Tasa anual" value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="18.5" suffix="%" style={{ flex: 1 }} error={tried ? optionalNumberError(rate, rateN) : null} />
      </FieldRow>
      {valid ? (
        <T style={{ fontSize: 12, color: colors.muted, marginTop: 8 }}>
          Pagarás {money(q! * n)} en total ({money(q! * n - p!)} de intereses y cargos).
        </T>
      ) : null}
      <ToggleRow label="Avisarme antes de cada cuota" value={notify} onChange={setNotify} />
    </Screen>
  );
}
