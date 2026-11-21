import { websitePageResource } from '../../../lib/resources/website-pages';

export const prerender = false;
export const GET = websitePageResource.getOne;
export const PATCH = websitePageResource.update;
export const DELETE = websitePageResource.remove;
