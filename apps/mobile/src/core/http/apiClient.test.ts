// Unit tests for the axios interceptor (attach token + 401-retry-with-
// refresh-once) without hitting a real server. axios and useSessionStore
// are mocked; the request/response interceptor callbacks registered by
// apiClient.ts are captured from the mocked `interceptors.*.use` calls and
// invoked directly, same technique used for testing axios interceptors
// without extra dependencies (no axios-mock-adapter/nock installed here).

const mockRefreshSession = jest.fn();
const mockLogout = jest.fn();
const mockGetState = jest.fn();
const mockNotifySessionExpired = jest.fn();

jest.mock('../../features/auth/state/useSessionStore', () => ({
  useSessionStore: { getState: () => mockGetState() },
}));

jest.mock('./sessionExpiry', () => ({
  notifySessionExpired: () => mockNotifySessionExpired(),
}));

// The mock axios instance is built entirely inside the factory (no
// references to consts declared later in this file): babel hoists `import`
// statements above other top-level statements when compiling to CommonJS,
// so `import { apiClient } from './apiClient'` below runs -- and therefore
// calls `axios.create()` -- before any `const` declared after it in this
// file would have been initialized.
jest.mock('axios', () => {
  const interceptors = { request: { use: jest.fn() }, response: { use: jest.fn() } };
  const instance = Object.assign(jest.fn(), { interceptors, post: jest.fn(), get: jest.fn() });
  return { __esModule: true, default: { create: jest.fn(() => instance) } };
});

import { apiClient } from './apiClient';

type MockAxiosInstance = jest.Mock & {
  interceptors: {
    request: { use: jest.Mock };
    response: { use: jest.Mock };
  };
};

const mockApiClient = apiClient as unknown as MockAxiosInstance;

function requestFulfilled() {
  return mockApiClient.interceptors.request.use.mock.calls[0][0];
}
function responseRejected() {
  return mockApiClient.interceptors.response.use.mock.calls[0][1];
}

beforeEach(() => {
  mockRefreshSession.mockReset();
  mockLogout.mockReset();
  mockNotifySessionExpired.mockReset();
  mockApiClient.mockReset();
  mockGetState.mockReturnValue({
    accessToken: null,
    refreshSession: mockRefreshSession,
    logout: mockLogout,
  });
});

describe('request interceptor', () => {
  test('attaches the current accessToken as a Bearer header', () => {
    mockGetState.mockReturnValue({ accessToken: 'token-abc', refreshSession: mockRefreshSession, logout: mockLogout });

    const config = requestFulfilled()({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer token-abc');
  });

  test('does not attach a header when there is no session', () => {
    const config = requestFulfilled()({ headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });
});

describe('response interceptor: 401-retry-with-refresh', () => {
  test('refreshes the token once and retries the original request on 401', async () => {
    mockGetState.mockReturnValue({ accessToken: 'old-token', refreshSession: mockRefreshSession, logout: mockLogout });
    mockRefreshSession.mockResolvedValue({ accessToken: 'new-token', refreshToken: 'new-refresh' });
    mockApiClient.mockResolvedValueOnce({ data: 'retried' });

    const config = { url: '/menu/items', headers: {} as Record<string, string> };
    const error = { response: { status: 401 }, config };

    const result = await responseRejected()(error);

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(config.headers.Authorization).toBe('Bearer new-token');
    expect(mockApiClient).toHaveBeenCalledWith(config);
    expect(result).toEqual({ data: 'retried' });
    expect(mockLogout).not.toHaveBeenCalled();
  });

  test('clears the session and redirects to /login when the refresh itself fails', async () => {
    mockGetState.mockReturnValue({ accessToken: 'old-token', refreshSession: mockRefreshSession, logout: mockLogout });
    mockRefreshSession.mockRejectedValue(new Error('No hay refresh token disponible.'));

    const config = { url: '/menu/items', headers: {} };
    const error = { response: { status: 401 }, config };

    await expect(responseRejected()(error)).rejects.toThrow('No hay refresh token disponible.');
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNotifySessionExpired).toHaveBeenCalledTimes(1);
  });

  test('does not attempt a refresh when the 401 comes from an auth route itself', async () => {
    const config = { url: '/auth/login', headers: {} };
    const error = { response: { status: 401 }, config };

    await expect(responseRejected()(error)).rejects.toBe(error);
    expect(mockRefreshSession).not.toHaveBeenCalled();
  });

  test('does not retry a request that already went through a retry', async () => {
    const config = { url: '/menu/items', headers: {}, _retried: true };
    const error = { response: { status: 401 }, config };

    await expect(responseRejected()(error)).rejects.toBe(error);
    expect(mockRefreshSession).not.toHaveBeenCalled();
  });

  test('passes non-401 errors through untouched', async () => {
    const config = { url: '/menu/items', headers: {} };
    const error = { response: { status: 500 }, config };

    await expect(responseRejected()(error)).rejects.toBe(error);
    expect(mockRefreshSession).not.toHaveBeenCalled();
  });
});
