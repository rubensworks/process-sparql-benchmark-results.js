const config = require('@rubensworks/eslint-config');

module.exports = config([
  {
    files: [ '**/*.ts' ],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: [ './tsconfig.eslint.json' ],
      },
    },
  },
  {
    rules: {
      'antfu/consistent-list-newline': 'off',
      'antfu/top-level-function': 'off',
      'import/newline-after-import': 'off',
      'import/no-nodejs-modules': 'off',
      'jest/prefer-todo': 'off',
      'jsonc/sort-array-values': 'off',
      'jsonc/sort-keys': 'off',
      'style/arrow-parens': 'off',
      'style/indent': 'off',
      'style/no-trailing-spaces': 'off',
      'ts/no-unsafe-argument': 'off',
      'ts/no-unsafe-assignment': 'off',
      'ts/restrict-template-expressions': 'off',
      'unicorn/no-negated-condition': 'off',
      'unicorn/prefer-at': 'off',
      'unicorn/prefer-node-protocol': 'off',
      'unicorn/prefer-string-replace-all': 'off',
      'unused-imports/no-unused-vars': 'off',
    },
  },
  {
    files: [ '**/*.ts' ],
    rules: {
      'ts/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: [ 'PascalCase' ],
          custom: {
            regex: '^[A-Z]',
            match: true,
          },
        },
      ],
    },
  },
]);
