export interface CsvRow {
  [key: string]: string;
}

export function numeric(value: string) {
  if (!value) return 0;
  // Strip currency symbols, percentages, and commas
  let normalized = value.replace(/[$,%]/g, "").trim().toLowerCase();
  
  // Handle 'k' and 'm' suffixes
  let multiplier = 1;
  if (normalized.endsWith("k")) {
    multiplier = 1000;
    normalized = normalized.slice(0, -1);
  } else if (normalized.endsWith("m")) {
    multiplier = 1000000;
    normalized = normalized.slice(0, -1);
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed * multiplier : 0;
}

export function parseCsv(text: string): CsvRow[] {
  const cleanText = text.replace(/^\ufeff/, "").replace(/\r\n/g, "\n");
  const lines = cleanText.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Robust delimiter detection: Count occurrences in the first line
  const firstLine = lines[0];
  const delimiters = [",", ";", "\t"];
  const counts = delimiters.map(d => ({ d, count: firstLine.split(d).length - 1 }));
  const best = counts.reduce((a, b) => b.count > a.count ? b : a);
  const delimiter = best.count > 0 ? best.d : ",";
  
  console.log(`[DEBUG] Detected Delimiter: "${delimiter === "\t" ? "\\t" : delimiter}"`);

  const splitLine = (l: string) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < l.length; i++) {
        const char = l[i];
        if (char === '"') { inQuotes = !inQuotes; continue; }
        if (char === delimiter && !inQuotes) { 
          values.push(current.trim().replace(/^"|"$/g, "")); 
          current = ""; 
          continue; 
        }
        current += char;
    }
    values.push(current.trim().replace(/^"|"$/g, ""));
    return values;
  };

  const headers = splitLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const rawHeaders = splitLine(lines[0]);
  console.log("[DEBUG] Raw Headers:", rawHeaders);
  console.log("[DEBUG] Normalized Headers:", headers);

  return lines.slice(1).map((line) => {
    const values = splitLine(line);
    return rawHeaders.reduce<CsvRow>((row, header, index) => {
      row[header] = values[index] ?? "";
      return row;
    }, {});
  });
}
