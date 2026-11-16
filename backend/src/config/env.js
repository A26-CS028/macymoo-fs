module.exports = {
  databaseUrl: process.env.DATABASE_URL,
  frontendOrigin: process.env.FRONTEND_ORIGIN,
  jwtSecret: process.env.JWT_SECRET,
  turnstileSecret: process.env.TURNSTILE_SECRET_KEY,
};