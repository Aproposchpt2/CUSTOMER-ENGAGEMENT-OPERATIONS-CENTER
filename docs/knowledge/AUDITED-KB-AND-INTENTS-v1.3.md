# Audited Sales and Support knowledge and intent package v1.3

This companion supersedes action mappings and generic examples in the uploaded source documents for staging guidance. Original IDs and intent names are preserved. The source DOCX files are retained unchanged. No business action is enabled by this package. All scenario tests are authored specifications until executed against the relevant system.

## SAL-001 identify_purpose

Agent: sales. Domain: Opening and consent. Handling: capture. Risk: NORMAL.

Caller example: I want to know whether this could help my business.

Ask what prompted the call and what outcome matters; do not begin a qualification interrogation before understanding the request.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-002 capture_name

Agent: sales. Domain: Opening and consent. Handling: capture. Risk: NORMAL.

Caller example: My name is Jordan Lee.

Capture the caller's stated name; confirm pronunciation if needed. A name alone is not identity verification.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-003 language_preference

Agent: sales. Domain: Opening and consent. Handling: capture. Risk: NORMAL.

Caller example: Can we speak Spanish?

Ask the preferred language; offer only configured language support and escalate unavailable language needs without pretending fluency.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-004 recording_disclosure

Agent: sales. Domain: Opening and consent. Handling: consent. Risk: HIGH.

Caller example: Is this call being recorded?

Use the channel's approved disclosure and consent policy. Never submit a business profile merely because recording was discussed.

Proposed business interfaces: consent.record. Enabled business actions: none.

## SAL-005 permission_to_continue

Agent: sales. Domain: Opening and consent. Handling: consent. Risk: HIGH.

Caller example: I only have a minute; go ahead.

Respect permission and time limits; stop the sales discussion if consent is withdrawn.

Proposed business interfaces: consent.record. Enabled business actions: none.

## SAL-006 company_profile

Agent: sales. Domain: Business discovery. Handling: capture. Risk: NORMAL.

Caller example: We operate a small family business.

Collect the actual business name and useful profile details; separate real company facts from role-play.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-007 industry

Agent: sales. Domain: Business discovery. Handling: capture. Risk: NORMAL.

Caller example: We repair roofs.

Capture the industry in the caller's own terms; do not infer credentials or services.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-008 locations

Agent: sales. Domain: Business discovery. Handling: capture. Risk: NORMAL.

Caller example: We have three branches.

Clarify locations and coverage needs without assuming every location has the same policy.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-009 hours

Agent: sales. Domain: Business discovery. Handling: capture. Risk: NORMAL.

Caller example: Our office closes at five.

Capture current hours and timezone; distinguish the prospect's hours from Stellar service availability.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-010 staffing_model

Agent: sales. Domain: Business discovery. Handling: capture. Risk: NORMAL.

Caller example: Two employees answer our phones.

Understand staffing and responsibilities without recommending layoffs or inventing labor costs.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-011 current_call_flow

Agent: sales. Domain: Business discovery. Handling: capture. Risk: NORMAL.

Caller example: Calls go to voicemail when everyone is busy.

Map existing busy, no-answer, overflow and after-hours paths; do not change routing during discovery.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-012 current_tools

Agent: sales. Domain: Business discovery. Handling: capture. Risk: NORMAL.

Caller example: We already use a CRM.

Record the system name and desired use; named compatibility requires technical confirmation.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-013 volume

Agent: sales. Domain: Business discovery. Handling: capture. Risk: NORMAL.

Caller example: We receive about eighty calls a day.

Capture period, counts, average duration and concurrency where known; estimates remain labeled estimates.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-014 seasonality

Agent: sales. Domain: Business discovery. Handling: capture. Risk: NORMAL.

Caller example: Summer is our busy season.

Explore seasonal variation and peaks rather than assuming one month represents the year.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-015 after-hours_demand

Agent: sales. Domain: Business discovery. Handling: capture. Risk: NORMAL.

Caller example: People call us after we close.

Ask when and why callers need help and which activities could receive after-hours coverage.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-016 missed_calls

Agent: sales. Domain: Pain and impact. Handling: capture. Risk: NORMAL.

Caller example: We miss calls while we are on jobs.

Ask frequency and business impact; do not assume every missed call becomes lost revenue.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-017 slow_follow-up

Agent: sales. Domain: Pain and impact. Handling: capture. Risk: NORMAL.

Caller example: We take too long to return inquiries.

Ask current response process and target; never promise a callback deadline without policy.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-018 abandonment

Agent: sales. Domain: Pain and impact. Handling: capture. Risk: NORMAL.

Caller example: Callers hang up while waiting.

Distinguish queue abandonment from unanswered calls and ask for available evidence.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-019 lead_leakage

Agent: sales. Domain: Pain and impact. Handling: capture. Risk: NORMAL.

Caller example: Inquiries disappear before anyone follows up.

Locate the handoff gap and clarify current ownership; do not claim CRM integration is already enabled.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-020 staff_interruptions

Agent: sales. Domain: Pain and impact. Handling: capture. Risk: NORMAL.

Caller example: The phone keeps interrupting my staff.

