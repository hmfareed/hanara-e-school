const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_ACCESS_SECRET: z.string().min(20, 'JWT_ACCESS_SECRET must be at least 20 chars'),
  JWT_REFRESH_SECRET: z.string().min(20, 'JWT_REFRESH_SECRET must be at least 20 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@hanaraschools.edu.gh'),
  SEED_ADMIN_PASSWORD: z.string().default('Admin@2026'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = parsed.data;
