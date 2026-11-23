# Human Resource Management

## 1. Purpose

This document defines the business flow to determine how to manage the human resource of the hospital.

It is the business specification for the Human Resource Management (HRM) module of the Hospital Information Management System. Requirements, workflows, technical specifications and implementation decisions for HRM must follow it. Terms follow `../glossary.md`; when a term used here is missing from the glossary or conflicts with it, ask for clarification before making assumptions.

Each business rule has a stable identifier (`HR-<AREA>-<NUMBER>`). Code, tests, tickets and other documents refer to rules by that identifier. Do not renumber or reuse an identifier; mark a removed rule as `Withdrawn`.

---

## 2. Scope

### 2.1 In scope

The module manages the hospital's workforce from hiring to separation. Sub-processes are delivered in this priority order:

| Priority | Sub-process | Section | Detail level |
|---|---|---|---|
| 1 | Professional license management | 6 | Full |
| 2 | Credentialing and clinical privileging | 7 | Full |
| 3 | Shift scheduling and rostering | 8 | Full |
| 4 | Recruitment and onboarding | 9.1 | Outline |
| 5 | Organization and position management | 9.2 | Outline |
| 6 | Attendance and time | 9.3 | Outline |
| 7 | Leave management | 9.4 | Full |
| 8 | Training and competency | 9.5 | Outline |
| 9 | Performance management | 9.6 | Outline |
| 10 | Compensation and payroll | 9.7 | Outline |
| 11 | Occupational health and safety | 9.8 | Outline |
| 12 | Discipline and grievance | 9.9 | Outline |
| 13 | Separation | 9.10 | Outline |

Outline sections describe purpose, entities and known rules only. They must be detailed in this document before implementation starts.

### 2.2 Out of scope

- General ledger and bank transfer of salaries (Finance module).
- Clinical documentation itself. HRM only answers *who* may perform clinical work, *where* and *when* (section 13).
- User accounts and authentication. HRM drives account status (section 13); the identity module owns accounts. Not every employee has an account: an account is created only on an approved account request and links to at most one employee. Collection design: `../../design/account-and-workforce-collections.md`.

---

## 3. Regulatory References

Rules cite these references. The legal summaries below are a starting point and **must be verified against the current regulation text by the hospital's legal and HR team before go-live**; regulations implementing UU 17/2023 were still being issued at the time of writing.

| Code | Reference | Relevance |
|---|---|---|
| `REG-UU17` | UU No. 17 Tahun 2023 tentang Kesehatan | Categories of health workers, STR, SIP, practice obligations. |
| `REG-PP28` | PP No. 28 Tahun 2024 (implementing regulation of UU 17/2023) | SIP validity, SKP requirement, practice-location limits. |
| `REG-KMK` | Permenkes No. 755/2011 (Komite Medik) and successors | Credentialing of medical staff, RKK, SPK, re-credentialing. |
| `REG-KKP` | Permenkes No. 49/2013 (Komite Keperawatan) and successors | Credentialing of nurses and midwives, clinical career levels. |
| `REG-KARS` | Standar Akreditasi Rumah Sakit (KARS / STARKES), chapter KKS | Staff files, credentialing, orientation, staff evaluation. |
| `REG-HBL` | Hospital By-Laws and Peraturan Internal Staf Medis | Hospital-specific committee procedures. |
| `REG-UUK` | UU No. 13/2003 as amended by UU No. 6/2023 (Cipta Kerja) | Employment, contracts, working time, termination. |
| `REG-PP35` | PP No. 35 Tahun 2021 | PKWT, working time, overtime, rest, termination. |
| `REG-BPJS` | BPJS Kesehatan and BPJS Ketenagakerjaan regulations | Mandatory social security enrolment and contributions. |
| `REG-PPH21` | PPh 21 regulations (TER scheme) | Income tax withholding. |
| `REG-PDP` | UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi | Processing of employee personal data. |

---

## 4. Actors and Roles

### 4.1 Actors

| Actor | Description |
|---|---|
| Employee | Any person employed by or contracted to the hospital. Uses self-service. |
| HR Admin | Maintains employee records, licenses and documents. Performs document verification. |
| HR Manager | Approves HR decisions within HR authority. Owns HR policy parameters (section 10). |
| Head of Unit | Head of a ward, installation or department (Kepala Ruangan, Kepala Instalasi, Kepala Bagian). Owns the unit's roster. |
| Komite Medik | Credentials Tenaga Medis through its Subkomite Kredensial, Subkomite Mutu Profesi and Subkomite Etika dan Disiplin Profesi. |
| Komite Keperawatan | Credentials nurses and midwives. |
| Komite Tenaga Kesehatan Lain | Credentials other Tenaga Kesehatan (pharmacists, laboratory, radiology, physiotherapy, nutrition, ...). |
| Mitra Bestari | Peer assessor appointed by a committee to assess a practitioner's competence. |
| Director | Hospital director (or delegated deputy). Issues SPK and approves decisions above HR authority. |
| Payroll Officer | Prepares payroll from HR data. |
| System | Scheduled jobs: expiry checks, notifications, status derivation. |

### 4.2 Permission matrix for priority sub-processes

`V` view, `C` create or edit, `A` approve, `-` no access. "Own" means the actor's own records; "Unit" means employees of the units the actor heads.

| Capability | Employee | HR Admin | HR Manager | Head of Unit | Committee | Director |
|---|---|---|---|---|---|---|
| License records | V/C (own, submit) | V/C | V/A | V (unit) | V (applicants) | V |
| License verification | - | C | A (rejections) | - | V | - |
| Credential application | C (own) | V/C | V | V (unit) | V/C | V |
| Credential assessment and recommendation | - | - | - | - | C/A | V |
| SPK issuance | V (own) | V | V | V (unit) | V | A |
| Privilege suspension or revocation | V (own) | V | V | V (unit) | C | A |
| Shift definitions and coverage requirements | - | V | C/A | C (unit) | - | V |
| Roster drafting | V (own) | V | V | C (unit) | - | V |
| Roster approval | - | V | A (if configured) | - | - | V |
| Shift swap request | C (own) | V | V | A (unit) | - | - |
| Leave request | C (own) | C (on behalf), proof, type change, end early | V | V (unit) | - | - |
| Leave decision | - | - | A (second step; first step when no Head) | A (unit, first step) | - | - |
| Leave policies and balance adjustments | V (own balance) | V | C | V (unit balances) | - | - |

---

## 5. Core Entities

Entities specific to a sub-process are defined in that sub-process section. The entities below are shared by all sub-processes.

### 5.1 Employee

The person employed by or contracted to the hospital.

| Field | Description |
|---|---|
| Employee number | Hospital-issued, unique, never reused. |
| Full name, title (gelar) | As printed on the identity document and diplomas. |
| NIK | National identity number. Sensitive (section 14). |
| Date and place of birth, gender | |
| Contact | Phone, email, address. |
| Workforce category | See 5.2. |
| Profession | For example `dokter_spesialis`, `perawat`, `bidan`, `apoteker`. Required for clinical categories. |
| Specialty | For example `penyakit_dalam`. Required for specialists. |
| Employment type | `pkwtt` (permanent), `pkwt` (fixed term), `mitra` (contracted practitioner, not an employee), `intern`. |
| Primary organization unit and position | See 5.3. |
| Employment status | See 5.4. |
| Join date, separation date | |
| SATUSEHAT practitioner identifier (IHS number) | For clinical categories. |

Implementation note: the fields above are the Indonesian business view. Storage is country-neutral: NIK and other official numbers are entries of a generic identifier list, titles (gelar) are name prefixes and suffixes, and categories, professions and employment types are codes per jurisdiction. Confidential fields (NIK, date of birth, address) are stored apart from the employee record. See `../../design/account-and-workforce-collections.md` sections 4 and 10.

### 5.2 Workforce categories

Following `REG-UU17`:

| Category | Members | Credentialing committee |
|---|---|---|
| `tenaga_medis` | Doctors, dentists, specialists, subspecialists. | Komite Medik |
| `tenaga_keperawatan` | Nurses and midwives. A subset of Tenaga Kesehatan with its own committee. | Komite Keperawatan |
| `tenaga_kesehatan_lain` | Pharmacists, pharmacy technicians, medical laboratory technologists, radiographers, physiotherapists, nutritionists, and other health professions. | Komite Tenaga Kesehatan Lain |
| `non_klinis` | Administration, finance, IT, facility, security, and other support staff. | None |

The first three categories are **clinical**. Sections 6 and 7 apply only to clinical categories.

### 5.3 Organization unit and position

- **Organization unit**: a node in the organization chart (directorate, department, installation, ward, polyclinic). Each unit has one Head of Unit and may have a parent unit. A unit is marked `clinical` when patients are treated there.
- **Position**: a job in a unit (structural or functional), with a job description and the professions allowed to fill it.

### 5.4 Employment status

```
onboarding → probation → active ⇄ suspended
                ↓           ↓         ↓
                └────→ separated ←────┘
```

| Status | Meaning |
|---|---|
| `onboarding` | Hired; orientation and documents in progress. Not schedulable. |
| `probation` | Working under a probation period (PKWTT only, per `REG-PP35`). Schedulable. |
| `active` | Working. Schedulable. |
| `suspended` | Temporarily barred from work by an HR or disciplinary decision. Not schedulable. |
| `separated` | Employment ended. Terminal. |

Approved leave does not change employment status; it is handled in section 9.4.

### 5.5 Clinical eligibility

Clinical eligibility is the central rule that connects licenses, credentials and rosters. It is **derived** from other records on demand and never stored or edited by hand.

