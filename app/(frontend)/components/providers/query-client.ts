import { QueryClient } from "@tanstack/react-query";

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 30,
        retry: 1,
        refetchOnWindowFocus: false,
        throwOnError: false,
      },
      mutations: {
        throwOnError: false,
      },
    },
  });

let client: QueryClient | null = null;

export const getQueryClient = () => {
  if (!client) {
    client = makeQueryClient();
  }
  return client;
};
