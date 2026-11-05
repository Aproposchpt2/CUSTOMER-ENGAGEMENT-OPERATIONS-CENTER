**AI4BUSINESSES**

**Master Intent Catalog**

Sales Specialist · Support Specialist · HVAC Demo

*Implementation-grade routing, workflow, data, security, and testing specification*

Version 1.0 \| October 2026  
Ruflo / Claude Code handoff

# 1. Purpose and Operating Model

This catalog defines the intent operating system shared by AI4Businesses agents. It separates universal conversation behavior, product-specific business intent, deterministic safety overrides, and backend workflow actions. The intent layer does not independently authorize data access or business completion; server-side authentication, RLS, policy validation, workflow state, and authoritative persistence remain controlling.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Routing contract<br />
</strong>Channel input → deterministic safety scan → intent classification → entity extraction → confidence evaluation → authorization → knowledge retrieval → workflow selection → database action → verified outcome → voice response → analytics/audit.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 1.1 Confidence Rules

| **Range**                 | **Handling**                                                                       |
|---------------------------|------------------------------------------------------------------------------------|
| **0.90–1.00**             | Execute bounded reversible workflow when required entities and authorization pass. |
| **0.70–0.89**             | Ask one focused clarification question; reclassify before action.                  |
| **Below 0.70**            | Route to UNKNOWN or human follow-up; no irreversible action.                       |
| **Safety signal present** | Bypass normal confidence threshold and run deterministic safety review first.      |

## 1.2 Canonical Intent Object

> {  
> "intent_id": "NO_COOLING",  
> "intent_version": "1.0",  
> "category": "HVAC_SUPPORT",  
> "confidence": 0.98,  
> "priority": "HIGH",  
> "channel": "VOICE",  
> "tenant_id": "server-derived",  
> "contact_role": "CUSTOMER",  
> "entities": {},  
> "requires_authentication": false,  
> "requires_clarification": false,  
> "requires_human_review": false,  
> "safety_override": false,  
> "allowed_workflows": \["CREATE_CASE"\],  
> "knowledge_entry_ids": \[\],  
> "correlation_id": "server-issued",  
> "fallback_intent": "SUPPORT_REQUEST"  
> }

# 2. Universal Platform Intents

Shared across all agent products.

| **ID**      | **Intent**          | **Trigger/Purpose**              | **Agent**     | **Action**                                  | **Required Entities**            | **Data Effect**           |
|-------------|---------------------|----------------------------------|---------------|---------------------------------------------|----------------------------------|---------------------------|
| **UNI-001** | GENERAL_GREETING    | Greeting                         | Channel Agent | Greeting only                               | None                             | No domain write           |
| **UNI-002** | GENERAL_HELP        | Capability question              | Channel Agent | Explain approved capabilities               | audience_role                    | Log optional intent event |
| **UNI-003** | GENERAL_INFORMATION | General business question        | Channel Agent | Retrieve approved knowledge                 | topic, audience                  | Interaction event         |
| **UNI-004** | UNKNOWN_QUESTION    | No reliable match/answer         | Channel Agent | Create knowledge gap and follow-up          | original_question, scope         | knowledge_gap, follow_up  |
| **UNI-005** | HUMAN_AGENT_REQUEST | Caller requests a person         | Channel Agent | Transfer or callback workflow               | reason, contact                  | handoff_request           |
| **UNI-006** | CALLBACK_REQUEST    | Caller requests return call      | Channel Agent | Capture callback request                    | name, callback, topic            | callback_task             |
| **UNI-007** | APPOINTMENT_REQUEST | Caller wants appointment         | Channel Agent | Route product-specific appointment request  | contact, purpose, preferred_time | appointment_request       |
| **UNI-008** | CONTACT_UPDATE      | Caller updates contact record    | Channel Agent | Authenticate then update allowed fields     | contact_id, changed_fields       | contact + audit           |
| **UNI-009** | CONTACT_CAPTURE     | New contact details              | Channel Agent | Validate and create/update contact          | name, one contact method         | contact                   |
| **UNI-010** | EMAIL_CAPTURE       | Email supplied                   | Channel Agent | Confirm spelling and normalize              | email                            | contact field             |
| **UNI-011** | PHONE_CAPTURE       | Phone supplied                   | Channel Agent | Confirm number and preference               | phone                            | contact field             |
| **UNI-012** | ESCALATION_REQUEST  | User asks for escalation         | Channel Agent | Create escalation under policy              | reason, urgency                  | escalation task           |
| **UNI-013** | COMPLAINT           | Negative service feedback        | Channel Agent | Capture concern; avoid unverified admission | contact, issue                   | complaint/follow-up       |
| **UNI-014** | COMPLIMENT          | Positive feedback                | Channel Agent | Capture feedback when configured            | message                          | feedback event            |
| **UNI-015** | FEEDBACK            | Product/service suggestion       | Channel Agent | Record feedback                             | message, product                 | feedback                  |
| **UNI-016** | LANGUAGE_CHANGE     | User requests supported language | Channel Agent | Switch supported locale or escalate         | language                         | session setting           |

