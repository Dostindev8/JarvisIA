import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

// Reglas React Compiler estrictas en código nuevo; el legado mantiene rules-of-hooks + exhaustive-deps
// hasta migrarlo (deuda: set-state-in-effect / refs en hooks y paneles de /jarvis).
const STRICT = [
  'src/components/Portal/**',
  'src/hooks/useVoiceAgent.js',
  'src/hooks/usePrefersReducedMotion.js',
  'src/lib/voiceAgentMachine*.js'
];
const COMPILER_RULES = Object.keys(reactHooks.configs.flat.recommended.rules).filter(
  (r) => r !== 'react-hooks/rules-of-hooks' && r !== 'react-hooks/exhaustive-deps'
);

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    ignores: STRICT,
    rules: Object.fromEntries(COMPILER_RULES.map((r) => [r, 'off']))
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }]
    }
  },
  {
    files: ['*.config.js', 'src/**/*.test.js'],
    languageOptions: { globals: { ...globals.node } }
  }
];
