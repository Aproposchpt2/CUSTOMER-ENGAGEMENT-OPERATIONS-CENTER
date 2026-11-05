-- Applied to STELLAR staging 2026-10-25: 39 Sales and 7 internal platform Support source drafts.
-- This is replayable and idempotent; never caller-eligible and never Summit-tenant platform content.
WITH input(tenant_id,title,category,content,tags) AS (VALUES
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-02] Existing business telephone number','sales_source_review_draft','Customers generally do not have to abandon the telephone number their customers already know. The customer''s existing telephone environment can forward selected calls into the Intelligent Customer Engagement Operation Center. Coverage can be configured around the customer''s operating requirements, for example:

- All calls
- After-hours calls
- No-answer calls
- Busy calls
- Overflow calls
- Weekend calls
- Holiday calls
- Peak-volume coverage

**Approved sales explanation:** "You can keep the business number your customers already know. The Intelligent Customer Engagement Operation Center can be placed behind your existing telephone environment so selected calls receive intelligent handling without requiring you to rebuild your public-facing telephone identity."

Do not promise compatibility with a particular carrier or telephone system unless it has been confirmed.',ARRAY['stellar','staging','source-review','SALES-SRC-02','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-03] Intelligent conversational call handling','sales_source_review_draft','The system supports natural-language customer conversations rather than requiring every caller to navigate a traditional press-1/press-2 telephone tree. The conversational experience can:

- Greet callers
- Determine why they are calling
- Ask appropriate follow-up questions
- Capture structured information
- Answer approved business questions
- Recognize customer intent
- Determine an appropriate next action
- Route or escalate calls according to configured business rules

The conversational experience is configured around the individual customer''s business rather than using one generic script for every company.',ARRAY['stellar','staging','source-review','SALES-SRC-03','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-04] Business-specific configuration','sales_source_review_draft','Each customer environment can be configured around the organization''s actual operation, including:

- Company identity
- Business terminology
- Operating hours
- Services
- Frequently asked questions
- Service areas
- Intake questions
- Departments
- Transfer destinations
- Queues
- Escalation criteria
- Routing rules
- After-hours rules
- Holiday behavior
- Fallback procedures
- Approved business policies
- Customer-specific knowledge

The objective is to create an intelligent customer-engagement environment that represents the customer''s operation.',ARRAY['stellar','staging','source-review','SALES-SRC-04','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-05] Structured customer intake','sales_source_review_draft','During a conversation, the system can collect structured information appropriate to the customer''s business. Depending on the configured workflow, this may include:

- Caller name
- Telephone number
- Email address
- Company
- Location
- Reason for calling
- Service requested
- Urgency
- Preferred callback information
- Additional notes

Questions can change according to the caller''s previous answers, so the system does not have to force every caller through the same questionnaire.',ARRAY['stellar','staging','source-review','SALES-SRC-05','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-06] Intent recognition','sales_source_review_draft','The system can identify the general purpose of a customer interaction and use it to determine subsequent handling. Examples:

- New customer inquiry
- Existing customer request
- Service request
- Scheduling requirement
- Sales inquiry
- Billing-related inquiry
- Maintenance request
- Urgent matter
- After-hours request
- Request for a department
- Request for a human representative

Configured business rules determine what happens after the intent is identified.',ARRAY['stellar','staging','source-review','SALES-SRC-06','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-07] After-hours and overflow coverage','sales_source_review_draft','The system can provide customer-engagement coverage when normal staff are unavailable:

- After-hours
- No-answer
- Busy
- Overflow
- Weekends
- Holidays
- Peak-volume periods

During these periods, the system can continue answering customers, collecting information, identifying potential leads, answering approved questions and applying configured routing or escalation procedures.

**Business value:** prevent valuable customer interactions from becoming unanswered calls or generic voicemail-only experiences merely because an employee was unavailable at that moment.',ARRAY['stellar','staging','source-review','SALES-SRC-07','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-08] Human transfer and escalation','sales_source_review_draft','The Intelligent Customer Engagement Operation Center is designed to work with human personnel rather than requiring every interaction to remain automated. Calls can be routed or escalated according to configured rules.

Potential destinations:

- Individual staff members
- Departments
- Operational queues
- Designated telephone destinations
- Urgent-response destinations

Routing can take into account:

- Caller intent
- Urgency
- Business hours
- Department
- Staff availability
- Customer-defined business rules

If the primary destination is unavailable, configured fallback behavior can be used.