# 3. Conversation-Control Intents

Control dialogue state without being mistaken for a business request.

| **ID**      | **Intent**            | **Trigger/Purpose**        | **Agent**               | **Action**                      | **Required Entities**  | **Data Effect**                 |
|-------------|-----------------------|----------------------------|-------------------------|---------------------------------|------------------------|---------------------------------|
| **CTL-001** | CONFIRMATION_YES      | Affirmation                | Conversation Controller | Advance pending step            | pending_action         | No write unless action executes |
| **CTL-002** | CONFIRMATION_NO       | Rejection                  | Conversation Controller | Cancel/revise pending step      | pending_action         | No action                       |
| **CTL-003** | CORRECTION            | User corrects earlier data | Conversation Controller | Update session state; reconfirm | field, corrected_value | Audit if persisted              |
| **CTL-004** | CLARIFICATION_REQUEST | User asks agent to explain | Conversation Controller | Restate simply                  | topic                  | None                            |
| **CTL-005** | REPEAT_REQUEST        | User asks repetition       | Conversation Controller | Repeat requested item only      | segment                | None                            |
| **CTL-006** | INTERRUPTION          | Barge-in detected          | Conversation Controller | Stop speech and listen          | audio event            | Telemetry                       |
| **CTL-007** | START_OVER            | Restart current flow       | Conversation Controller | Clear uncommitted state         | workflow               | Session event                   |
| **CTL-008** | CANCEL_REQUEST        | Cancel pending action      | Conversation Controller | Cancel if allowed; verify state | operation_id           | Workflow/audit                  |
| **CTL-009** | RESUME_PREVIOUS_TASK  | Resume interrupted task    | Conversation Controller | Recover session/workflow state  | operation_id           | Read workflow                   |

# 4. Sales Specialist Intents

Commercial discovery, portfolio guidance, objection handling, and verified lead/consultation capture.