A clinical employee is **clinically eligible** to perform a clinical privilege in a unit on a date when all of the following hold on that date:

1. Employment status is `probation` or `active` (5.4).
2. The STR for their profession is `valid` (section 6).
3. A SIP naming this hospital as practice location is `valid` (section 6).
4. An SPK is `active` and covers the unit (section 7).
5. The privilege is granted in the RKK attached to that SPK (section 7).

Conditions 1–4 alone give **general clinical eligibility**, which is what rostering checks (section 8). Clinical modules check the full rule, including condition 5, for the specific privilege (section 13).

- **HR-ELG-001**: Clinical eligibility is derived from current records each time it is checked. It must not be cached beyond the end of the current day.
- **HR-ELG-002**: Every check that returns "not eligible" states which condition failed (`employment`, `str`, `sip`, `spk`, `privilege`), so users can fix the cause.

---

## 6. Professional License Management

### 6.1 Purpose

Ensure that every clinical employee holds the legal documents required to practise, that those documents were verified, and that the hospital acts before they lapse. The two documents are:

- **STR (Surat Tanda Registrasi)**: national registration of the practitioner in their profession. Under `REG-UU17` an STR is valid for life.
- **SIP (Surat Izin Praktik)**: permit to practise at a specific location, issued by the local government (Dinas Kesehatan kabupaten/kota). Under `REG-PP28` it is valid for a fixed period (five years at the time of writing) and its renewal requires SKP (Satuan Kredit Profesi) fulfilment.

### 6.2 Entities

#### Professional License

| Field | Description |
|---|---|
| Employee | |
| License type | `str`, `sip`. Extensible: further types (for example a specialist certificate) are added as configuration, not code. |
| Profession and specialty | Must match the employee's profession and specialty. |
| Document number | Unique per license type. |
| Issuing authority | For example KKI or the Ministry of Health for STR; the local Dinas Kesehatan for SIP. |
| Practice location | SIP only. Name and address of the facility the permit is for. |
| Is this hospital | SIP only. Whether the practice location is this hospital. |
| Issue date | |
| Expiry date | Nullable. Empty for lifetime STR. |
| Document file | Scan of the original document. |
| Status | See 6.3. |
| Verification record | Verifier, date, method, outcome, notes. |

#### SKP Record

Professional credit points earned by the employee (training, seminars, practice), with points, activity, date and evidence. SKP records support SIP renewal tracking. Where the national SKP platform is the source of truth, HRM stores the latest known total and the date it was checked.

### 6.3 License status

```
pending_verification → valid → expired
         ↓               ↓
      rejected        revoked
```

| Status | Meaning |
|---|---|
| `pending_verification` | Submitted, not yet checked. Does not count for clinical eligibility. |
| `valid` | Verified and not past the expiry date. |
| `rejected` | Verification failed. The record is kept for audit; a corrected license is submitted as a new record. |
| `expired` | Past the expiry date. Set by the System. |
| `revoked` | Withdrawn by the issuing authority before expiry. Recorded by HR Admin. |
| `superseded` | Replaced by a verified renewal for the same facility and profession (HR-LIC-006). Terminal. |

"Expiring" is not a status. A license is **expiring** when it is `valid` and its expiry date falls within the alert window (section 10, `LICENSE_ALERT_DAYS`).

### 6.4 Workflows

#### 6.4.1 Register a license

1. HR Admin, or the Employee through self-service, enters the license data and uploads the document.
2. The license enters `pending_verification`.
3. HR Admin verifies it (6.4.2).

#### 6.4.2 Verify a license (primary source verification)

1. HR Admin compares the uploaded document with the original document, presented in person.
2. HR Admin checks the license against the issuing authority's registry (for example the national health-worker registry). Until an integration exists, this is a manual check and the method is recorded as `manual_registry_check`.
3. HR Admin records the outcome:
   - Match: status becomes `valid`.
   - Mismatch: status becomes `rejected` with a reason. HR Manager is notified.

#### 6.4.3 Renew a SIP

1. The System sends expiry alerts (6.6).
2. The Employee applies for renewal at the Dinas Kesehatan. HR provides the supporting letter from the hospital on request.
3. When the new SIP is issued, it is registered as a **new** license record (6.4.1). The old record keeps its history and expires on its own date.

#### 6.4.4 Expiry and revocation

1. Every day, the System sets `valid` licenses whose expiry date has passed to `expired`.
2. When the issuing authority revokes a license, HR Admin records `revoked` with the effective date and reason.
3. In both cases, the System re-evaluates clinical eligibility (5.5) and triggers the rostering conflict check (8.5.4).

### 6.5 Business rules

- **HR-LIC-001**: A clinical employee must have a `valid` STR for their profession and a `valid` SIP for this hospital to be clinically eligible (5.5).
- **HR-LIC-002**: Only HR Admin may set a license to `valid`. A user may not verify a license they submitted.
- **HR-LIC-003**: A license whose profession or specialty differs from the employee's profession or specialty cannot be verified.
- **HR-LIC-004**: An STR has no expiry date unless the document states one. An STR issued before `REG-UU17` with an expiry date is handled per open question Q1.
- **HR-LIC-005**: A SIP must have an expiry date.
- **HR-LIC-006**: A SIP names exactly one hospital or clinic. At most one `valid` SIP may exist per employee, profession and facility at a time. A renewal may be registered while the old SIP is still valid; verifying it makes the old SIP `superseded` from the renewal's issue date. A renewal whose issue date is in the future cannot be verified before that date.
- **HR-LIC-007**: A Tenaga Medis may hold SIPs for a limited number of practice locations (`MAX_PRACTICE_LOCATIONS_MEDIS`, section 10). HR records SIPs for other locations when the employee declares them, and warns when the limit would be exceeded.
- **HR-LIC-008**: License records are never deleted. Corrections are made by rejecting the record and registering a new one.
- **HR-LIC-009**: An employee cannot leave `onboarding` for a clinical position until both STR and SIP are `valid`. HR Manager may approve the move to `probation` without a SIP, but the employee is then not clinically eligible (5.5) until the SIP is valid.
- **HR-LIC-010**: When a SIP is due to expire before its renewal and the latest SKP total is below the renewal requirement (`SKP_REQUIRED_POINTS`), the expiry alert states the shortfall.

### 6.6 Alerts

| Trigger | Recipients |
|---|---|
| Each threshold in `LICENSE_ALERT_DAYS` before expiry | Employee, HR Admin, Head of Unit |
| License expired | Employee, HR Admin, HR Manager, Head of Unit, chair of the credentialing committee |
| License rejected or revoked | Employee, HR Manager, Head of Unit, chair of the credentialing committee |

---

## 7. Credentialing and Clinical Privileging

### 7.1 Purpose

Ensure that each clinical employee performs only the clinical activities they are competent for, as assessed by peers and authorized by the Director (`REG-KMK`, `REG-KKP`, `REG-KARS`).

- **Credentialing (kredensial)**: the committee's assessment of a practitioner's qualifications, competence and conduct.
- **Clinical privilege (kewenangan klinis)**: a clinical activity the practitioner may perform.
- **RKK (Rincian Kewenangan Klinis)**: the list of privileges granted to a practitioner.
- **SPK (Surat Penugasan Klinis)**: the Director's letter that assigns a practitioner to clinical work in the hospital, with the RKK attached.

### 7.2 Entities

#### Privilege Catalog Item

The hospital's list of privileges that can be requested, maintained by each committee per profession or specialty (often called the "buku putih" of that profession).

| Field | Description |
|---|---|
| Code, name | For example `PD-012`, "Pemasangan kateter vena sentral". |
| Committee | Owning committee. |
| Profession and specialty | Who may request it. |
| Clinical level | Nurses and midwives: required clinical career level (PK I–V). |
| Required evidence | Certificates, logbook, training that must be attached. |
| Active | Retired items cannot be requested; existing grants remain until their SPK ends. |

#### Credential Application

| Field | Description |
|---|---|
| Employee | |
| Type | `initial`, `recredentialing`, `privilege_extension`, `temporary`. |
| Requested privileges | Catalog items, each with the requested condition (7.2, Privilege Grant). |
| Requested units | Units where the practitioner will practise. |
| Supporting documents | Diploma, specialist certificate, STR, SIP, logbook, training certificates, health statement, references. |
| Assessors | Mitra Bestari appointed by the committee. |
| Assessment | Per privilege: recommended condition or not recommended, with reason. |
| Committee recommendation | Date, signer, summary. |
| Status | See 7.3. |

#### SPK (Clinical Appointment)

| Field | Description |
|---|---|
| SPK number | Hospital letter number. |
| Employee | |
| Source application | |
| Credentialing facility | Facility whose committee recommended the SPK and whose Director issued it. |
| Units | Units the SPK covers: units of the credentialing facility; units of several facilities only when the tenant credentials at group level (`CREDENTIALING_SCOPE` `group`). |
| Valid from, valid until | |
| Status | See 7.3. |
| Issued by, issue date | Director or delegate. |
| Signed document | Scan of the signed letter. |

#### Privilege Grant

One line of the RKK attached to an SPK.

| Field | Description |
|---|---|
| SPK | |
| Privilege | Catalog item. |
| Condition | `full` (independent), `supervised` (only with a named supervisor), `restricted` (with written restrictions). |
| Supervisor | Required when `supervised`. Must hold the same privilege with condition `full`. |
| Restriction notes | Required when `restricted`. |
| Status | `active`, `suspended`, `revoked`. |

### 7.3 Statuses

