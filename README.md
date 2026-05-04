# Azure HTML Report Viewer

Azure HTML Report Viewer is an Azure DevOps extension that renders **full HTML reports** directly inside pipeline runs.  
It is designed for **modern test frameworks** (especially Playwright) and supports JavaScript, CSS, screenshots, and videos — just like opening the report in a browser.

---

## ✨ Features

- ✅ Dedicated **HTML Report** tab in pipeline runs  
- ✅ Full HTML rendering (JavaScript & CSS supported)  
- ✅ Native Playwright report support  
- ✅ Inline screenshots and image assets  
- ✅ Video playback inside Azure DevOps  
- ✅ Supports parallel jobs, retries, and shards  
- ✅ Secure pipeline execution (no external hosting)  

---

## 🎯 Why Azure HTML Report Viewer?

Many existing HTML viewer extensions suffer from one or more limitations:
- ❌ They are unmaintained
- ❌ They break Playwright UI
- ❌ They fail to load images or videos
- ❌ They do not handle multiple pipeline jobs gracefully

**Azure HTML Report Viewer** is built specifically for **2025‑ready test pipelines** and modern testing workflows.

---

## ✅ Supported Report Types

- Playwright (TypeScript / JavaScript)
- Custom static HTML reports
- Any HTML output generated during pipeline execution
- Multi‑file reports with assets (CSS, JS, images, videos)

---

## 🚀 Installation

### From Azure DevOps Marketplace
1. Go to **Organization settings → Extensions**
2. Browse the Marketplace
3. Search for **Azure HTML Report Viewer**
4. Click **Install**

---

## 🛠 Pipeline Usage

Add the **Publish HTML Report** task to your pipeline after your tests run.

### Example: Playwright

```yaml
steps:
- script: |
    npm ci
    npx playwright test || true
  displayName: Run Playwright tests

- task: PublishHtmlReport@1
  inputs:
    reportDir: playwright-report
