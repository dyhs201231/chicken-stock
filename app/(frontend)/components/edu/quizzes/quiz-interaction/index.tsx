"use client";

import { useState } from "react";
import { useSubmitQuizAnswerMutation } from "@/app/(frontend)/apis/edu/quizzes/mutations";
import Modal from "../../../ui/modal";
import QuizContent, { type QuizContentData } from "../quiz-content";

type QuizInteractionProps = {
  quiz: QuizContentData;
  userId?: string;
};

type SubmissionResult = {
  answer: string;
  explanation: string;
  status: "correct" | "incorrect" | "error";
  isRewardPaid?: boolean;
  rewardAmountKrw?: number;
};

function isPositiveIntegerText(value?: string) {
  return typeof value === "string" && /^\d+$/.test(value) && Number(value) > 0;
}

function getAnswerValue(
  quiz: QuizContentData,
  selectedAnswer: string,
  shortAnswer: string,
) {
  if (quiz.quizType === "SHORT_ANSWER") {
    return shortAnswer.trim();
  }

  return selectedAnswer;
}

function getSubmitButtonLabel(
  isPending: boolean,
  hasCorrectSubmission: boolean,
  isAlreadySubmitted: boolean,
) {
  if (isPending) {
    return "확인 중";
  }

  if (hasCorrectSubmission || isAlreadySubmitted) {
    return "제출 완료";
  }

  return "확인";
}

function getInitialAnswerState(quiz: QuizContentData) {
  const submittedAnswer = quiz.submission?.selectedAnswer ?? "";

  if (quiz.quizType === "SHORT_ANSWER") {
    return {
      selectedAnswer: "",
      shortAnswer: submittedAnswer,
      submittedAnswer,
    };
  }

  return {
    selectedAnswer: submittedAnswer,
    shortAnswer: "",
    submittedAnswer,
  };
}

function formatRewardAmount(value: number) {
  return value.toLocaleString("ko-KR");
}

