const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
  identifier: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
}).refine(data => data.email || data.phone || data.identifier, {
  message: 'Email address or phone number is required',
  path: ['email'],
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').optional(),
});

module.exports = { loginSchema, refreshSchema };