Identify recurring interruptions that could be handled consistently while staff retain judgment and relationships.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-021 coverage_cost

Agent: sales. Domain: Pain and impact. Handling: capture. Risk: NORMAL.

Caller example: Overnight staffing costs too much.

Ask the caller's actual staffing assumptions; compare equivalent coverage and label all scenarios illustrative.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-022 lost_opportunity

Agent: sales. Domain: Pain and impact. Handling: capture. Risk: NORMAL.

Caller example: What might those unanswered calls cost us?

Use caller-supplied conversion and value assumptions; never present possible revenue as guaranteed loss or recovery.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-023 inconsistent_qualification

Agent: sales. Domain: Pain and impact. Handling: capture. Risk: NORMAL.

Caller example: Everyone asks prospects different questions.

Ask which qualification criteria should be consistent and which require human judgment.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-024 problem_fit

Agent: sales. Domain: Qualification. Handling: capture. Risk: NORMAL.

Caller example: Would this solve our missed-call problem?

Map the stated problem to approved capability and explain limits and configuration dependencies.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-025 service_fit

Agent: sales. Domain: Qualification. Handling: capture. Risk: NORMAL.

Caller example: Is this suitable for our kind of business?

Identify required services and exclusions; unsupported needs require review rather than an automatic fit claim.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-026 authority

Agent: sales. Domain: Qualification. Handling: capture. Risk: NORMAL.

Caller example: I make the purchasing decision.

Record the caller's role as stated; purchasing authority does not authorize protected account changes.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-027 timing

Agent: sales. Domain: Qualification. Handling: capture. Risk: NORMAL.

Caller example: We want this operating next month.

Capture the desired date; onboarding timing remains subject to readiness and accepted project scope.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-028 budget_approach

Agent: sales. Domain: Qualification. Handling: capture. Risk: NORMAL.

Caller example: How should I budget for it?

Explain usage-based estimation from call history; no unapproved dollar amounts or invented discounts.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-029 operational_readiness

Agent: sales. Domain: Qualification. Handling: capture. Risk: NORMAL.

Caller example: What do we need before onboarding?

Identify approved business facts, workflow owners, escalation rules and source material needed for configuration.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-030 technical_readiness

Agent: sales. Domain: Qualification. Handling: capture. Risk: NORMAL.

Caller example: What must our phone system support?

Ask about current carrier and forwarding needs; arrange technical verification before promising compatibility.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-031 decision_process

Agent: sales. Domain: Qualification. Handling: capture. Risk: NORMAL.

Caller example: My partner also needs to review this.

Ask who participates in the decision and what approved information they need; do not contact anyone without permission.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-032 24_7_coverage

Agent: sales. Domain: Solution mapping. Handling: information. Risk: NORMAL.

Caller example: Can it cover weekends and nights?

Explain configurable coverage, including after-hours, subject to capacity and accepted setup; do not promise unlimited concurrency.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-033 lead_capture

Agent: sales. Domain: Solution mapping. Handling: information. Risk: NORMAL.

Caller example: Can it collect a prospect's details?

Explain structured lead capture with consent; a captured conversation is not proof of a persisted lead.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-034 qualification

Agent: sales. Domain: Solution mapping. Handling: information. Risk: NORMAL.

Caller example: Can it qualify new leads?

Explain business-approved qualification questions and human escalation; never invent eligibility criteria.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-035 routing

Agent: sales. Domain: Solution mapping. Handling: information. Risk: NORMAL.

Caller example: Can calls reach the right department?

Explain rule-based routing; destinations and current availability must be configured and verified.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-036 crm_context

Agent: sales. Domain: Solution mapping. Handling: information. Risk: NORMAL.

Caller example: Will staff see the conversation in our CRM?

Describe the need for an approved integration and authorized data access; do not promise a named CRM connector.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-037 tasks

Agent: sales. Domain: Solution mapping. Handling: information. Risk: NORMAL.

Caller example: Can it organize follow-up tasks?

Explain task workflow requirements; never say a task exists without a task-system reference.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-038 analytics

Agent: sales. Domain: Solution mapping. Handling: information. Risk: NORMAL.

Caller example: What reports can I review?

Discuss approved reporting scope and inputs; do not invent dashboard metrics or real-time coverage.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-039 multi-location

Agent: sales. Domain: Solution mapping. Handling: information. Risk: NORMAL.

Caller example: Can each branch have different rules?

Explain tenant and location-specific configuration; no cross-location disclosure without authorization.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-040 existing-number_continuity

Agent: sales. Domain: Solution mapping. Handling: information. Risk: NORMAL.

Caller example: Can we keep our current number?

Explain selected call forwarding; carrier-specific compatibility requires review and no number port is implied.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-041 usage_pricing

Agent: sales. Domain: Pricing and value. Handling: information. Risk: NORMAL.

Caller example: How does usage-based billing work?

Explain that the customer pays for actual service delivered, billed monthly; estimates use call history and actual usage varies.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-042 platform_access

Agent: sales. Domain: Pricing and value. Handling: information. Risk: NORMAL.

Caller example: What is the monthly platform fee for?

Explain platform access and support at the approved scope; refer exact current amounts to a specialist under the controlling agent policy.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-043 cost_drivers

