import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface InitStore {
  test: number;
}

export const useAssetStore = create<InitStore>()(
  devtools((set) => ({
    test: 0,
    increment: () => set((state) => ({ test: state.test + 1 })),
    decrement: () => set((state) => ({ test: state.test - 1 })),
  })),
);
