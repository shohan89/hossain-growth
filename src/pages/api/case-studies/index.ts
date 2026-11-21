import { caseStudyResource } from '../../../lib/resources/case-studies';

export const prerender = false;
export const GET = caseStudyResource.list;
export const POST = caseStudyResource.create;