| **ID**      | **Intent**                       | **Trigger/Purpose**         | **Agent**        | **Action**                                         | **Required Entities**               | **Data Effect**      |
|-------------|----------------------------------|-----------------------------|------------------|----------------------------------------------------|-------------------------------------|----------------------|
| **SLS-001** | PRODUCT_OVERVIEW                 | Portfolio question          | Sales Specialist | Explain portfolio and discover need                | business_need                       | Interaction          |
| **SLS-002** | PRODUCT_COMPARISON               | Compare offerings           | Sales Specialist | Compare approved scope                             | products                            | Interaction          |
| **SLS-003** | PRODUCT_RECOMMENDATION           | Best-fit request            | Sales Specialist | Qualify then recommend                             | problem, coverage, current_process  | Lead notes           |
| **SLS-004** | CEOC_INQUIRY                     | CEOC question               | Sales Specialist | Explain connected operations foundation            | topic                               | Interaction          |
| **SLS-005** | SALES_SPECIALIST_INQUIRY         | Sales agent question        | Sales Specialist | Explain engagement and lead capture                | coverage_need                       | Lead optional        |
| **SLS-006** | SUPPORT_SPECIALIST_INQUIRY       | Support product question    | Sales Specialist | Explain structured support intake                  | support_need                        | Lead optional        |
| **SLS-007** | PROPERTY_MANAGEMENT_INQUIRY      | PMA question                | Sales Specialist | Explain communication-centered scope               | portfolio/use_case                  | Lead optional        |
| **SLS-008** | COMBINED_SYSTEM_INQUIRY          | Sales + support need        | Sales Specialist | Explain shared CEOC and distinct workflows         | sales_need, support_need            | Lead                 |
| **SLS-009** | PRICING_QUESTION                 | Price/fees question         | Sales Specialist | Use approved commercial knowledge or consultation  | product, usage context              | Lead/follow-up       |
| **SLS-010** | ROI_QUESTION                     | Savings/return question     | Sales Specialist | Discuss value without guarantee                    | current_cost context                | Lead note            |
| **SLS-011** | FEATURE_QUESTION                 | Specific capability         | Sales Specialist | Return truth-classified answer                     | product, feature                    | Interaction/gap      |
| **SLS-012** | INTEGRATION_QUESTION             | CRM/telephony/etc.          | Sales Specialist | Capture requirement; technical review              | system, workflow, data need         | Technical follow-up  |
| **SLS-013** | DEMO_REQUEST                     | Demo requested              | Sales Specialist | Create verified demo request                       | contact, products, preferred_time   | Demo request         |
| **SLS-014** | CONSULTATION_REQUEST             | Consultation requested      | Sales Specialist | Create verified consultation request               | contact, need                       | Consultation request |
| **SLS-015** | LEAD_QUALIFICATION               | Qualification in progress   | Sales Specialist | Collect structured fit data                        | contact, business, problem, urgency | Lead                 |
| **SLS-016** | BUSINESS_DISCOVERY               | Operational discovery       | Sales Specialist | Ask one question at a time                         | coverage, volume, process, goals    | Lead notes           |
| **SLS-017** | COVERAGE_QUESTION                | Coverage schedule           | Sales Specialist | Explain configurable coverage caveat               | hours/periods                       | Interaction          |
| **SLS-018** | AFTER_HOURS_QUESTION             | After-hours operation       | Sales Specialist | Explain approved after-hours model                 | schedule                            | Lead optional        |
| **SLS-019** | MISSED_CALL_QUESTION             | Missed-call problem         | Sales Specialist | Quantify pain and recommend fit                    | missed periods, call types          | Lead                 |
| **SLS-020** | IMPLEMENTATION_QUESTION          | Deployment process          | Sales Specialist | Describe approved discovery/config/testing process | product                             | Follow-up            |
| **SLS-021** | ONBOARDING_QUESTION              | Setup inputs                | Sales Specialist | List approved setup information                    | business info, KB, routing          | Follow-up            |
| **SLS-022** | OBJECTION_COST                   | Cost objection              | Sales Specialist | Value response; no pressure/guarantee              | concern                             | Lead note            |
| **SLS-023** | OBJECTION_ALREADY_HAVE_STAFF     | Staff objection             | Sales Specialist | Position augmentation                              | coverage gap                        | Lead note            |
| **SLS-024** | OBJECTION_ALREADY_HAVE_VOICEMAIL | Voicemail objection         | Sales Specialist | Contrast structured conversation/capture           | current_process                     | Lead note            |
| **SLS-025** | OBJECTION_AI_CONCERNS            | AI accuracy/control concern | Sales Specialist | Explain approved knowledge and fallback            | concern                             | Lead note            |

# 5. Universal Support Specialist Intents

Reusable support intake and case-management intents independent of vertical.

