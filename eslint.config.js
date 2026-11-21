import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astroPlugin from 'eslint-plugin-astro';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      '.astro/**',
      'node_modules/**',
      '.wrangler/**',
      'worker-configuration.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astroPlugin.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.worker,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['scripts/**', '*.config.{js,mjs,ts}', 'drizzle.config.ts', 'vitest.config.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);
