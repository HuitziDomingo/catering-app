import { NativeDateService } from '@ui-kitten/components';

// El Datepicker de UI Kitten usa nombres en inglés por default. Este
// DateService le da nombres en español, semana que empieza en lunes y
// formato DD/MM/YYYY (México).
export const spanishDateService = new NativeDateService('es', {
  startDayOfWeek: 1,
  format: 'DD/MM/YYYY',
  i18n: {
    dayNames: {
      short: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
      long: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    },
    monthNames: {
      short: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      long: [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre',
      ],
    },
  },
});