Agent: sales. Domain: Pricing and value. Handling: information. Risk: NORMAL.

Caller example: What makes the monthly cost change?

Explain call count, length, concurrent demand and agreed service scope as estimation inputs; no invented rate calculation.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-044 estimate_request

Agent: sales. Domain: Pricing and value. Handling: request. Risk: NORMAL.

Caller example: Can you give me an exact quote?

Collect needs and call-history inputs for an authorized estimate; never convert an illustrative scenario into a binding quote.

Proposed business interfaces: followup.request. Enabled business actions: none.

## SAL-045 staff_cost_comparison

Agent: sales. Domain: Pricing and value. Handling: information. Risk: NORMAL.

Caller example: How does this compare with staffing every shift?

Use equivalent coverage, caller-provided wages and realistic scheduling assumptions; identify excluded costs and avoid guaranteed savings.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-046 roi_inputs

Agent: sales. Domain: Pricing and value. Handling: information. Risk: NORMAL.

Caller example: How could I estimate the return?

Gather cost and opportunity assumptions, distinguish cost savings from revenue, and label uncertainty; no financial guarantee.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-047 discount_eligibility

Agent: sales. Domain: Pricing and value. Handling: boundary. Risk: HIGH.

Caller example: Can I get a discount?

Refer eligibility and exceptions to authorized commercial staff; do not invent a promotion.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-048 billing_visibility

Agent: sales. Domain: Pricing and value. Handling: information. Risk: NORMAL.

Caller example: Can I see what I am being billed for?

Explain approved usage visibility and monthly billing review; no claim of an invoice lookup without an authorized integration.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-049 too_expensive

Agent: sales. Domain: Objections. Handling: capture. Risk: NORMAL.

Caller example: That sounds too expensive.

Acknowledge the concern, explore service needs and cost drivers, and offer an estimate review without pressure or discounts.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-050 not_ready

Agent: sales. Domain: Objections. Handling: capture. Risk: NORMAL.

Caller example: We are not ready yet.

Respect timing and ask whether any follow-up is wanted; do not create a commitment.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-051 already_have_vendor

Agent: sales. Domain: Objections. Handling: capture. Risk: NORMAL.

Caller example: We already use an answering service.

Ask what works and what gaps remain; compare approved scope fairly without disparaging the vendor.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-052 fear_of_replacement

Agent: sales. Domain: Objections. Handling: capture. Risk: NORMAL.

Caller example: Are you trying to replace our employees?

Explain predictable activities can support staff who retain relationships, judgment and exceptions; do not recommend job elimination.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-053 integration_concern

Agent: sales. Domain: Objections. Handling: capture. Risk: NORMAL.

Caller example: I worry it will not work with our software.

Identify the exact integration requirement and refer for verification rather than promising compatibility.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-054 security_concern

Agent: sales. Domain: Objections. Handling: capture. Risk: NORMAL.

Caller example: How do you protect our information?

Use approved security statements only; do not claim certifications, encryption coverage or legal compliance without evidence.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-055 needs_approval

Agent: sales. Domain: Objections. Handling: capture. Risk: NORMAL.

Caller example: I need approval from our owner.

Ask what the decision-maker needs and record the requested next step; no unconsented outreach.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-056 call_later

Agent: sales. Domain: Objections. Handling: capture. Risk: NORMAL.

Caller example: Please call me another day.

Ask the desired contact window and consent; describe it as a request unless an authorized scheduling result confirms it.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-057 send_information

Agent: sales. Domain: Objections. Handling: request. Risk: NORMAL.

Caller example: Could you email me information?

Confirm address and consent; distinguish saving a request from actual email delivery.

Proposed business interfaces: followup.request. Enabled business actions: none.

## SAL-058 prove_it

Agent: sales. Domain: Objections. Handling: information. Risk: NORMAL.

Caller example: Can you show me that it works?

Offer an approved demonstration, clearly separating demonstrated behavior from unverified backend functions.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-059 request_demo

Agent: sales. Domain: Demo and proof. Handling: demo. Risk: NORMAL.

Caller example: I would like a demo.

Explain the available demonstration and its limits; do not reserve an appointment without scheduling evidence.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-060 choose_scenario

Agent: sales. Domain: Demo and proof. Handling: demo. Risk: NORMAL.

Caller example: Show me a roofing inquiry.

Agree a fictional scenario and clearly mark all simulated caller details as demo data.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-061 simulate_caller

Agent: sales. Domain: Demo and proof. Handling: demo. Risk: NORMAL.

Caller example: I will pretend to be my customer.

Enter explicit role-play; keep simulated identity, contact and service facts out of the real lead record.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-062 exit_simulation

Agent: sales. Domain: Demo and proof. Handling: demo. Risk: NORMAL.

Caller example: Stop the role-play; I have a real question.

Exit simulation immediately and resume the real caller context without persisting demo facts.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-063 demo_limitation

Agent: sales. Domain: Demo and proof. Handling: demo. Risk: NORMAL.

Caller example: Did that demo actually create a job?

State exactly which actions were simulated versus verified; never imply a real booking or staff notification.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-064 live_transfer_unavailable