export default function QuizInteraction({
  quiz,
  userId,
}: QuizInteractionProps) {
  const initialAnswerState = getInitialAnswerState(quiz);
  const [shortAnswer, setShortAnswer] = useState(
    initialAnswerState.shortAnswer,
  );
  const [selectedAnswer, setSelectedAnswer] = useState(
    initialAnswerState.selectedAnswer,
  );
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [submissionResult, setSubmissionResult] =
    useState<SubmissionResult | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState(
    initialAnswerState.submittedAnswer,
  );
  const [hasCorrectSubmission, setHasCorrectSubmission] = useState(
    quiz.submission?.isCorrect === true,
  );
  const submitAnswer = useSubmitQuizAnswerMutation();
  const answerValue = getAnswerValue(quiz, selectedAnswer, shortAnswer);
  const isAlreadySubmitted =
    hasCorrectSubmission &&
    answerValue.length > 0 &&
    answerValue === submittedAnswer;
  const canSubmit =
    answerValue.length > 0 &&
    isPositiveIntegerText(userId) &&
    !isAlreadySubmitted &&
    !hasCorrectSubmission;
  const isAnswerLocked = hasCorrectSubmission || submitAnswer.isPending;

  const handleSelectAnswer = (answer: string) => {
    if (isAnswerLocked) {
      return;
    }

    setSelectedAnswer(answer);
    setSubmissionResult(null);
  };

  const handleShortAnswerChange = (answer: string) => {
    if (isAnswerLocked) {
      return;
    }

    setShortAnswer(answer);
    setSubmissionResult(null);
  };

  const handleSubmit = () => {
    if (!userId || !canSubmit) {
      return;
    }

    setSubmissionResult(null);
    submitAnswer.mutate(
      {
        articleId: quiz.articleId,
        quizId: quiz.id,
        userAnswer: answerValue,
        userId,
      },
      {
        onSuccess: (result) => {
          setSubmittedAnswer(result.selectedAnswer);
          setHasCorrectSubmission(result.isCorrect);
          setSubmissionResult({
            answer: result.answer,
            explanation: result.isCorrect
              ? result.explanation
              : "아쉬워요! 다시 한 번 생각해 볼까요?",
            status: result.isCorrect ? "correct" : "incorrect",
            isRewardPaid: result.isRewardPaid,
            rewardAmountKrw: result.rewardAmountKrw,
          });
          setIsResultModalOpen(true);
        },
        onError: (error) => {
          let explanation = "잠시 후 다시 시도해 주세요.";

          if (error instanceof Error) {
            explanation = error.message;
          }

          setSubmissionResult({
            answer: "제출 실패",
            explanation,
            status: "error",
          });
          setIsResultModalOpen(true);
        },
      },
    );
  };

  return (
    <>
      <section className="cs-surface-card mx-auto flex w-full max-w-6xl flex-col px-5 py-7 text-(--cs-text-strong) md:px-10 md:py-10">
        <QuizContent
          quiz={quiz}
          selectedAnswer={selectedAnswer}
          shortAnswer={shortAnswer}
          isAnswerLocked={isAnswerLocked}
          onSelectAnswer={handleSelectAnswer}
          onShortAnswerChange={handleShortAnswerChange}
        />
      </section>

      <div className="flex w-full flex-col items-end gap-3">
        <button
          type="button"
          className="inline-flex min-h-12 min-w-28 items-center justify-center rounded-lg bg-(--cs-brand-700) px-6 text-lg font-semibold text-white shadow-(--cs-shadow-sm) transition hover:bg-(--cs-brand-800) disabled:cursor-not-allowed disabled:bg-(--cs-brand-100) disabled:text-(--cs-brand-700) disabled:shadow-none"
          disabled={!canSubmit || submitAnswer.isPending}
          onClick={handleSubmit}
        >
          {getSubmitButtonLabel(
            submitAnswer.isPending,
            hasCorrectSubmission,
            isAlreadySubmitted,
          )}
        </button>

        {!isPositiveIntegerText(userId) && (
          <p className="text-base font-medium text-rose-600">
            사용자 정보가 없어 답안을 제출할 수 없어요.
          </p>
        )}
      </div>

      <Modal.Root isOpen={isResultModalOpen} setIsOpen={setIsResultModalOpen}>
        <Modal.Overlay className="p-0">
          <Modal.Content
            aria-labelledby="quiz-result-title"
            aria-describedby="quiz-result-description"
            closeButtonLabel="퀴즈 결과 닫기"
            closeButtonClassName="right-5 top-5 size-9"
            className="min-h-80 w-162.5 max-w-[calc(100vw-32px)] p-7 pr-14 md:p-10 md:pr-16"
          >
            {submissionResult && (
              <div className="flex h-full flex-col gap-4">
                <p className="cs-section-label">
                  {submissionResult.status === "correct" && "Correct answer"}
                  {submissionResult.status === "incorrect" && "Try again"}
                  {submissionResult.status === "error" && "Submission error"}
                </p>
                <h2
                  id="quiz-result-title"
                  className="text-3xl leading-tight font-bold text-(--cs-text-strong)"
                >
                  {submissionResult.status === "correct" &&
                    `정답 : ${submissionResult.answer}`}
                  {submissionResult.status === "incorrect" && "아쉬워요"}
                  {submissionResult.status === "error" && "제출하지 못했어요"}
                </h2>

                <div className="min-h-0 flex-1 rounded-xl border border-(--cs-brand-300) bg-(--cs-brand-50) px-4 py-3">
                  <p
                    id="quiz-result-description"
                    className="text-lg leading-8 whitespace-pre-line text-(--cs-text-default) md:text-xl md:leading-9"
                  >
                    {submissionResult.explanation}
                  </p>

                  {submissionResult.status === "correct" &&
                    submissionResult.isRewardPaid &&
                    submissionResult.rewardAmountKrw !== undefined && (
                      <p className="mt-4 text-lg leading-8 font-bold text-(--cs-brand-800) md:text-xl">
                        보상으로{" "}
                        {formatRewardAmount(submissionResult.rewardAmountKrw)}
                        원이 지급되었어요.
                      </p>
                    )}
                </div>
              </div>
            )}
          </Modal.Content>
        </Modal.Overlay>
      </Modal.Root>
    </>
  );
}