**Credential Application**

```
draft → submitted → under_review → assessed → recommended → approved
  ↓         ↓            ↓            ↓            ↓
withdrawn withdrawn   returned     returned      rejected
                   (to draft)    (to draft)
```

| Status | Meaning |
|---|---|
| `draft` | Being prepared by the applicant or HR Admin. |
| `submitted` | Sent to the committee. |
| `under_review` | Subkomite Kredensial is checking completeness and assigning assessors. |
| `returned` | Sent back to `draft` for missing or incorrect documents. |
| `assessed` | All assessors have recorded their assessment. |
| `recommended` | Committee has signed its recommendation to the Director. |
| `approved` | Director has issued the SPK. Terminal. |
| `rejected` | Director, or the committee before recommendation, refused the application. Terminal. |
| `withdrawn` | Applicant withdrew before assessment. Terminal. |

**SPK**

| Status | Meaning |
|---|---|
| `active` | Within its validity period and not suspended or revoked. |
| `suspended` | Temporarily not effective, by Director decision after committee recommendation. |
| `revoked` | Permanently ended before `valid until`. Terminal. |
| `expired` | Past `valid until`. Set by the System. Terminal. |
| `superseded` | Replaced by a newer SPK for the same employee. Terminal. |

### 7.4 Workflows

#### 7.4.1 Initial credentialing

1. HR Admin or the applicant creates an application of type `initial`, selects privileges from the catalog and attaches documents.
2. The applicant submits. Status: `submitted`.
3. Subkomite Kredensial checks completeness (`under_review`), returns incomplete applications (`returned`), and appoints at least `MIN_ASSESSORS` Mitra Bestari.
4. Each assessor assesses each requested privilege (document review, interview, observation or logbook) and records the recommended condition.
5. When all assessments are recorded, the status becomes `assessed`.
6. The committee decides its recommendation, which may grant fewer privileges or stricter conditions than requested. Status: `recommended`.
7. The Director issues the SPK with the recommended RKK, or rejects with a reason. Status: `approved` or `rejected`.
8. On approval, the System creates the SPK and its Privilege Grants, and notifies the applicant, the Heads of the covered units and HR.

#### 7.4.2 Re-credentialing

1. `RECREDENTIAL_LEAD_DAYS` before an SPK expires, the System notifies the employee, HR Admin and the committee.
2. The application follows 7.4.1 with type `recredentialing`. The committee also considers the practitioner's performance evaluation (OPPE, section 9.6), incidents and complaints since the last SPK.
3. When the new SPK is issued, the old one becomes `superseded`.

#### 7.4.3 Privilege extension

A practitioner who gains a new competence applies with type `privilege_extension` for the additional privileges only. The flow is 7.4.1. On approval, a new SPK is issued that includes all existing privileges and the new ones, with the same `valid until` as the current SPK; the current SPK becomes `superseded`.

#### 7.4.4 Temporary privileges

For urgent needs (disaster, an unexpected absence, a visiting specialist), the Director may grant temporary privileges on the recommendation of the committee chair, without full assessment:

1. The application has type `temporary` and the requested duration.
2. Licenses must still be valid (HR-LIC-001).
3. The SPK is issued with a validity of at most `TEMPORARY_PRIVILEGE_MAX_DAYS`.

#### 7.4.5 Suspension, restriction and revocation

1. A Subkomite Mutu Profesi or Subkomite Etika dan Disiplin Profesi finding, a focused evaluation (FPPE) or a serious incident leads the committee to recommend suspending, restricting or revoking privileges.
2. The Director decides. The decision applies to the whole SPK or to individual Privilege Grants, with an effective date and a reason.
3. The System re-evaluates clinical eligibility (5.5), triggers the rostering conflict check (8.5.4) and notifies the employee, the Heads of the covered units and HR.
4. Lifting a suspension requires a new Director decision.

### 7.5 Business rules

- **HR-CRD-001**: A clinical employee may perform only privileges granted in an `active` Privilege Grant of an `active` SPK, with the grant's condition (5.5).
- **HR-CRD-002**: An SPK cannot be issued unless the employee's STR and SIP are `valid` on the issue date.
- **HR-CRD-003**: An SPK becoming ineffective because a license expired is not a revocation. The SPK stays `active`, but the employee is not clinically eligible until the license is valid again (5.5).
- **HR-CRD-004**: An SPK is valid for at most `SPK_VALIDITY_YEARS` years.
- **HR-CRD-005**: An assessor cannot assess their own application, an application of a relative, or an application where they declared a conflict of interest. The assessor records a conflict-of-interest declaration for each application.
- **HR-CRD-006**: A `supervised` grant requires a supervisor whose own grant for the same privilege is `full` and active. When the supervisor loses that grant, the supervised grant is flagged and the committee is notified.
- **HR-CRD-007**: Privileges can be requested only from active catalog items for the applicant's profession, specialty and, for nurses and midwives, clinical career level.
- **HR-CRD-008**: The committee may recommend fewer privileges or stricter conditions than requested, but never more than requested.
- **HR-CRD-009**: Each SPK covers explicit units. Clinical work in another unit requires an SPK that covers it. Under Indonesian regulation each facility credentials its own staff, so a practitioner working in several facilities of a group holds one SPK per facility. `HR-CRD-002` is checked for every facility an SPK covers.
- **HR-CRD-010**: Credentialing decisions are never deleted. Every status change records the user, date and reason (section 15).
- **HR-CRD-011**: A contracted practitioner (`mitra`) follows the same credentialing rules as an employee.

### 7.6 Alerts

| Trigger | Recipients |
|---|---|
| `RECREDENTIAL_LEAD_DAYS` before SPK expiry | Employee, HR Admin, committee secretary |
| Application waiting more than `CREDENTIAL_SLA_DAYS` in one status | Committee chair |
| SPK issued, suspended, revoked or expired | Employee, HR Admin, Heads of covered units |
| Supervisor lost the privilege (HR-CRD-006) | Committee chair, supervised practitioner, Head of Unit |

---

## 8. Shift Scheduling and Rostering

### 8.1 Purpose

Plan who works in each unit at every hour, so that every unit always has enough eligible staff, working time follows labour regulation, and clinical modules know who is on duty.

### 8.2 Entities

#### Shift Definition

| Field | Description |
|---|---|
| Code, name | For example `P` (Pagi), `S` (Siang/Sore), `M` (Malam), `L` (Libur, a day off), `ND` (non-shift office day). |
| Type | `regular`, `on_call_onsite`, `on_call_remote`, `off`. |
| Start time, end time | End may be on the next day (night shift). |
| Paid duration | Hours counted as working time. On-call counts per open question Q6. |
| Units | Units that may use this shift. Empty means all. |

#### Coverage Requirement

The minimum staffing per unit, shift and role.

| Field | Description |
|---|---|
| Unit, shift | |
| Day pattern | All days, weekdays, weekends and public holidays. |
| Workforce category, profession, specialty or clinical level | What kind of staff is counted. |
| Minimum count | |
| Team leader required | Whether at least one counted person must be assigned as team leader (Penanggung Jawab Shift). |

#### Roster

The plan for one unit for one period (`ROSTER_PERIOD`, normally a calendar month).

| Field | Description |
|---|---|
| Unit, period | One roster per unit and period. |
| Status | See 8.3. |
| Version | Increases on each published change. |
| Prepared by, approved by, published at | |

#### Roster Assignment

One person, one shift, one date.

| Field | Description |
|---|---|
| Roster | |
| Employee | |
| Date | The date the shift **starts**. |
| Shift | |
| Role | `staff`, `team_leader`, `supervisor`, `dpjp_on_call` (the responsible doctor on call). |
| Status | `planned`, `cancelled`. Attendance (9.3) records whether it was worked. |
| Source | `roster`, `swap`, `change_request`, `leave_cover` (9.4.4.3). |

#### Practice Schedule

The recurring weekly outpatient schedule of a Tenaga Medis, used by patient registration.

| Field | Description |
|---|---|
| Employee, polyclinic | |
| Day of week, start time, end time | |
| Quota | Maximum patients per session, if limited. |
| Valid from, valid until | |
| Exceptions | Dates the session is cancelled or moved, with reason (leave, training, emergency). |

#### Shift Swap Request

| Field | Description |
|---|---|
| Requester and requester's assignment | |
| Counterpart and counterpart's assignment | Empty when the requester only gives a shift away. |
| Reason | |
| Status | `requested`, `accepted_by_counterpart`, `approved`, `rejected`, `cancelled`. |

### 8.3 Roster status

```
draft → submitted → approved → published → closed
           ↓           ↓
        returned    returned
       (to draft)  (to draft)
```

| Status | Meaning |
|---|---|
| `draft` | Head of Unit is preparing it. Not visible to staff. |
| `submitted` | Sent for approval. Only when `ROSTER_APPROVAL_REQUIRED` is on; otherwise the Head of Unit publishes directly. |
| `approved` | Approved, waiting for publication. |
| `published` | Visible to staff and to other modules. Changes go through swaps or change requests (8.4.3). |
| `closed` | The period ended and attendance was reconciled. No changes. |

### 8.4 Workflows

#### 8.4.1 Prepare and publish a roster

1. At least `ROSTER_PUBLISH_LEAD_DAYS` before the period starts, the Head of Unit creates the draft. The System may pre-fill it from the previous period or from a rotation pattern, or the Head of Unit imports assignments from a CSV file (checked as a whole and applied only when confirmed; draft rosters only). Assignments can also be entered one at a time.
2. The Head of Unit assigns staff. The System validates each assignment against 8.5 as it is entered and shows violations immediately.
3. The Head of Unit submits the roster, or publishes it when approval is not required. The System re-validates the whole roster.
4. The approver (HR Manager or the head of the parent unit, per configuration) approves or returns it.
5. On publication, staff are notified and the roster becomes visible to the clinical and registration modules.