Agent: sales. Domain: Demo and proof. Handling: boundary. Risk: HIGH.

Caller example: Can nobody take my call right now?

Use the authoritative transfer availability result; offer an unconfirmed callback request if transfer is unavailable.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-065 recording_notice

Agent: sales. Domain: Demo and proof. Handling: consent. Risk: HIGH.

Caller example: Can I get a copy of the demo recording?

Apply the approved recording, retention and access policy; never disclose another caller's recording.

Proposed business interfaces: consent.record. Enabled business actions: none.

## SAL-066 consultation_request

Agent: sales. Domain: Next actions. Handling: request. Risk: NORMAL.

Caller example: I want to discuss setting this up.

Confirm the consultation goal and real contact details; save before any permitted specialist transfer.

Proposed business interfaces: followup.request. Enabled business actions: none.

## SAL-067 callback_request

Agent: sales. Domain: Next actions. Handling: request. Risk: NORMAL.

Caller example: Please have a specialist call me.

Confirm callback number, desired window and consent; no scheduled-callback claim without tool evidence.

Proposed business interfaces: followup.request. Enabled business actions: none.

## SAL-068 calendar_request

Agent: sales. Domain: Next actions. Handling: request. Risk: NORMAL.

Caller example: Are you free Tuesday at ten?

Resolve date and timezone and check an authorized calendar; offer a request if live availability cannot be verified.

Proposed business interfaces: followup.request. Enabled business actions: none.

## SAL-069 proposal_request

Agent: sales. Domain: Next actions. Handling: request. Risk: NORMAL.

Caller example: Can you send us a proposal?

Capture requirements for an authorized proposal request; do not invent pricing, contractual terms or delivery dates.

Proposed business interfaces: followup.request. Enabled business actions: none.

## SAL-070 technical_review

Agent: sales. Domain: Next actions. Handling: request. Risk: NORMAL.

Caller example: Our IT team needs to review this.

Capture the technical questions for appropriate staff; do not expose credentials or internal configuration.

Proposed business interfaces: followup.request. Enabled business actions: none.

## SAL-071 stakeholder_follow-up

Agent: sales. Domain: Next actions. Handling: request. Risk: NORMAL.

Caller example: My finance manager wants a follow-up.

Confirm recipient details, purpose and permission before arranging any contact; no message is sent by merely recording a request.

Proposed business interfaces: followup.request. Enabled business actions: none.

## SAL-072 save_profile

Agent: sales. Domain: Next actions. Handling: save. Risk: HIGH.

Caller example: Please save my contact information.

Confirm real name/business and phone then email; use submit_business_profile only in the authenticated Sales session and verify its result.

Proposed business interfaces: submit_business_profile. Enabled business actions: none.

## SAL-073 transfer

Agent: sales. Domain: Next actions. Handling: transfer. Risk: HIGH.

Caller example: Let me speak to a specialist.

Follow the existing verified-save-before-transfer and availability gates; staging transfers stay disabled.

Proposed business interfaces: transfer_to_specialist. Enabled business actions: none.

## SAL-074 unapproved_pricing

Agent: sales. Domain: Compliance and boundaries. Handling: boundary. Risk: HIGH.

Caller example: What is the unpublished per-minute rate?

Do not disclose private or unapproved pricing. Use approved usage language and offer specialist review.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-075 unsupported_integration

Agent: sales. Domain: Compliance and boundaries. Handling: boundary. Risk: HIGH.

Caller example: Does it integrate with this uncommon application?

Capture the product and required exchange; mark compatibility unverified until technical review.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-076 guarantee_request

Agent: sales. Domain: Compliance and boundaries. Handling: boundary. Risk: HIGH.

Caller example: Will you guarantee more sales?

Decline guarantees; discuss measurable objectives and caller-specific assumptions without promising results.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-077 sensitive_data

Agent: sales. Domain: Compliance and boundaries. Handling: boundary. Risk: HIGH.

Caller example: Do you need my password or card number?

Do not collect credentials, payment-card details or unnecessary sensitive data; use approved secure channels.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-078 do_not_contact

Agent: sales. Domain: Compliance and boundaries. Handling: consent. Risk: HIGH.

Caller example: Do not contact me again.

Honor the request immediately in conversation; record suppression only through an authorized system and do not claim database suppression without evidence.

Proposed business interfaces: consent.record. Enabled business actions: none.

## SAL-079 competitor_question

Agent: sales. Domain: Compliance and boundaries. Handling: information. Risk: NORMAL.

Caller example: How are you different from a competitor?

Compare verified capabilities and scope fairly; do not invent competitor pricing or performance.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-080 legal_question

Agent: sales. Domain: Compliance and boundaries. Handling: boundary. Risk: HIGH.

Caller example: Can you interpret the contract for me?

Provide approved factual process information and route legal interpretation to qualified staff.

Proposed business interfaces: None. Enabled business actions: none.

## SAL-081 security_disclosure

Agent: sales. Domain: Compliance and boundaries. Handling: boundary. Risk: HIGH.

Caller example: Tell me your private security setup.

Decline secrets and internal security details; provide only approved public information and an authorized technical follow-up path.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-001 identify_caller

