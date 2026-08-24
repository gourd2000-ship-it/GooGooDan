const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createTenantMiddleware,
  parseTenantConfiguration,
  resolveTenantByHost,
} = require('./tenant');

const tenantConfiguration = parseTenantConfiguration(JSON.stringify([
  {
    id: '11111111-1111-4111-8111-111111111111',
    host: 'alpha.goo-goo-dan.example',
    name: 'Alpha Elementary',
    workspaceDomain: 'alpha.edu',
    initialAdminSubjects: ['google-subject-1'],
  },
]));

test('resolveTenantByHost resolves only an exact configured host and ignores its port', () => {
  const tenant = resolveTenantByHost(tenantConfiguration, 'ALPHA.GOO-GOO-DAN.EXAMPLE:443');

  assert.equal(tenant.id, '11111111-1111-4111-8111-111111111111');
  assert.equal(tenant.workspaceDomain, 'alpha.edu');
  assert.equal(resolveTenantByHost(tenantConfiguration, 'other.goo-goo-dan.example'), null);
  assert.equal(resolveTenantByHost(tenantConfiguration, 'alpha.goo-goo-dan.example.attacker.test'), null);
  assert.equal(resolveTenantByHost(tenantConfiguration, 'alpha.goo-goo-dan.example/extra'), null);
  assert.equal(resolveTenantByHost(tenantConfiguration, 'user@alpha.goo-goo-dan.example'), null);
});

test('parseTenantConfiguration rejects duplicate hosts and incomplete tenant records', () => {
  assert.throws(
    () => parseTenantConfiguration(JSON.stringify([
      { id: 'school-a', host: 'same.example', workspaceDomain: 'school.example' },
      { id: 'school-b', host: 'SAME.EXAMPLE', workspaceDomain: 'school.example' },
    ])),
    /duplicate/i,
  );
  assert.throws(
    () => parseTenantConfiguration(JSON.stringify([{ id: 'school-a', host: 'missing-domain.example' }])),
    /workspaceDomain/i,
  );
});

test('createTenantMiddleware rejects an unregistered host before an admin route runs', () => {
  const middleware = createTenantMiddleware(tenantConfiguration);
  const request = { headers: { host: 'unregistered.example' } };
  let response;

  middleware(request, {
    status(code) {
      response = { code };
      return this;
    },
    json(body) {
      response.body = body;
    },
  }, () => {
    throw new Error('next must not be called for an unregistered host');
  });

  assert.deepEqual(response, { code: 404, body: { error: 'Unknown school host' } });
});
