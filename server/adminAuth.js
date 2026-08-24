const { OAuth2Client } = require('google-auth-library');

// Google recommends google-auth-library's verifyIdToken() for Node.js. It
// verifies the signed token, audience, issuer, and expiry. The hd claim is
// checked separately for the configured Workspace tenant.
// Source: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
function createGoogleIdTokenVerifier({ clientId, oauth2Client = new OAuth2Client() }) {
  if (typeof clientId !== 'string' || !clientId.trim()) {
    throw new Error('GOOGLE_OAUTH_CLIENT_ID is required for administrator authentication');
  }

  return async (idToken, tenant) => {
    if (typeof idToken !== 'string' || !idToken.trim()) throw new Error('Google ID token is required');
    const ticket = await oauth2Client.verifyIdToken({ idToken, audience: clientId.trim() });
    const payload = ticket.getPayload();
    const subject = typeof payload?.sub === 'string' ? payload.sub.trim() : '';
    const hostedDomain = typeof payload?.hd === 'string' ? payload.hd.toLowerCase() : '';
    if (!subject) throw new Error('Google ID token subject is missing');
    if (hostedDomain !== tenant.workspaceDomain) throw new Error('Google ID token Workspace domain is not allowed');
    if (payload.email_verified !== true) throw new Error('Google Workspace email is not verified');

    return {
      subject,
      email: typeof payload.email === 'string' ? payload.email : '',
      hostedDomain,
    };
  };
}

function getBearerToken(authorization) {
  if (typeof authorization !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match ? match[1] : null;
}

function createPoolAdminLookup(pool) {
  return async ({ schoolId, subject }) => {
    if (!pool) return null;
    const { rows } = await pool.query(
      'SELECT id, school_id, google_subject FROM admins WHERE school_id = $1 AND google_subject = $2 AND is_active = true',
      [schoolId, subject],
    );
    if (!rows[0]) return null;
    return { id: rows[0].id, schoolId: rows[0].school_id, googleSubject: rows[0].google_subject };
  };
}

function createRequireAdmin({ verifyGoogleIdToken, findAdmin }) {
  return async (req, res, next) => {
    const token = getBearerToken(req.headers.authorization);
    if (!token) return res.status(401).json({ error: 'Google administrator authentication required' });

    try {
      const identity = await verifyGoogleIdToken(token, req.tenant);
      const admin = await findAdmin({ schoolId: req.tenant.id, subject: identity.subject });
      if (admin) {
        req.admin = admin;
        return next();
      }
      if (req.tenant.initialAdminSubjects.includes(identity.subject)) {
        req.admin = {
          id: null,
          schoolId: req.tenant.id,
          googleSubject: identity.subject,
          isBootstrapAdmin: true,
        };
        return next();
      }
      return res.status(403).json({ error: 'Administrator access required' });
    } catch (error) {
      return res.status(401).json({ error: 'Invalid Google administrator authentication' });
    }
  };
}

module.exports = {
  createGoogleIdTokenVerifier,
  createPoolAdminLookup,
  createRequireAdmin,
  getBearerToken,
};
