import { blogCategoryResource } from '../../../lib/resources/blog-categories';

export const prerender = false;
export const GET = blogCategoryResource.getOne;
export const PATCH = blogCategoryResource.update;
export const DELETE = blogCategoryResource.remove;
