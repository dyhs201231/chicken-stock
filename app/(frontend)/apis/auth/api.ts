import { requests } from "../request";

export type MyInfoUser = {
  createdAt: string;
  currentLevel: number | null;
  currentStep: number | null;
  email: string | null;
  id: string;
  investmentType: string | null;
  name: string;
  profileImageUrl: string | null;
  totalSteps: number | null;
  type: "NORMAL" | "AGENT";
  updatedAt: string;
};

export type MyInfoResponse =
  | {
      isLoggedIn: false;
      user: null;
    }
  | {
      isLoggedIn: true;
      user: MyInfoUser;
    };

export async function getMyInfo() {
  const { data } = await requests.get<MyInfoResponse>("/api/auth/my-info");

  return data;
}

export async function postLogout() {
  const { data } = await requests.post<{ ok: true }>("/api/auth/logout");

  return data;
}
