import axios from 'axios';

// Expo inlines `process.env.EXPO_PUBLIC_*` at build time (see Expo's env
// vars docs) -- no extra config package needed. Defaults to the API's local
// dev address (nx serve api, ADR-014's Dockerized Postgres) when unset.
const DEFAULT_API_URL = 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL,
});
