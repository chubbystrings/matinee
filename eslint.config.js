//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'
import reactHooks from 'eslint-plugin-react-hooks'
import noEffect from 'eslint-plugin-react-you-might-not-need-an-effect'

export default [
  ...tanstackConfig,
  reactHooks.configs.flat.recommended,
  noEffect.configs.recommended,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      'playwright-report',
      'test-results',
      'project_doc',
    ],
  },
]