#### 8.4.2 Shift swap

1. An employee requests a swap through self-service.
2. The counterpart accepts.
3. The System validates both resulting assignments against 8.5.
4. The Head of Unit approves or rejects.
5. On approval, the original assignments are `cancelled` and new ones are created with source `swap`; the roster version increases and both employees are notified.

#### 8.4.3 Change after publication

The Head of Unit may add, cancel or move assignments in a published roster (for example after sickness). Each change requires a reason, is validated against 8.5, increases the roster version, and notifies the affected employees.

#### 8.4.4 Practice schedule maintenance

1. HR Admin or the Head of the polyclinic maintains Practice Schedules.
2. Approved leave of the doctor creates `cancelled` exceptions automatically (9.4.4.3, HR-LEV-021); approved training will do the same (9.5).
3. The registration module is notified of every change, so that booked patients can be contacted.

### 8.5 Business rules

#### 8.5.1 Eligibility

- **HR-ROS-001**: Only employees with status `probation` or `active` can be assigned.
- **HR-ROS-002**: A clinical employee can be assigned to a shift in a clinical unit only when they are generally clinically eligible (5.5, conditions 1–4) for that unit on the date of the shift.
- **HR-ROS-003**: An employee cannot be assigned on a date covered by their approved leave (9.4), suspension or approved training.
- **HR-ROS-004**: A Practice Schedule session can belong only to a Tenaga Medis who is generally clinically eligible for that polyclinic on the session date.

#### 8.5.2 Working time

Defaults follow `REG-PP35`. Values are configurable (section 10) because the hospital's collective agreement (Perjanjian Kerja Bersama) may set stricter limits.

- **HR-ROS-010**: An employee cannot have two assignments that overlap in time, in any unit.
- **HR-ROS-011**: The rest between the end of one assignment and the start of the next must be at least `MIN_REST_HOURS`.
- **HR-ROS-012**: Regular working time per week must not exceed `MAX_WEEKLY_HOURS`. Hours above it are overtime.
- **HR-ROS-013**: Overtime must not exceed `MAX_OVERTIME_HOURS_DAY` per day or `MAX_OVERTIME_HOURS_WEEK` per week, and requires the employee's documented consent.
- **HR-ROS-014**: An employee must have at least one rest day (`L`) in every 7 consecutive days.
- **HR-ROS-015**: An employee must not work more than `MAX_CONSECUTIVE_NIGHTS` night shifts in a row.
- **HR-ROS-016**: Working time rules apply across all units the employee works in, not per roster.

#### 8.5.3 Coverage

- **HR-ROS-020**: Every shift of every day in the period must meet each Coverage Requirement of the unit.
- **HR-ROS-021**: A roster that breaks HR-ROS-020 cannot be submitted or published unless the approver records an override with a reason. The override is listed in the coverage report (section 12).
- **HR-ROS-022**: When a team leader is required, exactly one assignment in that shift has the role `team_leader`, and that person must meet the requirement's profession and clinical level.

#### 8.5.4 Changes in eligibility after publication

- **HR-ROS-030**: When an employee's eligibility changes (license expired or revoked, SPK suspended or revoked, suspension), the System checks all their future published assignments and Practice Schedule sessions. Approved leave does not raise flags: its approval cancels the assignments and sessions itself (9.4.4.3).
- **HR-ROS-031**: Assignments that are no longer valid are **flagged, not cancelled**. The Head of Unit and HR Admin are notified and must resolve them through a change (8.4.3). Until resolved, the clinical modules treat the person as not on duty (section 13).
- **HR-ROS-032**: The daily check also runs for the coming `ROSTER_LOOKAHEAD_DAYS`, so that licenses about to expire are caught before the shift.

#### 8.5.5 Integrity

- **HR-ROS-040**: Assignments of a `closed` roster cannot change.
- **HR-ROS-041**: Assignments in the past cannot be changed, except to correct attendance reconciliation, by HR Admin, with a reason.
- **HR-ROS-042**: Every change to a published roster keeps the previous version (section 15).

### 8.6 Alerts

| Trigger | Recipients |
|---|---|
| Roster published or changed | Affected employees |
| Roster not published `ROSTER_PUBLISH_LEAD_DAYS` before the period | Head of Unit, HR Manager |
| Coverage override recorded | HR Manager |
| Assignment flagged (HR-ROS-031) | Head of Unit, HR Admin, the employee |
| Swap request waiting for action | Counterpart, then Head of Unit |
| Practice Schedule changed | Registration module, Head of polyclinic |

---

## 9. Other Sub-processes (Outline)

These sections must be detailed, in the format of sections 6–8, before implementation. Sections 9.3, 9.4 and 9.10 are detailed in full.

### 9.1 Recruitment and onboarding

- **Purpose**: fill approved positions and prepare new staff to work safely.
- **Entities**: Job Requisition, Candidate, Offer, Onboarding Checklist, Orientation Record.
- **Known rules**: pre-employment health check is required; general hospital orientation and unit orientation must be completed before independent work (`REG-KARS`); clinical hires follow sections 6 and 7 before clinical work.

### 9.2 Organization and position management

- **Purpose**: maintain the organization chart, positions and job descriptions.
- **Entities**: Organization Unit, Position, Job Description, Assignment History (transfers, promotions).
- **Known rules**: each unit has one Head of Unit at a time; history of every transfer is kept.

### 9.3 Attendance and time

Detail level: **Full** (agreed 2026-11-23). This section follows the format of sections 6–8.

#### 9.3.1 Purpose

Record when people actually worked, against the roster, so the Head of Unit sees who came, who was late and who was missing, overtime is paid only when approved, and a roster period can be closed with a true record. The engine knows only the mechanics: clock events in, one attendance record per planned shift out. Tolerances are tenant parameters (section 10).

#### 9.3.2 Entities

##### Attendance Device

A clock (fingerprint, face recognition, card or other) at a facility, identified by a code unique in the facility. Devices send clock events through the attendance integration (9.3.4.1). The hospital owns the device and the biometric templates it holds; **HRM never receives or stores biometric data**, only the user number the device reports.

##### Enrolment

The link between an employee and the user number a facility's devices use for them (for example a badge number). One active enrolment per employee and facility; a user number is unique among the active enrolments of a facility.

##### Clock Event

One instant at which an employee was seen by a device, imported from a file, or entered by hand through an approved correction. It holds the instant (UTC), the direction when the device reports it (`in`, `out`, or `unknown`), the source (`device`, `import`, `correction`) and, for device events, the device and the device's own event identifier, so a resent event is stored once. Events whose user number has no enrolment are kept as **unmatched** for HR to resolve. Clock events are never edited or deleted; a wrong one is superseded by a correction.

##### Attendance Record

What happened to one planned shift (a roster assignment of a shift that is not `off`), derived from the clock events by reconciliation (9.3.4.2):

| Field | Description |
|---|---|
| Assignment | The roster assignment, with its employee, unit, date and planned start and end. |
| Status | `open` (not reconciled yet), `worked` or `absent`. |
| First in, last out | The instants used, or empty. |
| Worked minutes | From first in to last out, capped to nothing beyond what the events show. |
| Late, early leave minutes | Beyond the grace minutes. |
| Overtime | Minutes worked after the planned end (and before the planned start when the Head asked for it), the minutes **approved** by the Head, and who approved them. Planned overtime with consent (`HR-ROS-013`) counts as approved up to its planned minutes. |
| Flags | `missing_in`, `missing_out`, `late`, `early_leave`, `overtime_pending`. |

A day with clock events and no planned shift gives an **unplanned work** record for the Head to review.

##### Attendance Correction

A request to fix a record: a missing or wrong clock in or out, or "I was absent for a reason". The employee (or the Head on their behalf) asks with a reason; the Head of Unit approves or rejects. An approved correction adds `correction` clock events (or marks the absence excused) and the record is reconciled again.

#### 9.3.3 Attendance record status

| Status | Meaning |
|---|---|
| `open` | The shift has not ended plus `ATTENDANCE_CLOSE_AFTER_MINUTES`, or it is being reconciled again. |
| `worked` | At least one clock event matched the shift. Flags say what was missing or late. |
| `absent` | No clock event matched. An approved correction may mark it `excused`, which keeps the status and says why in the change history. |

Records stay changeable through corrections until their roster is closed; after that they are final (`HR-ATT-012`).

#### 9.3.4 Workflows

##### 9.3.4.1 Clock events in

1. The facility's device gateway (a service account with the ingest permission) sends events in batches: device code, device event identifier, user number, instant, direction.
2. HRM stores each new event once (device and device event identifier), maps the user number to the employee through the active enrolment, and keeps the rest as unmatched.
3. Where no gateway exists, HR imports a CSV of clock events (check, then apply, as the roster import does, 5.6).

##### 9.3.4.2 Reconciliation

1. The System picks each planned shift that ended `ATTENDANCE_CLOSE_AFTER_MINUTES` ago, or whose events changed.
2. It matches the employee's clock events from `ATTENDANCE_MATCH_BEFORE_MINUTES` before the planned start to `ATTENDANCE_MATCH_AFTER_MINUTES` after the planned end. Shifts that cross midnight use their instants, so nothing special happens at midnight. An event inside two shifts' windows belongs to the nearer one.
3. First in is the earliest matched event, last out the latest; a single event is `missing_out` (or `missing_in` when the device says `out`).
4. Late, early leave and overtime are computed against the planned start and end with `ATTENDANCE_LATE_GRACE_MINUTES` and `OVERTIME_MIN_MINUTES`.
5. Events that match no shift on a day form an unplanned work record.

