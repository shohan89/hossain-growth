import { navigationItemResource } from '../../../lib/resources/navigation-items';

export const prerender = false;
export const GET = navigationItemResource.list;
export const POST = navigationItemResource.create;
