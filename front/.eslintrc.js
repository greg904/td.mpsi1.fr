module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  rules: {
    semi: ['error', 'never'],
    quotes: ['error', 'double'],
    'jsx-quotes': ['error', 'prefer-double']
  },
  plugins: [
    '@typescript-eslint'
  ],
  extends: [
    'eslint-config-preact',
    'plugin:@typescript-eslint/recommended'
  ]
}
