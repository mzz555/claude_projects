import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'happy-dom',
        include: ['packages/*/tests/**/*.test.ts', 'games/*/tests/**/*.test.ts'],
        coverage: { provider: 'v8', reporter: ['text', 'html'] }
    }
});
