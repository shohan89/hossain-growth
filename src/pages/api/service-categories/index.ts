import { serviceCategoryResource } from '../../../lib/resources/service-categories';

export const prerender = false;
export const GET = serviceCategoryResource.list;
export const POST = serviceCategoryResource.create;
