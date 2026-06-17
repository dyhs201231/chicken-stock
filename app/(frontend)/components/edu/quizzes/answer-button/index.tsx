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
    "w-fit justify-start rounded-md border-2 border-transparent bg-white px-1.5 py-0.5 text-left text-3xl leading-tight font-medium",
  true: "h-44 w-full justify-center rounded-xl border-8 border-[#4D61F5] bg-white px-6 text-8xl font-black text-[#4D61F5]",
  false:
    "h-44 w-full justify-center rounded-2xl border-8 border-[#FF5A60] bg-white px-6 text-8xl font-black text-[#FF5A60]",
};

const selectedAnswerButtonVariants: Record<AnswerButtonVariant, string> = {
  default: "border-[#2563EB] bg-[#2563EB]/10",
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
