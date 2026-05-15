// eslint.config.cjs — ESLint v9 flat config（兼容替代原 .eslintrc.cjs）
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
    {
        ignores: [
            'dist/**',
            'node_modules/**',
            'plane/**',
            'marble/**',
            '**/*.cjs',
            '**/*.config.ts'
        ]
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
                projectService: true,
                tsconfigRootDir: __dirname
            }
        },
        plugins: { '@typescript-eslint': tsPlugin },
        rules: {
            ...tsPlugin.configs.recommended.rules,
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/explicit-module-boundary-types': 'warn',
            '@typescript-eslint/no-floating-promises': 'error',
            'eqeqeq': 'error',
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'curly': ['error', 'multi-line']
        }
    }
];
