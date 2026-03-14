import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

import { resolve } from 'path';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env.local';
dotenv.config({ path: resolve(process.cwd(), envFile) });

export default defineConfig({
    schema: './src/shared/db/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
});