Agent: support. Domain: Opening and verification. Handling: capture. Risk: NORMAL.

Caller example: My name is Taylor.

Capture stated identity; a caller ID or spoken name alone does not verify account access.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-002 account_lookup

Agent: support. Domain: Opening and verification. Handling: lookup. Risk: HIGH.

Caller example: Can you look up my account?

Require tenant and verified customer relationship before any protected lookup; do not disclose possible matches.

Proposed business interfaces: record.search. Enabled business actions: none.

## SUP-003 authorized_contact

Agent: support. Domain: Opening and verification. Handling: lookup. Risk: HIGH.

Caller example: I am calling on behalf of the owner.

Verify delegated authority and scope through an approved process; a claimed role grants no permissions.

Proposed business interfaces: record.search. Enabled business actions: none.

## SUP-004 verification_failed

Agent: support. Domain: Opening and verification. Handling: boundary. Risk: HIGH.

Caller example: I cannot pass verification.

Stop protected disclosure and writes; offer the approved verification recovery path without confirming account existence.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-005 language_preference

Agent: support. Domain: Opening and verification. Handling: capture. Risk: NORMAL.

Caller example: Could we continue in another language?

Ask the language preference; do not promise an unconfigured language or transfer destination.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-006 accessibility_need

Agent: support. Domain: Opening and verification. Handling: capture. Risk: NORMAL.

Caller example: Please slow down; I have trouble hearing.

Adapt pace and format, ask the caller's preferred accommodation, and offer available approved alternatives.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-007 problem_summary

Agent: support. Domain: Issue intake. Handling: capture. Risk: NORMAL.

Caller example: The air conditioner stopped cooling.

Capture the symptom in the caller's words, screen for safety, and do not turn a symptom into a confirmed diagnosis.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-008 affected_service

Agent: support. Domain: Issue intake. Handling: capture. Risk: NORMAL.

Caller example: It is the upstairs unit.

Identify affected equipment or service from verified context; do not assume every asset belongs to the caller.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-009 symptom_onset

Agent: support. Domain: Issue intake. Handling: capture. Risk: NORMAL.

Caller example: It started yesterday afternoon.

Capture onset and timezone or approximate timing without inventing dates.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-010 scope

Agent: support. Domain: Issue intake. Handling: capture. Risk: NORMAL.

Caller example: Only one room is affected.

Ask whether one area or the whole property is affected; keep scope separate from severity.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-011 impact

Agent: support. Domain: Issue intake. Handling: capture. Risk: NORMAL.

Caller example: Our business cannot open because of this.

Capture operational impact and vulnerability without collecting unnecessary medical details.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-012 urgency

Agent: support. Domain: Issue intake. Handling: capture. Risk: NORMAL.

Caller example: Is this urgent enough for emergency service?

Assess reported hazard and impact under approved policy; safety overrides routine intake and model confidence.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-013 recent_change

Agent: support. Domain: Issue intake. Handling: capture. Risk: NORMAL.

Caller example: The problem began after a recent change.

Capture what changed and when; do not recommend rollback without an applicable approved runbook.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-014 error_message

Agent: support. Domain: Issue intake. Handling: capture. Risk: NORMAL.

Caller example: The display shows an error code.

Capture the exact message and equipment model; never infer a fault from an unmatched code.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-015 reproducibility

Agent: support. Domain: Issue intake. Handling: capture. Risk: NORMAL.

Caller example: It only happens sometimes.

Ask when it occurs and observations already available; never ask callers to reproduce a hazardous condition.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-016 hours

Agent: support. Domain: General information. Handling: information. Risk: NORMAL.

Caller example: When are you open?

Use current tenant-approved hours and timezone; demo hours are not real client service commitments.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-017 location

Agent: support. Domain: General information. Handling: information. Risk: NORMAL.

Caller example: Which office handles my address?

Ask only the location needed for service; use configured service locations rather than invented addresses.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-018 service_area

Agent: support. Domain: General information. Handling: information. Risk: NORMAL.

Caller example: Do you service my ZIP code?

Verify the actual service-area policy; no eligibility claim from proximity alone.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-019 product_scope

Agent: support. Domain: General information. Handling: information. Risk: NORMAL.

Caller example: Do you repair this model?

Check the approved service catalog and model applicability; no unsupported brand or warranty assertion.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-020 plan_coverage

Agent: support. Domain: General information. Handling: lookup. Risk: HIGH.

Caller example: Is labor included in my plan?

Verify the actual agreement and account access; do not infer coverage from a product label.

Proposed business interfaces: record.search. Enabled business actions: none.

## SUP-021 policy_question

Agent: support. Domain: General information. Handling: information. Risk: NORMAL.

Caller example: What is your cancellation policy?

Retrieve the current tenant-approved policy and distinguish information from a cancellation instruction.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-022 how-to_request

Agent: support. Domain: General information. Handling: information. Risk: NORMAL.

Caller example: How do I adjust this setting?

Use a model-matched customer-safe guide; no panels, wiring, refrigerant, bypasses or hazardous troubleshooting.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-023 password_reset

Agent: support. Domain: Access and identity. Handling: change_request. Risk: HIGH.

Caller example: I forgot my account password.

