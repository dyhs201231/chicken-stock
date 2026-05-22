import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAccount, postLogout, type MyInfoResponse } from "./api";
import { authQueryKeys } from "./queries";

const LOGGED_OUT_MY_INFO: MyInfoResponse = {
  isLoggedIn: false,
  user: null,
};

export function usePostLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postLogout,
    onSuccess: () => {
      queryClient.setQueryData(authQueryKeys.myInfo, LOGGED_OUT_MY_INFO);
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: deleteAccount,
  });
}
