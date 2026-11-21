import { serviceResource } from '../../../lib/resources/services';

export const prerender = false;
export const GET = serviceResource.getOne;
export const PATCH = serviceResource.update;
export const DELETE = serviceResource.remove;
