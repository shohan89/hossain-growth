import { blogCategoryResource } from '../../../lib/resources/blog-categories';

export const prerender = false;
export const GET = blogCategoryResource.list;
export const POST = blogCategoryResource.create;
