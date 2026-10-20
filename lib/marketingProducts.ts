export const BRAND = 'STELLAR INTELLIGENT TECHNOLOGIES';
export const ATTRIBUTION = 'Operated by APROPOS GROUP LLC';
export const TAGLINE = 'Intelligent Technology for the Workplace';
export const PRODUCT_ROOT = '/products';
export const products = [
  {
    slug: 'customer-engagement-operations-center', number: '01', short: 'Operations Center', category: 'THE FOUNDATION',
    name: 'Customer Engagement Operations Center',
    headline: 'Every conversation deserves a connected operation.',
    description: 'The platform that connects customer information, engagement history, lead activity, and the people responsible for the next step.',
    purpose: 'Give your people the context to move forward.',
    narrative: 'A conversation is only the beginning. The Customer Engagement Operations Center brings the information behind that conversation into a connected workspace, helping your people understand the relationship and continue the work.',
    capabilities: [
      ['Customer Resource Management', 'Keep customer and prospect information connected to the relationship.'],
      ['Lead Management', 'Organize captured opportunities and the details needed for follow-up.'],
      ['Customer 360', 'Bring customer context and engagement history into a connected view.'],
      ['Agent Workspace', 'Give authorized staff the information they need to continue the conversation.'],
      ['Admin Dashboard', 'Provide authorized administrators visibility into configured services and activity.'],
    ],
    steps: [['Connect the context', 'Bring customer details and captured inquiries into the operation.'], ['Understand the relationship', 'Review the information and engagement history available to your team.'], ['Continue the work', 'Use that context to guide follow-up and the next human decision.']],
    relationship: 'The foundation beneath the Sales and Support Specialist systems. Each specialist has a distinct role; the Operations Center connects that work with your people.',
    faqs: [
      {question: 'Is the Operations Center a product of its own?', answer: 'Yes. The Customer Engagement Operations Center is the foundational platform, with its own workspace and customer-management capabilities. The Sales and Support Specialist systems operate on top of it. Your consultation establishes the appropriate product configuration and commercial terms.'},
      {question: 'How do the specialist systems relate to the platform?', answer: 'The Sales Specialist handles sales inquiries; the Support Specialist focuses on customer support intake. The Operations Center provides the connected customer context and operational workspace behind those services. The configuration is established around your business requirements.'},
      {question: 'Can we expand over time?', answer: 'The product structure is designed to accommodate additional systems as they develop. Available capabilities, integrations, and rollout requirements are reviewed before any expansion is agreed.'},
    ],
  },
  {
    slug: 'sales-service-system', number: '02', short: 'Sales Specialist', category: 'INTELLIGENT SALES ENGAGEMENT',
    name: 'Sales Service System',
    headline: 'Your business may close. Your sales operation remains open 24/7.',
    description: 'An intelligent Sales Specialist engages inbound prospects, answers approved questions, and captures the details your people need to continue the relationship.',
    purpose: 'Turn the first conversation into a useful next step.',
    narrative: 'When employees are busy, the office is closed, or call volume exceeds available coverage, an inquiry still deserves attention. Establish a professional sales engagement process that keeps the conversation moving and gives your team context for follow-up.',
    capabilities: [
      ['Inbound sales engagement', 'Engage prospective customers during the coverage agreed for your business.'],
      ['Approved answers', 'Represent your business using the information and responses you approve.'],
      ['Opportunity capture', 'Collect contact details, service interests, and the reason for the inquiry.'],
      ['Connected follow-up', 'Give your people customer context through the Operations Center.'],
      ['Flexible call forwarding', 'Keep your existing number where technically compatible and control when calls are forwarded.'],
    ],
    steps: [['Engage the prospect', 'An intelligent Sales Specialist begins the conversation.'], ['Capture the opportunity', 'Collect the information and questions the prospect provides.'], ['Equip your people', 'Your team reviews the inquiry and continues the relationship.']],
    relationship: 'The Sales Specialist is the customer-facing sales service. The Customer Engagement Operations Center is the platform behind it, connecting the inquiry with customer context and human follow-up.',
    faqs: [] as {question:string;answer:string}[],
  },
  {
    slug: 'support-specialist', number: '03', short: 'Support Specialist', category: 'INTELLIGENT CUSTOMER SUPPORT',
    name: 'Support Specialist Service System',
    headline: 'A more considered beginning to customer support.',
    description: 'An intelligent Support Specialist gathers the customer’s concern and the details your support team needs to respond.',
    purpose: 'Bring structure and care to the first support conversation.',
    narrative: 'Customers want to be understood. Your people need a clear account of what happened. The Support Specialist service is being developed around structured intake, customer context, and a dependable handoff to the team responsible for helping.',
    capabilities: [
      ['Customer context', 'Gather the contact, product, or service details relevant to the support request.'],
      ['Structured issue intake', 'Understand the problem, its impact, and troubleshooting already attempted.'],
      ['Support case workflow', 'Configure how a request becomes a support record and receives a reference.'],
      ['Human handoff', 'Define escalation instructions and the information your team needs for follow-up.'],
      ['Connected operations', 'Build the support process around the Customer Engagement Operations Center.'],
    ],
    steps: [['Understand the concern', 'Collect the issue and relevant customer details.'], ['Organize the request', 'Follow the support intake workflow configured for the business.'], ['Prepare the handoff', 'Give the responsible team the context needed for follow-up.']],
    relationship: 'The Support Specialist sits on the same foundational Operations Center as the Sales Specialist, with a separate service role and support workflow.',
    faqs: [
      {question: 'What is the focus of the Support Specialist?', answer: 'The focus is understanding the customer’s concern, gathering relevant information, and preparing the next support step. It supports your people; it does not promise that every issue can be resolved during the initial conversation.'},
      {question: 'How are ticket creation and follow-up handled?', answer: 'Case creation, reference confirmation, staff notifications, and escalation are part of the service configuration and acceptance process. A record should only be confirmed after it has been successfully saved. Follow-up commitments must match your business’s actual support arrangements.'},
      {question: 'Can I discuss a Support Specialist deployment?', answer: 'Yes. Request a consultation to review your support workflow and current deployment readiness. Features, integrations, and availability are confirmed for your configuration before launch.'},
    ],
  },
] as const;
export type MarketingProduct = typeof products[number];
export const productHref = (slug: string) => `${PRODUCT_ROOT}/${slug}`;
