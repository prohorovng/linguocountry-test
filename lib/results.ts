import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import { correctAnswers, LETTERS } from "@/lib/test-data";

export type TestResult = {
  id: string;
  submittedAt: string;
  studentName: string;
  group: string;
  score: number;
  total: number;
  percent: number;
  answers: number[];
  correctAnswers: number[];
};

const resultsKey = "linguocountry-test:results";
const dataDir = path.join(process.cwd(), "data");
const jsonlPath = path.join(dataDir, "results.jsonl");
const csvPath = path.join(dataDir, "results.csv");
const writableDataDir = process.env.VERCEL ? "/tmp/linguocountry-test" : dataDir;
const writableJsonlPath = path.join(writableDataDir, "results.jsonl");
const writableCsvPath = path.join(writableDataDir, "results.csv");

let redis: Redis | null | undefined;

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  if (redis === undefined) {
    redis = Redis.fromEnv();
  }

  return redis;
}

export function buildResult(input: {
  studentName: unknown;
  group: unknown;
  answers: unknown;
}): TestResult {
  const studentName = String(input.studentName || "").trim().replace(/\s+/g, " ");
  const group = String(input.group || "").trim().replace(/\s+/g, " ");
  const answers = Array.isArray(input.answers) ? input.answers.map(Number) : [];

  if (studentName.length < 2) {
    throw new Error("Вкажіть прізвище та ім'я студента.");
  }

  if (group.length < 1) {
    throw new Error("Вкажіть академічну групу.");
  }

  if (
    answers.length !== correctAnswers.length ||
    answers.some((answer) => !Number.isInteger(answer) || answer < -1 || answer > 3)
  ) {
    throw new Error("Потрібно відповісти на всі питання.");
  }

  const total = correctAnswers.length;
  const score = answers.reduce(
    (sum, answer, index) => sum + (answer === correctAnswers[index] ? 1 : 0),
    0
  );
  const percent = Math.round((score / total) * 100);

  return {
    id: randomUUID(),
    submittedAt: new Date().toISOString(),
    studentName,
    group,
    score,
    total,
    percent,
    answers,
    correctAnswers
  };
}

export async function saveResult(result: TestResult) {
  const redisClient = getRedis();

  if (redisClient) {
    await redisClient.lpush(resultsKey, result);
    return;
  }

  await ensureLocalFiles();
  await fs.appendFile(writableJsonlPath, `${JSON.stringify(result)}\n`, "utf8");
  await fs.appendFile(writableCsvPath, `${toCsvRow(result)}\n`, "utf8");
}

export async function getResults(): Promise<TestResult[]> {
  const redisClient = getRedis();

  if (redisClient) {
    const results = await redisClient.lrange<TestResult>(resultsKey, 0, -1);
    return results.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  return getLocalResults();
}

export async function getResultsCsv() {
  const results = await getResults();
  const header = [
    "submittedAt",
    "studentName",
    "group",
    "score",
    "total",
    "percent",
    "answers",
    "correctAnswers",
    "id"
  ].join(",");

  return [header, ...results.map(toCsvRow)].join("\n") + "\n";
}

export function answerLetters(answers: number[]) {
  return answers.map((answer) => (answer >= 0 ? LETTERS[answer] : "-")).join(" ");
}

async function getLocalResults() {
  await ensureLocalFiles();
  const [seedJsonl, writableJsonl] = await Promise.all([
    readOptionalFile(jsonlPath),
    readOptionalFile(writableJsonlPath)
  ]);
  const jsonl = `${seedJsonl}\n${writableJsonl}`;
  const results = jsonl
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as TestResult;
      } catch {
        return null;
      }
    })
    .filter((result): result is TestResult => Boolean(result));

  return results.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

async function ensureLocalFiles() {
  await fs.mkdir(writableDataDir, { recursive: true });

  try {
    await fs.access(writableJsonlPath);
  } catch {
    await fs.writeFile(writableJsonlPath, "", "utf8");
  }

  try {
    await fs.access(writableCsvPath);
  } catch {
    await fs.writeFile(
      writableCsvPath,
      "submittedAt,studentName,group,score,total,percent,answers,correctAnswers,id\n",
      "utf8"
    );
  }
}

async function readOptionalFile(filePath: string) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function toCsvRow(result: TestResult) {
  return [
    result.submittedAt,
    result.studentName,
    result.group,
    result.score,
    result.total,
    `${result.percent}%`,
    answerLetters(result.answers),
    answerLetters(result.correctAnswers),
    result.id
  ].map(csvCell).join(",");
}

function csvCell(value: string | number) {
  const text = String(value ?? "");
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}
