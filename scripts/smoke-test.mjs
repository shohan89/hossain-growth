#!/usr/bin/env node
// End-to-end smoke test against a running `wrangler dev` instance.
// Exercises auth, RBAC, session/CSRF/lockout security, CRUD across the
// main resources, the lead pipeline, media upload, SEO metadata, and
// validation/permission error paths.
//
// Usage: node scripts/smoke-test.mjs [baseUrl]
// Expects the dev-seeded super admin/admin/editor users (seeds/dev-seed.sql).
//
// Different logical "actors" below use distinct fake CF-Connecting-IP
// values (TEST-NET-3 range, 203.0.113.0/24 — never a real address) purely
// so this single script run doesn't exhaust one shared IP's login rate
// limit across unrelated scenarios, the same way distinct real users
// naturally would. This only works because local `wrangler dev` doesn't
// strip a client-supplied cf-connecting-ip the way Cloudflare's real edge
// always does in production — the header can't be spoofed for real once
// deployed, so this is a test convenience, not a gap being relied on.

const base = process.argv[2] ?? 'http://127.0.0.1:8787';
const SITE_ORIGIN = 'http://localhost:4321'; // must match wrangler.jsonc's default-env SITE_URL

// Varies per run so re-running this script within the same IP-rate-limit
// window (60s) doesn't inherit a previous run's counters on these fake IPs.
const RUN_OFFSET = Date.now() % 150;
const fakeIp = (n) => `203.0.113.${n + RUN_OFFSET}`;

let passed = 0;
let failed = 0;
const failures = [];

function check(label, condition, extra) {
  if (condition) {
    passed++;
    console.log(`  ok  ${label}`);
  } else {
    failed++;
    failures.push(label);
    console.log(`FAIL  ${label}${extra ? ` — ${extra}` : ''}`);
  }
}

function makeClient(clientIp) {
  let cookie = '';
  let lastSetCookieRaw = '';
  const request = async function (method, path, body, extraHeaders) {
    const headers = { 'content-type': 'application/json', ...extraHeaders };
    if (clientIp) headers['cf-connecting-ip'] = clientIp;
    if (cookie) headers.cookie = cookie;
    const isFormData = body instanceof FormData;
    if (isFormData) delete headers['content-type'];
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      lastSetCookieRaw = setCookie;
      cookie = setCookie.split(';')[0];
    }
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = text;
    }
    return { status: res.status, body: json, raw: text };
  };
  request.lastSetCookieRaw = () => lastSetCookieRaw;
  request.clearCookie = () => {
    cookie = '';
  };
  return request;
}

