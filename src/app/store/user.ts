import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserInfo {
  userId: string;
  username: string;
  token: string;
  memberShipDeadline: number;
}

export interface UserInfoState {
  userInfo: UserInfo;
  recordUserInfo: (userInfo: UserInfo) => void;
  clearUserInfo: () => void;
}

export const useUserInfoStore = create<UserInfoState>()(
  persist((set, get) => ({
    userInfo: {
      userId: "",
      username: "",
      token: "",
      memberShipDeadline: new Date().getTime(),
    },
    recordUserInfo: (userInfo: UserInfo) => {
      set({ userInfo: userInfo });
    },
    clearUserInfo: () => {
      set({ userInfo: {
        userId: "",
        username: "",
        token: "",
        memberShipDeadline: new Date().getTime(),
      } });
    }
  }),
    { name: "userInf" }
  )
)