Never promise a specific transfer behavior until that customer''s routing configuration has been established.',ARRAY['stellar','staging','source-review','SALES-SRC-08','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-09] Human + intelligent operating model','sales_source_review_draft','The product should not be positioned as simply replacing employees. The intended operating model:

INTELLIGENT CONVERSATION → STRUCTURED BUSINESS INFORMATION → OPERATIONAL RECORD → HUMAN REVIEW/ACTION WHEN REQUIRED

The conversational layer increases customer-engagement capacity. Human staff retain responsibility for business decisions and work requiring human judgment or intervention.

**Approved objection response — "Will this replace my employees?"** "The system is designed to support your staff by handling appropriate customer conversations, repetitive intake, after-hours coverage and routing. Your team remains part of the operating model and handles the work and decisions that require human involvement."',ARRAY['stellar','staging','source-review','SALES-SRC-09','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-10] Lead capture','sales_source_review_draft','Qualified customer conversations can become structured lead records. The system can preserve information gathered during the conversation so a valuable inquiry does not have to end as:

- A handwritten note
- An isolated voicemail
- An employee''s memory
- An untracked telephone inquiry

The lead can then enter the business''s operational workflow.

CAPTURE THE CONVERSATION. CREATE THE OPPORTUNITY. ORGANIZE THE FOLLOW-UP.',ARRAY['stellar','staging','source-review','SALES-SRC-10','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-11] Lead management','sales_source_review_draft','Lead records can support operational information such as:

- Pipeline stage
- Priority
- Assigned personnel
- Lead score
- Next action
- Follow-up date
- Activities
- Tasks
- Notes
- Commercial information where authorized

The business can therefore manage the opportunity beyond the original conversation.',ARRAY['stellar','staging','source-review','SALES-SRC-11','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-12] Activities and tasks','sales_source_review_draft','The platform supports activities associated with customer and lead workflows. Activities preserve evidence of what has occurred. Tasks provide visible future work. Task states:

- Pending
- In progress
- Completed
- Cancelled

This creates continuity between the original customer conversation and the work that needs to occur afterward.',ARRAY['stellar','staging','source-review','SALES-SRC-12','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-13] Customer 360','sales_source_review_draft','Customer 360 provides a consolidated operational view of the customer relationship. Depending on the available records, personnel can review relationships among:

- Contacts
- Interactions
- Leads
- Activities
- Tasks
- Customer history

The objective is to reduce fragmented customer information and give personnel broader context when responding to the customer.',ARRAY['stellar','staging','source-review','SALES-SRC-13','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-14] Interaction management','sales_source_review_draft','Customer communications can become persistent operational interaction records, including:

- Channel
- Direction
- Status
- Customer relationship
- Routing relationships
- Supporting conversation information

The customer interaction therefore does not have to disappear when the telephone call ends.',ARRAY['stellar','staging','source-review','SALES-SRC-14','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-15] Voicemail operations','sales_source_review_draft','The platform includes voicemail handling as part of the broader customer-engagement environment. Voicemail can be reviewed operationally rather than existing only as an isolated telephone mailbox. Available workflow can include:

- Message review
- Recording information
- Transcript information where available
- Callback status
- Resolution status
- Connection to the underlying interaction',ARRAY['stellar','staging','source-review','SALES-SRC-15','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-16] Queues and routing','sales_source_review_draft','The platform supports queue-based customer handling. Customer demand can be organized around:

- Departments
- Functions
- Teams
- Service types
- Operational groups

Routing can use information gathered during the interaction to determine where the customer should be directed.',ARRAY['stellar','staging','source-review','SALES-SRC-16','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-17] Customer operating dashboard','sales_source_review_draft','Customers receive an operating environment rather than merely a telephone agent. Operational surfaces can include:

- Customer interactions
- Leads
- Contacts
- Activities
- Tasks
- Customer 360
- Agent workspace
- Queues
- Users
- Voicemail
- Voice operations
- Analytics

The precise modules available to a customer depend on the deployed configuration and service entitlement.',ARRAY['stellar','staging','source-review','SALES-SRC-17','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-18] Voice operations and analytics','sales_source_review_draft','The system provides operational visibility into voice activity. Documented capabilities include operational review of:

- Call activity
- Interaction results
- Routing
- Demand patterns
- Queue activity
- Caller needs
- Operational workload

Conversation transcripts may also support:

- Post-call review
- Lead verification
- Quality review
- Troubleshooting