##### 9.3.4.3 Corrections and overtime

1. The employee asks for a correction of their own record within `ATTENDANCE_CORRECTION_DAYS` of the shift date, with a reason.
2. The Head of the unit of the shift approves or rejects with a reason. The Head may also correct a record directly with a reason. Nobody approves their own correction.
3. The Head approves overtime minutes on a record, at most the minutes worked over the plan.

##### 9.3.4.4 Closing a roster

Closing a roster (8.3) needs every attendance record of its period out of `open` and no pending correction or overtime decision.

#### 9.3.5 Business rules

- **HR-ATT-001**: HRM stores no biometric data and no location; a clock event holds the user number, the device and the instant only.
- **HR-ATT-002**: A device event is stored once, identified by the device and its event identifier; a resent batch changes nothing.
- **HR-ATT-003**: An event whose user number has no active enrolment is kept unmatched and never guessed onto an employee.
- **HR-ATT-004**: Each planned shift that is not `off` has exactly one attendance record; cancelled shifts have none.
- **HR-ATT-005**: Reconciliation is derived from the clock events and the planned shift only, and can be repeated with the same result.
- **HR-ATT-006**: Instants are UTC; dates and the shift window are those of the facility's zone (`database.md` 4.4).
- **HR-ATT-007**: Late and early leave count only beyond `ATTENDANCE_LATE_GRACE_MINUTES`.
- **HR-ATT-008**: Overtime counts only from `OVERTIME_MIN_MINUTES`, and is paid only when approved; planned overtime with consent is approved up to its planned minutes.
- **HR-ATT-009**: A correction needs a reason and the Head of Unit's approval; the requester never approves it.
- **HR-ATT-010**: A correction adds events or marks an absence excused; it never edits or deletes an event.
- **HR-ATT-011**: An employee sees only their own records and events; the Head sees those of the units they head.
- **HR-ATT-012**: After its roster is closed a record is final.
- **HR-ATT-013**: A roster can be closed only when its records are reconciled and no correction or overtime decision is pending.

#### 9.3.6 Alerts

Sent when the notification service exists (section 11): a missing clock out to the employee the day after; absences and late arrivals of the day to the Head of Unit; corrections waiting longer than `ATTENDANCE_DECISION_SLA_DAYS` to the Head's superior; unmatched events to HR Admin.

#### 9.3.7 Not in this section

Payroll amounts (9.7, open question Q8), shift allowances, attendance of staff without a roster (for example office staff on a fixed schedule: a later extension that plans them a weekly roster), geofenced mobile clocking, and exporting attendance to an external payroll system.

### 9.4 Leave management

Detail level: **Full** (agreed 2026-11-18). This section follows the format of sections 6–8.

#### 9.4.1 Purpose

Let staff take the leave they are entitled to, let the Head of Unit decide with the unit's work in view, and keep the roster and the practice schedules true: a person on approved leave is never planned to work, and every leave day taken can be traced to an entitlement.

The module is one engine for every hospital and country. The engine knows only the mechanics (requests, decisions, balances, the effect on the roster). Which leave types exist, how many days they give and how days are counted is **policy data** per tenant (9.4.2, Leave Policy), loaded from a country bundle and adjusted to the hospital's collective agreement (Perjanjian Kerja Bersama, PKB). Nothing Indonesian is coded in the engine.

#### 9.4.2 Entities

##### Leave Type

A kind of leave, for example annual leave or sick leave. A code of a jurisdiction code system (`id.leave-type`, `us.leave-type`, ...), so reports can compare tenants and countries. The rules of a type live in its policy.

##### Leave Policy

The rules of one leave type in one tenant, valid from a date. A PKB revision is a new policy version with a later `effective from`; a request keeps the rules that applied when it was made.