| **ID**      | **Intent**        | **Trigger/Purpose**      | **Agent**          | **Action**                                  | **Required Entities**         | **Data Effect**    |
|-------------|-------------------|--------------------------|--------------------|---------------------------------------------|-------------------------------|--------------------|
| **SUP-001** | SUPPORT_REQUEST   | General support need     | Support Specialist | Begin structured intake                     | contact, issue                | Support case       |
| **SUP-002** | CASE_CREATION     | Ready to submit case     | Support Specialist | Confirm summary and invoke workflow         | required case fields, consent | Case/workflow      |
| **SUP-003** | CASE_STATUS       | Existing case status     | Support Specialist | Authenticate and retrieve owned case        | case_id, identity             | Read case          |
| **SUP-004** | CASE_UPDATE       | Add information          | Support Specialist | Authenticate; append event                  | case_id, update               | Case event         |
| **SUP-005** | TECHNICAL_ISSUE   | Technical problem        | Support Specialist | Collect symptoms/impact/prior steps         | product, issue                | Case               |
| **SUP-006** | SERVICE_ISSUE     | Service delivery concern | Support Specialist | Capture facts and route                     | service, impact               | Case/complaint     |
| **SUP-007** | BILLING_QUESTION  | Billing concern          | Support Specialist | Use approved billing knowledge or follow-up | identity, topic               | Follow-up          |
| **SUP-008** | WARRANTY_QUESTION | Warranty question        | Support Specialist | Capture details; no determination           | equipment/service data        | Warranty follow-up |
| **SUP-009** | URGENT_SUPPORT    | High-impact request      | Support Specialist | Apply priority policy                       | impact, safety signals        | Priority case      |
| **SUP-010** | EMERGENCY_SUPPORT | Potential emergency      | Emergency Agent    | Deterministic safety review                 | hazard signals                | Critical event     |
| **SUP-011** | DOCUMENT_REQUEST  | Manual/invoice/document  | Support Specialist | Authenticate and route approved request     | document_type, identity       | Document task      |
| **SUP-012** | KNOWLEDGE_REQUEST | How-to/FAQ               | Support Specialist | Retrieve approved article                   | product, topic                | Interaction        |
| **SUP-013** | FOLLOW_UP_REQUEST | Caller wants follow-up   | Support Specialist | Create follow-up linked to case/contact     | case/contact, reason          | Follow-up task     |

# 6. HVAC Vertical Intent Pack

Synthetic HVAC demo intents. Emergency screening always runs before routine troubleshooting.

| **ID**      | **Intent**                 | **Trigger/Purpose**         | **Agent**       | **Action**                                 | **Required Entities**                 | **Data Effect**      |
|-------------|----------------------------|-----------------------------|-----------------|--------------------------------------------|---------------------------------------|----------------------|
| **HVC-001** | NO_COOLING                 | No cooling                  | HVAC Support    | Safety screen then cooling intake          | location, equipment, symptoms, impact | HVAC case            |
| **HVC-002** | NO_HEAT                    | No heat                     | HVAC Support    | Safety screen then heating intake          | location, equipment, symptoms, impact | HVAC case            |
| **HVC-003** | THERMOSTAT_ISSUE           | Thermostat concern          | HVAC Support    | Approved low-risk checks                   | model if safe, display, settings      | Case/knowledge       |
| **HVC-004** | WEAK_AIRFLOW               | Reduced airflow             | HVAC Support    | Capture vents/filter observations          | rooms, onset, filter                  | Case                 |
| **HVC-005** | NO_POWER_TO_UNIT           | Unit not powered            | HVAC Support    | Safety screen; limited breaker observation | equipment, breaker observation        | Case                 |
| **HVC-006** | SYSTEM_SHORT_CYCLING       | Frequent on/off             | HVAC Support    | Capture timing and impact; no diagnosis    | cycle pattern, equipment              | Case                 |
| **HVC-007** | STRANGE_NOISE              | Noise/vibration             | HVAC Support    | Screen smoke/sparks then capture sound     | sound, timing, system state           | Case                 |
| **HVC-008** | BURNING_ODOR               | Burning smell               | HVAC Support    | Safety override review                     | odor, smoke/sparks                    | Urgent/critical case |
| **HVC-009** | GAS_ODOR                   | Gas/sulfur odor             | Emergency Agent | Immediate evacuation script                | minimum safe context                  | Critical event       |
| **HVC-010** | CO_ALARM                   | CO detector alarm           | Emergency Agent | Leave and call 911 script                  | minimum safe context                  | Critical event       |
| **HVC-011** | WATER_LEAK                 | Water/condensate            | HVAC Support    | Determine electrical proximity/severity    | location, quantity, electrical risk   | Case                 |
| **HVC-012** | REFRIGERANT_CONCERN        | Suspected refrigerant issue | HVAC Support    | No diagnosis/handling; capture concern     | symptoms, equipment                   | Case                 |
| **HVC-013** | FROZEN_COIL                | Ice/frozen indicator        | HVAC Support    | Safe observation only; case intake         | observed ice, airflow                 | Case                 |
| **HVC-014** | OUTDOOR_UNIT_PROBLEM       | Outdoor unit concern        | HVAC Support    | Safe-distance observation only             | noise, state, obstruction             | Case                 |
| **HVC-015** | FILTER_QUESTION            | Filter question             | HVAC Support    | Approved knowledge; no unsafe access       | equipment/filter type if known        | Interaction          |
| **HVC-016** | ROUTINE_MAINTENANCE        | Maintenance request         | HVAC Support    | Create request                             | equipment, location, preference       | Appointment request  |
| **HVC-017** | SEASONAL_TUNEUP            | Seasonal service            | HVAC Support    | Create request                             | equipment, preference                 | Appointment request  |
| **HVC-018** | MAINTENANCE_PLAN           | Plan inquiry                | HVAC Support    | Demo knowledge or sales follow-up          | contact, question                     | Lead/follow-up       |
| **HVC-019** | INSTALLATION_REQUEST       | New installation            | HVAC Support    | Route to sales                             | property, goals, contact              | Sales lead           |
| **HVC-020** | REPLACEMENT_REQUEST        | Replacement inquiry         | HVAC Support    | Route assessment/estimate                  | equipment, reason, contact            | Sales lead           |
| **HVC-021** | ENERGY_EFFICIENCY_QUESTION | Efficiency question         | HVAC Support    | General approved info; estimator follow-up | equipment, goals                      | Lead/follow-up       |
| **HVC-022** | COMMERCIAL_HVAC_REQUEST    | Commercial site issue       | HVAC Support    | Capture site contact and impact            | site, contact, equipment, impact      | Commercial case      |

