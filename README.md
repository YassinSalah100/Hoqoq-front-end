Hoqooq (حقوق) is a web-based legal practice management platform built for law firms to run their day-to-day operations in one place. This repository is the frontend — a React 19 + Vite single-page app with a fully right-to-left Arabic interface, talking to a NestJS/PostgreSQL backend over a REST API.

Core features:

Case management — create and track cases with embedded client/opponent details, court and governorate assignment, lifecycle status (draft → active → closed/archived), and a per-case document library.
Hearings & calendar — schedule court hearings, assign lawyers, log outcomes, and view everything on a unified firm calendar alongside tasks and deadlines.
Task management — assign and track work items tied to specific cases, with priority and status boards.
Finance — per-case fee agreements and a payment ledger, with firm-wide collection/outstanding reporting.
Team & permissions — onboard employees (lawyers, secretaries, accountants), assign granular permissions per account, and grant fine-grained, per-case access to specific team members.
Platform administration — a super-admin layer for provisioning law firms, managing subscriptions, and overseeing the platform.
Firm settings — manage firm profile, branding, and account security (password/MFA).
