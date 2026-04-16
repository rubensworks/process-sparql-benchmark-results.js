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
      'import/no-nodejs-modules': 'off',
      'ts/no-unsafe-argument': 'off',
      'ts/no-unsafe-assignment': 'off',
      'ts/no-unsafe-return': 'off',
      'ts/restrict-template-expressions': 'off',
      'unicorn/prefer-at': 'off',
      'unicorn/prefer-node-protocol': 'off',
      'unicorn/prefer-string-replace-all': 'off',
      'unicorn/no-negated-condition': 'off',
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
