import { useMutation } from "@tanstack/react-query";
import { submitQuizAnswer } from "./api";

export function useSubmitQuizAnswerMutation() {
  return useMutation({
    mutationFn: submitQuizAnswer,
  });
}
