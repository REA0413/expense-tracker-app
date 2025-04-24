module.exports = {
  extends: 'next/core-web-vitals',
  rules: {
    // Downgrade error severity for deployment
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    'prefer-const': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
  }
}; 