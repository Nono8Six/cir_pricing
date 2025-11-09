import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  // Ignore patterns
  {
    ignores: ['dist', 'node_modules', '.vite', 'coverage', 'build']
  },

  // Base ESLint recommended rules
  js.configs.recommended,

  // TypeScript ESLint recommended rules
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Project-specific configuration
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // React specific rules
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // React Hooks rules (relaxed)
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn', // Warn instead of error

      // React Refresh rules (only target exports)
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // TypeScript rules aligned with CLAUDE.md
      '@typescript-eslint/no-explicit-any': 'error', // NO any types
      '@typescript-eslint/explicit-function-return-type': 'off', // Disabled for now (too many warnings)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn', // Warn on ! operator
      '@typescript-eslint/consistent-type-imports': 'off', // Disabled for now

      // General code quality rules
      'no-console': ['warn', { allow: ['warn', 'error'] }], // NO console.log
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],

      // Disable overly strict rules
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-floating-promises': 'off', // Disabled for now (too many warnings)
      '@typescript-eslint/no-misused-promises': 'off', // Disabled for now (async event handlers)
      '@typescript-eslint/prefer-optional-chain': 'warn', // Warn instead of error
      '@typescript-eslint/no-base-to-string': 'warn', // Warn instead of error
      '@typescript-eslint/no-redundant-type-constituents': 'off', // Generated types
      '@typescript-eslint/no-empty-function': 'warn', // Warn for empty functions
      '@typescript-eslint/require-await': 'warn', // Warn for async without await
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn', // Warn
      '@typescript-eslint/consistent-type-definitions': 'off', // Allow both type and interface
      '@typescript-eslint/prefer-promise-reject-errors': 'warn' // Warn instead of error
    },
  },

  // Less strict rules for config files
  {
    files: ['**/*.config.{js,ts}', 'vite.config.ts', 'tailwind.config.js'],
    ...tseslint.configs.disableTypeChecked,
  }
);
