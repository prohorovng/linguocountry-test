import Link from "next/link";
import { answerLetters, getResults } from "@/lib/results";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const results = await getResults();

  return (
    <main className="app-shell">
      <header className="results-header">
        <div>
          <h1>Результати тесту</h1>
          <p>Усього записів: {results.length}</p>
        </div>
        <nav className="results-nav">
          <Link href="/">Повернутися до тесту</Link>
          <a href="/results.csv">Відкрити CSV</a>
        </nav>
      </header>

      <section className="results-card">
        {results.length ? (
          <table className="results-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Студент</th>
                <th>Група</th>
                <th>Бали</th>
                <th>%</th>
                <th>Відповіді</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.id}>
                  <td>{formatDate(result.submittedAt)}</td>
                  <td>{result.studentName}</td>
                  <td>{result.group}</td>
                  <td><strong>{result.score}/{result.total}</strong></td>
                  <td>{result.percent}%</td>
                  <td>{answerLetters(result.answers)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">Поки що немає жодного результату.</div>
        )}
      </section>
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("uk-UA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
