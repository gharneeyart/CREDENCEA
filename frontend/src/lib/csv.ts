import type { BulkIssueResult, BulkIssueRow } from "@/types";

type ParsedCsvResult = {
  rows: BulkIssueRow[];
  errors: string[];
};

const walletPattern = /^0x[a-fA-F0-9]{40}$/;

function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === "\"") {
      if (insideQuotes && nextCharacter === "\"") {
        currentValue += "\"";
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (character === "," && !insideQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !insideQuotes) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows
    .map((row) => row.map((value) => value.trim()))
    .filter((row) => row.some((value) => value.length > 0));
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function escapeCsvValue(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
}

export function parseBulkIssueCsv(text: string): ParsedCsvResult {
  const rows = splitCsv(text.replace(/^\uFEFF/, ""));
  if (rows.length < 2) {
    return {
      rows: [],
      errors: ["The CSV must include a header row and at least one student row."],
    };
  }

  const [headerRow, ...dataRows] = rows;
  const headerMap = new Map(headerRow.map((header, index) => [normalizeHeader(header), index]));

  const requiredHeaders = {
    wallet: ["wallet address", "wallet", "recipient address", "recipient wallet", "address"],
    studentName: ["student name", "name", "student"],
    degree: ["degree"],
    major: ["major", "field of study", "field", "programme", "program"],
    grade: ["grade", "result", "class"],
    graduationYear: ["year", "graduation year"],
  };

  const findHeaderIndex = (aliases: string[]) => {
    for (const alias of aliases) {
      const index = headerMap.get(alias);
      if (index !== undefined) return index;
    }
    return -1;
  };

  const walletIndex = findHeaderIndex(requiredHeaders.wallet);
  const studentNameIndex = findHeaderIndex(requiredHeaders.studentName);
  const degreeIndex = findHeaderIndex(requiredHeaders.degree);
  const majorIndex = findHeaderIndex(requiredHeaders.major);
  const gradeIndex = findHeaderIndex(requiredHeaders.grade);
  const graduationYearIndex = findHeaderIndex(requiredHeaders.graduationYear);
  const descriptionIndex = findHeaderIndex(["description", "notes", "additional notes"]);

  if ([walletIndex, studentNameIndex, degreeIndex, majorIndex, gradeIndex, graduationYearIndex].some((index) => index === -1)) {
    return {
      rows: [],
      errors: [
        "The CSV headers must include wallet address, student name, degree, major, grade, and year.",
      ],
    };
  }

  const errors: string[] = [];
  const parsedRows: BulkIssueRow[] = [];

  dataRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const recipientAddress = row[walletIndex]?.trim() || "";
    const studentName = row[studentNameIndex]?.trim() || "";
    const degree = row[degreeIndex]?.trim() || "";
    const major = row[majorIndex]?.trim() || "";
    const grade = row[gradeIndex]?.trim() || "";
    const graduationYear = row[graduationYearIndex]?.trim() || "";
    const description = descriptionIndex >= 0 ? row[descriptionIndex]?.trim() || "" : "";

    if (!recipientAddress || !studentName || !degree || !major || !grade || !graduationYear) {
      errors.push(`Row ${rowNumber} is missing one or more required values.`);
      return;
    }

    if (!walletPattern.test(recipientAddress)) {
      errors.push(`Row ${rowNumber} has an invalid wallet address.`);
      return;
    }

    parsedRows.push({
      rowNumber,
      recipientAddress,
      studentName,
      degree,
      major,
      grade,
      graduationYear,
      description,
    });
  });

  return { rows: parsedRows, errors };
}

export function buildBulkResultsCsv(results: BulkIssueResult[]): string {
  const header = ["student_name", "token_id", "wallet_address", "status", "error"];
  const lines = results.map((result) => [
    result.studentName,
    result.tokenId?.toString() || "",
    result.recipientAddress,
    result.status,
    result.error || "",
  ]);

  return [header, ...lines]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\n");
}
