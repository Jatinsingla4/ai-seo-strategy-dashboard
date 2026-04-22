"use client";

import type { ProjectRecord, KeywordRecord } from "@threezinc/shared";
import { useRef, useState } from "react";
import { parseCsv } from "../lib/csv";
import { buildKeywordRecords, readFileAsText } from "../lib/mvp-seo";
import { trpc } from "../lib/trpc";
import { useSession } from "next-auth/react";

interface UploadPanelProps {
  onComplete: (project: ProjectRecord) => void;
}

export function UploadPanel({ onComplete }: UploadPanelProps) {
  const { data: session } = useSession();
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  
  const primaryRef = useRef<HTMLInputElement>(null);

  function handlePrimaryDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) {
      setPrimaryFile(file);
      if (!projectName) setProjectName(file.name.replace(/\.csv$/i, ""));
    }
  }

  // tRPC Mutation (only used for auth users)
  const createProject = trpc.projects.create.useMutation({
    onSuccess: (data, variables) => {
      const now = new Date().toISOString();
      onComplete({ 
        id: data.id, 
        name: projectName || variables.name,
        keywords: (variables.keywords as KeywordRecord[]) || [],
        clusters: [],
        linkSuggestions: [],
        gapAnalysisResults: [],
        createdAt: now,
        updatedAt: now,
        userId: session?.user?.id || "guest",
      });
    },
    onError: (err) => {
      setError(`Failed to save project: ${err.message}`);
      setIsProcessing(false);
    }
  });

  async function handleAnalyze() {
    if (!primaryFile) {
      setError("Please select a primary keyword CSV file.");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      // 1. Parse primary CSV
      const primaryText = await readFileAsText(primaryFile);
      const primaryRows = parseCsv(primaryText);
      if (primaryRows.length === 0) throw new Error("The CSV file appears to be empty.");

      // 2. Build initial keyword records (un-enriched)
      const keywords = buildKeywordRecords(primaryRows, "") as KeywordRecord[];
      const name = projectName || primaryFile.name.replace(/\.csv$/i, "");

      // 3. Create project (Backend if auth, local if guest)
      if (session) {
        createProject.mutate({
          id: `proj_${Date.now()}`,
          name,
          keywords,
        });
      } else {
        // Guest mode: return local object immediately
        onComplete({
          id: `local_${Date.now()}`,
          name,
          keywords,
          clusters: [],
          linkSuggestions: [],
          gapAnalysisResults: [],
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          userId: "guest",
        });
      }

    } catch (err) {
      setIsProcessing(false);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  }

  return (
    <section className="card upload-card">
      <div className="upload-icon">CSV</div>
      <h3>Step 1: Upload Keyword Dataset</h3>
      <p className="muted">
        Upload your Ahrefs, SEMrush, or GSC export. We'll save the raw data to your 
        project library, and then you can trigger the AI analysis from the dashboard.
      </p>

      <div style={{ marginBottom: 20, textAlign: "left" }}>
        <label className="input-label">Project Name</label>
        <input
          className="text-input"
          type="text"
          placeholder="e.g. Q2 SEO Opportunity Map"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          disabled={isProcessing}
        />
      </div>

      <div className="upload-dropzone-container">
        <div
          className={`upload-dropzone ${primaryFile ? "has-file" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handlePrimaryDrop}
        >
          <h4>Primary Keyword CSV</h4>
          {primaryFile ? (
            <p className="file-name">{primaryFile.name}</p>
          ) : (
            <p className="muted">Drag & drop here, or click below.</p>
          )}
          <input
            ref={primaryRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setPrimaryFile(file);
                if (!projectName) setProjectName(file.name.replace(/\.csv$/i, ""));
              }
            }}
          />
          <button
            className="secondary-button"
            onClick={() => primaryRef.current?.click()}
            disabled={isProcessing}
          >
            {primaryFile ? "Change File" : "Select CSV File"}
          </button>
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <button
        className="primary-button full-width analyze-button"
        onClick={handleAnalyze}
        disabled={isProcessing || !primaryFile}
      >
        {isProcessing ? "Saving Project..." : "Create Project"}
      </button>

      <style jsx>{`
        .upload-card {
          max-width: 600px;
          margin: 0 auto;
          text-align: center;
          padding: 3rem;
        }
        .upload-icon {
          width: 64px;
          height: 64px;
          background: rgba(var(--accent-rgb), 0.1);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          border-radius: 16px;
          margin: 0 auto 1.5rem;
          font-size: 1.2rem;
        }
        .upload-dropzone {
          border: 2px dashed var(--border);
          border-radius: 12px;
          padding: 3rem 2rem;
          margin-bottom: 2rem;
          background: rgba(var(--background-rgb), 0.5);
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .upload-dropzone.has-file {
          border-color: var(--accent);
          background: rgba(var(--accent-rgb), 0.05);
        }
        .file-name {
          font-weight: 600;
          color: var(--accent);
          margin-bottom: 1rem;
        }
        .error-text {
          color: #ef4444;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }
        .analyze-button {
          height: 52px;
          font-size: 1.1rem;
          font-weight: 700;
        }
      `}</style>
    </section>
  );
}
