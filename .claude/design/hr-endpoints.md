# HR Endpoints (gateway_hr)

Status: **Draft for discussion** (2026-11-10). Collections: `human-resource-collections.md`, `account-and-workforce-collections.md`. All routes are under `/v1`, need a signed-in user, and act only inside the user's tenant. `me` routes are self-service: they act on the employee linked to the signed-in account.

We walk through the groups in order; each group is agreed before it is built.

Built so far: **1.1 Organizations** (PR #7) and **1.2 Facilities** (PR #10). Next: 1.3 Code concepts. The build order and status of every group is in `plans/2026-11-10-gateway-hr-plan.md` section 3; the rules each endpoint follows are in `../rules/back-end/workforce.md`.

## 1. Organization structure and reference data

### 1.1 Organizations (legal employers)
| Endpoint | Purpose |
|---|---|
| `GET /organizations` | List the employers of the tenant. |
| `POST /organizations` | Register an employer (legal name, country, currency). |
| `GET /organizations/:id` | View one employer. |
| `PATCH /organizations/:id` | Edit an employer or mark it inactive. |

### 1.2 Facilities (hospital and clinic sites)
| Endpoint | Purpose |
|---|---|
| `GET /facilities` | List hospital and clinic sites. |
| `POST /facilities` | Add a site with its time zone and holiday calendars. |
| `GET /facilities/:id` | View one site. |
| `PATCH /facilities/:id` | Edit a site or mark it inactive. |

### 1.3 Code concepts (codes the rules depend on)
| Endpoint | Purpose |
|---|---|
| `GET /code-concepts` | List the codes of one code system (for example workforce categories, licence types). |
| `POST /code-concepts` | Add a hospital-specific code. |
| `PATCH /code-concepts/:id` | Edit a code's names and properties, or retire it. |
| `POST /code-concepts/import` | Load a ready-made set of codes, such as the Indonesian defaults. |

### 1.4 Organization units (org chart)
| Endpoint | Purpose |
|---|---|
| `GET /units` | List units of a facility, optionally under one parent. |
| `GET /units/tree` | Show a facility's organization chart as a tree. |
| `POST /units` | Create a unit (directorate, ward, polyclinic, ...). |
| `GET /units/:id` | View one unit with its current head. |
| `PATCH /units/:id` | Edit a unit's name, type or clinical flag. |
| `POST /units/:id/move` | Move a unit under another parent. |
| `POST /units/:id/close` | Close a unit that no longer has staff or sub-units. |

### 1.5 Positions
| Endpoint | Purpose |
|---|---|
| `GET /positions` | List positions of a unit. |
| `POST /positions` | Create a position, including the unit's head position. |
| `GET /positions/:id` | View one position with who holds it. |
| `PATCH /positions/:id` | Edit title, grade, allowed professions or headcount. |
| `POST /positions/:id/close` | Close a position that nobody holds. |

### 1.6 HR parameters
| Endpoint | Purpose |
|---|---|
| `GET /parameters` | List parameter values set for the tenant, facilities and units. |
| `GET /parameters/effective` | Show the value in force for one parameter, place and date. |
| `POST /parameters` | Set a parameter value from a date (for example `MAX_WEEKLY_HOURS` for one facility). |

## 2. Employees

### 2.1 Employee records
| Endpoint | Purpose |
|---|---|
| `GET /employees` | Search employees by name, number, status, category or unit. |
| `POST /employees` | Register a new employee (starts in `onboarding`). |
| `GET /employees/:id` | View an employee's public and internal data. |
| `PATCH /employees/:id` | Edit an employee's name, profession, specialties or contacts. |
| `POST /employees/:id/status` | Change employment status: probation, active, suspended or separated (with reason and date). |
| `GET /employees/me` | Self-service: view my own record. |

### 2.2 Private profile (confidential)
| Endpoint | Purpose |
|---|---|
| `GET /employees/:id/private-profile` | View birth date, addresses, family and masked identifiers (HR and payroll only). |
| `PUT /employees/:id/private-profile` | Create or update the confidential profile. |
| `PUT /employees/:id/private-profile/identifiers` | Replace national id, passport, tax and insurance numbers. |
| `PUT /employees/:id/private-profile/bank-accounts` | Replace salary bank accounts. |
| `GET /employees/:id/private-profile/identifiers/:system` | Reveal one identifier in full (recorded as an access). |
| `GET /employees/me/private-profile` | Self-service: view my own confidential profile. |

### 2.3 Employment contracts
| Endpoint | Purpose |
|---|---|
| `GET /employees/:id/contracts` | List an employee's contracts, past and current. |
| `POST /contracts` | Create a contract draft (employer, type, dates, probation). |
| `GET /contracts/:id` | View one contract. |
| `POST /contracts/:id/activate` | Make a draft contract the active one. |
| `POST /contracts/:id/end` | End a contract on its end date. |
| `POST /contracts/:id/terminate` | End a contract early, with a reason. |

### 2.4 Position assignments
| Endpoint | Purpose |
|---|---|
| `GET /employees/:id/assignments` | List an employee's positions, past and current. |
| `GET /units/:id/assignments` | List who works in a unit. |
| `POST /assignments` | Assign an employee to a position (hire, transfer, promotion, acting). |
| `POST /assignments/:id/end` | End an assignment on a date. |

### 2.5 Committee memberships
| Endpoint | Purpose |
|---|---|
| `GET /committee-memberships` | List members of a facility's committees. |
| `POST /committee-memberships` | Appoint someone to a committee (chair, secretary, member, mitra bestari). |
| `POST /committee-memberships/:id/end` | End a membership. |

## 3. Professional licences

### 3.1 Licences (STR, SIP and others)
| Endpoint | Purpose |
|---|---|
| `GET /licenses` | List licences by status or expiring within a number of days (expiry report). |
| `GET /employees/:id/licenses` | List one employee's licences. |
| `POST /licenses` | HR registers a licence (starts `pending_verification`). |
| `POST /employees/me/licenses` | Self-service: submit my own licence. |
| `GET /licenses/:id` | View one licence with its verification. |
| `POST /licenses/:id/verify` | Record verification: match makes it valid (and supersedes the old SIP), mismatch rejects it. |
| `POST /licenses/:id/revoke` | Record a revocation by the issuing authority. |

### 3.2 Professional credits (SKP / CME)
| Endpoint | Purpose |
|---|---|
| `GET /employees/:id/cpd-records` | List an employee's credit records. |
| `POST /cpd-records` | HR records earned credits. |
| `POST /employees/me/cpd-records` | Self-service: submit my own credits. |
| `POST /cpd-records/:id/review` | Accept or reject submitted credits. |
| `GET /employees/:id/cpd-summaries` | Show credit totals per credit system. |
| `PUT /employees/:id/cpd-summaries/:system` | Record the total read from a national platform. |

## 4. Credentialing and clinical privileges

### 4.1 Privilege catalog
| Endpoint | Purpose |
|---|---|
| `GET /privileges` | List privileges that can be requested, by committee or profession. |
| `POST /privileges` | Add a privilege to the catalog. |
| `GET /privileges/:id` | View one privilege. |
| `PATCH /privileges/:id` | Edit a privilege's names, professions or required evidence. |
| `POST /privileges/:id/retire` | Stop new requests for a privilege. |

### 4.2 Credential applications
| Endpoint | Purpose |
|---|---|
| `GET /credential-applications` | Committee work queue: applications by status and age. |
| `POST /credential-applications` | Start an application (initial, re-credentialing, extension, temporary). |
| `GET /credential-applications/:id` | View an application. |
| `PATCH /credential-applications/:id` | Edit a draft: privileges, units, documents. |
| `POST /credential-applications/:id/submit` | Send the application to the committee. |
| `POST /credential-applications/:id/withdraw` | Applicant withdraws before assessment. |
| `POST /credential-applications/:id/start-review` | Committee starts checking completeness. |
| `POST /credential-applications/:id/return` | Committee sends it back for missing documents. |
| `POST /credential-applications/:id/assessors` | Committee appoints assessors (mitra bestari). |
| `POST /credential-applications/:id/conflict-declaration` | Assessor declares a conflict of interest, or none. |
| `POST /credential-applications/:id/assessments` | Assessor records their assessment of each privilege. |
| `GET /credential-applications/:id/assessments` | Committee reads the assessments (recorded as an access). |
| `POST /credential-applications/:id/recommendation` | Committee signs its recommendation to the Director. |
| `POST /credential-applications/:id/decision` | Director approves (creates the SPK) or rejects. |

### 4.3 SPK and granted privileges
| Endpoint | Purpose |
|---|---|
| `GET /clinical-appointments` | List SPKs by status or expiring soon. |
| `GET /employees/:id/clinical-appointments` | List one practitioner's SPKs. |
| `GET /clinical-appointments/:id` | View an SPK with its granted privileges (RKK). |
| `POST /clinical-appointments/:id/suspend` | Suspend a whole SPK by Director decision. |
| `POST /clinical-appointments/:id/lift-suspension` | Lift a suspension by a new decision. |
| `POST /clinical-appointments/:id/revoke` | Revoke an SPK permanently. |
| `GET /privilege-grants` | Privilege directory: who holds a privilege, with which condition. |
| `POST /privilege-grants/:id/suspend` | Suspend one granted privilege. |
| `POST /privilege-grants/:id/revoke` | Revoke one granted privilege. |

## 5. Rostering

### 5.1 Shift definitions
| Endpoint | Purpose |
|---|---|
| `GET /shift-definitions` | List a facility's shifts (P, S, M, L, ...). |
| `POST /shift-definitions` | Define a shift with times, paid minutes and night flag. |
| `PATCH /shift-definitions/:id` | Edit a shift (past assignments keep their copy). |
| `POST /shift-definitions/:id/retire` | Stop a shift from being assigned. |

### 5.2 Holiday calendars
| Endpoint | Purpose |
|---|---|
| `GET /holiday-calendars` | View a calendar's holidays for a year. |
| `POST /holiday-calendars` | Create a calendar for a year. |
| `POST /holiday-calendars/:id/holidays` | HR adds a holiday by hand. |
| `POST /holiday-calendars/:id/holidays/remove` | HR removes a holiday (imported or manual). |
| `POST /holiday-calendars/:id/imports` | Upload a holiday CSV to check before applying. |

### 5.3 Coverage requirements
| Endpoint | Purpose |
|---|---|
| `GET /coverage-requirements` | List minimum staffing rules of a unit. |
| `POST /coverage-requirements` | Add a minimum staffing rule for a shift. |
| `PATCH /coverage-requirements/:id` | Edit a rule. |
| `POST /coverage-requirements/:id/retire` | Stop checking a rule. |

### 5.4 Rosters
| Endpoint | Purpose |
|---|---|
| `GET /rosters` | List rosters by unit and period. |
| `POST /rosters` | Create a draft roster, optionally pre-filled from the previous period. |
| `GET /rosters/:id` | View a roster with its assignments. |
| `POST /rosters/:id/validate` | Check all rules and coverage, and list violations. |
| `POST /rosters/:id/submit` | Send for approval. |
| `POST /rosters/:id/approve` | Approve a submitted roster. |
| `POST /rosters/:id/return` | Return it to draft with a reason. |
| `POST /rosters/:id/publish` | Publish to staff and other modules. |
| `POST /rosters/:id/close` | Close the period after attendance is reconciled. |
| `POST /rosters/:id/coverage-overrides` | Accept a coverage gap with a reason. |

### 5.5 Roster assignments
| Endpoint | Purpose |
|---|---|
| `POST /rosters/:id/assignments` | Add one person to one shift on one date. |
| `PATCH /roster-assignments/:id` | Change an assignment (reason required after publication). |
| `POST /roster-assignments/:id/cancel` | Cancel an assignment. |
| `POST /roster-assignments/:id/resolve-flag` | Mark an eligibility flag as handled. |
| `POST /rosters/:id/imports` | Upload a roster CSV to check before applying. |
| `GET /units/:id/on-duty` | Who is on duty in a unit at a moment (for clinical modules). |
| `GET /employees/me/roster` | Self-service: my shifts for a date range. |

### 5.6 Imports (shared by rosters and holidays)
| Endpoint | Purpose |
|---|---|
| `GET /hr-imports/:id` | View an import's status, counts and row errors. |
| `POST /hr-imports/:id/apply` | Apply a checked import. |
| `POST /hr-imports/:id/cancel` | Discard an import. |

### 5.7 Shift swaps
| Endpoint | Purpose |
|---|---|
| `GET /shift-swaps` | List swap requests (mine, or my unit's for a Head of Unit). |
| `POST /shift-swaps` | Ask to swap or give away a shift. |
| `POST /shift-swaps/:id/accept` | Counterpart accepts. |
| `POST /shift-swaps/:id/approve` | Head of Unit approves; the assignments change. |
| `POST /shift-swaps/:id/reject` | Head of Unit rejects with a reason. |
| `POST /shift-swaps/:id/cancel` | Requester cancels. |

### 5.8 Practice schedules (outpatient)
| Endpoint | Purpose |
|---|---|
| `GET /practice-schedules` | Which doctors practise in a polyclinic on a date, with quotas (for registration). |
| `POST /practice-schedules` | Add a doctor's weekly session. |
| `PATCH /practice-schedules/:id` | Change a session's time, quota or validity. |
| `POST /practice-schedules/:id/end` | End a session from a date. |
| `POST /practice-schedules/:id/exceptions` | Cancel or move one session on a date. |
| `POST /practice-schedule-exceptions/:id/cancel` | Undo an exception. |

## 6. Clinical eligibility
| Endpoint | Purpose |
|---|---|
| `GET /employees/:id/eligibility` | Is this practitioner clinically eligible in a unit on a date, optionally for one privilege? Names the failing condition. |
