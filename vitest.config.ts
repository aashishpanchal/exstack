import {defineProject} from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineProject({
  test: {
    globals: true,
    typecheck: {
      tsconfig: './tsconfig.json',
    },
  },
  plugins: [tsconfigPaths()],
});
