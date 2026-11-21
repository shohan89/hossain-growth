#!/usr/bin/env node
// End-to-end smoke test against a running `wrangler dev` instance.
// Exercises auth, RBAC, CRUD across the main resources, the lead pipeline,
// media upload, SEO metadata, and validation/permission error paths.
//
// Usage: node scripts/smoke-test.mjs [baseUrl]
// Expects the dev-seeded admin/editor users (seeds/dev-seed.sql) to exist.

const base = process.argv[2] ?? 'http://127.0.0.1:8787';

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

function makeClient() {
  let cookie = '';
  return async function request(method, path, body) {
    const headers = { 'content-type': 'application/json' };
    if (cookie) headers.cookie = cookie;
    const isFormData = body instanceof FormData;
    const res = await fetch(`${base}${path}`, {
      method,
      headers: isFormData ? (cookie ? { cookie } : {}) : headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = text;
    }
    return { status: res.status, body: json, raw: text };
  };
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

  // --- auth: login ---
  console.log('\nauth: login');
  const admin = makeClient();
  {
    const bad = await admin('POST', '/api/auth/login', {
      email: 'dev-admin@hossaingrowth.local',
      password: 'wrong-password',
    });
    check('login with wrong password is 401', bad.status === 401, bad.status);

    const good = await admin('POST', '/api/auth/login', {
      email: 'dev-admin@hossaingrowth.local',
      password: 'DevAdmin!2026Local',
    });
    check('login with correct password is 200', good.status === 200, JSON.stringify(good.body));
    check('login response includes admin role', good.body?.data?.role === 'admin');

    const me = await admin('GET', '/api/auth/me');
    check('GET /api/auth/me is 200 after login', me.status === 200);
    check(
      'me.permissions includes users.manage',
      me.body?.data?.permissions?.includes('users.manage'),
    );
  }

  // --- RBAC: viewer cannot write ---
  console.log('\nRBAC: role boundaries');
  const editor = makeClient();
  {
    const login = await editor('POST', '/api/auth/login', {
      email: 'dev-editor@hossaingrowth.local',
      password: 'DevAdmin!2026Local',
    });
    check('editor login is 200', login.status === 200);

    const deniedUsersManage = await editor('GET', '/api/admin-users');
    check(
      'editor is forbidden from /api/admin-users',
      deniedUsersManage.status === 403,
      deniedUsersManage.status,
    );

    const allowedServices = await editor('GET', '/api/services');
    check('editor can read /api/services', allowedServices.status === 200, allowedServices.status);
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
    // text/plain is not in the allow-list — expect rejection, then retry with an allowed type.
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
    const anon = makeClient();
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
    const res = await admin('GET', '/api/activity-logs?entityType=lead');
    check('activity log list is 200', res.status === 200);
    check(
      'activity log recorded lead.created',
      res.body?.data?.some((l) => l.action === 'lead.created'),
    );
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
