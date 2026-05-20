// Neutralize @supabase/supabase-js's optional `import(OTEL_PKG)` telemetry
// import. The specifier is a variable, so Metro can't statically resolve it and
// leaves a raw dynamic `import()` in the bundle, which Hermes (SDK 54) rejects
// with "Invalid expression encountered". We replace the dynamic import of
// "@opentelemetry/api" with `Promise.resolve(null)` — Supabase already handles
// a null result (telemetry is best-effort).
function stripOtelDynamicImport() {
  return {
    name: 'strip-otel-dynamic-import',
    visitor: {
      CallExpression(path) {
        if (path.node.callee.type !== 'Import') return;
        const arg = path.get('arguments.0');
        if (!arg) return;
        const evaluated = arg.evaluate();
        if (evaluated.confident && evaluated.value === '@opentelemetry/api') {
          path.replaceWithSourceString('Promise.resolve(null)');
        }
      },
    },
  };
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [stripOtelDynamicImport, 'react-native-worklets/plugin'],
  };
};
