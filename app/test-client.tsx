"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Question } from "@/lib/test-data";

type SubmitResponse = {
  ok: boolean;
  score: number;
  total: number;
  percent: number;
  error?: string;
};

export default function TestClient({ questions }: { questions: Question[] }) {
  const [studentName, setStudentName] = useState("");
  const [group, setGroup] = useState("");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<number[]>(() => Array(questions.length).fill(-1));
  const [secondsLeft, setSecondsLeft] = useState(60 * 60);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const answersRef = useRef(answers);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const answeredCount = useMemo(
    () => answers.filter((answer) => answer >= 0).length,
    [answers]
  );

  useEffect(() => {
    if (!started || finished) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          void submitTest(true);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
    // submitTest intentionally reads current state when the timer expires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, finished]);

  function startTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentName.trim() || !group.trim()) return;
    setStarted(true);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function setAnswer(questionIndex: number, answerIndex: number) {
    setAnswers((current) => {
      const next = [...current];
      next[questionIndex] = answerIndex;
      return next;
    });
  }

  async function submitTest(fromTimer = false) {
    if (submitting || finished) return;

    const currentAnswers = answersRef.current;
    const unanswered = currentAnswers.filter((answer) => answer < 0).length;
    if (!fromTimer && unanswered > 0) {
      const ok = window.confirm(`Не надано відповідей: ${unanswered}. Завершити тест зараз?`);
      if (!ok) return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName, group, answers: currentAnswers })
      });
      const payload = (await response.json()) as SubmitResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Не вдалося зберегти результат.");
      }

      setResult(payload);
      setFinished(true);
      window.scrollTo({ top: 0, behavior: "auto" });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Не вдалося зберегти результат.");
    } finally {
      setSubmitting(false);
    }
  }

  const minutes = Math.max(0, Math.floor(secondsLeft / 60));
  const seconds = Math.max(0, secondsLeft % 60);
  const time = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  if (finished && result) {
    return (
      <main className="app-shell">
        <section className="result">
          <p className="eyebrow">Результат збережено</p>
          <h1>Тест завершено</h1>
          <div className="score">{result.score}/{result.total} ({result.percent}%)</div>
          <p>
            Таблиця доступна за посиланням <a href="/results">/results</a>.
          </p>
          <table className="meta-table">
            <tbody>
              <tr>
                <th>Студент</th>
                <td>{studentName}</td>
              </tr>
              <tr>
                <th>Група</th>
                <td>{group}</td>
              </tr>
              <tr>
                <th>Бали</th>
                <td>{result.score}/{result.total} ({result.percent}%)</td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>
    );
  }

  if (!started) {
    return (
      <main className="app-shell">
        <section className="intro">
          <div>
            <p className="eyebrow">Підсумковий модульний контроль</p>
            <h1>Лінгвокраїнознавство Великої Британії та США</h1>
            <p className="intro__meta">Час виконання: 60 хвилин</p>
          </div>

          <form className="student-form" onSubmit={startTest}>
            <label>
              <span>Прізвище та ім&apos;я студента</span>
              <input
                value={studentName}
                onChange={(event) => setStudentName(event.target.value)}
                autoComplete="name"
                required
              />
            </label>

            <label>
              <span>Академічна група</span>
              <input
                value={group}
                onChange={(event) => setGroup(event.target.value)}
                autoComplete="organization"
                required
              />
            </label>

            <button type="submit">Розпочати тест</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="test">
        <header className="testbar">
          <div>
            <p className="eyebrow">Тест триває</p>
            <h2>{studentName} · {group}</h2>
          </div>
          <div className={`timer ${secondsLeft <= 300 ? "is-low" : ""}`} aria-live="polite">
            <span>Залишилось</span>
            <strong>{time}</strong>
          </div>
        </header>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitTest(false);
          }}
        >
          <div className="questions">
            {questions.map((question, questionIndex) => (
              <fieldset className="question" key={question.text}>
                <legend>{questionIndex + 1}. {question.text}</legend>
                <div className="options">
                  {question.options.map((option, answerIndex) => (
                    <label className="option" key={option}>
                      <input
                        type="radio"
                        name={`q${questionIndex}`}
                        checked={answers[questionIndex] === answerIndex}
                        onChange={() => setAnswer(questionIndex, answerIndex)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="submit-row">
            <p>Відповіді: {answeredCount}/{questions.length}</p>
            <button type="submit" disabled={submitting}>
              {submitting ? "Збереження..." : "Завершити та зберегти"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
