import { blogTagResource } from '../../../lib/resources/blog-tags';

export const prerender = false;
export const GET = blogTagResource.list;
export const POST = blogTagResource.create;
