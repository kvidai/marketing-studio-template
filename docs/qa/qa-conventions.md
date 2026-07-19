<!-- Source: epicmobile18/rules/contextual/docs/qa/qa-conventions.md -->
<!-- Version: 1.0.2 -->
<!-- Last Updated: 2026-03-09 -->

# QA Documentation Guide

- QA work focuses on verifying feature behavior. For tasks that don't affect feature operation but are essential for productivity, safety, and resilience, create a separate checklist per repo.
- If the QA table in README.md is too wide, it becomes hard to read → omit less important properties (columns) from the README.md QA table.
- If QA content is small, write everything in a single `qa-report-test-cases.md` file.
- When QA content is large, split into separate `.md` files by feature area under `docs/qa/`.

```plaintext
docs/
└── qa/
    ├── qa-overview.md
    ├── qa-{feature1}.md
    ├── qa-{feature2}.md
    ├── test-plan.md
    ├── test-cases.md
    ├── test-execution.md
    ├── test-report.md
    ├── bug-log.md
    └── ...
```

- If images are needed in QA docs, save image files inside the `./qa/` folder and reference the path in the document.
- If integrating with a Markdown-based wiki or static doc site (Docusaurus, VitePress, etc.), use `docs/qa/README.md` as the overview page.

### qa-**.md Example

[example_do-not-use-this_qa-report-test-cases.md](./example_do-not-use-this_qa-report-test-cases.md)

### Common QA Table Metadata Fields

| Field | Options |
|-------|---------|
| Priority | P1 (high), P2 (medium), P3 (low) |
| Class1 | Feature domain category (e.g., audio, video, auth, ...) |
| Class2 | Sub-category of Class1 |
| Status | To do / Edit In progress / Edit Completed / Review in progress / Reviewer approved / Completed archive |
| Platform Type | android, ios, windows chrome, macos safari, web-PC, web-mobile, ... |
| confirm_staging | X / O / O AutomatedTest / O ManualTest |
| confirm_production | X / O / O AutomatedTest / O ManualTest |
| Description | Description text — link to a separate doc for complex content |

> **Tip**: Matching the column order between the Notion QA table and the README.md table allows direct copy-paste into Notion with Ctrl+C/V.

> **Note**: Put the Description column at the far right — placing it in the middle makes the Markdown table hard to edit.

Unused columns (mark with ~~strikethrough~~):
- ~~Category~~, ~~Sprint~~, ~~Product Version~~, ~~Product Name~~, ~~Reporter~~

### AI Prompt Examples for Generating QA Content

```plaintext
You are a QA engineer. Write "Test Cases" for the following features in Markdown table format.

Project: "{project name}"
Version: {version}
Feature list:
1. {feature1}
  - Input conditions: ...
  - Edge cases: ...
2. {feature2}
  ...

Reference: (if an existing qa-test-case-report.md exists) refer to @qa-test-case-report.md

If there is existing QA content in qa-test-case-report.md, use it as reference and do not modify existing test cases.

(Optional) Generate QA test case report for the features listed above.

(If no table format exists) Create a Markdown table with the following columns per test case:
- Test ID, Test Scenario Description, Preconditions, Input Data, Steps, Expected Result, Actual Result, Status (Pass/Fail/Blocked), Notes
```

```plaintext
You are a QA engineer. Write a "QA Checklist" for pre-release review in Markdown table format.

Checklist areas:
- Functionality: verify key screen button behaviors
- UI/UX: mobile/PC layout, font and color consistency
- Security: SQL injection, XSS vulnerabilities
- Performance: page load time, load testing
- Compatibility: major browsers, resolutions
- Regression: re-verify bug fixes from previous release
- Documentation: check if API docs are up to date
```

### Filename Examples for Environment QA Checklists (not feature QA)

| Filename | Description |
|----------|-------------|
| `devops-checklist.md` | Quality review checklist for DevOps workflows |
| `environment-qa-checklist.md` | QA checklist per deployment environment and tooling |
| `deployment-qa-guide.md` | QA guide focused on runtime/deployment environments |
| `infra-qa-checklist.md` | Infrastructure and deployment environment QA |
| `non-functional-qa.md` | Non-functional QA (environment, logging, capacity, build setup, etc.) |
| `qa-system-check.md` | QA document focused on system setup and configuration |
