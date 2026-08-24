function normalizeHost(value) {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const rawHost = value.trim();
    // A Host header is only a hostname with an optional port. Do not let URL
    // parsing silently discard a path or user-info segment before tenant lookup.
    if (/[\s/?#@\\]/.test(rawHost)) return null;
    const parsed = new URL(`http://${rawHost}`);
    if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) return null;
    const hostname = parsed.hostname.toLowerCase();
    return hostname || null;
  } catch {
    return null;
  }
}

function normalizeWorkspaceDomain(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim().toLowerCase();
}

function normalizeSubjects(value, tenantId) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((subject) => typeof subject !== 'string' || !subject.trim())) {
    throw new Error(`Tenant ${tenantId} initialAdminSubjects must be an array of Google subjects`);
  }
  return [...new Set(value.map((subject) => subject.trim()))];
}

/**
 * SCHOOL_TENANTS is a JSON array rather than a hostname suffix rule so every
 * host is explicitly mapped to one school. This prevents lookalike hosts from
 * being treated as a tenant.
 */
function parseTenantConfiguration(rawConfiguration) {
  if (rawConfiguration === undefined || rawConfiguration === '') return { tenants: [], byHost: new Map() };

  let records;
  try {
    records = typeof rawConfiguration === 'string' ? JSON.parse(rawConfiguration) : rawConfiguration;
  } catch {
    throw new Error('SCHOOL_TENANTS must contain valid JSON');
  }
  if (!Array.isArray(records)) throw new Error('SCHOOL_TENANTS must be a JSON array');

  const byHost = new Map();
  const tenants = records.map((record) => {
    if (!record || typeof record !== 'object' || typeof record.id !== 'string' || !record.id.trim()) {
      throw new Error('Each tenant requires a non-empty id');
    }
    const host = normalizeHost(record.host);
    if (!host) throw new Error(`Tenant ${record.id} requires a valid host`);
    const workspaceDomain = normalizeWorkspaceDomain(record.workspaceDomain);
    if (!workspaceDomain) throw new Error(`Tenant ${record.id} requires a workspaceDomain`);
    if (byHost.has(host)) throw new Error(`Duplicate tenant host: ${host}`);

    const tenant = Object.freeze({
      id: record.id.trim(),
      host,
      name: typeof record.name === 'string' ? record.name.trim() : '',
      workspaceDomain,
      initialAdminSubjects: normalizeSubjects(record.initialAdminSubjects, record.id),
    });
    byHost.set(host, tenant);
    return tenant;
  });

  return Object.freeze({ tenants: Object.freeze(tenants), byHost });
}

function resolveTenantByHost(configuration, hostHeader) {
  const host = normalizeHost(hostHeader);
  return host ? configuration.byHost.get(host) || null : null;
}

function createTenantMiddleware(configuration) {
  return (req, res, next) => {
    if (!configuration.tenants.length) {
      return res.status(503).json({ error: 'School tenant configuration is required' });
    }
    const tenant = resolveTenantByHost(configuration, req.headers.host);
    if (!tenant) return res.status(404).json({ error: 'Unknown school host' });
    req.tenant = tenant;
    return next();
  };
}

module.exports = {
  createTenantMiddleware,
  normalizeHost,
  parseTenantConfiguration,
  resolveTenantByHost,
};
