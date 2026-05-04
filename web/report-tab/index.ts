import * as SDK from "azure-devops-extension-sdk";
import { getClient } from "azure-devops-extension-api";
import { BuildRestClient } from "azure-devops-extension-api/Build";

/**
 * Represents one logical report (usually one job / shard)
 */
type ReportEntry = {
  displayName: string;
  manifest: any;
};

async function init(): Promise<void> {
  SDK.init();
  await SDK.ready();

  const statusEl = document.getElementById("status");
  if (statusEl) statusEl.textContent = "Discovering HTML reports…";

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

  const buildClient = getClient(BuildRestClient);

  // -----------------------------
  // STEP 2.1 — Discover ALL manifests
  // -----------------------------
  const manifestAttachments = await buildClient.getAttachments(
    projectName,
    buildId,
    "html-report-manifest"
  );

  if (manifestAttachments.length === 0) {
    if (statusEl) {
      statusEl.textContent =
        "No HTML reports were published for this pipeline run.";
    }
    return;
  }

  const reports: ReportEntry[] = [];

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
      throw new Error(
        `Manifest ${attachment.name} does not contain timelineId / recordId`
      );
    }

    reports.push({
      displayName:
        manifest.job.jobName ??
        `Report (${attachment.name})`,
      manifest
    });
  }

  if (statusEl) statusEl.textContent = "Loading report…";

  populateReportSelector(reports, async (report) => {
  const files = await fetchReportFiles(
    buildClient,
    projectName,
    buildId,
    report.manifest.job.timelineId,
    report.manifest.job.recordId
  );

  await renderHtmlReport(files);
});

// Auto-select first report
showLoading(true);
await fetchAndRenderFirstReport();
showLoading(false);

  if (statusEl) statusEl.textContent = "";
}

/* =========================================================
   Report file loading & rendering
   (Stable from Phase 1 / Step 5)
========================================================= */

async function fetchReportFiles(
  buildClient: BuildRestClient,
  projectName: string,
  buildId: number,
  timelineId: string,
  recordId: string
): Promise<Map<string, Blob>> {
  const attachments = await buildClient.getAttachments(
    projectName,
    buildId,
    "html-report-file"
  );

  const fileMap = new Map<string, Blob>();

  for (const attachment of attachments) {
    const bytes = await buildClient.getAttachment(
      projectName,
      buildId,
      timelineId,
      recordId,
      "html-report-file",
      attachment.name
    );

    // Attachment names were normalized by the task:
    // path/to/file.ext -> path_to_file.ext
    const relativePath = attachment.name.replace(/_/g, "/");
    fileMap.set(relativePath, new Blob([bytes]));
  }

  return fileMap;
}

function createBlobUrlMap(
  files: Map<string, Blob>
): Map<string, string> {
  const map = new Map<string, string>();

  for (const [path, blob] of files) {
    map.set(path, URL.createObjectURL(blob));
  }

  return map;
}

async function rewriteHtml(
  htmlBlob: Blob,
  urlMap: Map<string, string>
): Promise<string> {
  let html = await htmlBlob.text();

  for (const [path, url] of urlMap) {
    // replaceAll not used for ES2020 compatibility
    html = html.split(path).join(url);
  }

  return html;
}

async function renderHtmlReport(
  files: Map<string, Blob>
): Promise<void> {
  const urlMap = createBlobUrlMap(files);

  const indexBlob =
    files.get("index.html") ||
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
  if (!root) return;

  root.innerHTML = "";
  root.appendChild(iframe);
}

function showLoading(show: boolean) {
  const el = document.getElementById("loading");
  if (el) el.style.display = show ? "inline" : "none";
}

function populateReportSelector(
  reports: ReportEntry[],
  onSelect: (report: ReportEntry) => Promise<void>
) {
  const selector = document.getElementById(
    "reportSelector"
  ) as HTMLSelectElement;

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

async function fetchAndRenderFirstReport(
  reports?: ReportEntry[]
) {
  const selector = document.getElementById(
    "reportSelector"
  ) as HTMLSelectElement;

  if (!reports || reports.length === 0) return;

  selector.value = "0";
  const first = reports[0];

  const buildClient = getClient(BuildRestClient);
  const config = SDK.getConfiguration();
  const pageContext = SDK.getPageContext();

  const files = await fetchReportFiles(
    buildClient,
    pageContext.webContext.project.name,
    config.buildId,
    first.manifest.job.timelineId,
    first.manifest.job.recordId
  );

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