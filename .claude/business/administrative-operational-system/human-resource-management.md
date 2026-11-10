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
| 7 | Leave management | 9.4 | Outline |
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
| Source | `roster`, `swap`, `change_request`. |

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
2. Approved leave or training of the doctor creates exceptions automatically (9.4).
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

- **HR-ROS-030**: When an employee's eligibility changes (license expired or revoked, SPK suspended or revoked, suspension, approved leave), the System checks all their future published assignments and Practice Schedule sessions.
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

These sections must be detailed, in the format of sections 6–8, before implementation.

### 9.1 Recruitment and onboarding

- **Purpose**: fill approved positions and prepare new staff to work safely.
- **Entities**: Job Requisition, Candidate, Offer, Onboarding Checklist, Orientation Record.
- **Known rules**: pre-employment health check is required; general hospital orientation and unit orientation must be completed before independent work (`REG-KARS`); clinical hires follow sections 6 and 7 before clinical work.

### 9.2 Organization and position management

- **Purpose**: maintain the organization chart, positions and job descriptions.
- **Entities**: Organization Unit, Position, Job Description, Assignment History (transfers, promotions).
- **Known rules**: each unit has one Head of Unit at a time; history of every transfer is kept.

### 9.3 Attendance and time

- **Purpose**: record actual working time against the roster.
- **Entities**: Attendance Record (from fingerprint or face-recognition devices), Attendance Correction, Overtime Record.
- **Known rules**: attendance is reconciled against Roster Assignments; overtime requires prior approval; corrections need Head of Unit approval.

### 9.4 Leave management

- **Purpose**: manage leave entitlements and requests.
- **Entities**: Leave Type, Leave Balance, Leave Request.
- **Known rules**: annual leave of at least 12 working days after 12 months of continuous service (`REG-UUK`); maternity, sick, and special leave per regulation and PKB; an approved leave blocks rostering (HR-ROS-003) and creates Practice Schedule exceptions (8.4.4); the Head of Unit may require a named replacement before approval.

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

- **Purpose**: end employment cleanly.
- **Entities**: Separation Request, Exit Checklist, Final Settlement.
- **Known rules**: on the separation date, the employee's SPK is revoked, future Roster Assignments and Practice Schedule sessions are flagged (HR-ROS-030), and the identity module disables the account; records are kept for the retention period (section 14).

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

---

## 11. Notifications

- Notifications are sent in-app. Email or messaging channels are open question Q9.
- A notification never contains sensitive data (section 14). It names the record and links to it; the recipient opens it with their own permissions.
- Each sub-process lists its alerts (6.6, 7.6, 8.6). Escalation: an alert unanswered for its SLA is sent to the recipient's superior.

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
| Internal | Employee number, contact, roster, license numbers and expiry, privileges. | HR, Head of Unit (unit), committees (as needed), the employee. |
| Confidential | NIK, NPWP, date of birth, address, family data, bank account, salary, payroll. | HR, Payroll Officer, the employee. |
| Highly confidential | Health records, vaccination, occupational incidents, disciplinary and ethics cases, credentialing assessments. | Named roles only (HR Manager, the relevant committee, Director), the employee for their own health records. |

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
