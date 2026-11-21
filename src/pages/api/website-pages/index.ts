import { websitePageResource } from '../../../lib/resources/website-pages';

export const prerender = false;
export const GET = websitePageResource.list;
export const POST = websitePageResource.create;
