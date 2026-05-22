export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change_me_in_production',
    expiresIn: process.env.JWT_EXPIRATION ?? '7d',
  },
  aiService: {
    url: process.env.AI_SERVICE_URL ?? 'http://localhost:8000',
  },
  internal: {
    secret: process.env.INTERNAL_API_SECRET ?? 'internal_secret',
  },
  frontend: {
    url: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  },
});