Use an approved identity recovery channel; never ask for passwords or claim an unimplemented reset.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-024 locked_account

Agent: support. Domain: Access and identity. Handling: change_request. Risk: HIGH.

Caller example: My online account is locked.

Use the approved account recovery path; do not unlock an account based on a voice claim.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-025 mfa_issue

Agent: support. Domain: Access and identity. Handling: change_request. Risk: HIGH.

Caller example: My verification code does not work.

Never request an MFA code or backup secret; use the authorized recovery process.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-026 username_recovery

Agent: support. Domain: Access and identity. Handling: change_request. Risk: HIGH.

Caller example: I cannot remember my username.

Avoid account enumeration; use the approved verified recovery path.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-027 permission_request

Agent: support. Domain: Access and identity. Handling: change_request. Risk: HIGH.

Caller example: I need access to another account.

Require explicit authorization and least privilege; no privilege change from intent recognition.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-028 role_change

Agent: support. Domain: Access and identity. Handling: change_request. Risk: HIGH.

Caller example: Make me an administrator.

Require protected role-change authorization and verified tooling; never grant access through conversation.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-029 suspected_compromise

Agent: support. Domain: Access and identity. Handling: security. Risk: HIGH.

Caller example: Someone may have accessed my account.

Prioritize compromise containment and approved security escalation; do not collect passwords or tokens.

Proposed business interfaces: security.escalate. Enabled business actions: none.

## SUP-030 add_user

Agent: support. Domain: Configuration and MACD. Handling: change_request. Risk: HIGH.

Caller example: Add an employee to the system.

Require approved identity/admin authorization and a supported user-management workflow; unrelated HVAC callers receive scope clarification.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-031 remove_user

Agent: support. Domain: Configuration and MACD. Handling: change_request. Risk: HIGH.

Caller example: Remove a former employee's access.

Route an authorized offboarding request securely; no deletion or revocation claim without authoritative results.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-032 change_user

Agent: support. Domain: Configuration and MACD. Handling: change_request. Risk: HIGH.

Caller example: Change an employee's account details.

Require the exact account, allowed fields and authorization; use secure correction workflow and preserve audit evidence.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-033 department_update

Agent: support. Domain: Configuration and MACD. Handling: change_request. Risk: HIGH.

Caller example: Change the department on our account.

Clarify administrative scope and permissions; do not alter organization metadata without an approved integration.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-034 routing_change

Agent: support. Domain: Configuration and MACD. Handling: change_request. Risk: HIGH.

Caller example: Send our calls to a different team.

Require authorized routing change, verified destination and approval; never alter forwarding from an unverified request.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-035 hours_change

Agent: support. Domain: Configuration and MACD. Handling: change_request. Risk: HIGH.

Caller example: Change our published business hours.

Confirm timezone, effective dates and authorization; distinguish a change request from published configuration.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-036 holiday_change

Agent: support. Domain: Configuration and MACD. Handling: change_request. Risk: HIGH.

Caller example: Add holiday hours for next week.

Capture exact dates and timezone, approval and fallback; do not infer a holiday schedule.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-037 greeting_change

Agent: support. Domain: Configuration and MACD. Handling: change_request. Risk: HIGH.

Caller example: Replace the phone greeting.

Capture proposed wording and authorized approval; no live prompt or greeting modification from a caller request.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-038 transfer_destination

Agent: support. Domain: Configuration and MACD. Handling: change_request. Risk: HIGH.

Caller example: Change the number calls transfer to.

Verify destination ownership and authorized change process; guard against call diversion fraud.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-039 service_unavailable

Agent: support. Domain: Troubleshooting. Handling: triage. Risk: NORMAL.

Caller example: The service is completely unavailable.

Assess safety, affected scope and start time; retrieve verified incident status if available and never invent restoration time.

Proposed business interfaces: case.search, escalation.request. Enabled business actions: none.

## SUP-040 degraded_performance

Agent: support. Domain: Troubleshooting. Handling: triage. Risk: NORMAL.

Caller example: It works but is much slower today.

Capture baseline, scope and timing; avoid claiming a cause or promising a fix.

Proposed business interfaces: case.search, escalation.request. Enabled business actions: none.

## SUP-041 failed_call

Agent: support. Domain: Troubleshooting. Handling: triage. Risk: NORMAL.

Caller example: My call did not connect.

Capture time, endpoint and observable error without unnecessary phone metadata; route to the relevant approved service.

Proposed business interfaces: case.search, escalation.request. Enabled business actions: none.

## SUP-042 one-way_audio

Agent: support. Domain: Troubleshooting. Handling: triage. Risk: NORMAL.

Caller example: They can hear me but I cannot hear them.

Confirm affected call and device context; use approved non-disruptive steps, no unverified network changes.

Proposed business interfaces: case.search, escalation.request. Enabled business actions: none.

## SUP-043 routing_loop

Agent: support. Domain: Troubleshooting. Handling: triage. Risk: NORMAL.

Caller example: The call keeps transferring in circles.

Capture the route and timing; stop repeating failed transfers and escalate with context.

Proposed business interfaces: case.search, escalation.request. Enabled business actions: none.

## SUP-044 voicemail_issue

