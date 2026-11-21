import { redirectResource } from '../../../lib/resources/redirects';

export const prerender = false;
export const GET = redirectResource.getOne;
export const PATCH = redirectResource.update;
export const DELETE = redirectResource.remove;
