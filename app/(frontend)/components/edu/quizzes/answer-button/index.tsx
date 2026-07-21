import type { ReactNode } from "react";
import Image from "next/image";
import { twMerge } from "tailwind-merge";

type AnswerButtonVariant = "default" | "true" | "false";

type AnswerButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  isSelected: boolean;
  variant?: AnswerButtonVariant;
  onClick: () => void;
};

const answerButtonVariants: Record<AnswerButtonVariant, string> = {
  default:
    "w-full justify-start rounded-xl border border-(--cs-border-strong) bg-(--cs-surface-raised) px-4 py-3 text-left text-lg leading-7 font-medium hover:border-(--cs-brand-500) hover:bg-(--cs-brand-50) md:px-5 md:text-xl",
  true: "h-32 w-full justify-center rounded-xl border-4 border-(--cs-color-blue-800) bg-(--cs-surface-raised) px-4 text-6xl font-black text-(--cs-color-blue-800) md:h-40 md:border-6 md:text-8xl",
  false:
    "h-32 w-full justify-center rounded-xl border-4 border-[#FF5A60] bg-(--cs-surface-raised) px-4 text-6xl font-black text-[#FF5A60] md:h-40 md:border-6 md:text-8xl",
};

const selectedAnswerButtonVariants: Record<AnswerButtonVariant, string> = {
  default: "border-(--cs-brand-600) bg-(--cs-brand-100) text-(--cs-brand-800)",
  true: "bg-[#4d61f529]",
  false: "bg-red-50",
};

const trueFalseIconConfig = {
  true: {
    height: 91,
    src: "/icon/quizzes/o.svg",
    width: 91,
  },
  false: {
    height: 78,
    src: "/icon/quizzes/x.svg",
    width: 81,
  },
} satisfies Record<
  Exclude<AnswerButtonVariant, "default">,
  {
    height: number;
    src: string;
    width: number;
  }
>;

function getTrueFalseIcon(variant: AnswerButtonVariant) {
  if (variant === "true" || variant === "false") {
    return trueFalseIconConfig[variant];
  }

  return null;
}

export default function AnswerButton({
  children,
  disabled = false,
  isSelected,
  variant = "default",
  onClick,
}: AnswerButtonProps) {
  const trueFalseIcon = getTrueFalseIcon(variant);

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      className={twMerge(
        "flex items-center transition",
        answerButtonVariants[variant],
        isSelected && selectedAnswerButtonVariants[variant],
        disabled && "cursor-not-allowed opacity-70",
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {trueFalseIcon && (
        <>
          <span className="sr-only">{children}</span>
          <Image
            alt=""
            aria-hidden="true"
            height={trueFalseIcon.height}
            src={trueFalseIcon.src}
            width={trueFalseIcon.width}
          />
        </>
      )}

      {!trueFalseIcon && children}
    </button>
  );
}
