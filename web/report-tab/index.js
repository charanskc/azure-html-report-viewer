"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const SDK = __importStar(require("azure-devops-extension-sdk"));
const azure_devops_extension_api_1 = require("azure-devops-extension-api");
const Build_1 = require("azure-devops-extension-api/Build");
async function init() {
    SDK.init();
    await SDK.ready();
    const statusEl = document.getElementById("status");
    if (statusEl)
        statusEl.textContent = "Discovering HTML reports…";
    // -----------------------------
    // Resolve build & project context
    // -----------------------------
    const config = SDK.getConfiguration();
    const buildId = config?.buildId;
    if (!buildId) {
        throw new Error("buildId not found in extension context");
    }
    const pageContext = SDK.getPageContext();
    const projectName = pageContext?.webContext?.project?.name;
    if (!projectName) {
        throw new Error("project name not found in page context");
    }
    const buildClient = (0, azure_devops_extension_api_1.getClient)(Build_1.BuildRestClient);
    // -----------------------------
    // STEP 2.1 — Discover ALL manifests
    // -----------------------------
    const manifestAttachments = await buildClient.getAttachments(projectName, buildId, "html-report-manifest");
    if (manifestAttachments.length === 0) {
        if (statusEl) {
            statusEl.textContent =
                "No HTML reports were published for this pipeline run.";
        }
        return;
    }
    const reports = [];
    for (const attachment of manifestAttachments) {
        // ✅ Correct way to read manifest:
        // Use the attachment's self URL (already authenticated),
        // NOT buildClient.getAttachment (which needs timeline/record IDs).
        const response = await fetch(attachment._links.self.href);
        if (!response.ok) {
            throw new Error(`Failed to load report manifest: ${attachment.name}`);
        }
        const manifest = await response.json();
        if (!manifest?.job?.timelineId || !manifest?.job?.recordId) {
            throw new Error(`Manifest ${attachment.name} does not contain timelineId / recordId`);
        }
        reports.push({
            displayName: manifest.job.jobName ??
                `Report (${attachment.name})`,
            manifest
        });
    }
    if (statusEl)
        statusEl.textContent = "Loading report…";
    populateReportSelector(reports, async (report) => {
        const files = await fetchReportFiles(buildClient, projectName, buildId, report.manifest.job.timelineId, report.manifest.job.recordId);
        await renderHtmlReport(files);
    });
    // Auto-select first report
    showLoading(true);
    await fetchAndRenderFirstReport();
    showLoading(false);
    if (statusEl)
        statusEl.textContent = "";
}
/* =========================================================
   Report file loading & rendering
   (Stable from Phase 1 / Step 5)
========================================================= */
async function fetchReportFiles(buildClient, projectName, buildId, timelineId, recordId) {
    const attachments = await buildClient.getAttachments(projectName, buildId, "html-report-file");
    const fileMap = new Map();
    for (const attachment of attachments) {
        const bytes = await buildClient.getAttachment(projectName, buildId, timelineId, recordId, "html-report-file", attachment.name);
        // Attachment names were normalized by the task:
        // path/to/file.ext -> path_to_file.ext
        const relativePath = attachment.name.replace(/_/g, "/");
        fileMap.set(relativePath, new Blob([bytes]));
    }
    return fileMap;
}
function createBlobUrlMap(files) {
    const map = new Map();
    for (const [path, blob] of files) {
        map.set(path, URL.createObjectURL(blob));
    }
    return map;
}
async function rewriteHtml(htmlBlob, urlMap) {
    let html = await htmlBlob.text();
    for (const [path, url] of urlMap) {
        // replaceAll not used for ES2020 compatibility
        html = html.split(path).join(url);
    }
    return html;
}
async function renderHtmlReport(files) {
    const urlMap = createBlobUrlMap(files);
    const indexBlob = files.get("index.html") ||
        files.get("./index.html");
    if (!indexBlob) {
        throw new Error("index.html not found in report files");
    }
    const finalHtml = await rewriteHtml(indexBlob, urlMap);
    const iframe = document.createElement("iframe");
    iframe.style.width = "100%";
    iframe.style.height = "100vh";
    iframe.style.border = "none";
    iframe.style.background = "white";
    iframe.sandbox.add("allow-scripts", "allow-same-origin");
    iframe.srcdoc = finalHtml;
    const root = document.getElementById("root");
    if (!root)
        return;
    root.innerHTML = "";
    root.appendChild(iframe);
}
function showLoading(show) {
    const el = document.getElementById("loading");
    if (el)
        el.style.display = show ? "inline" : "none";
}
function populateReportSelector(reports, onSelect) {
    const selector = document.getElementById("reportSelector");
    selector.innerHTML = "";
    reports.forEach((r, index) => {
        const option = document.createElement("option");
        option.value = index.toString();
        option.textContent = r.displayName;
        selector.appendChild(option);
    });
    selector.onchange = async () => {
        const selected = reports[Number(selector.value)];
        showLoading(true);
        await onSelect(selected);
        showLoading(false);
    };
}
async function fetchAndRenderFirstReport(reports) {
    const selector = document.getElementById("reportSelector");
    if (!reports || reports.length === 0)
        return;
    selector.value = "0";
    const first = reports[0];
    const buildClient = (0, azure_devops_extension_api_1.getClient)(Build_1.BuildRestClient);
    const config = SDK.getConfiguration();
    const pageContext = SDK.getPageContext();
    const files = await fetchReportFiles(buildClient, pageContext.webContext.project.name, config.buildId, first.manifest.job.timelineId, first.manifest.job.recordId);
    await renderHtmlReport(files);
}
/* ========================================================= */
init().catch(err => {
    console.error("HTML Report Viewer failed:", err);
    const statusEl = document.getElementById("status");
    if (statusEl) {
        statusEl.textContent = err.message;
    }
});