Do not promise a specific automated quality-assurance or compliance function unless that exact production capability has been validated.',ARRAY['stellar','staging','source-review','SALES-SRC-18','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-19] Customer knowledge','sales_source_review_draft','Customer-approved information can be loaded into the conversational environment, for example:

- Frequently asked questions
- Services
- Business hours
- Service areas
- Business policies
- Basic approved pricing information
- Operating procedures
- Routing information

The objective is to ground customer-facing responses in approved business information and reduce unsupported responses.',ARRAY['stellar','staging','source-review','SALES-SRC-19','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-20] Multi-tenant customer environment','sales_source_review_draft','The platform is designed to support multiple customer organizations while separating their business information and operational authority. The architecture includes:

- Tenant-aware customer environments
- User membership
- Role-aware access
- Tenant-specific configuration
- Authentication
- Data-access controls
- Tenant-specific intake authorization

Customer-facing sales conversations should describe this as a secure, customer-specific operating environment, without unnecessarily exposing implementation details.

Never make regulatory or security certifications that have not been formally approved.',ARRAY['stellar','staging','source-review','SALES-SRC-20','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-21] Customer users and roles','sales_source_review_draft','Authorized customer personnel can access the customer''s operating environment. Different roles can have different operational authority, so employees can participate in customer operations without every user having unrestricted administrative control. Exact permissions depend on the deployed configuration.',ARRAY['stellar','staging','source-review','SALES-SRC-21','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-22] Onboarding','sales_source_review_draft','Implementation begins by understanding the customer''s business operation. Onboarding can collect:

- Business identity
- Telephone environment
- Operating hours
- Departments
- Staff
- Transfer numbers
- Services
- Frequently asked questions
- Customer-call patterns
- Escalation requirements
- Compliance considerations
- Desired coverage model

A customer-specific environment can then be configured.',ARRAY['stellar','staging','source-review','SALES-SRC-22','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-23] Implementation process','sales_source_review_draft','BUSINESS DISCOVERY → CUSTOMER CONFIGURATION → KNOWLEDGE LOADING → CALL-FLOW BUILD → INTERNAL TESTING → CUSTOMER TESTING/TRAINING → FORWARDING ACTIVATION → SOFT LAUNCH → REVIEW → GO-LIVE ACCEPTANCE

The initial rollout may use a narrower coverage model, such as after-hours or no-answer handling, before broader call coverage is activated.

Do not promise an exact implementation duration until an approved commercial implementation timeline has been established.',ARRAY['stellar','staging','source-review','SALES-SRC-23','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-24] Keep-your-number implementation','sales_source_review_draft','The customer can receive a dedicated service destination for the intelligent call-handling layer. The customer''s existing public telephone number can then forward calls according to the agreed strategy. This preserves the established number while adding the Intelligent Customer Engagement Operation Center behind it.',ARRAY['stellar','staging','source-review','SALES-SRC-24','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-25] Target business problems','sales_source_review_draft','The product is particularly relevant when a business experiences:

- Missed calls
- After-hours customer demand
- Overloaded employees
- Repetitive customer questions
- Lost leads
- Excessive transfers
- Slow follow-up
- Voicemail backlog
- High inbound call pressure
- Inconsistent intake
- Difficulty routing callers
- Lack of customer-interaction visibility

The sales agent should discover whether these conditions exist rather than assume that they do.',ARRAY['stellar','staging','source-review','SALES-SRC-25','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-26] Initial demonstration markets','sales_source_review_draft','**Property management:**

- Leasing inquiries
- Resident questions
- Maintenance requests
- Vendor calls
- After-hours calls
- Emergency escalation
- Multi-property routing

**Home / field services:**

- Appointment inquiries
- Service requests
- Dispatch-related intake
- Estimate inquiries
- Urgent service calls
- After-hours calls

**Automotive service operations:**

- Appointment requests
- Service inquiries
- Status requests
- Service-department routing

The demonstration should adapt to the prospect''s actual business rather than forcing every prospect into these examples.',ARRAY['stellar','staging','source-review','SALES-SRC-26','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-27] Core business outcomes','sales_source_review_draft','Sell around operational outcomes rather than technical infrastructure:

- Answer more customer inquiries
- Capture more opportunities
- Reduce missed-call exposure
- Automate structured intake
- Route customer needs
- Organize follow-up
- Create visible tasks
- Preserve customer history
- Build Customer 360
- Support human personnel
- Reduce operational call pressure
- Create a systematic path from conversation to business action