# 7. Deterministic Safety Overrides

These intents bypass ordinary model confidence routing and prohibit routine troubleshooting until immediate safety guidance is delivered.

| **ID**       | **Intent**           | **Trigger**                                 | **Priority** | **Required Response**                                             | **Prohibited**                 |
|--------------|----------------------|---------------------------------------------|--------------|-------------------------------------------------------------------|--------------------------------|
| **SAFE-001** | EMERGENCY_GAS_LEAK   | Gas/sulfur odor                             | Critical     | Evacuate; no switches/phone at site; call 911/utility from safety | No troubleshooting             |
| **SAFE-002** | EMERGENCY_CO_ALARM   | CO alarm                                    | Critical     | Leave immediately and call 911                                    | No re-entry assurance          |
| **SAFE-003** | EMERGENCY_FIRE       | Visible fire                                | Critical     | Move away and contact emergency services                          | No HVAC dispatch substitution  |
| **SAFE-004** | EMERGENCY_SMOKE      | Visible smoke                               | Critical     | Move away/contact emergency services                              | No routine intake first        |
| **SAFE-005** | EMERGENCY_SPARKING   | Active sparks                               | Critical     | Move away/contact emergency services                              | No breaker manipulation advice |
| **SAFE-006** | EMERGENCY_MEDICAL    | Symptoms/immediate medical danger           | Critical     | Contact emergency services                                        | No medical diagnosis           |
| **SAFE-007** | EMERGENCY_FLOODING   | Major uncontrolled flooding/electrical risk | Critical     | Prioritize safety and emergency contact as appropriate            | No unsafe access               |
| **SAFE-008** | EMERGENCY_ELECTRICAL | Electrical fire/shock hazard                | Critical     | Move away/contact emergency services                              | No touching equipment          |

# 8. Backend Workflow Intents

Internal actions are never treated as caller intent. They are invoked only after policy, authorization, and schema validation.

