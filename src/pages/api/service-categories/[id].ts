import { serviceCategoryResource } from '../../../lib/resources/service-categories';

export const prerender = false;
export const GET = serviceCategoryResource.getOne;
export const PATCH = serviceCategoryResource.update;
export const DELETE = serviceCategoryResource.remove;
