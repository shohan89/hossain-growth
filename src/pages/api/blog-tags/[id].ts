import { blogTagResource } from '../../../lib/resources/blog-tags';

export const prerender = false;
export const GET = blogTagResource.getOne;
export const PATCH = blogTagResource.update;
export const DELETE = blogTagResource.remove;