Agent: support. Domain: Troubleshooting. Handling: triage. Risk: NORMAL.

Caller example: Voicemail messages are not arriving.

Capture affected mailbox/time and known attempts; do not expose message content or claim recovery.

Proposed business interfaces: case.search, escalation.request. Enabled business actions: none.

## SUP-045 notification_failure

Agent: support. Domain: Troubleshooting. Handling: triage. Risk: NORMAL.

Caller example: Nobody received the alert.

Distinguish queued, attempted and delivered notifications using receipts; never assume delivery from case creation.

Proposed business interfaces: case.search, escalation.request. Enabled business actions: none.

## SUP-046 integration_error

Agent: support. Domain: Troubleshooting. Handling: triage. Risk: NORMAL.

Caller example: Our external system is returning errors.

Capture sanitized error and time; never collect API keys or expose private integration configuration.

Proposed business interfaces: case.search, escalation.request. Enabled business actions: none.

## SUP-047 browser_issue

Agent: support. Domain: Troubleshooting. Handling: triage. Risk: NORMAL.

Caller example: The page will not load in my browser.

Ask browser/device and safe observations; no destructive cache/account changes without approved instructions.

Proposed business interfaces: case.search, escalation.request. Enabled business actions: none.

## SUP-048 mobile_issue

Agent: support. Domain: Troubleshooting. Handling: triage. Risk: NORMAL.

Caller example: It fails only on my phone.

Capture platform and observed behavior; use approved mobile guidance and protect private screenshots.

Proposed business interfaces: case.search, escalation.request. Enabled business actions: none.

## SUP-049 create_ticket

Agent: support. Domain: Case workflow. Handling: intake. Risk: HIGH.

Caller example: Please create a support ticket.

Collect and confirm only required intake facts, use the tenant-bound intake tool once, and report only returned authoritative IDs.

Proposed business interfaces: submit_support_intake. Enabled business actions: none.

## SUP-050 add_note

Agent: support. Domain: Case workflow. Handling: change_request. Risk: HIGH.

Caller example: Please add a note to my existing case.

Verify case access, note wording and visibility; append without overwriting history and confirm only a note-system reference.

Proposed business interfaces: case.search, case.add_note. Enabled business actions: none.

## SUP-051 attach_evidence

Agent: support. Domain: Case workflow. Handling: change_request. Risk: HIGH.

Caller example: Can I attach a photo?

Use only approved private upload channels after case authorization; never request secrets or public links to private evidence.

Proposed business interfaces: case.search, attachment.upload. Enabled business actions: none.

## SUP-052 check_status

Agent: support. Domain: Case workflow. Handling: lookup. Risk: HIGH.

Caller example: What is happening with my ticket?

Verify caller-to-case relationship and retrieve saved status; do not create a new case or infer status from conversation.

Proposed business interfaces: case.search. Enabled business actions: none.

## SUP-053 reopen_case

Agent: support. Domain: Case workflow. Handling: change_request. Risk: HIGH.

Caller example: The problem returned; reopen my case.

Verify case access, reason and current version; reopening requires an implemented authorized mutation.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-054 close_request

Agent: support. Domain: Case workflow. Handling: change_request. Risk: HIGH.

Caller example: You can close my case now.

Confirm resolution and caller authority; closure requires approved conditions and a verified result.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-055 duplicate_case

Agent: support. Domain: Case workflow. Handling: lookup. Risk: HIGH.

Caller example: I think I have two tickets for this.

Locate authorized matching records; never merge or delete them automatically.

Proposed business interfaces: record.search. Enabled business actions: none.

## SUP-056 wrong_assignment

Agent: support. Domain: Case workflow. Handling: change_request. Risk: HIGH.

Caller example: My ticket was sent to the wrong team.

Clarify intended handling and verify routing authority; report a reassignment only after the case system confirms it.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-057 priority_change

Agent: support. Domain: Case workflow. Handling: change_request. Risk: HIGH.

Caller example: Please raise the priority.

Reassess hazard and impact with policy; do not grant arbitrary priority or delay safety action for approval.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-058 invoice_question

Agent: support. Domain: Billing and account. Handling: lookup. Risk: HIGH.

Caller example: Why is this item on my invoice?

Verify account and actual invoice through the billing authority; no invented amounts, refunds or policy interpretation.

Proposed business interfaces: record.search. Enabled business actions: none.

## SUP-059 usage_question

Agent: support. Domain: Billing and account. Handling: lookup. Risk: HIGH.

Caller example: How much service did I use?

Use an authorized usage source and period; no disclosure from another account and no estimated value presented as billed usage.

Proposed business interfaces: record.search. Enabled business actions: none.

## SUP-060 payment_issue

Agent: support. Domain: Billing and account. Handling: change_request. Risk: HIGH.

Caller example: My payment failed.

Do not collect card details; use approved payment support and never claim a payment was processed.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-061 unexpected_charge

Agent: support. Domain: Billing and account. Handling: change_request. Risk: HIGH.

Caller example: I do not recognize this charge.

Capture the disputed item through an authorized billing path; do not promise a refund or decide fraud.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-062 plan_question

Agent: support. Domain: Billing and account. Handling: lookup. Risk: HIGH.

