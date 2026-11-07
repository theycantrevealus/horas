# Business Glossary

## 1. Purpose

This document defines the business terminology used throughout the
Hospital Information Management System

All business requirements, workflows, technical specifications, and
implementation decisions should use these terms consistently.

When implementing a feature, the AI agent must refer to this glossary
to understand the intended meaning of business terms.

If a term is ambiguous or its definition conflicts with an existing
business requirement, ask for clarification before making assumptions.

---

## 2. General Hospital Management Terms

### Hospital Management System

The system that manage all the data to support the medical officer decision making.

### Patient

People as object of medical treatment.

### Receptionist

Person who do administrative task to register patient at front office.

---

## 3. Platform and Identity Terms

### Tenant

One customer of the system: a single hospital or a hospital group. Every stored record belongs to one tenant.

### Organization

A legal entity inside a tenant, for example the company that employs staff. One tenant can have several organizations.

### Facility

One hospital site. It has its own address and time zone and belongs to one organization.

### Employee

A person employed by or contracted to the hospital, managed by Human Resource Management. Being an employee does not give access to the system.

### Account

A login to the system, owned by the identity module. A workforce account links to exactly one employee; external accounts (vendors, auditors, visiting students) and service accounts (other systems) link to none. Not every employee has an account.

### Account hold

A reason, placed by one source (HR, security, administration), that keeps an account suspended or disabled. An account can be used only when it has no holds.

### Change history

The record of who changed which data, when, how (before and after) and why. It is written through the logger, not kept in the changed records.
