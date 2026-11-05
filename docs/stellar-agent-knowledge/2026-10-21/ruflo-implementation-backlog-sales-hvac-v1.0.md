**AI4BUSINESSES / STELLAR INTELLIGENT TECHNOLOGIES**

**Ruflo Implementation Ticket Backlog**

Sales Specialist and HVAC Support Specialist Demo v1.0

Controlled staging implementation package \| October 2026

# 1. Execution Rules

- Perform read-only repository and Supabase discovery before coding.

- Reuse existing tenant, contact, lead, interaction, case, knowledge, audit, voice, and orchestration services.

- Do not change production telephone routing, approved Support persona, production data, or production deployment without separate authorization.

- Use an isolated feature branch and staging-only synthetic data.

- Every ticket requires tests and evidence before closure.

- Do not mark business work complete from ACCEPTED, RUNNING, or UNKNOWN states.

| **ID**      | **Title**                                 | **Priority** | **Depends On**          | **Definition of Done**                                                                                    |
|-------------|-------------------------------------------|--------------|-------------------------|-----------------------------------------------------------------------------------------------------------|
| **EPIC-01** | Knowledge and Configuration Foundation    | P0           | None                    | Versioned tenant-scoped knowledge supports both agents.                                                   |
| **RUF-001** | Repository and schema discovery           | P0           | None                    | Document reusable modules, actual tables/RLS, voice paths, branches, deployments, risks; no code changes. |
| **RUF-002** | Knowledge source classification model     | P0           | RUF-001                 | Implement VERIFIED/PROPOSED/PLANNED/DEMO/UNKNOWN metadata and publication state.                          |
| **RUF-003** | Stellar Sales product catalog ingestion   | P0           | RUF-002                 | Ingest CEOC, Sales, Support, PMA, combined system, FAQs, objections, and approved wording.                |
| **RUF-004** | HVAC synthetic tenant seed package        | P0           | RUF-002                 | Create Summit Comfort demo tenant; all records test_only; notifications disabled.                         |
| **RUF-005** | Knowledge retrieval visibility controls   | P0           | RUF-001                 | Enforce platform/tenant/product/audience scope; cross-tenant tests pass.                                  |
| **EPIC-02** | Sales Specialist Voice and Workflows      | P0           | EPIC-01                 | Stellar Sales demo qualifies and persists leads safely.                                                   |
| **RUF-006** | Sales intent configuration                | P0           | RUF-003                 | Implement 15 sales intents with structured outputs and confidence/fallback rules.                         |
| **RUF-007** | Sales voice system prompt                 | P0           | RUF-003                 | Deploy approved voice behavior in staging; no unsupported claims.                                         |
| **RUF-008** | Sales call-flow state machine             | P0           | RUF-006,RUF-007         | Implement eight call flows with interruptions, silence, correction, and route changes.                    |
| **RUF-009** | Sales qualification schema                | P0           | RUF-006                 | Validate contact, business, product interest, problem, coverage, urgency, next action.                    |
| **RUF-010** | Sales lead persistence adapter            | P0           | RUF-009                 | Idempotent lead save; verified ID; UNKNOWN reconciliation; no duplicate lead.                             |
| **RUF-011** | Sales consultation/demo request workflow  | P1           | RUF-010                 | Request only until confirmed; audit and notification behavior verified.                                   |
| **RUF-012** | Sales unknown-question workflow           | P1           | RUF-005,RUF-006         | Create knowledge gap and human follow-up without fabricated answer.                                       |
| **RUF-013** | Sales pricing and claim guardrails        | P0           | RUF-007                 | Block unapproved rates, guarantees, concurrency, ROI, compatibility, and launch claims.                   |
| **RUF-014** | Sales voice acceptance suite              | P0           | RUF-008,RUF-010,RUF-013 | All voice tests and backend-state tests pass with evidence.                                               |
| **EPIC-03** | HVAC Support Specialist Demo              | P0           | EPIC-01                 | Synthetic HVAC demo performs safe structured intake.                                                      |
| **RUF-015** | HVAC intent configuration                 | P0           | RUF-004                 | Implement 18 support intents and deterministic safety overrides.                                          |
| **RUF-016** | HVAC voice system prompt                  | P0           | RUF-004                 | Deploy calm, one-question-at-a-time, non-diagnostic voice behavior.                                       |
| **RUF-017** | Emergency phrase detector                 | P0           | RUF-015                 | Gas, CO, smoke, fire, sparks, danger override normal classifier confidence.                               |
| **RUF-018** | HVAC intake schema and validation         | P0           | RUF-015                 | Validate customer, location, callback, equipment, symptoms, impact, safety, consent.                      |
| **RUF-019** | Approved basic-check policy engine        | P0           | RUF-017,RUF-018         | Only safe observational checks; prohibited instructions blocked and tested.                               |
| **RUF-020** | Support ticket orchestration adapter      | P0           | RUF-018                 | Idempotent submit; durable states; verification before ticket number.                                     |
| **RUF-021** | HVAC priority and escalation rules        | P0           | RUF-017,RUF-020         | Critical/urgent/high/normal/low routes with owner-configurable policy.                                    |
| **RUF-022** | Appointment request workflow              | P1           | RUF-018                 | Capture preferred window; no confirmation until scheduler/staff confirms.                                 |
| **RUF-023** | Installation sales handoff                | P1           | RUF-018                 | Installation intent creates sales lead, not repair diagnosis.                                             |
| **RUF-024** | Warranty review workflow                  | P1           | RUF-018                 | Capture details; no warranty guarantee; human review.                                                     |
| **RUF-025** | Ticket status secure lookup               | P0           | RUF-020                 | Identity/ownership verification; no cross-customer disclosure.                                            |
| **RUF-026** | HVAC voice acceptance suite               | P0           | RUF-016-RUF-025         | Safety, voice, RLS, persistence, UNKNOWN, and duplicate tests pass.                                       |
| **EPIC-04** | Security, Observability, and Release      | P0           | EPIC-02,EPIC-03         | Staging evidence supports controlled owner acceptance.                                                    |
| **RUF-027** | RLS and tenant-isolation verification     | P0           | RUF-005,RUF-010,RUF-020 | Owner/tenant/vendor/customer boundaries pass SELECT/INSERT/UPDATE tests.                                  |
| **RUF-028** | Private attachment controls               | P1           | RUF-020                 | Private bucket, MIME/size controls, signed URLs, cross-tenant denial.                                     |
| **RUF-029** | Intent and workflow telemetry             | P1           | RUF-006,RUF-015         | Log intent, confidence, KB IDs, workflow, correlation, outcome, latency.                                  |
| **RUF-030** | Audit and append-only events              | P0           | RUF-010,RUF-020         | State changes and overrides have actor, before/after, correlation ID.                                     |
| **RUF-031** | Staging demo data and scripts             | P1           | RUF-014,RUF-026         | Repeatable sales and HVAC demo scenarios with reset/cleanup.                                              |
| **RUF-032** | End-to-end staging acceptance             | P0           | RUF-027-RUF-031         | Voice → workflow → database → verified response tested for both agents.                                   |
| **RUF-033** | Rollback and production protection review | P0           | RUF-032                 | Rollback documented; production unchanged; owner gate explicit.                                           |
| **RUF-034** | Owner acceptance package                  | P0           | RUF-033                 | Provide results, defects, screenshots/log evidence, known limits, release recommendation.                 |

