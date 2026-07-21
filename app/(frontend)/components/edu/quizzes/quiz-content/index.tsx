"use client";

import QuizAnswerField, { type QuizType } from "../quiz-answer-field";

export type QuizSubmissionData = {
  answeredAt: string | null;
  isCorrect: boolean;
  isSkip: boolean;
  selectedAnswer: string;
};

export type QuizContentData = {
  id: number;
  educationLevelId: number;
  articleId: number;
  question: string;
  description: string;
  quizType: QuizType;
  optionText: string[];
  submission?: QuizSubmissionData | null;
};

type QuizContentProps = {
  quiz: QuizContentData;
  selectedAnswer: string;
  shortAnswer: string;
  isAnswerLocked?: boolean;
  onSelectAnswer: (answer: string) => void;
  onShortAnswerChange: (answer: string) => void;
};

export default function QuizContent({
  quiz,
  selectedAnswer,
  shortAnswer,
  isAnswerLocked = false,
  onSelectAnswer,
  onShortAnswerChange,
}: QuizContentProps) {
  const descriptionLines = quiz.description.split("\n");

  return (
    <>
      <h2 className="mb-6 text-2xl leading-snug font-bold tracking-[-0.02em] md:text-3xl">
        <span className="mr-3 text-(--cs-brand-700)">Q.</span>
        {quiz.question}
      </h2>

      <div className="rounded-xl border border-(--cs-border-subtle) bg-(--cs-surface-tint) px-5 py-7 md:px-8 md:py-9">
        <p className="mx-auto max-w-3xl text-lg leading-8 text-(--cs-text-default) md:text-xl md:leading-9">
          {descriptionLines.map((line, index) => (
            <span key={`${line}-${index}`}>
              {line}
              {index < descriptionLines.length - 1 && <br />}
            </span>
          ))}
        </p>
      </div>

      <div className="mt-7 mb-2 flex w-full justify-center">
        <QuizAnswerField
          optionText={quiz.optionText}
          quizType={quiz.quizType}
          disabled={isAnswerLocked}
          selectedAnswer={selectedAnswer}
          shortAnswer={shortAnswer}
          onSelectAnswer={onSelectAnswer}
          onShortAnswerChange={onShortAnswerChange}
        />
      </div>
    </>
  );
}
