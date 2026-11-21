import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  driver: 'd1-http',
  schema: './src/lib/db/schema/index.ts',
  out: './migrations',
});
