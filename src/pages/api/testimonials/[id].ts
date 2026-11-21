import { testimonialResource } from '../../../lib/resources/testimonials';

export const prerender = false;
export const GET = testimonialResource.getOne;
export const PATCH = testimonialResource.update;
export const DELETE = testimonialResource.remove;
