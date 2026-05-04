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
const tl = __importStar(require("azure-pipelines-task-lib/task"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
const mime = __importStar(require("mime-types"));
function run() {
    try {
        const reportDir = tl.getPathInput("reportDir", true);
        const reportName = tl.getInput("reportName") || "HTML Report";
        if (!fs.existsSync(reportDir)) {
            throw new Error(`Report directory does not exist: ${reportDir}`);
        }
        const files = (0, glob_1.globSync)("**/*", {
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
            tl.command("task.addattachment", {
                type: "html-report-file",
                name: file.replace(/[\/\\]/g, "_")
            }, fs.readFileSync(fullPath).toString("base64"));
        }
        // Publish manifest
        tl.command("task.addattachment", { type: "html-report-manifest", name: "manifest.json" }, JSON.stringify(manifest));
        tl.setResult(tl.TaskResult.Succeeded, "HTML report published");
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}
run();
