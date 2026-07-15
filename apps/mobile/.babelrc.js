module.exports = function (api) {
  api.cache(true);
  return {
    // NativeWind v4 (gluestack-ui v2 — ADR-003): jsxImportSource enruta el JSX
    // por NativeWind y el preset habilita el transform de `className`.
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
