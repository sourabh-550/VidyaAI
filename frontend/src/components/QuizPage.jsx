import { useState } from "react";
import axios from "axios";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, XCircle } from "lucide-react";
import Button from "./ui/Button";
import SlowServerNotice from "./ui/SlowServerNotice";
import useSlowNotice from "../lib/useSlowNotice";
import apiErrorMessage from "../lib/apiError";
import { API_BASE } from "../lib/constants";

const BADGES = [
  { min: 100, label: "Excellent" },
  { min: 70, label: "Good understanding" },
  { min: 40, label: "Needs revision" },
  { min: 0, label: "Keep learning" },
];

function getBadge(pct) {
  return BADGES.find((b) => pct >= b.min) || BADGES[BADGES.length - 1];
}

const QUESTION_COUNTS = [5, 10];

export default function QuizPage() {
  const [topic, setTopic] = useState("");
  const [numQ, setNumQ] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const slow = useSlowNotice(loading);

  const generate = async () => {
    setLoading(true);
    setError("");
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setCurrentQ(0);
    try {
      const res = await axios.post(`${API_BASE}/quiz`, {
        topic,
        num_questions: numQ,
      });
      setQuestions(res.data.questions);
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't make the quiz. Check that your textbook is uploaded, then try again."));
    } finally {
      setLoading(false);
    }
  };

  const select = (qi, opt) => {
    if (submitted) return;
    setAnswers((p) => ({ ...p, [qi]: opt }));
  };

  const submit = () => {
    let s = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correct) s++;
    });
    setScore(s);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => {
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setScore(0);
    setTopic("");
    setCurrentQ(0);
  };

  const allAnswered =
    questions.length > 0 && Object.keys(answers).length === questions.length;
  const pct =
    questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const badge = getBadge(pct);
  const answeredCount = Object.keys(answers).length;
  const isLast = currentQ === questions.length - 1;

  return (
    <div className="max-w-[720px] pt-8 pb-16">
      {/* Setup */}
      {questions.length === 0 && !loading && (
        <div>
          <IntroHeading />
          <form
            className="mt-6 rounded-[10px] border border-border bg-surface p-5 sm:p-6"
            onSubmit={(e) => {
              e.preventDefault();
              generate();
            }}
          >
            <label htmlFor="quiz-topic" className="block text-sm font-medium text-text">
              Topic <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="quiz-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Photosynthesis, Chapter 3"
              className="mt-2 min-h-12 w-full rounded-lg border border-input-border bg-bg px-3 text-base text-text transition-colors duration-150 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />

            <fieldset className="mt-5">
              <legend className="text-sm font-medium text-text">Number of questions</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {QUESTION_COUNTS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={numQ === n}
                    onClick={() => setNumQ(n)}
                    className={`min-h-12 rounded-lg border text-base font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      numQ === n
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-bg text-muted hover:border-primary/50 hover:text-text"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </fieldset>

            <Button type="submit" size="lg" className="mt-6 w-full">
              Make quiz
            </Button>

            {error && (
              <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-danger">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </p>
            )}
          </form>
        </div>
      )}

      {/* Loading: static skeleton, no spinner */}
      {loading && (
        <div aria-live="polite">
          <IntroHeading />
          <p className="mt-6 text-muted">
            Writing {numQ} questions from your textbook…
          </p>
          <div
            className="mt-4 rounded-[10px] border border-border bg-surface p-5 sm:p-6"
            aria-hidden="true"
          >
            <div className="h-4 w-3/4 rounded-sm bg-border" />
            <div className="mt-5 space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg border border-border bg-bg" />
              ))}
            </div>
          </div>
          {slow && (
            <SlowServerNotice className="mt-4">
              Waking up the server. This can take up to a minute.
            </SlowServerNotice>
          )}
        </div>
      )}

      {/* Answering: one question at a time */}
      {questions.length > 0 && !submitted && (
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm text-muted">
              Question {currentQ + 1} of {questions.length} · {answeredCount} answered
            </p>
            <button
              type="button"
              onClick={reset}
              className="rounded-sm text-sm font-medium text-primary underline-offset-4 transition-colors duration-150 hover:text-primary-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              New quiz
            </button>
          </div>

          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-border"
            role="progressbar"
            aria-label="Questions answered"
            aria-valuemin={0}
            aria-valuemax={questions.length}
            aria-valuenow={answeredCount}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>

          <nav aria-label="Questions" className="mt-4 flex flex-wrap gap-1.5">
            {questions.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentQ(i)}
                aria-current={currentQ === i ? "step" : undefined}
                aria-label={`Question ${i + 1}${answers[i] ? ", answered" : ""}`}
                className={`h-10 min-w-10 rounded-lg border px-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  currentQ === i
                    ? "border-primary bg-primary text-on-primary"
                    : answers[i]
                      ? "border-primary/40 bg-primary/10 text-text"
                      : "border-border bg-surface text-muted hover:text-text"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </nav>

          <QuestionCard
            className="mt-6"
            q={questions[currentQ]}
            qi={currentQ}
            answers={answers}
            submitted={false}
            onSelect={select}
          />

          <div className="mt-6 flex items-center justify-between gap-4">
            <Button
              variant="secondary"
              disabled={currentQ === 0}
              onClick={() => setCurrentQ((c) => c - 1)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Previous
            </Button>
            {isLast ? (
              <Button disabled={!allAnswered} onClick={submit}>
                Submit quiz
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setCurrentQ((c) => c + 1)}>
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>

          {isLast && !allAnswered && (
            <p className="mt-3 text-right text-sm text-muted">
              Answer every question to submit.
            </p>
          )}
          {!isLast && allAnswered && (
            <Button className="mt-4 w-full" size="lg" onClick={submit}>
              Submit quiz
            </Button>
          )}
        </div>
      )}

      {/* Results, then a review of every question */}
      {submitted && (
        <div>
          <section
            aria-labelledby="quiz-results"
            className="rounded-[10px] border border-border bg-surface p-5 sm:p-6"
          >
            <p className="text-sm text-muted">Your score</p>
            <h2 id="quiz-results" className="mt-1 font-display text-3xl font-bold text-text">
              {score} out of {questions.length}
            </h2>
            <p className="mt-1 text-muted">
              {pct}% · {badge.label}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-border" aria-hidden="true">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <dl className="mt-4 flex gap-8 text-sm">
              <div>
                <dt className="text-muted">Correct</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 text-base font-semibold text-primary">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {score}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Wrong</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 text-base font-semibold text-danger">
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  {questions.length - score}
                </dd>
              </div>
            </dl>
            <Button className="mt-6" onClick={reset}>
              Make a new quiz
            </Button>
          </section>

          <h3 className="mt-10 font-display text-xl font-semibold text-text">
            Review your answers
          </h3>
          <div className="mt-4 space-y-4">
            {questions.map((q, qi) => (
              <QuestionCard
                key={qi}
                q={q}
                qi={qi}
                answers={answers}
                submitted
                onSelect={select}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IntroHeading() {
  return (
    <>
      <h2 className="font-display text-2xl font-semibold text-text">Practice quiz</h2>
      <p className="mt-2 text-muted">
        MCQ and True/False questions made from your textbook. Add a topic, or
        leave it blank to cover the whole book.
      </p>
    </>
  );
}

// The API's options often carry their own letter ("A) Paris"), which duplicates
// the letter badge. Strip it for display only, and only when every option has
// its matching letter. Answers are still compared using the original strings.
function optionLabels(options) {
  const prefix = (oi) =>
    new RegExp(`^\\s*${String.fromCharCode(65 + oi)}\\s*[).:]\\s*`, "i");
  const allPrefixed = options.every((opt, oi) => prefix(oi).test(opt));
  return options.map((opt, oi) =>
    allPrefixed ? opt.replace(prefix(oi), "") || opt : opt
  );
}

function QuestionCard({ q, qi, answers, submitted, onSelect, className = "" }) {
  const isCorrect = answers[qi] === q.correct;
  const labels = optionLabels(q.options);

  return (
    <div className={`rounded-[10px] border border-border bg-surface p-5 sm:p-6 ${className}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        <span>
          Question {qi + 1} · {q.type === "mcq" ? "MCQ" : "True or false"}
        </span>
        {submitted && (
          <span
            className={`ml-auto flex items-center gap-1 font-semibold ${
              isCorrect ? "text-primary" : "text-danger"
            }`}
          >
            {isCorrect ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <XCircle className="h-4 w-4" aria-hidden="true" />
            )}
            {isCorrect ? "Correct" : "Wrong"}
          </span>
        )}
      </div>

      <p className="mt-2 font-display text-lg font-semibold leading-snug text-text">
        {q.question}
      </p>

      <div className="mt-5 space-y-2">
        {q.options.map((opt, oi) => {
          const selected = answers[qi] === opt;
          const isAnswer = opt === q.correct;

          // After submitting, colour is always paired with an icon and a label.
          let rowClass = "border-border bg-surface text-text hover:border-primary/50 hover:bg-primary/5";
          let status = null;
          if (submitted) {
            if (isAnswer) {
              rowClass = "border-primary bg-primary/10 text-text";
              status = { icon: CheckCircle2, text: selected ? "Your answer" : "Correct answer", color: "text-primary" };
            } else if (selected) {
              rowClass = "border-danger bg-danger/10 text-text";
              status = { icon: XCircle, text: "Your answer", color: "text-danger" };
            } else {
              rowClass = "border-border bg-surface text-muted";
            }
          } else if (selected) {
            rowClass = "border-primary bg-primary/10 text-text";
          }

          return (
            <button
              key={oi}
              type="button"
              aria-pressed={!submitted ? selected : undefined}
              className={`flex min-h-12 w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default ${rowClass}`}
              onClick={() => onSelect(qi, opt)}
              disabled={submitted}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-sm font-semibold ${
                  submitted && selected && !isAnswer
                    ? "border-danger bg-danger text-on-primary"
                    : selected
                      ? "border-primary bg-primary text-on-primary"
                      : "border-border text-muted"
                }`}
                aria-hidden="true"
              >
                {String.fromCharCode(65 + oi)}
              </span>
              <span className="flex-1">{labels[oi]}</span>
              {status && (
                <span className={`flex shrink-0 items-center gap-1 text-sm font-medium ${status.color}`}>
                  <status.icon className="h-4 w-4" aria-hidden="true" />
                  {status.text}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {submitted && q.explanation && (
        <p className="mt-4 rounded-lg bg-bg px-4 py-3 text-sm text-text">
          <span className="font-semibold">Explanation: </span>
          {q.explanation}
        </p>
      )}
    </div>
  );
}
