import { defaultApiUrl } from './defaultApiUrl';

describe('defaultApiUrl', () => {
  it('usa el alias 10.0.2.2 del host en Android', () => {
    expect(defaultApiUrl('android')).toBe('http://10.0.2.2:3000/api');
  });

  it.each(['ios', 'web'])('usa localhost en %s', (os) => {
    expect(defaultApiUrl(os)).toBe('http://localhost:3000/api');
  });
});