| **ID**     | **Workflow Intent**           | **Action**                        | **Preconditions**                 | **Completion Rule**                               | **Data Targets**            |
|------------|-------------------------------|-----------------------------------|-----------------------------------|---------------------------------------------------|-----------------------------|
| **WF-001** | WORKFLOW_CREATE_LEAD          | Create idempotent lead            | Validated qualification + consent | Lead ID verified                                  | leads/contacts/interactions |
| **WF-002** | WORKFLOW_CREATE_CASE          | Create idempotent case            | Validated intake + confirmation   | Case ID verified                                  | cases/case_events           |
| **WF-003** | WORKFLOW_CREATE_APPOINTMENT   | Create appointment request        | Contact + preferred window        | Request saved, not necessarily confirmed          | appointment_requests        |
| **WF-004** | WORKFLOW_UPDATE_CONTACT       | Update allowed contact fields     | Authentication/authorization      | Updated row verified                              | contacts/audit              |
| **WF-005** | WORKFLOW_ESCALATE             | Create escalation                 | Policy + reason + target          | Task/event saved                                  | escalations/audit           |
| **WF-006** | WORKFLOW_NOTIFY_OWNER         | Request owner notification        | Event policy                      | Delivery status separate from business completion | notifications/outbox        |
| **WF-007** | WORKFLOW_NOTIFY_TEAM          | Request team notification         | Recipient policy                  | Delivery status tracked                           | notifications/outbox        |
| **WF-008** | WORKFLOW_STORE_INTERACTION    | Persist interaction metadata      | Tenant/session/correlation        | Interaction saved                                 | interactions                |
| **WF-009** | WORKFLOW_GENERATE_TASK        | Create follow-up task             | Owner + due rule                  | Task saved                                        | tasks                       |
| **WF-010** | WORKFLOW_CREATE_KNOWLEDGE_GAP | Create unanswered-question record | Question + scope                  | Gap saved                                         | knowledge_gaps              |
| **WF-011** | WORKFLOW_CREATE_AUDIT_EVENT   | Append audit event                | Actor/action/entity               | Append verified                                   | audit_events                |
| **WF-012** | WORKFLOW_RECONCILE_UNKNOWN    | Resolve uncertain operation       | Stable operation identity         | Authoritative success/failure/pending             | workflow ledger             |

# 9. Entity Extraction Catalog

| **Entity**                       | **Definition**                                      | **Domain**    |
|----------------------------------|-----------------------------------------------------|---------------|
| **contact_name**                 | Person/business contact name                        | Universal     |
| **business_name**                | Prospect organization                               | Sales         |
| **phone**                        | Validated callback number                           | Universal     |
| **email**                        | Normalized email                                    | Universal     |
| **product_interest**             | CEOC/Sales/Support/PMA/Combined                     | Sales         |
| **business_problem**             | Caller-stated operational pain                      | Sales         |
| **coverage_need**                | After-hours/overflow/etc.                           | Sales         |
| **current_process**              | Existing answering/support workflow                 | Sales         |
| **urgency**                      | Desired timing/impact                               | Sales/Support |
| **service_address**              | HVAC service location                               | HVAC          |
| **customer_type**                | Residential/commercial                              | HVAC          |
| **equipment_type**               | AC/furnace/heat pump/etc.                           | HVAC          |
| **equipment_brand_model_serial** | Only when safely accessible                         | HVAC          |
| **issue_summary**                | Customer description                                | Support       |
| **onset**                        | When issue began                                    | Support       |
| **impact**                       | Comfort/safety/business impact                      | Support       |
| **safety_signals**               | Gas/CO/smoke/fire/sparks/danger/water-electric risk | HVAC          |
| **troubleshooting_attempted**    | Only safe prior steps                               | Support       |
| **access_notes**                 | Pets/gates/site access                              | Support       |
| **preferred_time**               | Request, not confirmation                           | Appointment   |
| **case_id**                      | Verified case reference                             | Support       |
| **operation_id**                 | Stable server-derived workflow identity             | Backend       |
| **correlation_id**               | Server-issued trace identity                        | Backend       |

# 10. Routing and Precedence Rules

- Run deterministic safety detection before ordinary intent classification.

- Safety override supersedes product, billing, scheduling, and routine support intents.

- Conversation-control intent may modify the active business intent but does not erase confirmed persisted work.

- If two business intents are present, select a primary intent and preserve secondary_intents for follow-up.

- Never execute a workflow before required entities, authentication, authorization, and consent/confirmation are satisfied.

- UNKNOWN creates a knowledge gap or follow-up; it never authorizes improvisation.

- Backend workflow state controls completion language: ACCEPTED and RUNNING are pending; COMPLETED requires authoritative verification; UNKNOWN requires reconciliation.

# 11. Database Mapping

| **Domain**             | **Primary Data Targets**                                                    | **Access Model**                                            |
|------------------------|-----------------------------------------------------------------------------|-------------------------------------------------------------|
| **Universal contacts** | contacts, interactions, tasks                                               | Tenant membership or secured public intake                  |
| **Sales**              | product catalog, knowledge, leads, interactions, consultation/demo requests | Staff/owner reads; server-only public writes                |
| **Support**            | customers/contacts, cases, case_events, knowledge                           | Identity/ownership or authorized staff                      |
| **HVAC**               | support cases, equipment references, appointment requests, sales handoff    | Synthetic demo tenant; test_only and notifications_disabled |
| **Safety**             | critical events, audit, notification request                                | Server-controlled minimal data                              |
| **Workflows**          | workflow ledger, outbox, audit events                                       | Service role/server only; append-only where applicable      |
| **Analytics**          | intent_events, latency/outcome metrics                                      | Authorized analytics roles                                  |

