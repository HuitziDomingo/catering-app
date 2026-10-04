import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Datepicker,
  Icon,
  IndexPath,
  Input,
  Select,
  SelectItem,
  Text,
} from '@ui-kitten/components';
import type { CheckoutErrors } from '../util/scheduling';
import { spanishDateService } from '../util/spanishDateService';

export type CheckoutFormValue = {
  date: Date | null;
  time: string | null;
  peopleCount: string;
  notes: string;
};

type CheckoutFormProps = {
  value: CheckoutFormValue;
  onChange: (value: CheckoutFormValue) => void;
  timeSlots: string[];
  minDate: Date;
  errors: CheckoutErrors;
};

// Formulario controlado del checkout (ADR-020, ui/ pura): fecha y hora del
// evento (scheduledFor), cantidad de personas (peopleCount) y notas. La
// validación vive en util/scheduling.ts y el envío en la pantalla.
export const CheckoutForm = ({ value, onChange, timeSlots, minDate, errors }: CheckoutFormProps) => {
  const selectedTimeIndex = value.time ? timeSlots.indexOf(value.time) : -1;

  return (
    <View style={styles.form}>
      <Datepicker
        testID="checkout-date"
        label="Fecha del evento"
        placeholder="Elige un día"
        date={value.date ?? undefined}
        min={minDate}
        // Sin `max` UI Kitten limita a ~12 meses desde hoy; se amplía a 2 años
        // para eventos que se reservan con mucha anticipación.
        max={new Date(minDate.getFullYear() + 2, minDate.getMonth(), minDate.getDate())}
        dateService={spanishDateService}
        onSelect={(date) => onChange({ ...value, date })}
        status={errors.date ? 'danger' : 'basic'}
        caption={errors.date}
        accessoryRight={(props) => <Icon {...props} name="calendar-outline" />}
      />

      <Select
        testID="checkout-time"
        label="Hora del evento"
        placeholder="Elige una hora"
        value={value.time ?? undefined}
        selectedIndex={selectedTimeIndex >= 0 ? new IndexPath(selectedTimeIndex) : undefined}
        onSelect={(index) => {
          const row = (index as IndexPath).row;
          onChange({ ...value, time: timeSlots[row] });
        }}
        status={errors.time ? 'danger' : 'basic'}
        caption={errors.time}
      >
        {timeSlots.map((slot) => (
          <SelectItem key={slot} title={slot} />
        ))}
      </Select>

      <Input
        label="¿Para cuántas personas?"
        placeholder="Ej. 150"
        keyboardType="number-pad"
        value={value.peopleCount}
        onChangeText={(peopleCount) => onChange({ ...value, peopleCount })}
        status={errors.peopleCount ? 'danger' : 'basic'}
        caption={errors.peopleCount}
      />

      <Input
        label="Notas (opcional)"
        placeholder="Alergias, dirección de entrega, indicaciones…"
        multiline
        textStyle={styles.notes}
        value={value.notes}
        onChangeText={(notes) => onChange({ ...value, notes })}
      />

      <Text appearance="hint" category="c1">
        La hora es la de tu dispositivo.
      </Text>
    </View>
  );
};

export default CheckoutForm;

const styles = StyleSheet.create({
  form: {
    gap: 16,
  },
  notes: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
});