Do not guarantee financial results or specific revenue improvements.',ARRAY['stellar','staging','source-review','SALES-SRC-27','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-28] Approved demo-led sales concept','sales_source_review_draft','The prospect is already interacting with the technology being demonstrated.

**Approved statement:** "You don''t have to imagine what the conversational experience would be like. You''re experiencing it right now."

After discovery, the agent transitions into a relevant scenario, for example: "Suppose I were answering for your company after 6 PM. What are the three most common reasons customers call you?" The agent then demonstrates an appropriate interaction.

The purpose is to create the realization: "This could answer my customers."',ARRAY['stellar','staging','source-review','SALES-SRC-28','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-29] Approved objection knowledge','sales_source_review_draft','| Objection | Approved response |
| --- | --- |
| "We already have a phone system." | "The Intelligent Customer Engagement Operation Center is designed to work with an existing telephone environment. In many deployments, the business keeps its established number and forwards selected calls into the intelligent handling environment." |
| "We use voicemail." | "Voicemail can capture a message, but the Intelligent Customer Engagement Operation Center can engage the caller, determine what they need, collect structured information and create an operational next step." |
| "My employees already answer the phones." | "The system can complement your employees by providing coverage when they are unavailable, handling repetitive intake and helping organize information and follow-up." |
| "I don''t want to change my number." | "You generally don''t have to. Keeping the number your customers already know is one of the core implementation strategies." |
| "Can it work after hours?" | "Yes. After-hours handling is a documented core use case. The specific behavior is configured around your business rules." |
| "Can callers reach a real person?" | "The system supports human transfer and escalation. The exact transfer destinations, hours and fallback behavior are configured for the individual business." |
| "What happens when it can''t answer something?" | "It should not invent an answer. The environment is configured around approved business knowledge and escalation rules so questions outside that authority can be routed or captured for human follow-up." |
| "Is this just an answering service?" | "No. Intelligent call handling is the front end of the system. The platform can also create operational records, capture leads, organize activities and tasks, maintain customer context, support routing and provide an operating dashboard." |
| "Will this replace my staff?" | "The intended model combines intelligent customer engagement with human operations. It can reduce repetitive workload and extend coverage while your staff continues handling the work and decisions that require people." |
| "Can it handle more than one call at a time?" | "Yes. It can answer multiple callers at the same time, so callers aren''t stuck waiting for a free line. Expected call volume is part of onboarding." |
| "Is this difficult to install?" | "No. Setup is a managed service: our team configures and tests everything. Your part is sharing how your business runs and turning on call forwarding with your phone provider once testing is approved." |
| "How quickly can we get started?" | "Typically one to two weeks after we receive your information." Then describe the steps: discovery, configuration, testing, forwarding, soft launch. |
| "Can it integrate with our existing systems?" | "Captured leads, tasks and customer history live in your own operating dashboard. Connections to other specific systems are confirmed case by case, so I''ll have a specialist follow up on the systems you use." Never confirm a named integration. |
| "Can I change the greeting or answers myself?" | "Changes are handled through our managed change process: you tell us what to update, and we make and test the change so your live calls don''t break." |
| "What happens if I cancel?" | "It''s month to month and you can cancel anytime." For the cancellation steps, data export or switching your forwarding back, a specialist follows up. |
| "How much does it cost?" | See section 35: "$1,200 per month, and you can cancel anytime." Anything beyond that (setup, discounts, custom pricing, trials) is escalated. |',ARRAY['stellar','staging','source-review','SALES-SRC-29','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-30] Information the sales agent must not invent','sales_source_review_draft','Until explicitly approved in section 35, the agent must not invent or independently determine:

- Setup fee
- Custom pricing
- Discounts
- Trial terms
- Pilot terms
- Guaranteed implementation time
- Guaranteed savings
- Guaranteed revenue improvement
- Regulatory compliance guarantees
- Security certifications
- Unsupported integrations
- Future product availability
- Custom contractual commitments
- Plan names or tiers, volume discounts, or any usage terms beyond section 35
- User-seat limits
- Supported phone providers or phone systems, and provider-specific forwarding steps
- Calendar booking directly into the customer''s scheduling system (see section 41)
- Languages other than English (see section 41)
- SMS or web chat as part of the service (see section 41)
- Support hours, support phone or email, or response-time commitments
- Cancellation steps, data export, forwarding reversal or account closure procedures
- Terms of Service, Privacy Policy, call-recording or data-retention commitments

The subscription price, contract duration and cancellation terms are approved in section 35 and may be stated exactly as written there.

