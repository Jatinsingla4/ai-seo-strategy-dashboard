import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState } from "react";
import type { KeywordRecord } from "@threezinc/shared";

interface KeywordStrategyTableProps {
  keywords: KeywordRecord[];
  focusedPillar?: string | null;
  onClearPillar?: () => void;
}

type SortKey = "keyword" | "volume" | "difficulty" | "priority";
type SortDir = "asc" | "desc";

function exportCsv(keywords: KeywordRecord[]) {
  const headers = ["Keyword", "Volume", "Difficulty", "Intent", "AIDA Stage", "Pillar Topic", "Priority", "Current Rank", "Suggested Title", "Page Type"];
  const rows = keywords.map((kw) => [
    `"${kw.keyword}"`,
    kw.volume,
    kw.difficulty,
    kw.intent ?? "",
    kw.aidaStage ?? "",
    `"${kw.pillarTopic ?? ""}"`,
    (kw.priority ?? 0).toFixed(1),
    kw.serpData?.rank ?? "—",
    `"${kw.suggestedTitle ?? ""}"`,
    kw.suggestedPageType ?? "",
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "keywords.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function KeywordStrategyTable({ keywords, focusedPillar, onClearPillar }: KeywordStrategyTableProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const parentRef = useRef<HTMLDivElement>(null);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
      parentRef.current?.scrollTo({ top: 0 }); // Reset scroll on sort
    }
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    parentRef.current?.scrollTo({ top: 0 }); // Reset scroll on search
    
    return keywords.filter((kw) => {
      // Intentional Filter from Authority Panel
      if (focusedPillar && kw.pillarTopic !== focusedPillar) {
        return false;
      }

      // Search Query Filter
      if (!q) return true;
      return (
        kw.keyword.toLowerCase().includes(q) ||
        (kw.pillarTopic ?? "").toLowerCase().includes(q) ||
        (kw.intent ?? "").toLowerCase().includes(q)
      );
    });
  }, [keywords, query, focusedPillar]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let diff = 0;
      if (sortKey === "keyword") diff = a.keyword.localeCompare(b.keyword);
      else if (sortKey === "volume") diff = a.volume - b.volume;
      else if (sortKey === "difficulty") diff = a.difficulty - b.difficulty;
      else diff = (a.priority ?? 0) - (b.priority ?? 0);
      return sortDir === "asc" ? diff : -diff;
    });
  }, [filtered, sortKey, sortDir]);

  // Virtualizer setup
  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // Estimated row height
    overscan: 5,
  });

  function arrow(key: SortKey) {
    if (sortKey !== key) return " ↕";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  return (
    <div className="table-shell virtualized">
      <div className="table-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            className="search-input"
            type="text"
            placeholder="Search keywords, topics, or intent…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {focusedPillar && (
            <div className="active-filter-badge">
              <span>Topic: <strong>{focusedPillar}</strong></span>
              <button className="clear-filter-x" onClick={onClearPillar}>×</button>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="muted">{sorted.length} of {keywords.length} keywords</span>
          <button
            className="secondary-button"
            style={{ padding: "8px 14px", fontSize: 13 }}
            onClick={() => exportCsv(sorted)}
          >
            Export All CSV
          </button>
        </div>
      </div>

      <div className="virtual-table-container">
        {/* Header (Stay Fixed) */}
        <div className="virtual-header">
          <div className="virtual-row header-row">
            <div className="cell col-keyword" onClick={() => toggleSort("keyword")}>Keyword{arrow("keyword")}</div>
            <div className="cell col-volume" onClick={() => toggleSort("volume")}>Volume{arrow("volume")}</div>
            <div className="cell col-kd" onClick={() => toggleSort("difficulty")}>KD{arrow("difficulty")}</div>
            <div className="cell col-intent">Intent</div>
            <div className="cell col-aida">AIDA Stage</div>
            <div className="cell col-pillar">Pillar Topic</div>
            <div className="cell col-priority" onClick={() => toggleSort("priority")}>Priority{arrow("priority")}</div>
            <div className="cell col-serp">Rank</div>
            <div className="cell col-title">Suggested Title</div>
            <div className="cell col-type">Page Type</div>
          </div>
        </div>

        {/* Scrollable List */}
        <div ref={parentRef} className="virtual-list-scroll">
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const keyword = sorted[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  className="virtual-row"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="cell col-keyword">{keyword.keyword}</div>
                  <div className="cell col-volume">{keyword.volume.toLocaleString()}</div>
                  <div className="cell col-kd">{keyword.difficulty}</div>
                  <div className="cell col-intent">
                    <span className={`intent-pill intent-${(keyword.intent ?? "unknown").toLowerCase()}`}>
                      {keyword.intent ?? "Unknown"}
                    </span>
                  </div>
                  <div className="cell col-aida">
                    <span className={`aida-pill aida-${(keyword.aidaStage ?? "").toLowerCase()}`}>
                      {keyword.aidaStage ?? "—"}
                    </span>
                  </div>
                  <div className="cell col-pillar">{keyword.pillarTopic ?? "Uncategorized"}</div>
                  <div className="cell col-priority">{(keyword.priority ?? 0).toFixed(1)}</div>
                  <div className="cell col-serp">
                    {keyword.serpData ? (
                      <span className="serp-pill">#{keyword.serpData.rank}</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </div>
                  <div className="cell col-title">{keyword.suggestedTitle || "—"}</div>
                  <div className="cell col-type">{keyword.suggestedPageType || "—"}</div>
                </div>
              );
            })}
            {sorted.length === 0 && (
              <div className="empty-row">No keywords match your search.</div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .virtual-table-container {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 450px);
          min-height: 400px;
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          background: var(--card-bg);
        }
        .virtual-list-scroll {
          flex: 1;
          overflow: auto;
          scrollbar-width: thin;
        }
        .virtual-header {
          background: rgba(var(--background-rgb), 0.5);
          backdrop-filter: blur(10px);
          border-bottom: 2px solid var(--border);
          z-index: 10;
        }
        .virtual-row {
          display: flex;
          align-items: center;
          border-bottom: 1px solid var(--border);
          transition: background 0.1s ease;
        }
        .virtual-row:hover {
          background: rgba(var(--accent-rgb), 0.03);
        }
        .header-row {
          font-weight: 700;
          color: var(--muted);
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
          height: 52px;
        }
        .header-row .cell {
          cursor: pointer;
        }
        .cell {
          padding: 12px 16px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .col-keyword { width: 25%; flex-grow: 1; min-width: 200px; font-weight: 500; }
        .col-volume  { width: 100px; text-align: right; }
        .col-kd      { width: 80px; text-align: right; }
        .col-intent  { width: 140px; }
        .col-aida    { width: 120px; }
        .col-pillar  { width: 180px; }
        .col-priority { width: 100px; text-align: right; }
        .col-serp    { width: 80px; text-align: center; }
        .col-title   { width: 250px; }
        .col-type    { width: 120px; }
        
        .empty-row {
          padding: 40px;
          text-align: center;
          color: var(--muted);
        }

        .active-filter-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--theme-primary-light);
          color: var(--theme-primary);
          padding: 6px 12px;
          border-radius: 10px;
          border: 1px solid rgba(var(--accent-rgb), 0.2);
          font-size: 13px;
          white-space: nowrap;
        }

        .clear-filter-x {
          background: transparent;
          border: 0;
          color: var(--theme-primary);
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          margin-left: 4px;
          opacity: 0.6;
          transition: opacity 0.1s ease;
        }

        .clear-filter-x:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
