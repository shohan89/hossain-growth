import { testimonialResource } from '../../../lib/resources/testimonials';

export const prerender = false;
export const GET = testimonialResource.list;
export const POST = testimonialResource.create;