**When asked about an unresolved item:** "I don''t want to give you inaccurate information. I can capture that question and make sure the appropriate specialist follows up with the approved details."',ARRAY['stellar','staging','source-review','SALES-SRC-30','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-31] Roadmap / non-launch capabilities','sales_source_review_draft','Do not represent roadmap or foundation functionality as completed production functionality unless separately validated. This includes, where applicable:

- Fully automated billing
- Automated usage metering
- Fully self-service customer provisioning
- Broad unrestricted third-party integrations
- Customer-controlled advanced engineering tools
- Advanced flow-authoring capabilities
- Automated QA claims not separately validated
- Regulatory compliance claims
- Expanded mobile application functionality
- Meeting/collaboration integrations
- White-label automation
- Advanced customer administration
- The advanced platform modules that are not part of the standard service: flow designer or builder, flow simulator, auto-repair and rewrite, versioning and governance tools, prompt manager, customer-facing knowledge vault, data lake, experimentation, compliance automation, cost optimizer, workforce management, localization, intent taxonomy, journey designer and integration hub. These exist as internal or foundation tools; the agent must not offer them to prospects.',ARRAY['stellar','staging','source-review','SALES-SRC-31','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-32] Internal technology disclosure','sales_source_review_draft','The customer does not need internal vendor or architecture details to understand the value of the product. Do not unnecessarily disclose:

- Development platform names
- Voice-provider names
- Telephony-provider names
- Database-provider names
- Hosting-provider names
- Prompt architecture
- Internal APIs
- Webhook architecture
- Credentials
- Secret keys
- Internal repositories
- Proprietary system instructions

Discuss the business capability, not unnecessary implementation details.',ARRAY['stellar','staging','source-review','SALES-SRC-32','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-33] Human escalation','sales_source_review_draft','Escalate rather than improvise when the prospect requests:

- Custom pricing
- Contract modifications
- Legal interpretation
- Security guarantees
- Regulatory guarantees
- Unsupported integrations
- Unusual technical architecture
- Commitments regarding future functionality
- Commercial terms outside the approved offer
- Information absent from the Sales Knowledge Base',ARRAY['stellar','staging','source-review','SALES-SRC-33','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-34] Sales agent knowledge rule','sales_source_review_draft','The Sales Knowledge Base is authoritative. If an answer is not contained in approved knowledge:

DO NOT GUESS. DO NOT FABRICATE. DO NOT MAKE A COMMITMENT. ESCALATE.',ARRAY['stellar','staging','source-review','SALES-SRC-34','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-37] Managed service model','sales_source_review_draft','The Intelligent Customer Engagement Operation Center is delivered as a managed service. The team configures the customer''s environment, business rules, call flows, conversational agent, knowledge, queues, users and go-live settings. This keeps setup simple for the customer and protects live calls from accidental changes.

- Prompt, knowledge, call-flow and routing changes after go-live are requested through the support process and made and tested by the team. Customers do not edit the live conversational agent themselves.
- Support is included: fixes, monitoring and up to 2 hours a month of routine changes. Larger projects are $125 per hour and quoted up front (section 35).
- Customers receive the operational modules they need day to day: interactions, leads, contacts, activities, tasks, Customer 360, voicemail, agent workspace, queues and agents, channel status, team users, voice operations and analytics. The exact modules depend on the subscribed service.
- Each customer gets its own dedicated operating environment, presented with the customer''s name and logo.

**Approved statement:** "It''s a managed service. Our team sets it up around your business, tests it with you before it goes live, and handles changes afterwards, so you get the results without having to run the technology."',ARRAY['stellar','staging','source-review','SALES-SRC-37','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-38] What we''ll need from the customer (onboarding checklist)','sales_source_review_draft','Use this when a prospect asks "What do you need from me?" or "How do we get started?". Mention only the few items that matter to the caller; never read the list aloud.

