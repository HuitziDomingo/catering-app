import axios from 'axios';

// Ver features/menu/data-access/apiClient.ts -- misma configuración
// (EXPO_PUBLIC_API_URL con fallback a la API local de dev), duplicada aquí
// a propósito para no acoplar features/session a features/menu (ADR-020:
// cada feature es autocontenida).
const DEFAULT_API_URL = 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL,
});
