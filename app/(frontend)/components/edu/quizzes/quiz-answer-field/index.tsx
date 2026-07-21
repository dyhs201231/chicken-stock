import Input from "../../../ui/input";
import AnswerButton from "../answer-button";

export type QuizType = "SHORT_ANSWER" | "TRUE_FALSE" | "MULTIPLE_CHOICE";

type QuizAnswerFieldProps = {
  quizType: QuizType;
  optionText: string[];
  disabled?: boolean;
  shortAnswer: string;
  selectedAnswer: string;
  onSelectAnswer: (answer: string) => void;
  onShortAnswerChange: (answer: string) => void;
};

function getTrueFalseOptions(optionText: string[]) {
  if (optionText.length > 0) {
    return optionText;
  }

  return ["O", "X"];
}

function getTrueFalseVariant(option: string): "true" | "false" {
  if (option === "O") {
    return "true";
  }

  return "false";
}

export default function QuizAnswerField({
  quizType,
  optionText,
  disabled = false,
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
          inputClassName="h-20 border-b-2 border-(--cs-brand-500) text-center text-4xl font-bold placeholder:text-(--cs-text-muted) placeholder:opacity-100 md:h-24 md:text-5xl"
          disabled={disabled}
          value={shortAnswer}
          variant="underline"
          onChange={(event) => onShortAnswerChange(event.target.value)}
        />
      </label>
    );
  }

  if (quizType === "TRUE_FALSE") {
    const trueFalseOptions = getTrueFalseOptions(optionText);

    return (
      <div className="grid w-full max-w-4xl grid-cols-2 gap-3 md:gap-6">
        {trueFalseOptions.map((option, index) => (
          <AnswerButton
            key={`${option}-${index}`}
            disabled={disabled}
            isSelected={selectedAnswer === option}
            variant={getTrueFalseVariant(option)}
            onClick={() => onSelectAnswer(option)}
          >
            {option}
          </AnswerButton>
        ))}
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-5xl flex-col items-stretch gap-3">
      {optionText.map((option, index) => (
        <AnswerButton
          key={`${option}-${index}`}
          disabled={disabled}
          isSelected={selectedAnswer === option}
          onClick={() => onSelectAnswer(option)}
        >
          {index + 1}. {option}
        </AnswerButton>
      ))}
    </div>
  );
}