- **Business details:** business name, main contact, website, address, industry, service area, rough monthly call volume, and why they want the service.
- **Phone setup:** current business number(s), phone provider and system, which calls to forward (all calls, after hours, no answer or overflow), business hours, holiday and closure rules, after-hours and emergency procedures, human transfer numbers, and the voicemail or fallback procedure.
- **The conversation:** preferred assistant name, opening greeting, tone and voice, business description, services, FAQs, what the agent may and must not say, required intake and qualification questions, special terms and pronunciations, and languages needed.
- **Routing and follow-up:** departments, which calls need a person, primary and secondary escalation contacts, what counts as urgent, what a qualified lead is, required lead information, who follows up, and who should be notified and how.
- **Dashboard access:** the administrator, other authorized users and their roles, and which modules they need.',ARRAY['stellar','staging','source-review','SALES-SRC-38','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-39] Validation, go-live and after go-live','sales_source_review_draft','- **Configuration review:** before activation, the customer reviews and approves business identity and hours, the greeting and tone, knowledge and FAQs, intake questions, routing and transfer rules, escalation contacts, lead-capture requirements, dashboard users and permissions, notification destinations and the call-forwarding plan.
- **Acceptance testing:** test calls check the greeting, need recognition, intake capture, human transfer and routing, lead creation, Customer 360 update, task creation, notification delivery, dashboard access, the after-hours scenario and a failure or fallback scenario.
- **Go-live authorization:** the customer signs off only after the agreed tests pass. Then the customer turns on the approved forwarding rule with their phone provider, a controlled live call confirms the path, and the service goes active.
- **Soft launch:** many customers start with after-hours or no-answer calls first. Early calls, leads, voicemails and routing are reviewed and refined before coverage expands.
- **After go-live:** early calls are monitored for refinements; changes to hours, greetings, FAQs, routing or users go through the support process; the customer keeps escalation contacts and business information current and works leads, tasks and follow-up in the dashboard.

**Approved statement:** "Nothing goes live until you''ve heard it, tested it and signed off on it."',ARRAY['stellar','staging','source-review','SALES-SRC-39','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-40] Responsibilities','sales_source_review_draft','- **The customer** provides accurate business information and call-handling rules, keeps escalation contacts current, gives access to its own phone-provider settings where forwarding is needed, approves the configured experience on time, and remains responsible for its own business decisions, staff actions and industry obligations.
- **Apropos Group LLC** configures the service from the approved onboarding record, provisions the customer''s environment, validates the agreed workflows, provides the dashboard, and runs the service under the applicable commercial and support terms.',ARRAY['stellar','staging','source-review','SALES-SRC-40','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-41] Scope limits to state carefully','sales_source_review_draft','These are common prospect questions where the honest answer is narrower than the brief''s full vision. The agent answers exactly this way.

| Topic | What the agent may say | What it must not say |
| --- | --- | --- |
| Appointments | The agent can take appointment and scheduling requests and capture the details for the customer''s team to confirm. | That it books directly into the customer''s calendar or scheduling software. Scheduling scope for launch is not final; a specialist confirms. |
| Languages | The service is configured and tested in English. | That other languages are available. Other languages go to a specialist. |
| SMS and web chat | The service centers on phone calls. | That text messaging or web chat is included. A specialist follows up. |
| Notifications | Captured leads, voicemails and tasks appear in the customer''s dashboard; who gets notified, and whether by email or text, is set up during onboarding. | Instant alerts, specific response times, or that notifications already work for them. |
| Mobile | The operating dashboard runs in a web browser. | That there is a mobile app. A mobile experience is on the roadmap. |
| Usage | 2,000 minutes a month included; $0.40 per additional minute (section 35). | That usage is unlimited. Volume discounts or larger plans go to a specialist. |
| Phone providers | Most businesses keep their number and forward calls from their current provider. | That a specific carrier or phone system is supported. Confirmed during onboarding. |
| Multiple locations | Routing can be configured by department, location or purpose. | A number of locations or numbers included in the price. A specialist follows up. |',ARRAY['stellar','staging','source-review','SALES-SRC-41','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SALES-SRC-42] Value statements (approved)','sales_source_review_draft','Use one, in the caller''s own terms, after the prospect has named the problem:

- Enterprise-style call handling for businesses that don''t want to run a traditional call center.
- Callers reach an intelligent front door immediately instead of waiting for someone to be free.
- The same intake standard on every call, including nights, weekends, overflow and staffing gaps.
- Coverage starts behind the number customers already know, so nothing public-facing has to change.
- It grows with the business: more numbers, users, queues and departments can be added.

Never quantify savings or revenue.',ARRAY['stellar','staging','source-review','SALES-SRC-42','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SUPPORT-SRC-01] Executive decision and product identity','support_platform_review_draft','**Parent:** Stellar Unified Communications (Stellar UC), Apropos Group LLC. **Flagship:** Intelligent Customer Service Operation Center. **Functional product/workstream:** Customer Support Service System (CSS), also described as Intelligent Service Response System. The earlier AI4 Contact Center and Sales Specialist concepts preceded this product direction. **Externally use “Intelligent” or “Intelligence,” not “AI.”** The Sales Specialist remains a separate, preserved capability; do not delete or regress it.

