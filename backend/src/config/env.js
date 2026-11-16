module.exports = {
  databaseUrl: process.env.DATABASE_URL,
  frontendOrigin: process.env.FRONTEND_ORIGIN,
  jwtSecret: process.env.JWT_SECRET,
  turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY,
};