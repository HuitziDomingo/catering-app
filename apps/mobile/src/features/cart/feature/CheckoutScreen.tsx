import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Spinner, Text, useTheme } from '@ui-kitten/components';
import { useRouter } from 'expo-router';
import { formatCurrency } from '../../../core/ui/formatCurrency';
import { useSessionStore } from '../../auth/state/useSessionStore';
import { LoginScreen } from '../../auth/feature/LoginScreen';
import { selectSubtotal, useCartStore } from '../state/useCartStore';
import { CheckoutForm, type CheckoutFormValue } from '../ui/CheckoutForm';
import { OrderPlacedCard } from '../ui/OrderPlacedCard';
import { ServesRangeWarning } from '../ui/ServesRangeWarning';
import {
  buildTimeSlots,
  combineDateAndTime,
  startOfToday,
  validateCheckout,
  type CheckoutErrors,
} from '../util/scheduling';
import { describeServesRanges, isWithinAnyServesRange } from '../util/servesRange';

const EMPTY_FORM: CheckoutFormValue = { date: null, time: null, peopleCount: '', notes: '' };

// Checkout (ADR-020): conecta el formulario de ui/ con useCartStore.placeOrder
// (POST /orders con todo el carrito). Antes de enviar valida el formulario
// y, si ningún platillo cubre la cantidad de personas (ADR-021), muestra un
// aviso que el cliente puede aceptar o corregir. Sin sesión embebe
// LoginScreen con onLoggedIn, para que al iniciar sesión siga aquí.
export const CheckoutScreen = () => {
  const isBootstrapping = useSessionStore((state) => state.isBootstrapping);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const lines = useCartStore((state) => state.lines);
  const subtotal = useCartStore(selectSubtotal);
  const submitStatus = useCartStore((state) => state.submitStatus);
  const submitError = useCartStore((state) => state.submitError);
  const lastOrder = useCartStore((state) => state.lastOrder);
  const placeOrder = useCartStore((state) => state.placeOrder);
  const resetSubmit = useCartStore((state) => state.resetSubmit);
  const theme = useTheme();
  const router = useRouter();

  const [form, setForm] = useState<CheckoutFormValue>(EMPTY_FORM);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [showRangeWarning, setShowRangeWarning] = useState(false);
  const timeSlots = useMemo(buildTimeSlots, []);
  const minDate = useMemo(() => startOfToday(), []);

  // Un "success" de un pedido anterior no debe mostrarse al volver a entrar.
  useEffect(() => {
    resetSubmit();
  }, [resetSubmit]);

  if (isBootstrapping) {
    return (
      <View style={[styles.centered, { backgroundColor: theme['background-basic-color-2'] }]}>
        <Spinner size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoggedIn={() => undefined} />;
  }

  if (submitStatus === 'success' && lastOrder) {
    return (
      <ScrollView
        style={{ backgroundColor: theme['background-basic-color-2'] }}
        contentContainerStyle={styles.content}
      >
        <OrderPlacedCard order={lastOrder} />
        <Button appearance="outline" onPress={() => router.replace('/menu')}>
          Volver al menú
        </Button>
      </ScrollView>
    );
  }

  if (lines.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme['background-basic-color-2'] }]}>
        <Text appearance="hint" testID="checkout-empty">
          Tu carrito está vacío.
        </Text>
      </View>
    );
  }

  const submit = async () => {
    // validateCheckout ya garantizó date/time no nulos.
    const scheduledFor = combineDateAndTime(form.date as Date, form.time as string);
    const notes = form.notes.trim();
    await placeOrder({
      peopleCount: Number(form.peopleCount),
      scheduledFor: scheduledFor.toISOString(),
      notes: notes.length > 0 ? notes : null,
    });
  };

  const handleConfirm = async () => {
    const validation = validateCheckout(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      return;
    }
    if (!isWithinAnyServesRange(lines, Number(form.peopleCount))) {
      setShowRangeWarning(true);
      return;
    }
    await submit();
  };

  const handleFormChange = (next: CheckoutFormValue) => {
    // Si cambia la cantidad de personas, el aviso anterior ya no aplica.
    if (next.peopleCount !== form.peopleCount) {
      setShowRangeWarning(false);
    }
    setForm(next);
  };

  const submitting = submitStatus === 'submitting';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
    >
      <ScrollView
        testID="checkout-screen"
        style={{ backgroundColor: theme['background-basic-color-2'] }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.summary, { backgroundColor: theme['background-basic-color-1'] }]}>
          {lines.map((line) => (
            <Text key={line.menuItemId} category="p2">
              {`${line.quantity} × ${line.name}`}
            </Text>
          ))}
          <Text category="s1" style={styles.summaryTotal}>
            {`Subtotal estimado: ${formatCurrency(subtotal)}`}
          </Text>
        </View>

        <CheckoutForm
          value={form}
          onChange={handleFormChange}
          timeSlots={timeSlots}
          minDate={minDate}
          errors={errors}
        />

        {showRangeWarning ? (
          <ServesRangeWarning
            peopleCount={Number(form.peopleCount)}
            rangesText={describeServesRanges(lines)}
            submitting={submitting}
            onConfirmAnyway={submit}
            onAdjust={() => setShowRangeWarning(false)}
          />
        ) : null}

        {submitStatus === 'error' && submitError ? (
          <Text status="danger" testID="checkout-error">
            {submitError}
          </Text>
        ) : null}

        {!showRangeWarning ? (
          <Button
            testID="checkout-confirm"
            disabled={submitting}
            accessoryLeft={submitting ? () => <Spinner size="tiny" status="control" /> : undefined}
            onPress={handleConfirm}
          >
            Confirmar pedido
          </Button>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CheckoutScreen;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  summary: {
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  summaryTotal: {
    marginTop: 8,
  },
});
