import * as tl from "azure-pipelines-task-lib/task";
import * as fs from "fs";
import * as path from "path";
import {globSync} from "glob";
import * as mime from "mime-types";

function run() {
  try {
    const reportDir = tl.getPathInput("reportDir", true)!;
    const reportName = tl.getInput("reportName") || "HTML Report";

    if (!fs.existsSync(reportDir)) {
      throw new Error(`Report directory does not exist: ${reportDir}`);
    }

    const files = globSync("**/*", {
  cwd: reportDir,
  nodir: true
});

    const manifest = {
      schemaVersion: 1,
      reportName,
      entryFile: "index.html",
      job: {
        jobName: tl.getVariable("System.JobName"),
        stageName: tl.getVariable("System.StageName"),
        attempt: Number(tl.getVariable("System.JobAttempt") || 1)
      },
      files: files.map(f => ({
        path: f,
        mime: mime.lookup(f) || "application/octet-stream"
      }))
    };

    // Publish files as attachments
    for (const file of files) {
      const fullPath = path.join(reportDir, file);
      tl.command(
        "task.addattachment",
        {
          type: "html-report-file",
          name: file.replace(/[\/\\]/g, "_")
        },
        fs.readFileSync(fullPath).toString("base64")
      );
    }

    // Publish manifest
    tl.command(
      "task.addattachment",
      { type: "html-report-manifest", name: "manifest.json" },
      JSON.stringify(manifest)
    );

    tl.setResult(tl.TaskResult.Succeeded, "HTML report published");
  } catch (err: any) {
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

run();