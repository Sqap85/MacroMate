import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/__tests__/**',
        'src/main.tsx',
        'src/config/firebase.ts',
        'src/types/**',
      ],
      thresholds: {
        // Global — kept conservative because large Firebase-dependent
        // components are intentionally not covered by unit tests.
        lines: 8,
        functions: 5,
        branches: 5,
        statements: 8,
        // Per-file thresholds for every unit-tested file.
        // These will fail CI if a refactor drops coverage below the floor.
        'src/utils/numberUtils.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/utils/statsUtils.ts': { lines: 90, functions: 90, branches: 85, statements: 90 },
        'src/utils/dateUtils.ts': { lines: 90, functions: 90, branches: 80, statements: 90 },
        'src/services/openFoodFactsService.ts': { lines: 95, functions: 100, branches: 90, statements: 95 },
        'src/hooks/useLocalStorage.ts': { lines: 85, functions: 100, branches: 100, statements: 85 },
        'src/components/StatsCard.tsx': { lines: 95, functions: 100, branches: 90, statements: 95 },
      },
    },
  },
})
