export interface ServiceBenefit {
  title: string;
  description: string;
}

export interface ServiceProcessStep {
  title: string;
  description: string;
}

export interface ServiceFaq {
  question: string;
  answer: string;
}

export interface ServiceDetail {
  slug: string;
  heroKicker: string;
  heroHeadline: string;
  heroSubheadline: string;
  problem: string;
  solution: string;
  benefits: ServiceBenefit[];
  process: ServiceProcessStep[];
  deliverables: string[];
  faqs: ServiceFaq[];
}

export const SERVICE_ICON: Record<
  string,
  'layers' | 'target' | 'megaphone' | 'search' | 'share' | 'code'
> = {
  'full-stack-digital-marketing': 'layers',
  'google-ads-management': 'target',
  'meta-ads-management': 'megaphone',
  'seo-aeo-geo': 'search',
  'social-media-management': 'share',
  'web-development': 'code',
};

export const SERVICE_DETAILS: Record<string, ServiceDetail> = {
  'full-stack-digital-marketing': {
    slug: 'full-stack-digital-marketing',
    heroKicker: 'Full Stack Digital Marketing',
    heroHeadline: 'One partner, every channel, one growth plan.',
    heroSubheadline:
      'We run paid, organic, content, and conversion strategy as a single connected system — not a pile of disconnected vendors.',
    problem:
      'Most businesses end up managing a patchwork of freelancers and point-solution agencies: one for ads, one for SEO, one for social. Nobody owns the full picture, budgets overlap, and attribution breaks down.',
    solution:
      'Hossain Growth runs your entire digital marketing stack under one strategy, one reporting system, and one accountable team — so every channel reinforces the others instead of competing for the same budget.',
    benefits: [
      {
        title: 'Single growth strategy',
        description:
          'Every channel — paid, organic, content, email — is planned against the same revenue goals, not managed in isolation.',
      },
      {
        title: 'Unified reporting',
        description:
          'One dashboard shows how channels interact, where budget is working, and where it should move next.',
      },
      {
        title: 'Faster decisions',
        description:
          'One team with full context moves budget and creative between channels in days, not after a quarterly review.',
      },
      {
        title: 'Lower overhead',
        description:
          'Replace multiple vendor contracts and handoffs with a single point of accountability.',
      },
    ],
    process: [
      {
        title: 'Growth audit',
        description:
          'We review your current channels, funnel, and data to find where growth is being left on the table.',
      },
      {
        title: 'Strategy & roadmap',
        description:
          'We build a prioritized, quarter-by-quarter plan mapped to pipeline and revenue targets.',
      },
      {
        title: 'Execution across channels',
        description:
          'Our team runs paid media, SEO, content, and conversion optimization in parallel, in sync.',
      },
      {
        title: 'Report, learn, reallocate',
        description:
          'We review performance on a fixed cadence and shift budget toward what is working.',
      },
    ],
    deliverables: [
      'Integrated growth strategy and channel roadmap',
      'Paid media management across search and social',
      'SEO and content execution',
      'Conversion rate optimization on key landing pages',
      'Unified performance reporting and regular strategy reviews',
    ],
    faqs: [
      {
        question: 'Do we need to replace our existing marketing team?',
        answer:
          'No. We typically work alongside in-house teams, filling strategy, execution, or specialist gaps as needed.',
      },
      {
        question: 'How quickly will we see results?',
        answer:
          'Paid channels can show early signal within weeks; organic and content investments compound over several months. We set expectations for each channel during the strategy phase.',
      },
      {
        question: 'Can you work with our existing tools and data?',
        answer:
          'Yes. We integrate with your existing analytics, CRM, and ad accounts rather than asking you to migrate platforms.',
      },
    ],
  },
  'google-ads-management': {
    slug: 'google-ads-management',
    heroKicker: 'Google Ads Management',
    heroHeadline: 'Search and shopping campaigns built to convert, not just click.',
    heroSubheadline:
      'Structured accounts, disciplined bidding, and landing pages aligned to intent — so ad spend turns into qualified pipeline.',
    problem:
      'Poorly structured Google Ads accounts waste budget on broad match keywords, irrelevant search terms, and landing pages that do not match searcher intent.',
    solution:
      'We rebuild or restructure your account around tightly themed ad groups, intent-matched keywords, and conversion-focused landing pages, then manage bidding and budget with ongoing optimization.',
    benefits: [
      {
        title: 'Intent-first account structure',
        description:
          'Campaigns and ad groups are organized around how your customers actually search, reducing wasted spend.',
      },
      {
        title: 'Conversion tracking you can trust',
        description:
          'We set up and audit conversion tracking so reported results reflect real pipeline, not vanity clicks.',
      },
      {
        title: 'Ongoing bid and budget management',
        description:
          'Budgets shift toward the keywords, audiences, and placements proven to convert.',
      },
      {
        title: 'Transparent reporting',
        description:
          'Clear, regular reporting on spend, cost per lead, and the keywords actually driving results.',
      },
    ],
    process: [
      {
        title: 'Account audit',
        description:
          'We review search terms, structure, and conversion tracking for waste and gaps.',
      },
      {
        title: 'Campaign build or rebuild',
        description:
          'We organize campaigns around intent and build landing pages matched to each ad group.',
      },
      {
        title: 'Launch and optimize',
        description:
          'We monitor search terms, adjust bids, and refine targeting in the first weeks of a live campaign.',
      },
      {
        title: 'Scale what converts',
        description: 'Budget moves toward the highest-performing campaigns as data accumulates.',
      },
    ],
    deliverables: [
      'Full account audit and restructuring plan',
      'Search, shopping, and performance max campaign setup',
      'Conversion tracking audit and implementation',
      'Ongoing bid, budget, and keyword management',
      'Monthly performance reporting',
    ],
    faqs: [
      {
        question: 'What budget do I need to get started?',
        answer:
          'Minimum effective budget depends on your industry and competition. We confirm a realistic starting range during the account audit.',
      },
      {
        question: 'Do you also build the landing pages?',
        answer:
          'Yes — our web development team can build or optimize landing pages specifically for your campaigns, or we can work with your existing pages.',
      },
      {
        question: 'How is performance reported?',
        answer:
          'You receive regular reporting on spend, conversions, and cost per lead, with context on what changed and why.',
      },
    ],
  },
  'meta-ads-management': {
    slug: 'meta-ads-management',
    heroKicker: 'Meta Ads Management',
    heroHeadline: 'Facebook and Instagram campaigns that earn attention and action.',
    heroSubheadline:
      'Creative-led campaigns, precise audience strategy, and continuous testing across the Meta ecosystem.',
    problem:
      'Meta campaigns that rely on a single creative or broad targeting burn out fast and stop delivering efficient results.',
    solution:
      'We run a structured testing system across creative, audiences, and placements — retiring what fatigues and scaling what performs — so campaigns stay efficient over time.',
    benefits: [
      {
        title: 'Creative testing as a system',
        description:
          'New creative variations are tested on a regular cadence instead of left to run until performance drops.',
      },
      {
        title: 'Full-funnel audience strategy',
        description:
          'Prospecting, retargeting, and lookalike audiences are structured to move people through the funnel, not just generate clicks.',
      },
      {
        title: 'Cross-placement optimization',
        description:
          'Budget is managed across Facebook, Instagram, and the Audience Network based on where it performs.',
      },
      {
        title: 'Clear attribution',
        description:
          'We align tracking with your actual conversion events, not just platform-reported clicks.',
      },
    ],
    process: [
      {
        title: 'Audience and offer strategy',
        description:
          'We define who we are targeting at each funnel stage and what offer moves them forward.',
      },
      {
        title: 'Creative production brief',
        description:
          'We brief creative direction based on what performs for your audience and category.',
      },
      {
        title: 'Launch and test',
        description:
          'Campaigns launch with structured testing across creative and audience variables.',
      },
      {
        title: 'Scale and refresh',
        description:
          'Winning combinations scale; fatigued creative is refreshed before performance drops.',
      },
    ],
    deliverables: [
      'Audience and funnel strategy across prospecting and retargeting',
      'Campaign setup across Facebook, Instagram, and Audience Network',
      'Structured creative testing plan',
      'Pixel and conversion event audit',
      'Monthly performance and creative reporting',
    ],
    faqs: [
      {
        question: 'Do you produce the ad creative?',
        answer:
          'We provide creative direction and briefs; production can be handled by your team, ours, or a trusted creative partner, depending on scope.',
      },
      {
        question: 'How do you handle iOS tracking limitations?',
        answer:
          'We configure server-side tracking and conversion APIs where possible to maintain reliable measurement.',
      },
      {
        question: 'What makes Meta ads different from Google ads?',
        answer:
          'Meta reaches people based on interests and behavior rather than active search intent, so creative and audience strategy carry more weight than keyword targeting.',
      },
    ],
  },
  'seo-aeo-geo': {
    slug: 'seo-aeo-geo',
    heroKicker: 'SEO / AEO / GEO',
    heroHeadline: 'Be found in search, AI answers, and your local market.',
    heroSubheadline:
      'Technical SEO, content strategy, and the emerging discipline of answer and generative engine optimization — built together.',
    problem:
      'Search is no longer just a list of blue links. Buyers find answers through AI assistants and generative search summaries, and traditional SEO alone no longer covers how people discover businesses.',
    solution:
      'We combine technical SEO, structured content, and answer-engine optimization so your business is visible across traditional search, AI-generated answers, and local results.',
    benefits: [
      {
        title: 'Technical foundation first',
        description:
          'We fix crawlability, site speed, and structured data issues that silently cap organic visibility.',
      },
      {
        title: 'Content built to rank and answer',
        description:
          'Content is structured to satisfy search intent and to be cited correctly by AI answer engines.',
      },
      {
        title: 'Local and map presence',
        description:
          'Geo-targeted optimization strengthens visibility in local search and map results where relevant.',
      },
      {
        title: 'Measurable organic growth',
        description: 'We track rankings, organic traffic, and answer-engine visibility over time.',
      },
    ],
    process: [
      {
        title: 'Technical and content audit',
        description: 'We assess site health, existing content, and structured data coverage.',
      },
      {
        title: 'Keyword and topic strategy',
        description: 'We map search and conversational queries your customers actually use.',
      },
      {
        title: 'Content and technical execution',
        description:
          'We implement fixes, structured data, and new or updated content against the plan.',
      },
      {
        title: 'Track and iterate',
        description:
          'We monitor rankings, traffic, and answer-engine citations, adjusting the plan monthly.',
      },
    ],
    deliverables: [
      'Technical SEO audit and fix implementation',
      'Keyword and topic strategy',
      'On-page and structured data optimization',
      'Answer and generative engine optimization for key topics',
      'Monthly organic performance reporting',
    ],
    faqs: [
      {
        question: 'What is AEO and GEO?',
        answer:
          'AEO (answer engine optimization) and GEO (generative engine optimization) focus on how content is surfaced in AI-generated answers and summaries, alongside traditional search rankings.',
      },
      {
        question: 'How long does SEO take to show results?',
        answer:
          'Organic growth compounds over months rather than weeks. We agree on realistic milestones during the audit phase.',
      },
      {
        question: 'Do you handle technical SEO or just content?',
        answer:
          'Both. Technical SEO and content strategy are treated as one discipline, since weak technical health limits even strong content.',
      },
    ],
  },
  'social-media-management': {
    slug: 'social-media-management',
    heroKicker: 'Social Media Management & Strategy',
    heroHeadline: 'A social presence with a strategy behind every post.',
    heroSubheadline:
      'Content planning, community management, and platform strategy built around business goals, not posting for its own sake.',
    problem:
      'Inconsistent posting without a clear strategy builds a feed, not a business outcome. Most brands struggle to connect social activity to real pipeline or sales.',
    solution:
      'We build a content strategy tied to your business goals, manage planning and publishing on a consistent cadence, and track performance against outcomes that matter, not just likes.',
    benefits: [
      {
        title: 'Strategy before content',
        description:
          'Every content calendar is built around defined goals — awareness, engagement, or lead generation — for each platform.',
      },
      {
        title: 'Consistent publishing cadence',
        description: 'A planned content calendar replaces reactive, inconsistent posting.',
      },
      {
        title: 'Active community management',
        description: 'Comments and messages are monitored and responded to in your brand voice.',
      },
      {
        title: 'Performance tied to goals',
        description:
          'Reporting focuses on the metrics relevant to your strategy, not just surface-level engagement.',
      },
    ],
    process: [
      {
        title: 'Platform and goal strategy',
        description:
          'We define which platforms matter for your audience and what each one needs to achieve.',
      },
      {
        title: 'Content calendar and planning',
        description:
          'We plan content themes and formats on a monthly cadence, aligned to the strategy.',
      },
      {
        title: 'Publishing and community management',
        description: 'Content is published on schedule, with ongoing community engagement.',
      },
      {
        title: 'Review and refine',
        description:
          'We review performance monthly and adjust content direction based on what resonates.',
      },
    ],
    deliverables: [
      'Platform and content strategy',
      'Monthly content calendar',
      'Content scheduling and publishing',
      'Community management and response handling',
      'Monthly performance reporting',
    ],
    faqs: [
      {
        question: 'Which platforms do you manage?',
        answer:
          'We work across the major platforms relevant to your audience and recommend focus based on where your customers actually spend time.',
      },
      {
        question: 'Do you create the visual content?',
        answer:
          'We handle content planning and copy, and can coordinate visual production directly or with your existing creative resources.',
      },
      {
        question: 'Can social media management be combined with paid ads?',
        answer:
          'Yes — organic social and Meta ads management work well together and are often run as a combined strategy.',
      },
    ],
  },
  'web-development': {
    slug: 'web-development',
    heroKicker: 'Web Development',
    heroHeadline: 'Fast, conversion-ready websites built on modern infrastructure.',
    heroSubheadline:
      'Custom web design and development built for speed, SEO, and the specific job your website needs to do.',
    problem:
      'Slow, templated websites hurt both search rankings and conversion rates, and are often disconnected from the marketing strategy driving traffic to them.',
    solution:
      'We design and build websites and landing pages on modern, fast infrastructure, built around conversion goals and aligned with the rest of your marketing strategy.',
    benefits: [
      {
        title: 'Built for speed',
        description:
          'Sites are built on modern, edge-deployed infrastructure for fast load times across devices and locations.',
      },
      {
        title: 'Designed to convert',
        description:
          'Every page is structured around a clear action, not just visual presentation.',
      },
      {
        title: 'SEO-ready from day one',
        description:
          'Semantic structure, clean URLs, and technical SEO best practices are built in, not added later.',
      },
      {
        title: 'Easy to maintain',
        description: 'Content is manageable without needing a developer for every update.',
      },
    ],
    process: [
      {
        title: 'Discovery and sitemap',
        description: 'We define site structure, goals, and content requirements for every page.',
      },
      {
        title: 'Design',
        description:
          'We design pages around your brand and conversion goals before any code is written.',
      },
      {
        title: 'Development and QA',
        description: 'We build, test across devices, and verify performance and accessibility.',
      },
      {
        title: 'Launch and support',
        description: 'We handle launch and remain available for ongoing updates and improvements.',
      },
    ],
    deliverables: [
      'Site architecture and sitemap',
      'Custom design for key page templates',
      'Responsive, accessible development',
      'Technical SEO implementation',
      'Launch support and post-launch monitoring',
    ],
    faqs: [
      {
        question: 'Can you redesign an existing site, or only build new ones?',
        answer:
          'Both. We work on full redesigns, rebuilds, and net-new builds depending on your needs.',
      },
      {
        question: 'What platform do you build on?',
        answer:
          'We build on modern, fast web infrastructure suited to the project — the right technical foundation depends on your content and performance needs.',
      },
      {
        question: 'Will the website work well with our marketing campaigns?',
        answer:
          'Yes — we design with campaign landing pages and conversion tracking in mind, especially when paired with our paid media or SEO services.',
      },
    ],
  },
};
