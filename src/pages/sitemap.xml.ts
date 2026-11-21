import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getDb } from '../lib/db/client';
import {
  getPublishedServices,
  getPublishedPortfolioProjects,
  getPublishedCaseStudies,
  getPublishedBlogPosts,
} from '../lib/content/public';

export const prerender = false;

const STATIC_PATHS = [
  '',
  'about',
  'services',
  'portfolio',
  'case-studies',
  'industries',
  'blog',
  'contact',
  'privacy-policy',
  'terms-and-conditions',
];

function url(origin: string, path: string) {
  return `  <url>\n    <loc>${origin}/${path}</loc>\n  </url>`;
}

export const GET: APIRoute = async ({ url: requestUrl }) => {
  const origin = (env.SITE_URL ?? requestUrl.origin).replace(/\/$/, '');
  const db = getDb(env.DB);

  const [servicesRows, portfolioRows, caseStudyRows, blogRows] = await Promise.all([
    getPublishedServices(db),
    getPublishedPortfolioProjects(db),
    getPublishedCaseStudies(db),
    getPublishedBlogPosts(db),
  ]);

  const entries = [
    ...STATIC_PATHS.map((path) => url(origin, path)),
    ...servicesRows.map((row) => url(origin, `services/${row.slug}`)),
    ...portfolioRows.map((row) => url(origin, `portfolio/${row.slug}`)),
    ...caseStudyRows.map((row) => url(origin, `case-studies/${row.slug}`)),
    ...blogRows.map((row) => url(origin, `blog/${row.slug}`)),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`;

  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'application/xml' },
  });
};
