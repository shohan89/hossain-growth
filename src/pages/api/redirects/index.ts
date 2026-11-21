import { redirectResource } from '../../../lib/resources/redirects';

export const prerender = false;
export const GET = redirectResource.list;
export const POST = redirectResource.create;
