# M0 tenant and administrator configuration

Configure these values only in the deployment environment. Do not commit real
OAuth client IDs, Google subjects, or database URLs.

```text
GOOGLE_OAUTH_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
CLIENT_ORIGINS=https://app.example.com
SCHOOL_TENANTS=[{"id":"11111111-1111-4111-8111-111111111111","name":"Alpha Elementary","host":"alpha.example.com","workspaceDomain":"alpha.edu","initialAdminSubjects":["google-account-subject"]}]
```

`host` is the complete, unique browser hostname for one school. It maps to the
same `schools.id` UUID used in the database; suffix and wildcard mappings are
not supported. `workspaceDomain` must be the Google Workspace hosted-domain
(`hd`) claim, not merely the domain portion of an email address. An initial
administrator is identified by the stable Google `sub` value, and is only a
bootstrap authority for its configured school until a matching `admins` record
exists.

Google recommends server-side validation with `google-auth-library` and says
to use `sub` as the stable account identifier while checking `hd` for Workspace
membership: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token

The allowed frontend origin list must contain exact origins whenever credentials
are enabled. The CORS configuration follows the official `cors` middleware
guidance: https://expressjs.com/en/resources/middleware/cors.html
