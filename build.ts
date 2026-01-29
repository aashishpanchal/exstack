import {build} from 'tsdown';
import {rimraf} from 'rimraf';

const main = async () => {
  // Clean previous dist folders
  await rimraf('./dist', {glob: false});
  console.log('🚀 Building exstack...');
  // Build main entry point
  await build({
    dts: true,
    clean: false,
    sourcemap: false,
    target: 'esnext',
    entry: ['./src/index.ts', './src/zod.ts'],
    format: ['esm', 'cjs'],
    external: ['zod'],
    outDir: './dist',
    // unbundle: true,
    // treeshake: true,
    unused: true,
  });
  console.log('✅ Build completed successfully!');
};

void main();