# 12. RLS and Security Requirements

- Derive tenant identity from authenticated server context, not model output.

- Users may read only rows for authorized tenant memberships and audience visibility.

- Customer case status requires verified identity and ownership or secure scoped token.

- Public lead/case intake uses validated server endpoints, never broad anonymous table grants.

- Workflow, audit, intent, and outbox records are append-only to ordinary users.

- Service-role credentials remain server-side and all bypass actions are audited.

- HVAC demo rows are test_only and notifications_disabled by default.

- Cross-tenant IDs supplied by a caller or model must fail validation and RLS.

# 13. Intent Test Matrix

| **Test ID**    | **Intent**                       | **Input Class**                   | **Expected**                                                                                        |
|----------------|----------------------------------|-----------------------------------|-----------------------------------------------------------------------------------------------------|
| **TC-UNI-001** | GENERAL_GREETING                 | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-UNI-002** | GENERAL_HELP                     | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-UNI-003** | GENERAL_INFORMATION              | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-UNI-004** | UNKNOWN_QUESTION                 | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-UNI-005** | HUMAN_AGENT_REQUEST              | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-UNI-006** | CALLBACK_REQUEST                 | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-UNI-007** | APPOINTMENT_REQUEST              | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-UNI-008** | CONTACT_UPDATE                   | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-UNI-009** | CONTACT_CAPTURE                  | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-UNI-010** | EMAIL_CAPTURE                    | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-UNI-011** | PHONE_CAPTURE                    | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-UNI-012** | ESCALATION_REQUEST               | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-UNI-013** | COMPLAINT                        | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-UNI-014** | COMPLIMENT                       | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-UNI-015** | FEEDBACK                         | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-UNI-016** | LANGUAGE_CHANGE                  | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-CTL-001** | CONFIRMATION_YES                 | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-CTL-002** | CONFIRMATION_NO                  | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-CTL-003** | CORRECTION                       | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-CTL-004** | CLARIFICATION_REQUEST            | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-CTL-005** | REPEAT_REQUEST                   | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-CTL-006** | INTERRUPTION                     | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-CTL-007** | START_OVER                       | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-CTL-008** | CANCEL_REQUEST                   | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-CTL-009** | RESUME_PREVIOUS_TASK             | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-001** | PRODUCT_OVERVIEW                 | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-002** | PRODUCT_COMPARISON               | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-003** | PRODUCT_RECOMMENDATION           | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-004** | CEOC_INQUIRY                     | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-005** | SALES_SPECIALIST_INQUIRY         | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-006** | SUPPORT_SPECIALIST_INQUIRY       | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-007** | PROPERTY_MANAGEMENT_INQUIRY      | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-008** | COMBINED_SYSTEM_INQUIRY          | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-009** | PRICING_QUESTION                 | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-010** | ROI_QUESTION                     | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-011** | FEATURE_QUESTION                 | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-012** | INTEGRATION_QUESTION             | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-013** | DEMO_REQUEST                     | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-014** | CONSULTATION_REQUEST             | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-015** | LEAD_QUALIFICATION               | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-016** | BUSINESS_DISCOVERY               | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-017** | COVERAGE_QUESTION                | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-018** | AFTER_HOURS_QUESTION             | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-019** | MISSED_CALL_QUESTION             | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-020** | IMPLEMENTATION_QUESTION          | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-021** | ONBOARDING_QUESTION              | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-022** | OBJECTION_COST                   | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-023** | OBJECTION_ALREADY_HAVE_STAFF     | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-024** | OBJECTION_ALREADY_HAVE_VOICEMAIL | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SLS-025** | OBJECTION_AI_CONCERNS            | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SUP-001** | SUPPORT_REQUEST                  | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SUP-002** | CASE_CREATION                    | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SUP-003** | CASE_STATUS                      | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SUP-004** | CASE_UPDATE                      | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SUP-005** | TECHNICAL_ISSUE                  | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SUP-006** | SERVICE_ISSUE                    | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SUP-007** | BILLING_QUESTION                 | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SUP-008** | WARRANTY_QUESTION                | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SUP-009** | URGENT_SUPPORT                   | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SUP-010** | EMERGENCY_SUPPORT                | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SUP-011** | DOCUMENT_REQUEST                 | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SUP-012** | KNOWLEDGE_REQUEST                | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-SUP-013** | FOLLOW_UP_REQUEST                | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-HVC-001** | NO_COOLING                       | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-HVC-002** | NO_HEAT                          | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-HVC-003** | THERMOSTAT_ISSUE                 | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-HVC-004** | WEAK_AIRFLOW                     | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-HVC-005** | NO_POWER_TO_UNIT                 | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-HVC-006** | SYSTEM_SHORT_CYCLING             | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-HVC-007** | STRANGE_NOISE                    | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-HVC-008** | BURNING_ODOR                     | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-HVC-009** | GAS_ODOR                         | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-HVC-010** | CO_ALARM                         | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-HVC-011** | WATER_LEAK                       | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-HVC-012** | REFRIGERANT_CONCERN              | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-HVC-013** | FROZEN_COIL                      | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-HVC-014** | OUTDOOR_UNIT_PROBLEM             | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-HVC-015** | FILTER_QUESTION                  | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-HVC-016** | ROUTINE_MAINTENANCE              | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-HVC-017** | SEASONAL_TUNEUP                  | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-HVC-018** | MAINTENANCE_PLAN                 | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-HVC-019** | INSTALLATION_REQUEST             | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-HVC-020** | REPLACEMENT_REQUEST              | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-HVC-021** | ENERGY_EFFICIENCY_QUESTION       | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |
| **TC-HVC-022** | COMMERCIAL_HVAC_REQUEST          | Representative utterance or event | Correct classification, required clarification/entities, bounded action, no cross-tenant disclosure |

