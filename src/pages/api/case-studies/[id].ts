import { caseStudyResource } from '../../../lib/resources/case-studies';

export const prerender = false;
export const GET = caseStudyResource.getOne;
export const PATCH = caseStudyResource.update;
export const DELETE = caseStudyResource.remove;
