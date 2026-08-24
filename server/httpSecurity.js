// The CORS package documents credentials:true with an explicit allowed origin.
// Source: https://expressjs.com/en/resources/middleware/cors.html
function createCorsOptions(allowedOrigins) {
  const allowed = new Set(allowedOrigins);
  return {
    origin(origin, callback) {
      callback(null, Boolean(origin && allowed.has(origin)));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  };
}

// Express documents that secure cookies need HTTPS; production uses SameSite=None
// for the separately deployed browser client, while local HTTP uses Lax.
// Source: https://expressjs.com/en/resources/middleware/session/
function createSessionCookieOptions(environment = process.env, maxAge) {
  const production = environment.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'none' : 'lax',
    path: '/',
    maxAge,
  };
}

module.exports = { createCorsOptions, createSessionCookieOptions };
