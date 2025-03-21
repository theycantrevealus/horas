import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ['**/*.{js,mjs,cjs,ts,vue}'] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
      'object-curly-spacing': ['error', 'always'],
    },
  },
  {
    files: ['**/*.vue', '**/*.ts'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
]
