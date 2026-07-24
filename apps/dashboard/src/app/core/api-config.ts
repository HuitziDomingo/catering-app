// Apunta al backend local (nx serve api, ADR-014). Cuando el dashboard
// necesite desplegarse a más de un entorno, esto se vuelve un
// environment.ts real con fileReplacements de Angular.
export const API_BASE_URL = 'http://localhost:3000/api';
