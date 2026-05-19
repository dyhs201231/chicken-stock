import { useQuery } from "@tanstack/react-query";
import { getMyInfo } from "./api";

export const authQueryKeys = {
  myInfo: ["auth", "my-info"],
} as const;

export function useGetMyInfo() {
  return useQuery({
    queryFn: getMyInfo,
    queryKey: authQueryKeys.myInfo,
  });
}