## 13.1 Safety and Workflow Tests

| **Test**      | **Scenario**                              | **Expected**                                      |
|---------------|-------------------------------------------|---------------------------------------------------|
| **SAFE-T01**  | Gas odor embedded in no-heat request      | Safety override executes before heating intake.   |
| **SAFE-T02**  | CO alarm with low model confidence        | Deterministic override still executes.            |
| **SAFE-T03**  | Smoke plus price question                 | Emergency response; pricing deferred.             |
| **WF-T01**    | Lead workflow ACCEPTED                    | Agent says processing, not completed.             |
| **WF-T02**    | Case workflow COMPLETED with verified ID  | Agent may provide exact reference.                |
| **WF-T03**    | Workflow UNKNOWN after timeout            | No duplicate write; reconcile by operation ID.    |
| **RLS-T01**   | Tenant A queries Tenant B case            | Denied/no rows.                                   |
| **RLS-T02**   | Unassigned customer requests another case | Denied.                                           |
| **KB-T01**    | Knowledge missing                         | No fabrication; gap created.                      |
| **VOICE-T01** | Caller interruption                       | Speech stops and active intent resumes correctly. |

# 14. Ruflo Implementation Pack

- Represent intents as versioned configuration, not scattered string literals.

- Implement universal, conversation-control, Sales, Support, HVAC, safety, and workflow namespaces.

- Use JSON-schema validation for classifier output and extracted entities.

- Create deterministic safety rules independent of model confidence.

- Map existing database entities before creating new tables.

- Add idempotency, correlation IDs, and reconciliation for all business writes.

- Implement automated tests generated from this catalog plus voice interaction tests.

- Deploy only to isolated staging with synthetic data until owner acceptance.

# 15. Acceptance Checklist

☐ All intent IDs are unique and versioned.

☐ Safety overrides precede model routing.

☐ Confidence thresholds and fallback behavior are configurable.

☐ Required entities are validated server-side.

☐ Authentication and RLS guard every read/write.

☐ No workflow completion is announced without verification.

☐ Every intent has at least one automated classification/routing test.

☐ Cross-tenant, UNKNOWN, duplicate, timeout, and interruption tests pass.

☐ Sales and HVAC demo voice scenarios pass in staging.

☐ Production remains gated by separate owner authorization.