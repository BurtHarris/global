# Source documents — 2026 USPS election-mail litigation

Primary-source documents backing the research report
[`../civil-rico-and-qui-tam-2026-postal-litigation.md`](../civil-rico-and-qui-tam-2026-postal-litigation.md).
All files retrieved from public sources (CourtListener RECAP, govinfo.gov)
and are unmodified except for text extraction noted below.

| File | Description | Source |
|---|---|---|
| `california-v-usps-complaint-doc1.pdf` | Complaint, *State of California v. United States Postal Service*, No. 1:26-cv-13917 (D. Mass., filed Aug. 26, 2026), Document 1, 53 pp. The active case — challenges the "Ballot Mail for Federal Elections" rule. 7 causes of action; no RICO/qui tam/DNC content. | CourtListener RECAP, `gov.uscourts.mad.305406.1.0.pdf` |
| `california-v-usps-complaint-doc1.txt` | Plaintext extraction of the above (via `pypdf`), for full-text search/grep. | Derived locally |
| `california-v-trump-complaint-doc1.pdf` | Complaint, *State of California v. Trump*, No. 1:26-cv-11581 (D. Mass., filed Apr. 3, 2026; terminated Jul. 7, 2026), Document 1, 49 pp. Earlier, related suit against the proposed rule/EO, referenced repeatedly in the active complaint's footnotes as already enjoined. | CourtListener RECAP, `gov.uscourts.mad.298518.1.0_2.pdf` |
| `lwv-v-trump-complaint-doc1.pdf` | Complaint, *League of Women Voters of Massachusetts v. Trump*, No. 1:26-cv-11549 (D. Mass., filed Apr. 2, 2026), Document 1, 56 pp. Companion suit to *California v. Trump*, same judge (Talwani), also referenced in the active complaint's footnotes. Since appealed to the 1st Circuit (No. 26-2029). | CourtListener RECAP, `gov.uscourts.mad.298449.1.0_1.pdf` |
| `fedreg-2026-17238-final-rule-ballot-mail.pdf` | USPS final rule "Ballot Mail for Federal Elections," 91 Fed. Reg. 54,966 (Aug. 26, 2026), Doc. No. 2026-17238 — the rule under challenge in the active complaint. | Federal Register API / govinfo.gov |
| `fedreg-2026-10968-proposed-rule-ballot-mail.pdf` | USPS notice of proposed rulemaking (NPRM) for the same rule, 91 Fed. Reg. 32,915 (Jun. 2, 2026), Doc. No. 2026-10968. | Federal Register API / govinfo.gov |

## Not yet obtained

- Executive Order No. 14399 (Mar. 31, 2026), which directed the rulemaking — not yet located/downloaded as a standalone document; the complaint quotes and characterizes it but a primary-source copy of the EO itself should still be pulled (e.g., from the Federal Register's EO index or whitehouse.gov) if deeper drafting requires citing its exact text.
- USPS's Privacy Act System of Records Notice (SORN) proposing the associated data collection — referenced in Federal Register search results but not yet downloaded.
- Dockets for the 1st Circuit appeal of *LWV v. Trump* (No. 26-2029), in case the appellate disposition is relevant to how much weight the district-court injunctions still carry.

## Retrieval method (for reproducing or extending)

1. CourtListener REST API (`/api/rest/v4/search/?q=...&type=r&format=json`) to find docket IDs and `recap_documents[].filepath_local` values (must append `&format=json`; the plain HTML search/docket pages return HTTP 403 for automated clients).
2. Direct file download from `https://storage.courtlistener.com/recap/<filepath_local>` (binary PDFs aren't renderable through the markdown-conversion fetch tool — use a direct HTTP client).
3. Federal Register documents via `https://www.federalregister.gov/api/v1/documents.json?conditions[term]=...` for metadata, then the `pdf_url` (a govinfo.gov link) for the actual PDF — the Federal Register's own HTML search UI blocks automated access.