| Field | Description |
|---|---|
| Leave type | The code. |
| Effective from | First date this version applies. |
| Balance | `period` (a yearly entitlement), `per_event` (each request is its own entitlement, up to a maximum, for example marriage leave) or `none` (no balance: sick leave with a doctor's note, unpaid leave, "unavailable" for contracted practitioners). |
| Entitlement period | For `period` only: `calendar_year` or `service_year` (from the anniversary of the service start date, 9.4.5). |
| Days per period, or per event | For example 12 for annual leave, 3 for marriage leave. |
| Minimum service | Months of continuous service before the first entitlement, for example 12 for annual leave. |
| Counting | `working_days` (9.4.6) or `calendar_days` (every day counts, for example maternity leave). |
| Half days | Whether half days may be requested. |
| Paid | Whether the leave is paid. Read by payroll (9.7). |
| Who may use it | Employment types allowed; empty means all. Contracted practitioners (`mitra`) normally get only `none` types. |
| Approval | `one_step` (Head of Unit) or `two_step` (Head of Unit, then HR Manager), optionally two-step only above a number of days. |
| Notice | Minimum days between the request and the first leave day; 0 for none. |
| After the fact | How many days after the leave started it may still be requested (9.4.4.6); 0 means only future dates. |
| Maximum per request | Days. |
| Proof | Whether proof is required (for example a doctor's note) and how many days after the leave starts it is due. |
| Carry-over | For `period` only: days that move to the next period and how many months they stay usable; 0 for none. |
| Collective leave | For `period` only: whether the facility's collective leave days (*cuti bersama*, holiday calendar kind `collective_leave`) are taken from this balance (HR-LEV-031). Off unless the hospital's regulation says otherwise. |
| Notes | Legal basis, for example the PKB article. |

##### Leave Balance

A **ledger**, never a number someone overwrites. Each entry belongs to one employee, one leave type and one entitlement period, and the balance is the sum of the entries.

| Entry | Meaning |
|---|---|
| `grant` | The entitlement of a period, posted by the System (9.4.5). |
| `use` | Days of an approved request, or a collective leave day. |
| `reversal` | Days given back: a cancelled or shortened leave, or a request whose type HR changed. |
| `adjustment` | HR Manager corrects the balance, up or down, with a reason. |
| `carry_over` | Unused days moved in from the previous period, with the date they expire. |
| `expiry` | Unused days that lapse at the end of a period or of a carry-over. |

**Available** days are the balance minus the days of the employee's pending requests of that type, so two requests can never spend the same days.

##### Leave Request

| Field | Description |
|---|---|
| Employee | The requester. |
| Leave type, policy version | |
| First date, last date | Local dates of the employee's facility. Half days only on the first or the last date, when the policy allows them. |
| Day breakdown | Each date of the leave with its count (1, 0.5 or 0) and why (`working`, `rest_day`, `holiday`, `collective_leave`). Proposed at the request and fixed at the final approval (9.4.6). |
| Days | The sum of the breakdown. |
| Reason | Free text from the requester. Highly confidential (section 14). |
| Proof | File reference, with the date it is due. Highly confidential. |
| Deciders | The Head who decides the first step and, for two-step types, HR Manager (9.4.4.2). |
| Replacement | The employee who covers the work, named by the Head of Unit at the first step, or "no replacement" with a reason. |
| Decisions | Per step: who, when, outcome, reason. |
| Status | See 9.4.3. |
| Cover proposal | After the final approval: the requester's cancelled shifts and whether each can go to the replacement (9.4.4.3). |

#### 9.4.3 Leave request status

```
requested → head_approved → approved → (ended early)
    ↓             ↓             ↓
 rejected      rejected     cancelled
 cancelled     cancelled
```

| Status | Meaning |
|---|---|
| `requested` | Waiting for the Head of Unit. The days are reserved (not available to other requests). |
| `head_approved` | Two-step types only: the Head approved and named the replacement; waiting for HR Manager. The days stay reserved. The roster is not touched yet. |
| `approved` | Final approval. The days are used and the roster and the practice schedule are changed (9.4.4.3). |
| `rejected` | Refused at either step, with a reason. Terminal. The reservation ends. |
| `cancelled` | Withdrawn before the leave started (9.4.4.4). Terminal. Days used are given back. |

Ending a leave early (9.4.4.5) keeps the status `approved` and moves the last date.

#### 9.4.4 Workflows

##### 9.4.4.1 Request leave

1. The Employee requests leave through self-service: type, dates, half days, reason. HR Admin may enter a request on the employee's behalf, for example when the employee calls in sick; the employee stays the requester.
2. The System checks the policy (9.4.7) and proposes the day breakdown (9.4.6). The request is refused when the available days are not enough.
3. The request enters `requested` and the deciding Head is chosen (9.4.4.2).

##### 9.4.4.2 Decide

1. **Who decides the first step.** The Head of Unit of the requester's unit: the holder of the head-of-unit position of the unit of the requester's open primary assignment (9.2). When the requester is that Head, or the unit has no Head, the head of the parent unit decides; when the parent unit has no Head either, or there is no parent unit, or the requester has no open primary assignment, HR Manager decides. The unit is chosen when the request is made; the Head of that unit is found again when the decision is made, so a newly appointed Head can decide. Nobody decides their own leave (HR-LEV-010).
2. **The Head of Unit** reviews the reason and the unit's roster and:
   - adjusts the day breakdown to the unit's shift pattern when needed (9.4.6, step 3);
   - names the **replacement**, an employee of the tenant on `probation` or `active` who is not the requester, or records "no replacement" with a reason (for example when the requester has no shifts in the period);
   - approves or rejects with a reason.
3. **One-step types**: the Head's approval is final (`approved`).
4. **Two-step types**: the request becomes `head_approved`, and HR Manager approves (`approved`) or rejects (`rejected`). HR Manager confirms the leave itself and does not change the replacement or the day breakdown. The same person never gives both approvals of one request.

##### 9.4.4.3 Effects of the final approval

In one transaction with the approval:

1. The days are posted as `use` entries of the balance (none for `none` types).
2. The requester's `planned` roster assignments on the leave dates are cancelled with the reason `leave`, in rosters that are not `closed` (HR-LEV-020). A published roster's revision increases (8.4.3). A leave approval never fails because of a roster rule.
3. The requester's Practice Schedule sessions on the leave dates get a `cancelled` exception with the source `leave` (8.4.4). The replacement does **not** take over polyclinic sessions: patients book a specific doctor, so registration decides what happens to booked patients.

Then the **cover proposal** is offered to the Head of Unit: each cancelled assignment dated today or later, with whether the replacement can take it, checked as an assignment added by hand (8.5: eligibility, overlap, rest, weekly hours, night runs). The Head selects the shifts to give to the replacement, adjusts them if needed, and confirms in one action. Confirmed shifts become new assignments with the source `leave_cover`; a shift that fails a rule is not created. Shifts that nobody takes show as coverage gaps in roster validation (8.5.3). The proposal can be confirmed only into a `draft` or `published` roster (8.4.3).

Half days do not cancel the shift of that date; the cover proposal lists them so that the Head adjusts the shift by hand.

##### 9.4.4.4 Cancel a request

1. The requester cancels a request that is `requested` or `head_approved`. The reservation ends.
2. An `approved` leave that has not started is cancelled by the requester or HR Admin, with a reason. The `use` entries are reversed and the leave's Practice Schedule exceptions are undone. **Cancelled roster assignments are not restored**, because someone may already cover them; the Head re-plans by hand.
3. A leave that has started cannot be cancelled; it is ended early (9.4.4.5).

##### 9.4.4.5 End a leave early

When the employee returns before the last date, HR Admin sets a new last date, from the first date to the day before the current last date, with a reason. The days after the new last date are reversed and their Practice Schedule exceptions undone; roster assignments are not restored (9.4.4.4).

##### 9.4.4.6 Leave requested after the fact

Some leave is known only after it starts, for example sick leave or the death of a family member.

1. A policy with "after the fact" set to N days allows a first date up to N days before today in the employee's facility.
2. On approval, assignments of past dates are cancelled as a past-date correction with the reason `leave` (HR-ROS-041), and are never offered for cover. Today's and later assignments follow 9.4.4.3.
3. Policies without this setting accept only a first date of today or later, and at least the notice days ahead.

##### 9.4.4.7 Proof

1. When the policy requires proof, the requester or HR Admin attaches it until the due date (the policy's days after the first leave date).
2. A request whose proof is missing after the due date is listed as **proof overdue** for HR Admin.
3. HR Admin may then **change the leave type** of an approved request, for example from sick leave to annual or unpaid leave, with a reason. The `use` entries of the old type are reversed and those of the new type posted; when the new type's available days are not enough, the change is refused and HR picks another type. The roster is not touched again.

#### 9.4.5 Entitlements

1. **Service start date.** Continuous service counts from the start of the earliest employment contract in the unbroken run of contracts that reaches the current one: a renewed PKWT continues the service, a gap of one day or more starts a new one. The original hire date (5.1) is not used, because it survives a rehire.
2. **Grants.** For each `period` policy, the System posts one `grant` per employee and entitlement period once the employee has the minimum service and an employment type the policy allows. For `service_year` the period runs from the service anniversary; for `calendar_year`, from 1 January. The grant of a coming period is posted `LEAVE_GRANT_LEAD_DAYS` before it starts, so requests for the next period can be made. A grant is posted once; a second pass changes nothing.
3. **No proration.** A period's grant is the full days of the policy. Proration for part-time or partial periods is not built (open question Q13).
4. **Using days.** A request is charged to the entitlement period that contains its first date and cannot extend past the end of that period; a longer leave is two requests. Carried-over days are used before the period's own days.
5. **Period end.** Unused days up to the carry-over limit become a `carry_over` entry of the next period with its expiry date; the rest lapse as `expiry`. Carried-over days not used by their expiry date lapse too.
6. **Separation.** A separated employee gets no further grants. What happens to unused days (payment in the final settlement) belongs to 9.10.
7. **No negative balance.** Only HR Manager can add days, as an `adjustment` with a reason (for example an advance).

#### 9.4.6 Counting leave days

For `calendar_days` policies every date of the leave counts as 1.

For `working_days` policies each date is counted as follows. Weekly rest days, public holidays and collective leave days never count.

1. **The roster proposes**: when a published or draft roster of the requester's unit covers the date, the date counts only when the requester has a `planned` assignment of a shift that is not of type `off` on it.
2. **Otherwise the working week proposes**: the date counts when it is a working day of the facility's working week (`LEAVE_WORKING_WEEK`) and not a public holiday or collective leave day of the facility's holiday calendars.
3. **The Head of Unit decides**: before the first-step approval, the Head may mark any date of the leave as a rest day, or a proposed rest day as a working day, to match the unit's shift pattern (for example the regular days off of a three-shift ward).
4. The breakdown is **fixed at the final approval**. Later roster or calendar changes do not change it; a correction is an HR Manager `adjustment` with a reason.

Half days count 0.5 on a date that counts.

#### 9.4.7 Business rules

##### Requests

- **HR-LEV-001**: A request needs a leave type whose policy is in force on the first date and allows the employee's employment type. Requests cannot be made for a retired type.
- **HR-LEV-002**: An employee cannot have two requests that share a date, unless the earlier one is `rejected` or `cancelled`.
- **HR-LEV-003**: A request needs enough available days (9.4.2, Leave Balance) of its type and period, and at most the policy's days per request; `per_event` types need at most the days per event. The days are checked again at each approval, without the request's own reservation, because the Head's breakdown or an adjustment may change them.
- **HR-LEV-004**: The first date respects the policy's notice, or its after-the-fact limit (9.4.4.6).
- **HR-LEV-005**: Only employees on `probation` or `active` can request leave. Suspended and separated employees cannot.

##### Decisions

- **HR-LEV-010**: Nobody decides their own leave. The deciding Head is chosen by 9.4.4.2 step 1, and the same person never gives both approvals of a two-step request.
- **HR-LEV-011**: A rejection needs a reason.
- **HR-LEV-012**: The first-step approval names a replacement, or records "no replacement" with a reason. The replacement is an employee of the tenant on `probation` or `active` and is not the requester.

##### Roster and practice schedule

- **HR-LEV-020**: On final approval, the requester's planned assignments on full leave days are cancelled with the reason `leave` in rosters that are not `closed`, including `submitted` and `approved` rosters; such a roster must be validated again before it is published. Assignments of a `closed` roster are never touched (HR-ROS-040).
- **HR-LEV-021**: On final approval, the requester's Practice Schedule sessions on leave days get a `cancelled` exception with the source `leave`, past dates of a leave requested after the fact included; cancelling or shortening the leave undoes the exceptions of the dates it frees, when those dates are today or later.
- **HR-LEV-022**: The cover proposal never creates an assignment that breaks a rule of 8.5, and is offered only for dates of today or later.
- **HR-LEV-023**: Cancelled roster assignments are never restored automatically when a leave is cancelled or shortened.

##### Balances

- **HR-LEV-030**: Balance entries are never edited or deleted. Every change is a new entry; adjustments need a reason.
- **HR-LEV-031**: When a policy takes collective leave from its balance, each collective leave day of the employee's facility calendar is posted as a `use` entry the day after it, **only when the employee had no working assignment that date**. Employees who worked keep the day.
- **HR-LEV-032**: A balance cannot go below zero except through an HR Manager adjustment.

##### Integrity and privacy

- **HR-LEV-040**: Leave requests are never deleted. Every status change records the user, date and reason (section 15).
- **HR-LEV-041**: The leave type, the reason and the proof of a request are not shown to colleagues or in the roster. A cancelled assignment shows only the reason `leave`. Reading the proof is audited (HR-AUD-003).

#### 9.4.8 Indonesian bundle

The starter policies for Indonesian tenants. Every value must be verified against `REG-UUK`, `REG-PP35`, UU No. 4/2024 (Kesejahteraan Ibu dan Anak) and the hospital's PKB before go-live (section 3). Codes are in `id.leave-type`.

| Code | Leave | Balance | Days | Counting | Approval | After the fact | Proof |
|---|---|---|---|---|---|---|---|
| `tahunan` | Annual | `period`, `service_year`, after 12 months | 12 | working | one-step | 0 | no |
| `sakit` | Sick, with a doctor's note | `none` | | working | one-step | 3 | doctor's note, 3 days |
| `melahirkan` | Maternity | `per_event` | 90 *(verify; UU 4/2024 allows longer)* | calendar | two-step | 0 | yes |
| `keguguran` | Miscarriage | `per_event` | 45 | calendar | two-step | 3 | yes |
| `haid` | Menstrual leave | `none` | | working | one-step | 1 | no |
| `menikah` | Own marriage | `per_event` | 3 | working | one-step | 0 | yes |
| `menikahkan_anak` | Marriage of a child | `per_event` | 2 | working | one-step | 0 | no |
| `khitan_baptis_anak` | Circumcision or baptism of a child | `per_event` | 2 | working | one-step | 0 | no |
| `istri_melahirkan` | Wife gives birth or miscarries | `per_event` | 2 *(verify; UU 4/2024)* | working | one-step | 3 | yes |
| `duka_keluarga` | Death of a spouse, parent, parent-in-law, child or child-in-law | `per_event` | 2 | working | one-step | 3 | no |
| `duka_serumah` | Death of another household member | `per_event` | 1 | working | one-step | 3 | no |
| `tanpa_upah` | Unpaid | `none` | | working | two-step | 0 | no |
| `tidak_tersedia` | Unavailable (contracted practitioners) | `none` | | working | one-step | 0 | no |

`tidak_tersedia` is allowed only for `mitra`; every other type excludes `mitra`. Annual leave carries over nothing and does not take collective leave unless the PKB says otherwise.

#### 9.4.9 Alerts

| Trigger | Recipients |
|---|---|
| Request waiting for a decision | The deciding Head, then HR Manager for two-step types |
| Request waiting longer than `LEAVE_DECISION_SLA_DAYS` | The decider's superior (section 11) |
| Request approved, rejected, cancelled or ended early | Requester |
| Named as replacement | Replacement |
| Cover proposal waiting to be confirmed | Head of Unit |
| Proof due in 1 day, and proof overdue | Requester, HR Admin |
| Carried-over days expiring within 30 days | Employee |

Notifications never name the leave type or the reason (section 11, HR-LEV-041).

#### 9.4.10 Not in this section

- Leave of absence for training (9.5) and suspension (9.9) also block rostering (HR-ROS-003); they are recorded by those sub-processes.
- Payment of unused days at separation (9.10) and pay of unpaid leave (9.7).
- Attendance reconciliation of leave days (9.3).
- Pending and future approved leave of an employee who separates or is suspended (9.10, 9.9).

### 9.5 Training and competency

- **Purpose**: track mandatory and professional training.
- **Entities**: Training Catalog, Training Record, Certificate.
- **Known rules**: mandatory training (for example basic life support, infection prevention and control, fire safety, patient safety) has an expiry; expired mandatory training is reported to the Head of Unit; clinical training records feed SKP (6.2) and credentialing evidence (7.2).

### 9.6 Performance management

- **Purpose**: evaluate staff performance.
- **Entities**: Appraisal Cycle, Appraisal, KPI, OPPE (Ongoing Professional Practice Evaluation), FPPE (Focused Professional Practice Evaluation).
- **Known rules**: OPPE for clinical staff runs periodically and feeds re-credentialing (7.4.2); FPPE is used for new privileges and after concerns, and may lead to 7.4.5.

### 9.7 Compensation and payroll

- **Purpose**: calculate pay from HR data.
- **Entities**: Salary Structure, Payroll Component, Payroll Period, Payslip, Jasa Medis (medical service fee) Allocation.
- **Known rules**: BPJS Kesehatan and BPJS Ketenagakerjaan contributions (`REG-BPJS`); PPh 21 withholding (`REG-PPH21`); overtime pay from approved overtime (9.3); jasa medis distribution follows the hospital remuneration policy. Whether payroll is built in HRM or integrated is open question Q8.

### 9.8 Occupational health and safety

- **Purpose**: protect staff health.
- **Entities**: Health Check Record, Vaccination Record, Occupational Incident (for example needle-stick injury).
- **Known rules**: periodic health checks; required vaccinations (for example Hepatitis B) for clinical staff; health data is the most sensitive data class (section 14).

### 9.9 Discipline and grievance

- **Purpose**: handle misconduct and complaints fairly.
- **Entities**: Disciplinary Case, Warning Letter (SP1, SP2, SP3), Grievance.
- **Known rules**: warning letters have validity periods (`REG-PP35`); professional ethics and discipline cases go to the relevant committee subcommittee and may lead to 7.4.5.

### 9.10 Separation

Detail level: **Full** (agreed 2026-11-23). This section follows the format of sections 6–8.

#### 9.10.1 Purpose

End employment cleanly: once HR records that someone is leaving, nobody plans them after their last day, and when that day is over every place that still names them is closed the same way, at the same time: shifts, polyclinic sessions, leave, clinical privileges, committee seats, positions, the contract and the account. What is left to settle (unused leave days, items to return) is listed for HR and payroll.

#### 9.10.2 Entities

##### Separation

| Field | Description |
|---|---|
| Employee | Who is leaving. At most one separation that is not cancelled per employee. |
| Type | A tenant code (`id.separation-type`: for example resignation, end of contract, dismissal, retirement, death). The code's property `contract_action` says whether the contract is ended (`end`) or terminated (`terminate`) at completion. |
| Last working day | The last day the employee works, a local date of the facility. Today or later when recorded; earlier only with immediate effect. |
| Notice received on | The date the resignation or notice was given, for reports. |
| Immediate | For a dismissal or a death: completed when recorded, not after the last working day. |
| Reason | Free text, confidential: never in lists or logs. |
| Status | `planned`, `completed` or `cancelled` (9.10.3). |
| Exit checklist | One item per active code of the tenant's `id.exit-checklist-item` system (for example return of badge and uniform, handover of patients, return of keys), each with who marked it done and when. |
| Settlement | Filled at completion: per yearly leave type, the days left on the last working day (negative when more was taken than earned); other items HR notes. No amounts: pay is 9.7. |

#### 9.10.3 Separation status

| From | To | By | When |
|---|---|---|---|
| — | `planned` | HR Admin | The separation is recorded. |
| `planned` | `completed` | System | The day after the last working day, in the facility's zone. |
| `planned` | `completed` | HR Manager | At once, for an immediate separation. |
| `planned` | `cancelled` | HR Admin | Before completion, with a reason (a resignation withdrawn). |

`completed` and `cancelled` are final. A completed separation sets the employee to `separated` (5.4); someone who returns is a new hire (rehire is not in this section).

#### 9.10.4 Workflows

##### 9.10.4.1 Recording a separation

1. HR Admin records the type, the last working day, the notice date and the reason.
2. HRM shows the **impact**: the shifts, polyclinic sessions, leave requests, SPKs and grants, committee seats, position assignments and the contract that completion will close.
3. From then on, nobody can plan the employee after the last working day (HR-SEP-003). Shifts and sessions already planned after it stay visible until completion, so the Head can arrange cover.

##### 9.10.4.2 Changing or cancelling

While `planned`, HR Admin can move the last working day, change the type or the reason, or cancel the separation with a reason. Nothing that the planning guard refused is planned again automatically.

##### 9.10.4.3 Completion

On the day after the last working day (or at once when immediate), in one step for the employee:

1. Roster assignments after the last working day are cancelled with the reason `separation`; a published roster takes a new revision, a submitted or approved one is validated again (as for leave, 9.4.4.3).
2. Practice schedules end on the last working day; sessions moved onto a later date are undone.
3. Pending leave requests are cancelled; approved leave after the last working day is cancelled, and leave that runs past it is ended on it, with the days given back (9.4).
4. Current SPKs are revoked from the day after the last working day, which revokes their grants and flags the supervised grants that named them (7.4.5); open credential applications are withdrawn.
5. Committee memberships and position assignments end on the last working day.
6. The contract in force is ended, or terminated when the type says so, on the last working day.
7. The employee becomes `separated` with the last working day as separation date; identity disables the account (`authentication.md` 5).
8. The settlement is computed and the exit checklist stays open until HR marks every item done.

#### 9.10.5 Business rules

- **HR-SEP-001**: An employee has at most one separation that is not cancelled.
- **HR-SEP-002**: A separation is recorded only for an employee who has not separated, with a last working day today or later in the facility's zone, unless it is immediate.
- **HR-SEP-003**: While a separation is planned, nothing can be planned for the employee after the last working day: roster assignments (added, imported or swapped), practice sessions, leave, new contracts and credential applications are refused (`employee_leaving`).
- **HR-SEP-004**: Completion closes everything in 9.10.4.3 for the employee in one transaction, or nothing; a failure is retried and never leaves the employee half separated.
- **HR-SEP-005**: Completion happens after the last working day has ended in the facility's zone, so the account works through the last day; an immediate separation completes when recorded.
- **HR-SEP-006**: Completed shifts, sessions and leave before the last working day are never changed.
- **HR-SEP-007**: Licences, professional credits and the change history stay; they belong to the person's record (retention: open question Q11).
- **HR-SEP-008**: The reason is confidential; lists, notifications and logs carry the type only.

#### 9.10.6 Alerts

Sent when the notification service exists (section 11): a recorded separation to the Heads of the units the employee works in (to arrange cover); open checklist items `SEPARATION_CHECKLIST_ALERT_DAYS` after completion to HR Admin.

#### 9.10.7 Not in this section

Rehire, a resignation submitted by the employee in self-service, the exit interview, pay and severance amounts (9.7), and the retention and anonymisation of records (Q11).

---

## 10. Configurable Parameters

Values are owned by HR Manager unless stated otherwise, stored as configuration, and changed without code changes. Defaults marked *(verify)* come from regulation and must be confirmed (section 3).

| Parameter | Default | Used by |
|---|---|---|
| `LICENSE_ALERT_DAYS` | 180, 90, 60, 30 | 6.6 |
| `SKP_REQUIRED_POINTS` | Per profession, from the national SKP requirement *(verify)* | HR-LIC-010 |
| `MAX_PRACTICE_LOCATIONS_MEDIS` | 3 *(verify)* | HR-LIC-007 |
| `SPK_VALIDITY_YEARS` | 3 *(verify)* | HR-CRD-004 |
| `RECREDENTIAL_LEAD_DAYS` | 90 | 7.4.2 |
| `MIN_ASSESSORS` | 1 (owned by each committee) | 7.4.1 |
| `ATTENDANCE_LATE_GRACE_MINUTES` | 5 | HR-ATT-007 |
| `ATTENDANCE_MATCH_BEFORE_MINUTES` | 120 | 9.3.4.2 |
| `ATTENDANCE_MATCH_AFTER_MINUTES` | 240 | 9.3.4.2 |
| `ATTENDANCE_CLOSE_AFTER_MINUTES` | 240 | 9.3.3 |
| `ATTENDANCE_CORRECTION_DAYS` | 7 | 9.3.4.3 |
| `ATTENDANCE_DECISION_SLA_DAYS` | 3 | 9.3.6 |
| `OVERTIME_MIN_MINUTES` | 30 *(verify against the PKB)* | HR-ATT-008 |
| `SEPARATION_CHECKLIST_ALERT_DAYS` | 7 | 9.10.6 |
| `CREDENTIAL_SLA_DAYS` | 14 | 7.6 |
| `TEMPORARY_PRIVILEGE_MAX_DAYS` | 60 | 7.4.4 |
| `ROSTER_PERIOD` | Calendar month | 8.2 |
| `ROSTER_PUBLISH_LEAD_DAYS` | 7 | 8.4.1 |
| `ROSTER_APPROVAL_REQUIRED` | On | 8.3 |
| `ROSTER_LOOKAHEAD_DAYS` | 14 | HR-ROS-032 |
| `MIN_REST_HOURS` | 8 (see Q5) | HR-ROS-011 |
| `MAX_WEEKLY_HOURS` | 40 *(verify)* | HR-ROS-012 |
| `MAX_OVERTIME_HOURS_DAY` | 4 *(verify)* | HR-ROS-013 |
| `MAX_OVERTIME_HOURS_WEEK` | 18 *(verify)* | HR-ROS-013 |
| `MAX_CONSECUTIVE_NIGHTS` | 3 | HR-ROS-015 |
| `CREDENTIALING_SCOPE` | `facility` (each facility's committee credentials; `group` for central credentialing) | 7, HR-CRD-009 |
| `IMPORT_MAX_ROWS` | 5,000 | 8.4.1 |
| `IMPORT_MAX_ERRORS` | 500 | 8.4.1 |
| `LEAVE_WORKING_WEEK` | Monday to Friday *(verify; per facility)* | 9.4.6 |
| `LEAVE_GRANT_LEAD_DAYS` | 60 | 9.4.5 |
| `LEAVE_DECISION_SLA_DAYS` | 3 | 9.4.9 |

---

## 11. Notifications

- Notifications are sent in-app. Email or messaging channels are open question Q9.
- A notification never contains sensitive data (section 14). It names the record and links to it; the recipient opens it with their own permissions.
- Each sub-process lists its alerts (6.6, 7.6, 8.6, 9.4.9). Escalation: an alert unanswered for its SLA is sent to the recipient's superior.

---

## 12. Reports

| Report | Audience | Content |
|---|---|---|
| License expiry | HR, Heads of Unit | Licenses expiring in a chosen window, and expired licenses of active employees. |
| Clinical eligibility exceptions | HR Manager, committees, Director | Clinical employees not clinically eligible today, with the failing condition (HR-ELG-002). |
| Credentialing status | Committees, Director | Applications by status and age; SPKs expiring; suspended privileges. |
| Privilege directory | Clinical units | Who holds which privilege, with condition. |
| Roster coverage | Heads of Unit, HR Manager | Coverage per unit and shift against requirements; overrides (HR-ROS-021). |
| Working-time compliance | HR Manager | Breaches of HR-ROS-011 to HR-ROS-015 per employee. |
| Accreditation staff file | Accreditation team | Per employee: licenses, credentialing history, orientation, mandatory training, evaluations (`REG-KARS`). |
| Workforce summary | Director | Headcount by category, profession, unit and employment type. |
| Leave balances | HR, Heads of Unit (unit), the employee (own) | Balance per employee and leave type: granted, used, pending, carried over, expiring. |
| Leave taken | HR Manager | Leave days per unit and leave type in a period, without reasons. |
| Attendance summary | Heads of Unit (unit), HR Manager | Per unit and period: shifts worked, absences, late arrivals, missing clock events, approved overtime. |
| Separations | HR Manager, Director | Separations by type and unit in a period, with notice given; no reasons. |

---

## 13. Integration with Other Modules

HRM is the source of truth for the data below. Other modules read it; they never keep their own copy of licenses, privileges or rosters.

| Consumer | Question HRM answers | Source |
|---|---|---|
| Clinical modules (EMR, orders, prescriptions, procedures) | Is practitioner P clinically eligible to perform privilege Z in unit U now? | 5.5 |
| Clinical modules | Who is on duty, and who is the team leader or on-call DPJP, in unit U now? | 8.2, HR-ROS-031 |
| Patient registration | Which doctors practise in polyclinic C on date D, with what quota? | 8.2 Practice Schedule |
| Identity and access | Should the account of employee E be active, and with which unit roles? | 5.4, 5.3 |
| Finance | Payroll results, overtime, jasa medis allocation. | 9.7 |
| SATUSEHAT | Practitioner identity (IHS number) for clinical records. | 5.1 |
| National health-worker reporting (SISDMK) | Workforce data required by the Ministry of Health. | 5.1, 6 |
| Attendance devices | Attendance events. | 9.3 |

HRM answers the identity question through events (status changes, separation, position and committee changes) and never creates, enables or edits accounts itself. Licence, SPK and roster changes do not change accounts; clinical modules check eligibility at action time instead (HR-INT-001). See `../../design/account-and-workforce-collections.md` section 6.

- **HR-INT-001**: A clinical module must check clinical eligibility when an action is performed, not only when the user logs in.
- **HR-INT-002**: When HRM cannot answer an eligibility question (for example it is unavailable), the consumer must not treat the practitioner as eligible. How emergency care continues in that case is open question Q10.

---

## 14. Data Sensitivity and Access Control

Employee data is personal data under `REG-PDP`.

| Class | Examples | Access |
|---|---|---|
| Public within the hospital | Name, title, profession, specialty, unit, position, practice schedule. | All staff. |
| Internal | Employee number, contact, roster, license numbers and expiry, privileges, the dates someone is on leave. | HR, Head of Unit (unit), committees (as needed), the employee. |
| Confidential | NIK, NPWP, date of birth, address, family data, bank account, salary, payroll, leave type and leave balances. | HR, Payroll Officer, the employee. |
| Highly confidential | Health records, vaccination, occupational incidents, disciplinary and ethics cases, credentialing assessments, leave reasons and leave proof (for example a doctor's note). | Named roles only (HR Manager, the relevant committee, Director), the employee for their own health records. |

- **HR-SEC-001**: Users see only the classes and units their role allows (4.2).
- **HR-SEC-002**: Confidential and highly confidential fields are never written to logs or notifications. New field names of these classes (for example `npwp`, `bank_account`) are added to the logger's redaction list in the same change (`.claude/rules/back-end/logging.md` section 7).
- **HR-SEC-003**: Records are kept for the retention period after separation (open question Q11) and then archived or deleted per `REG-PDP`.
- **HR-SEC-004**: Employees may view their own data and request corrections through self-service; corrections to verified records go through HR Admin.

---

## 15. Audit Trail

- **HR-AUD-001**: Every create, status change, approval, rejection, override and correction in HRM records who, when, what changed (before and after) and the reason where one is required.
- **HR-AUD-002**: Audit records cannot be edited or deleted by any user.
- **HR-AUD-003**: Reading highly confidential records (section 14) is also audited.

Implementation: change history is not stored as `updated_by` fields in records; it is written through the logger's change-log channel. See `../../design/data-change-history.md` and `../../rules/back-end/logging.md` section 13.

---

## 16. Open Questions

| # | Question | Affects |
|---|---|---|
| Q1 | How are STRs issued before `REG-UU17` with an expiry date treated: lifetime, or until the printed date? | HR-LIC-004 |
| Q2 | Is the national health-worker registry, or the SKP platform, available for integration, or is verification manual? | 6.4.2, HR-LIC-010 |
| Q3 | Which non-STR/SIP documents are required per profession (for example specialist certificate, competency certificate, clinical career level certificate)? | 6.2 |
| Q4 | Does the Director delegate SPK issuance (for example to the Medical Director)? | 4.1, 7.4.1 |
| Q5 | What minimum rest between shifts does the hospital or its PKB require? | `MIN_REST_HOURS` |
| Q6 | How does on-call time count toward working time and overtime: on-site, remote, and called-in? | 8.2, HR-ROS-012 |
| Q7 | Who approves rosters: HR Manager, the head of the parent unit, or nursing management (Bidang Keperawatan) for nursing units? | 8.4.1 |
| Q8 | Is payroll built in HRM or provided by an external system? | 9.7 |
| Q9 | Which notification channels are allowed (email, WhatsApp, SMS), given that notifications must not contain sensitive data? | 11 |
| Q10 | When HRM is unavailable, how do clinical modules allow emergency care (break-glass procedure)? | HR-INT-002 |
| Q11 | What is the retention period for employee records after separation? | HR-SEC-003 |
| Q12 | Are contracted practitioners (`mitra`) paid through HRM? (Rostered: yes, decided 2026-11-07.) | 9.7 |
| Q13 | Should leave entitlements be prorated for part-time staff, or for a first or last partial period? | 9.4.5 |
