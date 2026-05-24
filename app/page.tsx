import { questions } from "@/lib/test-data";
import TestClient from "@/app/test-client";

export default function HomePage() {
  return <TestClient questions={questions} />;
}