**Approved flagship outcomes:** 24/7/365 inbound customer engagement; existing-number continuity; multiple concurrent calls; intelligent intake and issue triage; service request creation; emergency/urgent escalation; verifiable employee notification; tenant administrative dashboard; comprehensive customer lifecycle records; transparent Usage-Based Pricing (UBP). These are PRODUCT REQUIREMENTS, not all proven production capabilities. Initial commercial targets: HVAC, plumbing, electrical, restoration and related field services; architecture must remain horizontal for other industries. For field services, use the tenant''s actual role title (technician, dispatcher, service manager), not universally “engineer.”

**Proposed marketing message (not unconditional claim until acceptance):** “YOUR BUSINESS MAY CLOSE. YOUR CUSTOMER SERVICE OPERATION REMAINS OPEN 24/7.” / “KEEP YOUR NUMBER. ADD THE INTELLIGENCE.” Customer-facing UBP copy: customers pay for services delivered, not unused capacity; lower usage means lower charges. Never discuss Apropos receiving payment in customer-facing copy.',ARRAY['stellar','staging','source-review','SUPPORT-SRC-01','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SUPPORT-SRC-08] Full CSS customer interaction design','support_platform_review_draft','1. Answer in tenant-branded voice and identify purpose. Honor consent/recording requirements and supported languages.
2. Recognize/identify customer with minimum necessary information; securely consult permitted tenant-specific lifecycle records when available.
3. Gather name, callback number, email if available, service address and ZIP, problem category, affected equipment/location, symptoms, safety risk, actions tried, preferred callback window and impact. Ask one question at a time.
4. Detect urgent and dangerous situations. For fire, gas smell, shock or immediate danger: direct caller to emergency services or relevant utility/emergency responder; never imply emergency dispatch without a verified integration.
5. Read back critical fields; create idempotent service request and wait for actual DB success.
6. Resolve the tenant''s configured service recipient/escalation chain. Send notification only to an approved test recipient during staging. Persist provider acknowledgment, delivery status and failures; use safe retry/deduplication.
7. Tell caller the real case reference; say staff were notified only if delivery is verified. State callback timing only when supported by the tenant''s SLA and operational capacity. Otherwise provide truthful next-step language.
8. Expose lifecycle: open → acknowledged → assigned → in progress → resolved → closed; timestamp all transitions, interactions, notification attempts and human updates.',ARRAY['stellar','staging','source-review','SUPPORT-SRC-08','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SUPPORT-SRC-09] Platform architecture and security requirements','support_platform_review_draft','**Logical flow:** Customer''s existing number → telephony routing (production design; verify carrier configuration) → tenant resolution → voice runtime → tenant-scoped customer lookup/intake → authenticated transaction API → Supabase contact/case → notification queue/provider → tenant admin dashboard → status updates and analytics.

**Isolation:** Every query/write scoped to authenticated tenant; RLS enforced and independently tested; service-role credentials only server-side; never trust client tenant ID without membership checks; audit cross-tenant denial. **Secrets:** OPENAI_API_KEY, access codes, Supabase keys and provider credentials must never appear in documentation, chat or client bundles. Environment variable *names* may be documented; values must not. Protect private POC with Netlify team SSO and app-level access controls. Prevent replay and duplicates; validate origins; apply rate limits; protect webhooks; audit notification access.

**Privacy/compliance:** Define lawful call-recording consent by jurisdiction, retention and deletion schedules, customer access/erasure process, vendor DPAs, incident response, business associate/regulated-sector limitations where relevant. Do not collect payment credentials, passwords or sensitive medical data in general support flows. Do not assume every customer interaction should retain audio: store minimal necessary structured records and use optional recordings under approved policy.

