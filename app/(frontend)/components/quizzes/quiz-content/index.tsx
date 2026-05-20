"use client";

import { useState } from "react";
import QuizAnswerField, { type QuizType } from "../quiz-answer-field";

export type QuizContentData = {
  id: number;
  educationLevelId: number;
  articleId: number;
  question: string;
  description: string;
  quizType: QuizType;
  optionText: string[];
};

type QuizContentProps = {
  quiz: QuizContentData;
};

export default function QuizContent({ quiz }: QuizContentProps) {
  const [shortAnswer, setShortAnswer] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const descriptionLines = quiz.description.split("\n");

  return (
    <>
      <h1 className="mb-8 text-3xl leading-snug">
        <span className="mr-3">Q.</span>
        {quiz.question}
      </h1>

      <div className="border-[1.5px] border-black px-8 py-12">
        <p className="mx-auto max-w-3xl text-2xl leading-relaxed">
          {descriptionLines.map((line, index) => (
            <span key={`${line}-${index}`}>
              {line}
              {index < descriptionLines.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
      </div>

      <div className="mt-8 mb-3 flex w-full justify-center">
        <QuizAnswerField
          optionText={quiz.optionText}
          quizType={quiz.quizType}
          selectedAnswer={selectedAnswer}
          shortAnswer={shortAnswer}
          onSelectAnswer={setSelectedAnswer}
          onShortAnswerChange={setShortAnswer}
        />
      </div>
    </>
  );
}
