import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MenuItem, OrderDetail } from '@catering-app/shared-types';
import { createOrder } from '../../orders/data-access/ordersDataAccess';
import { extractErrorMessage } from '../../../core/http/extractErrorMessage';

/**
 * Línea del carrito. Guarda una copia de lo que la UI necesita del platillo
 * (nombre, precio, rango) para que el carrito se pueda mostrar aunque el
 * menú todavía no se haya cargado (el carrito persiste entre aperturas de la
 * app). El precio es solo para mostrar el subtotal estimado: el que cuenta
 * es el snapshot que toma la API al crear el pedido (ADR-006).
 */
export type CartLine = {
  menuItemId: string;
  name: string;
  unitPrice: number;
  servesMin: number;
  servesMax: number;
  quantity: number;
  /**
   * Imagen al momento de agregar: solo respaldo para cuando el menú no está
   * cargado. La que se muestra sale del menú vigente (resolveCartLineImage),
   * porque si el staff reemplaza la imagen la API borra el objeto viejo y
   * esta URL deja de existir. Opcional: los carritos guardados antes de este
   * campo no la tienen.
   */
  imageUrl?: string | null;
};

export type PlaceOrderInput = {
  peopleCount: number;
  /** ISO 8601. */
  scheduledFor: string;
  notes: string | null;
};

export type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

export type CartState = {
  lines: CartLine[];
  submitStatus: SubmitStatus;
  submitError: string | null;
  /** Último pedido creado desde el carrito (pantalla de confirmación). */
  lastOrder: OrderDetail | null;
  addItem: (item: MenuItem, quantity: number) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  removeItem: (menuItemId: string) => void;
  clear: () => void;
  placeOrder: (input: PlaceOrderInput) => Promise<OrderDetail | null>;
  resetSubmit: () => void;
};

export const MAX_QUANTITY = 99;

function clampQuantity(quantity: number): number {
  return Math.min(MAX_QUANTITY, Math.max(1, Math.floor(quantity)));
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      submitStatus: 'idle',
      submitError: null,
      lastOrder: null,
      addItem(item, quantity) {
        const lines = get().lines;
        const existing = lines.find((line) => line.menuItemId === item.id);
        if (existing) {
          set({
            lines: lines.map((line) =>
              line.menuItemId === item.id
                ? { ...line, quantity: clampQuantity(line.quantity + quantity) }
                : line
            ),
          });
          return;
        }
        set({
          lines: [
            ...lines,
            {
              menuItemId: item.id,
              name: item.name,
              unitPrice: Number(item.basePrice),
              servesMin: item.servesMin,
              servesMax: item.servesMax,
              quantity: clampQuantity(quantity),
              imageUrl: item.imageUrl,
            },
          ],
        });
      },
      setQuantity(menuItemId, quantity) {
        if (quantity < 1) {
          get().removeItem(menuItemId);
          return;
        }
        set({
          lines: get().lines.map((line) =>
            line.menuItemId === menuItemId ? { ...line, quantity: clampQuantity(quantity) } : line
          ),
        });
      },
      removeItem(menuItemId) {
        set({ lines: get().lines.filter((line) => line.menuItemId !== menuItemId) });
      },
      clear() {
        set({ lines: [] });
      },
      async placeOrder(input) {
        const lines = get().lines;
        if (lines.length === 0) {
          return null;
        }
        set({ submitStatus: 'submitting', submitError: null });
        try {
          // Un solo pedido con todos los platillos del carrito (POST /orders
          // acepta varias líneas). customerId sale del JWT en la API.
          const order = await createOrder({
            peopleCount: input.peopleCount,
            scheduledFor: input.scheduledFor,
            notes: input.notes,
            items: lines.map((line) => ({
              menuItemId: line.menuItemId,
              quantity: line.quantity,
            })),
          });
          set({ lines: [], submitStatus: 'success', lastOrder: order });
          return order;
        } catch (err) {
          // El carrito se conserva para que el cliente pueda reintentar.
          set({ submitStatus: 'error', submitError: extractErrorMessage(err) });
          return null;
        }
      },
      resetSubmit() {
        set({ submitStatus: 'idle', submitError: null });
      },
    }),
    {
      name: 'cart',
      storage: createJSONStorage(() => AsyncStorage),
      // Solo las líneas persisten: el estado de envío es de la sesión actual.
      partialize: (state) => ({ lines: state.lines }),
    }
  )
);

/** Total de unidades en el carrito (badge de la navegación). */
export function selectItemCount(state: CartState): number {
  return state.lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** Subtotal estimado con los precios vigentes al agregar (la API recalcula). */
export function selectSubtotal(state: CartState): number {
  return Math.round(
    state.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0) * 100
  ) / 100;
}
