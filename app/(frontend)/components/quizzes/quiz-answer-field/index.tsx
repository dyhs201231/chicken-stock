import Input from "../../ui/input";
import AnswerButton from "../answer-button";

export type QuizType = "SHORT_ANSWER" | "TRUE_FALSE" | "MULTIPLE_CHOICE";

type QuizAnswerFieldProps = {
  quizType: QuizType;
  optionText: string[];
  shortAnswer: string;
  selectedAnswer: string;
  onSelectAnswer: (answer: string) => void;
  onShortAnswerChange: (answer: string) => void;
};

export default function QuizAnswerField({
  quizType,
  optionText,
  shortAnswer,
  selectedAnswer,
  onSelectAnswer,
  onShortAnswerChange,
}: QuizAnswerFieldProps) {
  if (quizType === "SHORT_ANSWER") {
    return (
      <label className="w-full max-w-xl">
        <span className="sr-only">주관식 답안</span>
        <Input
          inputClassName="h-24 border-b-2 border-black text-center text-6xl font-black placeholder:text-black placeholder:opacity-100"
          value={shortAnswer}
          variant="underline"
          onChange={(event) => onShortAnswerChange(event.target.value)}
        />
      </label>
    );
  }

  if (quizType === "TRUE_FALSE") {
    const trueFalseOptions = optionText.length > 0 ? optionText : ["O", "X"];

    return (
      <div className="grid w-full max-w-4xl grid-cols-2 gap-6">
        {trueFalseOptions.map((option) => (
          <AnswerButton
            key={option}
            isSelected={selectedAnswer === option}
            variant={option === "O" ? "true" : "false"}
            onClick={() => onSelectAnswer(option)}
          >
            {option}
          </AnswerButton>
        ))}
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-5xl flex-col items-start gap-3">
      {optionText.map((option, index) => (
        <AnswerButton
          key={option}
          isSelected={selectedAnswer === option}
          onClick={() => onSelectAnswer(option)}
        >
          {index + 1}. {option}
        </AnswerButton>
      ))}
    </div>
  );
}
