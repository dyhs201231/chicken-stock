import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAccount, postLogout, updateMyInfo } from "./api";

export function usePostLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postLogout,
    onSuccess: () => {
      queryClient.clear();
      window.location.replace("/");
    },
  });
}

export function useUpdateMyInfo() {
  return useMutation({
    mutationFn: updateMyInfo,
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: deleteAccount,
  });
}
