//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    files: ['src/features/auth/components/particle-text.tsx'],
    // Keep the defensive runtime checks from the adapted React Bits source.
    rules: { '@typescript-eslint/no-unnecessary-condition': 'off' },
  },
  {
    ignores: [
      '.agents/**',
      '.output/**',
      'eslint.config.js',
      'prettier.config.js',
    ],
  },
]
