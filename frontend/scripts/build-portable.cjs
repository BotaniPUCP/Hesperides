const path = require('node:path');
const { webpack } = require('next/dist/compiled/webpack/webpack');
const root = path.resolve(__dirname, '..');
webpack({
  mode: 'production', target: 'web', devtool: false,
  entry: path.join(root, 'src/components/map3d/equivalence/portableApp.ts'),
  output: { path: path.join(root, 'public/models/equivalence'), filename: 'portable.js' },
  resolve: { extensions: ['.ts', '.js', '.json'], alias: { '@shared': path.resolve(root, '../shared') } },
  module: { rules: [{ test: /\.ts$/, exclude: /node_modules/, use: path.join(__dirname, 'portable-ts-loader.cjs') }] },
  optimization: { splitChunks: false, runtimeChunk: false, minimize: false },
  performance: { hints: false },
}, (error, stats) => {
  if (error || stats.hasErrors()) { process.stderr.write(String(error || stats.toString({ all: false, errors: true }))); process.exitCode = 1; }
  else process.stdout.write('Portable runtime built.\n');
});