**Resilience:** Graceful fallback for model/telephony/database/notification outages, human handoff, retry with idempotency, incident logs, monitoring, backup/restore and rollback. Concurrent-call claims require actual load tests and carrier/provider quotas.',ARRAY['stellar','staging','source-review','SUPPORT-SRC-09','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SUPPORT-SRC-10] Admin dashboard and lifecycle','support_platform_review_draft','**MVP dashboard:** New/open cases, urgency, assignment, contact details, service location, caller transcript summary (where authorized), case timeline, notification status, response SLA, search/filter, status updates, role-based tenant users, and audit trail. **Operational analytics:** calls offered/answered, concurrent peaks, duration, completion rate, escalation rate, case save success, notification success, time-to-acknowledge, time-to-resolution, cost/usage by tenant. **Usage meter:** estimated invoice, projected month-end, days remaining, platform/voice/SMS/other delivered service categories, billing reconciliation. Do not display fabricated estimates as invoices.',ARRAY['stellar','staging','source-review','SUPPORT-SRC-10','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SUPPORT-SRC-11] Release gates and production migration plan','support_platform_review_draft','**Gate 0 — continuity:** Master record versioned in GitHub and Drive; next engineer can identify branch, deployments, schemas, failures, owners and rollback. **Gate 1 — transactional:** Confirm actual staging case + contact + spoken case ID. **Gate 2 — notification:** Tenant routing, delivery acknowledgment, failures/retries and caller-safe language. **Gate 3 — operations:** Realistic multi-call tests, RLS/security/privacy review, error handling and emergency flows. **Gate 4 — commercial:** Tenant onboarding, dashboard, measured usage, billing/pricing terms, support runbooks. **Gate 5 — controlled release:** Owner signs off migration, backup, production migration scripts, feature flags, smoke tests, rollback and pilot tenant.

**Production procedure (not yet authorized):** Freeze verified staging revision; inventory diffs; take tested backup; prepare reversible schema migrations; stage environment variables in secret store; deploy behind feature flag to production with zero disruption to existing Sales Specialist/production site; provision pilot tenant and routing; verify data isolation, case creation, notification, dashboard and metering; monitor error budget; rollback on failure; obtain owner acceptance. Never copy fictional staging contacts/cases into production.',ARRAY['stellar','staging','source-review','SUPPORT-SRC-11','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SUPPORT-SRC-13] Client onboarding specification','support_platform_review_draft','**Discovery:** legal business identity, authorized owner/admin, service locations and ZIP coverage, time zone, business hours, service categories, emergency rules, response SLA, approved phrases, staff roster, notification channels, privacy/recording requirements, existing phone provider/number and transfer policy, billing contact. **Provision:** tenant record, roles/RLS, verified number forwarding/porting choice, knowledge base and agent persona, service address validation, intake form schema, case routing and escalation, dashboard roles, notification recipients and test channel. **Acceptance:** tenant-specific fictional call, normal and urgent case, DB record, delivered notification, dashboard display, failed-delivery fallback, multi-call test, customer approval and operator guide. **Go-live:** signed order/terms, pricing disclosure, support contacts, escalation, usage alerts, rollback and periodic quality review. Never promise immediate callback without an enforceable SLA.',ARRAY['stellar','staging','source-review','SUPPORT-SRC-13','source-package-20261025-v1']::text[]),
('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'[SOURCE-REVIEW SUPPORT-SRC-14] Acceptance test matrix and evidence requirements','support_platform_review_draft','**AT-01** Natural voice call and correct tenant persona. **AT-02** Accurate required fields and confirmation. **AT-03** Staging contact created or correctly matched. **AT-04** Case created once with true DB ID. **AT-05** Spoken ID matches DB. **AT-06** Notification accepted/delivered to configured test recipient. **AT-07** Agent distinguishes saved vs notified vs callback promised. **AT-08** Urgent safety escalation. **AT-09** Failed database write is disclosed; no fabricated confirmation. **AT-10** Failed notification is disclosed and logged. **AT-11** Duplicate/retry idempotency. **AT-12** Tenant A cannot read/write tenant B. **AT-13** Simultaneous calls within measured limit. **AT-14** Dashboard timeline and roles. **AT-15** Usage meter matches provider/source records. **AT-16** Rollback and incident recovery.

For each test record: test ID, date/time UTC, commit SHA, Netlify deploy ID, staging tenant, test-only session ID, sanitized request/response event types, database case/contact IDs (only in private engineering evidence), provider notification ID/status, expected/actual, PASS/FAIL and tester sign-off. Never publish OTPs, API keys, real customer PII or raw voice content in public repo.',ARRAY['stellar','staging','source-review','SUPPORT-SRC-14','source-package-20261025-v1']::text[])
)
INSERT INTO public.ai4cc_knowledge_entries(tenant_id,title,category,content,tags,visibility,approved,source_status,scope,audience_scope,publication_state,version_num)
SELECT tenant_id,title,category,content,tags,'staff',false,'UNKNOWN','tenant','staff','draft',1
FROM input WHERE NOT EXISTS(SELECT 1 FROM public.ai4cc_knowledge_entries k WHERE k.tenant_id=input.tenant_id AND k.title=input.title);
