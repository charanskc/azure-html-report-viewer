# Azure HTML Report Viewer

View your test reports like artifacts, not artifacts. A native Report Viewer tab for Azure DevOps build summaries. The task attaches your HTML reports to the build; the tab renders them with CSS, JavaScript, embedded media, and screenshots — the way a real browser would.

A native Report Viewer tab for Azure DevOps build summaries. The task attaches your HTML report output to the build; the tab renders it as a structured, interactive view — the kind of thing you actually want a teammate to inspect before test results are archived.

## Why this exists

Most Azure DevOps pipelines do one of two things with HTML test reports:

- Download them manually after the build completes — but they end up scattered across laptops, never version-controlled, and lost after the build is deleted.
- Embed them as plain text attachments — which loses all styling, scripts, screenshots, and videos, leaving you with a static snapshot.

Neither is built for the moment that matters: a human reviewing the full test report without leaving Azure DevOps.

This extension treats the report as a rendered artifact, not text — so the tab can display everything a test reviewer needs.

## What you get

### Full HTML rendering with asset support
Reports with CSS, JavaScript, images, screenshots, and embedded videos render exactly as authored. Playwright, Cypress, Jest, WebdriverIO — if it generates HTML, we render it.

### Multi-file report support  
Report bundles with interdependent assets (stylesheets, images, JavaScript modules) load seamlessly. Assets nest within the report's directory structure; relative paths just work.

### Interactive report navigation
Click links, interact with JavaScript widgets, replay videos, scroll through screenshots. The report is alive in the tab, not locked in a PDF or screenshot viewer.

### Multiple reports per build
Run the task once per stage or suite (unit tests, e2e, visual regression) with distinct names. The tab lists all attached reports in a dropdown — switching is instant once a report is loaded.

The selector hides itself when only one report is attached, so single-report pipelines look exactly the same as before.

### Themed for Azure DevOps
The tab uses the same CSS theme tokens Azure DevOps uses for the rest of the portal — light mode, dark mode, and high-contrast all just work. The report renders inside a styled container that respects your organization's theme settings.

## Quick start

```yaml
- task: PublishHtmlReport@1
  displayName: 'Publish Test Report'
  inputs:
    reportPath: '$(System.DefaultWorkingDirectory)/reports/index.html'
```

That's it. Run the pipeline; the HTML Report tab will appear on the build results page.

The task accepts:
- A single HTML file (index.html, report.html, etc.)
- A folder containing an HTML report and its assets (CSS, JS, images, videos)

## Multi-report example

```yaml
- task: PublishHtmlReport@1
  displayName: 'Publish unit tests'
  inputs:
    reportPath: '$(System.DefaultWorkingDirectory)/reports/unit'
    reportName: 'Unit Tests'

- task: PublishHtmlReport@1
  displayName: 'Publish e2e tests'
  inputs:
    reportPath: '$(System.DefaultWorkingDirectory)/reports/e2e'
    reportName: 'E2E Tests'

- task: PublishHtmlReport@1
  displayName: 'Publish visual regression'
  inputs:
    reportPath: '$(System.DefaultWorkingDirectory)/reports/visual'
    reportName: 'Visual Regression'
```

Each reportName becomes a label in the dropdown. Sorted alphabetically, the first is selected by default.

## How it works

The task takes your report file or folder, validates it, and uploads the report assets to Azure DevOps as a build attachment with the type `html-report`. The tab calls Azure DevOps's Build REST API to download the attachment, parses it client-side, and renders it in an iframe.

There's no server, no database, no third-party endpoint. Report data sits in your Azure DevOps organization the same way build logs do.

## Privacy & security

- **No third-party calls.** Report HTML and assets live as build attachments in your Azure DevOps organization. The tab fetches them from your own ADO API. Nothing leaves your tenant.
- **No execution risks.** Scripts and styles execute in an iframe with restricted permissions — cross-origin resource sharing is blocked, external assets cannot load.
- **DOM-safe rendering.** Report content loads from static assets, never injected as a string — so a malicious HTML report cannot access the Azure DevOps UI or your session tokens.

## FAQ

**Will this work with large reports?** The task supports reports up to 256 MiB. The tab parses and renders client-side; multi-thousand-screenshot reports render smoothly on modern laptops.

**Does it work in dark mode / high-contrast?** Yes. The tab respects Azure DevOps theme settings and renders reports inside a themed container.

**Can I use this with classic (non-YAML) build pipelines?** Yes — the task and tab are both surfaced through the standard build results view, which works in classic and YAML pipelines.

**What if my report uses external CDNs or external images?** For security, external resources don't load. Reports must be self-contained or use relative asset paths within the report bundle.

## Source, issues, contributions

Open source on GitHub: charan-s-vayigandla/azure-html-report-viewer. Issues and PRs welcome.