# 2. Standard Ticket Template

> TITLE: \[RUF-###\] Clear implementation outcome  
>   
> OBJECTIVE  
> Describe the business and technical outcome.  
>   
> DISCOVERY REQUIRED  
> List files, services, tables, functions, routes, and existing capabilities to inspect.  
>   
> IMPLEMENTATION  
> Define bounded changes. Reuse existing authoritative services.  
>   
> SECURITY  
> Authentication, tenant isolation, RLS, input validation, secrets, audit, and data minimization.  
>   
> TESTS  
> Unit, integration, RLS, failure, idempotency, UNKNOWN outcome, and regression tests.  
>   
> ACCEPTANCE CRITERIA  
> Use measurable pass/fail statements.  
>   
> EVIDENCE  
> Commit SHA, test commands/results, staging URL, migration ID, sanitized logs, and known limitations.  
>   
> ROLLBACK  
> Exact rollback steps and data cleanup.  
>   
> RELEASE GATE  
> Staging only unless owner separately authorizes production.

# 3. Detailed First Sprint Tickets

| **Ticket**  | **Implementation Summary**                                                                                                                                                        | **Acceptance**                                                                             |
|-------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------|
| **RUF-001** | Inspect repository, branch, product source files, voice bridge, knowledge structures, Supabase tables/RLS, Netlify/Railway targets. Produce reuse matrix and file/migration plan. | No modifications. Report ends STATUS: AWAITING IMPLEMENTATION AUTHORIZATION.               |
| **RUF-002** | Add source_status, scope, audience, effective/expiry dates, version, reviewer, and publication state to existing KB model or mapped equivalent.                                   | Existing knowledge remains readable; invalid visibility combinations rejected; tests pass. |
| **RUF-003** | Map repository product definitions and Sales FAQs into versioned Stellar knowledge entries without copying unapproved pricing into public responses.                              | Sales retrieval returns approved product facts, source IDs, and truth status.              |
| **RUF-004** | Create synthetic HVAC demo configuration and seed/reset process.                                                                                                                  | Every demo row is test_only; no live notifications; cleanup is deterministic.              |
| **RUF-005** | Implement server-side scope and audience enforcement plus RLS mapping.                                                                                                            | Cross-tenant and owner-only knowledge access denied; logged tests prove boundaries.        |

# 4. Release Gates

- Gate A: discovery and reuse matrix accepted.

- Gate B: knowledge ingestion and visibility tests accepted.

- Gate C: Sales voice and lead persistence accepted in staging.

- Gate D: HVAC safety, ticketing, and RLS accepted in staging.

- Gate E: end-to-end voice acceptance and rollback evidence accepted.

- Gate F: separate written owner authorization before any production merge, telephony change, or live notification.

# 5. Ruflo First Response Required

- Do not code immediately.

- Return repository and branch selected, current HEAD, working-tree status, reusable modules, database assets, file plan, migration plan, test plan, staging plan, risks, blockers, and execution order.

- End with: STATUS: AWAITING IMPLEMENTATION AUTHORIZATION.