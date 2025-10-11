import {Glob} from 'bun';
import {rimraf} from 'rimraf';
import {build, type Options} from 'tsdown';

const tsdownConfig: Options = {
  dts: true,
  clean: false,
  sourcemap: false,
  // minify: true,
  target: 'esnext',
  format: ['esm', 'cjs'],
  outDir: './dist',
};

const entries: Options[] = [
  {entry: './src/index.ts'},
  {entry: './src/zod.ts', external: ['./index', 'zod']},
  // {entry: './src/env.ts', external: ['fs', 'zod', 'dotenv']},
];

async function buildProject() {
  console.log('🚀 Building exstack...');
  for (const entry of entries) {
    // Build main entry point
    await build({...entry, ...tsdownConfig});
  }
  // Remove all .d.mts files
  await rimraf(['./dist/**/*.d.mts', './dist/**/*.d.cts'], {glob: true});

  console.log('✅ Build completed successfully!\n📁 Generated files:');

  // List all files in dist/
  const glob = new Glob('**/*');
  for await (const file of glob.scan({cwd: './dist'})) {
    console.log('  -', file);
  }
}

buildProject()
  .then(async () => {
    // 🧩 Fix ESM import paths to include `.mjs`
    const glob = new Glob('./dist/**/*.mjs');

    for await (const entry of glob.scan('.')) {
      const content = await Bun.file(entry).text();

      const fixed = content
        // Only match imports/exports from relative paths
        .replace(
          /(import|export)\s*\{([^}]*)\}\s*from\s*['"]((?:\.{1,2}\/)[^'"]+?)(?<!\.mjs)['"]/g,
          '$1{$2}from"$3.mjs"',
        )
        .replace(
          /(import|export)\s+([\w_$]+)\s+from\s*['"]((?:\.{1,2}\/)[^'"]+?)(?<!\.mjs)['"]/g,
          '$1 $2 from"$3.mjs"',
        );

      await Bun.write(entry, fixed);
    }
  })
  .catch(console.error);
