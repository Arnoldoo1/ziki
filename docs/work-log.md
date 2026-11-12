
## 2026-11-12 — Fix on Ziki for paid security checks (#897)

- Started from the shared security-check models and the existing private finding conversion. The paid report has no remediation picker in Part 5 yet.
- Added a named picker, authenticated project lookup and an atomic submission. It locks the check, verifies the requester, payment, project and result IDs, and reuses linked findings on repeat requests.
- The existing converter creates a vetted issue with placeholder text. The result text is copied inside PostgreSQL into the private finding. The report page hookup belongs to Part 4.
- Full lint and type check passed. The full unit suite timed out after a Windows fork worker stopped responding. The focused run passed 60 tests across the picker, private finding workflow, vetted conversion and security engine. The repository recheck passed lint, typecheck and 36 tests across the two edited test files.
- Outcome: Part 5 is ready for PR review. An integrated report-page and PostgreSQL run remains outstanding because Part 4 is separate and the local Docker daemon is unavailable.