async function main() {
  console.log(`Smoke testing against ${base}\n`);

  // --- health ---
  console.log('health');
  {
    const anon = makeClient();
    const res = await anon('GET', '/api/health');
    check('GET /api/health is 200', res.status === 200, JSON.stringify(res.body));
    check('health reports db ok', res.body?.checks?.database === 'ok');
    check('health reports media ok', res.body?.checks?.media === 'ok');
  }

  // --- auth: unauthenticated access is rejected ---
  console.log('\nauth: unauthenticated access');
  {
    const anon = makeClient();
    const res = await anon('GET', '/api/leads');
    check('unauthenticated GET /api/leads is 401', res.status === 401, res.status);
  }

  // --- account lockout (own IP + a throwaway email so it can't collide with real accounts) ---
  console.log('\nauth: account lockout');
  {
    const attacker = makeClient(fakeIp(10));
    // Unique per run — lockout state persists for 15 minutes in KV, so a
    // fixed email would make this test non-repeatable within that window.
    const target = {
      email: `lockout-test-${Date.now()}@example.test`,
      password: 'wrong',
      turnstileToken: 't',
    };
    let lastStatus;
    for (let i = 0; i < 5; i++) {
      const res = await attacker('POST', '/api/auth/login', target);
      lastStatus = res.status;
    }
    check('5th failed attempt is still a normal 401', lastStatus === 401, lastStatus);
    const locked = await attacker('POST', '/api/auth/login', target);
    check(
      '6th attempt is 423 ACCOUNT_LOCKED',
      locked.status === 423 && locked.body?.error?.code === 'ACCOUNT_LOCKED',
      JSON.stringify(locked.body),
    );
  }

  // --- login validation ---
  console.log('\nauth: login validation');
  {
    const anon = makeClient(fakeIp(11));
    const missingTurnstile = await anon('POST', '/api/auth/login', {
      email: 'dev-admin@hossaingrowth.local',
      password: 'DevAdmin!2026Local',
    });
    check(
      'login without turnstileToken is 400',
      missingTurnstile.status === 400,
      missingTurnstile.status,
    );
  }

  // --- auth: login (admin, super admin, editor — each its own IP) ---
  console.log('\nauth: login');
  const admin = makeClient(fakeIp(20));
  const superAdmin = makeClient(fakeIp(21));
  const editor = makeClient(fakeIp(22));
  {
    const bad = await admin('POST', '/api/auth/login', {
      email: 'dev-admin@hossaingrowth.local',
      password: 'wrong-password',
      turnstileToken: 't',
    });
    check('login with wrong password is 401', bad.status === 401, bad.status);

    const good = await admin('POST', '/api/auth/login', {
      email: 'dev-admin@hossaingrowth.local',
      password: 'DevAdmin!2026Local',
      turnstileToken: 't',
    });
    check('login with correct password is 200', good.status === 200, JSON.stringify(good.body));
    check('login response includes admin role', good.body?.data?.role === 'admin');

    const setCookie = admin.lastSetCookieRaw();
    check('session cookie is HttpOnly', /HttpOnly/i.test(setCookie), setCookie);
    check('session cookie is SameSite=Strict', /SameSite=Strict/i.test(setCookie), setCookie);

    const me = await admin('GET', '/api/auth/me');
    check('GET /api/auth/me is 200 after login', me.status === 200);
    check(
      'admin does NOT have users.manage (narrowed role)',
      !me.body?.data?.permissions?.includes('users.manage'),
    );

    const superLogin = await superAdmin('POST', '/api/auth/login', {
      email: 'dev-superadmin@hossaingrowth.local',
      password: 'DevAdmin!2026Local',
      turnstileToken: 't',
    });
    check('super admin login is 200', superLogin.status === 200, JSON.stringify(superLogin.body));
    check('super admin role is super_admin', superLogin.body?.data?.role === 'super_admin');
    check(
      'super admin has users.manage',
      superLogin.body?.data?.permissions?.includes('users.manage'),
    );
    check(
      'super admin has roles.manage',
      superLogin.body?.data?.permissions?.includes('roles.manage'),
    );

    const editorLogin = await editor('POST', '/api/auth/login', {
      email: 'dev-editor@hossaingrowth.local',
      password: 'DevAdmin!2026Local',
      turnstileToken: 't',
    });
    check('editor login is 200', editorLogin.status === 200);
    check(
      'editor does NOT have settings.write',
      !editorLogin.body?.data?.permissions?.includes('settings.write'),
    );
  }

  // --- RBAC: role boundaries ---
  console.log('\nRBAC: role boundaries');
  {
    const adminDenied = await admin('GET', '/api/admin-users');
    check(
      'admin (narrowed) is forbidden from /api/admin-users',
      adminDenied.status === 403,
      adminDenied.status,
    );

    const editorDenied = await editor('GET', '/api/admin-users');
    check(
      'editor is forbidden from /api/admin-users',
      editorDenied.status === 403,
      editorDenied.status,
    );

    const superAllowed = await superAdmin('GET', '/api/admin-users');
    check(
      'super admin can access /api/admin-users',
      superAllowed.status === 200,
      superAllowed.status,
    );

    const allowedServices = await editor('GET', '/api/services');
    check('editor can read /api/services', allowedServices.status === 200, allowedServices.status);
  }

  // --- roles: configurable permissions ---
  console.log('\nroles: configurable permissions');
  let customRoleId;
  {
    const rolesList = await superAdmin('GET', '/api/roles');
    check('GET /api/roles is 200', rolesList.status === 200);
    const allPermissions = await superAdmin('GET', '/api/permissions');
    const adminRole = rolesList.body?.data?.find((r) => r.key === 'admin');
    const editorRole = rolesList.body?.data?.find((r) => r.key === 'editor');
    const superRole = rolesList.body?.data?.find((r) => r.key === 'super_admin');
    check(
      'admin role lacks users.manage/roles.manage',
      !adminRole?.permissions?.includes('users.manage') &&
        !adminRole?.permissions?.includes('roles.manage'),
    );
    check('editor role lacks settings.write', !editorRole?.permissions?.includes('settings.write'));
    check(
      'super_admin role has every permission',
      superRole?.permissions?.length === allPermissions.body?.data?.length,
      `${superRole?.permissions?.length} vs ${allPermissions.body?.data?.length}`,
    );
    check('viewer role no longer exists', !rolesList.body?.data?.some((r) => r.key === 'viewer'));

    const created = await superAdmin('POST', '/api/roles', {
      key: `smoke_role_${Date.now()}`,
      name: 'Smoke Test Role',
      description: 'Temporary role created by the smoke test.',
    });
    check('create custom role is 201', created.status === 201, JSON.stringify(created.body));
    customRoleId = created.body?.data?.id;

    if (customRoleId) {
      const setPerms = await superAdmin('PUT', `/api/roles/${customRoleId}/permissions`, {
        permissionKeys: ['leads.read', 'blog.read'],
      });
      check('set role permissions is 200', setPerms.status === 200, JSON.stringify(setPerms.body));
      check(
        'role now has exactly the configured permissions',
        setPerms.body?.data?.permissions?.sort().join(',') === 'blog.read,leads.read',
      );

      const badPerms = await superAdmin('PUT', `/api/roles/${customRoleId}/permissions`, {
        permissionKeys: ['not.a.real.permission'],
      });
      check('setting an unknown permission key is 400', badPerms.status === 400, badPerms.status);
    }

    const editorCannotManageRoles = await editor('GET', '/api/roles');
    check(
      'editor is forbidden from /api/roles',
      editorCannotManageRoles.status === 403,
      editorCannotManageRoles.status,
    );
  }

  // --- CSRF: Origin check on authenticated mutating requests ---
  console.log('\nCSRF protection');
  {
    const forged = await admin(
      'PATCH',
      `/api/services/does-not-matter`,
      { title: 'x' },
      { origin: 'https://evil.example' },
    );
    check(
      'mismatched Origin on authenticated mutation is 403 CSRF_REJECTED',
      forged.status === 403 && forged.body?.error?.code === 'CSRF_REJECTED',
      JSON.stringify(forged.body),
    );

    const legit = await admin('GET', `/api/services?pageSize=1`, undefined, {
      origin: SITE_ORIGIN,
    });
    check('matching Origin is unaffected', legit.status === 200, legit.status);
  }

  // --- validation errors ---
  console.log('\nvalidation');
  {
    const res = await admin('POST', '/api/service-categories', { slug: 'Not Valid Slug!' });
    check(
      'invalid slug returns 400 VALIDATION_ERROR',
      res.status === 400 && res.body?.error?.code === 'VALIDATION_ERROR',
      res.status,
    );
  }

  // --- service categories + services CRUD ---
  console.log('\nservices CRUD');
  let serviceCategoryId;
  let serviceId;
  {
    const created = await admin('POST', '/api/service-categories', {
      slug: `smoke-cat-${Date.now()}`,
      name: 'Smoke Test Category',
    });
    check('create service category is 201', created.status === 201, JSON.stringify(created.body));
    serviceCategoryId = created.body?.data?.id;

    const createdService = await admin('POST', '/api/services', {
      slug: `smoke-svc-${Date.now()}`,
      title: 'Smoke Test Service',
      categoryId: serviceCategoryId,
    });
    check(
      'create service is 201',
      createdService.status === 201,
      JSON.stringify(createdService.body),
    );
    serviceId = createdService.body?.data?.id;

    const listRes = await admin('GET', '/api/services?pageSize=5&sortBy=title&sortDir=asc');
    check(
      'list services is 200 with pagination',
      listRes.status === 200 && listRes.body?.pagination?.pageSize === 5,
    );

    const updated = await admin('PATCH', `/api/services/${serviceId}`, {
      title: 'Smoke Test Service (updated)',
    });
    check(
      'update service is 200',
      updated.status === 200 && updated.body?.data?.title?.endsWith('(updated)'),
    );

    const notFound = await admin('GET', '/api/services/does-not-exist');
    check('get missing service is 404', notFound.status === 404);
  }

  // --- portfolio projects (+ images join) ---
  console.log('\nportfolio projects');
  let portfolioProjectId;
  {
    const created = await admin('POST', '/api/portfolio-projects', {
      slug: `smoke-project-${Date.now()}`,
      title: 'Smoke Test Project',
      serviceIds: serviceId ? [serviceId] : [],
    });
    check('create portfolio project is 201', created.status === 201, JSON.stringify(created.body));
    portfolioProjectId = created.body?.data?.id;

    const detail = await admin('GET', `/api/portfolio-projects/${portfolioProjectId}`);
    check(
      'portfolio project detail includes images array',
      Array.isArray(detail.body?.data?.images),
    );
  }

  // --- blog posts (+ tags join) ---
  console.log('\nblog posts');
  {
    const tag = await admin('POST', '/api/blog-tags', {
      slug: `smoke-tag-${Date.now()}`,
      name: 'Smoke Tag',
    });
    check('create blog tag is 201', tag.status === 201);
    const tagId = tag.body?.data?.id;

    const post = await admin('POST', '/api/blog-posts', {
      slug: `smoke-post-${Date.now()}`,
      title: 'Smoke Test Post',
      content: 'Smoke test content.',
      tagIds: [tagId],
      status: 'draft',
    });
    check('create blog post is 201', post.status === 201, JSON.stringify(post.body));

    const detail = await admin('GET', `/api/blog-posts/${post.body?.data?.id}`);
    check(
      'blog post detail includes tags',
      detail.body?.data?.tags?.some((t) => t.id === tagId),
    );

    const publishDenied = await editor('PATCH', `/api/blog-posts/${post.body?.data?.id}`, {
      status: 'published',
    });
    // editor has blog.publish per seed data, so this should succeed (200), not be denied.
    check(
      'editor with blog.publish can publish',
      publishDenied.status === 200,
      publishDenied.status,
    );
  }

  // --- media upload ---
  console.log('\nmedia');
  let mediaAssetId;
  {
    const form = new FormData();
    const blob = new Blob(['smoke-test-file-contents'], { type: 'text/plain' });
    form.set('file', blob, 'smoke.txt');
    const rejected = await admin('POST', '/api/media', form);
    check('upload of disallowed mime type is 400', rejected.status === 400, rejected.status);

    const pngBytes = Uint8Array.from(
      atob(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      ),
      (c) => c.charCodeAt(0),
    );
    const form2 = new FormData();
    form2.set('file', new Blob([pngBytes], { type: 'image/png' }), 'smoke.png');
    form2.set('altText', 'Smoke test image');
    const uploaded = await admin('POST', '/api/media', form2);
    check('upload of 1x1 png is 201', uploaded.status === 201, JSON.stringify(uploaded.body));
    mediaAssetId = uploaded.body?.data?.id;

    const listRes = await admin('GET', '/api/media');
    check('list media is 200', listRes.status === 200);
  }

  // --- SEO metadata ---
  console.log('\nseo metadata');
  if (portfolioProjectId) {
    const put = await admin('PUT', `/api/seo-metadata/portfolio_project/${portfolioProjectId}`, {
      metaTitle: 'Smoke Test SEO Title',
      metaDescription: 'Smoke test description.',
    });
    check('upsert seo metadata is 201 (create)', put.status === 201, JSON.stringify(put.body));

    const putAgain = await admin(
      'PUT',
      `/api/seo-metadata/portfolio_project/${portfolioProjectId}`,
      {
        metaTitle: 'Smoke Test SEO Title v2',
      },
    );
    check('upsert seo metadata is 200 (update)', putAgain.status === 200);
  }

  // --- site settings ---
  console.log('\nsite settings');
  {
    const put = await admin('PUT', '/api/site-settings/smoke_test_key', {
      value: { hello: 'world' },
    });
    check('upsert site setting is 200', put.status === 200, JSON.stringify(put.body));
    const get = await admin('GET', '/api/site-settings/smoke_test_key');
    check('read back site setting', get.body?.data?.value?.hello === 'world');
  }

  // --- leads: public create (Turnstile + rate limit), then admin workflow ---
  console.log('\nleads pipeline');
  let leadId;
  {
    const anon = makeClient(fakeIp(30));
    const created = await anon('POST', '/api/leads', {
      name: 'Smoke Test Lead',
      email: 'smoke-lead@example.test',
      source: 'contact_form',
      serviceInterest: serviceId ? [serviceId] : [],
      turnstileToken: 'smoke-test-token',
    });
    check('public lead creation is 201', created.status === 201, JSON.stringify(created.body));
    leadId = created.body?.data?.id;
    check('new lead defaults to status "new"', created.body?.data?.status === 'new');

    const missingToken = await anon('POST', '/api/leads', {
      name: 'No Token',
      email: 'no-token@example.test',
      source: 'contact_form',
    });
    check(
      'lead creation without turnstileToken is 400',
      missingToken.status === 400,
      missingToken.status,
    );

    if (leadId) {
      const assign = await admin('PATCH', `/api/leads/${leadId}`, {
        status: 'contacted',
        assignedTo: null,
      });
      check('admin can update lead status', assign.status === 200, JSON.stringify(assign.body));

      const note = await admin('POST', `/api/leads/${leadId}/notes`, { note: 'Smoke test note.' });
      check('add lead note is 201', note.status === 201, JSON.stringify(note.body));

      const detail = await admin('GET', `/api/leads/${leadId}`);
      check('lead detail includes notes', detail.body?.data?.notes?.length >= 1);

      const list = await admin('GET', '/api/leads?status=contacted');
      check(
        'filter leads by status',
        list.body?.data?.some((l) => l.id === leadId),
      );

      const csv = await admin('GET', '/api/leads/export');
      check('CSV export is 200 text/csv', csv.status === 200);
      check(
        'CSV export contains lead row',
        typeof csv.raw === 'string' && csv.raw.includes('smoke-lead@example.test'),
      );
    }
  }

  // --- activity logs captured the above actions ---
  console.log('\nactivity logs');
  {
    const res = await superAdmin('GET', '/api/activity-logs?entityType=lead');
    check('activity log list is 200', res.status === 200);
    check(
      'activity log recorded lead.created',
      res.body?.data?.some((l) => l.action === 'lead.created'),
    );
  }

  // --- admin UI route protection (server-side, not just frontend) ---
  console.log('\nadmin route protection');
  {
    const noRedirect = await fetch(`${base}/admin`, { redirect: 'manual' });
    check(
      'GET /admin with no session is a redirect',
      noRedirect.status >= 300 && noRedirect.status < 400,
      noRedirect.status,
    );
    check(
      'redirect target is /admin/login',
      (noRedirect.headers.get('location') ?? '').startsWith('/admin/login'),
      noRedirect.headers.get('location'),
    );

    const loginPage = await fetch(`${base}/admin/login`);
    check('GET /admin/login is public (200)', loginPage.status === 200, loginPage.status);
  }

  // --- change password invalidates the current session ---
  console.log('\nchange password invalidates session');
  {
    const changed = await editor('POST', '/api/auth/change-password', {
      currentPassword: 'DevAdmin!2026Local',
      newPassword: 'NewEditorPassword!2026',
    });
    check('change password is 200', changed.status === 200, JSON.stringify(changed.body));

    const meAfter = await editor('GET', '/api/auth/me');
    check(
      'old session is invalid immediately after password change',
      meAfter.status === 401,
      meAfter.status,
    );

    const reLogin = await editor('POST', '/api/auth/login', {
      email: 'dev-editor@hossaingrowth.local',
      password: 'NewEditorPassword!2026',
      turnstileToken: 't',
    });
    check('can log in with the new password', reLogin.status === 200, JSON.stringify(reLogin.body));

    // Restore the original dev-seed password so repeated smoke-test runs keep working.
    const restore = await editor('POST', '/api/auth/change-password', {
      currentPassword: 'NewEditorPassword!2026',
      newPassword: 'DevAdmin!2026Local',
    });
    check('password restored for next run', restore.status === 200, JSON.stringify(restore.body));
  }

  // --- password reset workflow ---
  console.log('\npassword reset workflow');
  {
    const resetClient = makeClient(fakeIp(40));
    const requested = await resetClient('POST', '/api/auth/request-password-reset', {
      email: 'dev-editor@hossaingrowth.local',
      turnstileToken: 't',
    });
    check(
      'request password reset is 200',
      requested.status === 200,
      JSON.stringify(requested.body),
    );
    const devToken = requested.body?.data?.devOnlyResetToken;
    check(
      'dev environment returns a reset token for testing',
      typeof devToken === 'string' && devToken.length > 0,
    );

    const unknownEmail = await resetClient('POST', '/api/auth/request-password-reset', {
      email: 'no-such-account@example.test',
      turnstileToken: 't',
    });
    check(
      'requesting reset for an unknown email is still 200 (no account enumeration)',
      unknownEmail.status === 200 &&
        unknownEmail.body?.data?.message === requested.body?.data?.message,
    );

    if (devToken) {
      const badToken = await resetClient('POST', '/api/auth/reset-password', {
        token: 'not-a-real-token',
        newPassword: 'SomeNewPassword!2026',
      });
      check('resetting with a bad token is 400', badToken.status === 400, badToken.status);

      const reset = await resetClient('POST', '/api/auth/reset-password', {
        token: devToken,
        newPassword: 'ResetFlowPassword!2026',
      });
      check(
        'reset-password with a valid token is 200',
        reset.status === 200,
        JSON.stringify(reset.body),
      );

      const reuse = await resetClient('POST', '/api/auth/reset-password', {
        token: devToken,
        newPassword: 'AnotherPassword!2026',
      });
      check('the same reset token cannot be used twice', reuse.status === 400, reuse.status);

      const loginOldPassword = await resetClient('POST', '/api/auth/login', {
        email: 'dev-editor@hossaingrowth.local',
        password: 'DevAdmin!2026Local',
        turnstileToken: 't',
      });
      check(
        'old password no longer works after reset',
        loginOldPassword.status === 401,
        loginOldPassword.status,
      );

      const loginNewPassword = await resetClient('POST', '/api/auth/login', {
        email: 'dev-editor@hossaingrowth.local',
        password: 'ResetFlowPassword!2026',
        turnstileToken: 't',
      });
      check(
        'new password works after reset',
        loginNewPassword.status === 200,
        JSON.stringify(loginNewPassword.body),
      );

      // Restore the dev-seed password for repeatable runs.
      await resetClient('POST', '/api/auth/change-password', {
        currentPassword: 'ResetFlowPassword!2026',
        newPassword: 'DevAdmin!2026Local',
      });
    }
  }

  // --- cleanup created resources ---
  console.log('\ncleanup');
  {
    if (serviceId) {
      const del = await admin('DELETE', `/api/services/${serviceId}`);
      check('delete service is 204', del.status === 204, del.status);
    }
    if (serviceCategoryId) {
      const del = await admin('DELETE', `/api/service-categories/${serviceCategoryId}`);
      check('delete service category is 204', del.status === 204, del.status);
    }
    if (portfolioProjectId) {
      const del = await admin('DELETE', `/api/portfolio-projects/${portfolioProjectId}`);
      check('delete portfolio project is 204', del.status === 204, del.status);
    }
    if (mediaAssetId) {
      const del = await admin('DELETE', `/api/media/${mediaAssetId}`);
      check('delete media asset is 204', del.status === 204, del.status);
    }
    if (leadId) {
      const del = await admin('DELETE', `/api/leads/${leadId}`);
      check('delete lead is 204', del.status === 204, del.status);
    }
  }

  // --- logout ---
  console.log('\nlogout');
  {
    const out = await admin('POST', '/api/auth/logout');
    check('logout is 200', out.status === 200);
    const me = await admin('GET', '/api/auth/me');
    check('me after logout is 401', me.status === 401, me.status);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log('Failures:', failures.join(', '));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
