import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TokenState {
  token: string;
  recordToken: (token: string) => void;
}

export const useTokenStore = create<TokenState>()(
  persist((set, get) => ({
    token: "",
    recordToken: (token: string) => {
      set({ token: token });
    }
  }),
    { name: "token" }
  )
)
