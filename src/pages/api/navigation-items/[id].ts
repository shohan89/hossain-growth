import { navigationItemResource } from '../../../lib/resources/navigation-items';

export const prerender = false;
export const GET = navigationItemResource.getOne;
export const PATCH = navigationItemResource.update;
export const DELETE = navigationItemResource.remove;