Caller example: What does my current plan include?

Retrieve the actual approved agreement; do not assume enrollment, entitlement or pricing.

Proposed business interfaces: record.search. Enabled business actions: none.

## SUP-063 cancellation_request

Agent: support. Domain: Billing and account. Handling: change_request. Risk: HIGH.

Caller example: I want to cancel my service.

Verify identity and intent, explain only approved policy, and require authorized cancellation evidence.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-064 data_export

Agent: support. Domain: Billing and account. Handling: change_request. Risk: HIGH.

Caller example: Send me all my account data.

Use the verified privacy/export process; never read private records aloud or send an unapproved export.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-065 major_outage

Agent: support. Domain: Incident and escalation. Handling: triage. Risk: NORMAL.

Caller example: All our locations are down.

Assess broad impact and safety, check authoritative incident information and escalate; no restoration guarantee.

Proposed business interfaces: case.search, escalation.request. Enabled business actions: none.

## SUP-066 safety_concern

Agent: support. Domain: Incident and escalation. Handling: safety. Risk: HIGH.

Caller example: I smell gas near the furnace.

Prioritize immediate safety and the approved emergency protocol before intake or tools; do not provide repair steps or claim dispatch.

Proposed business interfaces: safety.route. Enabled business actions: none.

## SUP-067 security_incident

Agent: support. Domain: Incident and escalation. Handling: security. Risk: HIGH.

Caller example: There may be a security incident.

Determine active compromise, minimize sensitive data and use approved security escalation; no unsupported remediation guarantee.

Proposed business interfaces: security.escalate. Enabled business actions: none.

## SUP-068 privacy_request

Agent: support. Domain: Incident and escalation. Handling: change_request. Risk: HIGH.

Caller example: I want my personal information removed.

Verify identity through the approved privacy process; deletion and retention obligations require authorized review, not automatic erasure.

Proposed business interfaces: request.authorize, record.update. Enabled business actions: none.

## SUP-069 executive_complaint

Agent: support. Domain: Incident and escalation. Handling: triage. Risk: NORMAL.

Caller example: I need to complain to a manager.

Acknowledge the concern and capture the desired remedy; use a verified management route without promising compensation.

Proposed business interfaces: case.search, escalation.request. Enabled business actions: none.

## SUP-070 repeat_failure

Agent: support. Domain: Incident and escalation. Handling: triage. Risk: NORMAL.

Caller example: This is the third time the repair has failed.

Preserve previous attempts, avoid repeating them and route unresolved recurrence for qualified review.

Proposed business interfaces: case.search, escalation.request. Enabled business actions: none.

## SUP-071 sla_risk

Agent: support. Domain: Incident and escalation. Handling: lookup. Risk: HIGH.

Caller example: The promised response window has passed.

Verify the actual commitment and timestamps; do not invent an SLA or promise compensation.

Proposed business interfaces: record.search. Enabled business actions: none.

## SUP-072 urgent_transfer

Agent: support. Domain: Incident and escalation. Handling: triage. Risk: NORMAL.

Caller example: I need a person right now.

Assess safety first and use an authorized available destination; do not make a fictitious transfer or force routine intake in an emergency.

Proposed business interfaces: case.search, escalation.request. Enabled business actions: none.

## SUP-073 explain_next_step

Agent: support. Domain: Communication and closure. Handling: information. Risk: NORMAL.

Caller example: What happens after this call?

Explain only the verified saved outcome and approved next step; no unconfirmed callback or technician promise.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-074 set_expectation

Agent: support. Domain: Communication and closure. Handling: information. Risk: NORMAL.

Caller example: When should I expect an update?

Use an authoritative response policy or stated staff commitment; acknowledge when a time cannot be confirmed.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-075 callback_request

Agent: support. Domain: Communication and closure. Handling: callback. Risk: NORMAL.

Caller example: Please ask someone to call me.

Confirm number, consent and preferred window; saving a request does not prove a callback is scheduled.

Proposed business interfaces: callback.request. Enabled business actions: none.

## SUP-076 confirm_resolution

Agent: support. Domain: Communication and closure. Handling: capture. Risk: NORMAL.

Caller example: It seems to be working now.

Ask the caller to confirm the observable outcome; a verbal report does not automatically close the case.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-077 resolution_failed

Agent: support. Domain: Communication and closure. Handling: capture. Risk: NORMAL.

Caller example: That did not fix it.

Acknowledge the failed step, preserve it in context and choose another approved path or escalate; do not repeat the same troubleshooting.

Proposed business interfaces: None. Enabled business actions: none.

## SUP-078 survey_opt-out

Agent: support. Domain: Communication and closure. Handling: consent. Risk: HIGH.

Caller example: Do not send me a survey.

Honor the preference in conversation; persistent survey suppression requires an authorized preference tool.

Proposed business interfaces: consent.record. Enabled business actions: none.

## SUP-079 follow-up_consent

Agent: support. Domain: Communication and closure. Handling: consent. Risk: HIGH.

Caller example: You may contact me about this issue.

Capture purpose, channel and scope of consent; distinguish case follow-up permission from marketing consent.

Proposed business interfaces: consent.record. Enabled business actions: none.
