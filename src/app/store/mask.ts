import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import { ChatSession, DEFAULT_TOPIC } from "./chat";
import { ModelConfig, ModelType } from "./config";
import { RequestMessage } from "../client/api";
import { CN_MASKS } from "./cn";
import { Lang } from "../locales";

export type ChatMessage = RequestMessage & {
  date: string;
  streaming?: boolean;
  isError?: boolean;
  id: string;
  model?: ModelType;
};

export type Mask = {
  id: string;
  avatar: string;
  name: string;
  context: ChatMessage[];
  modelConfig: ModelConfig;
  lang: Lang;
  builtin: boolean;
  createdAt: number;
};

export const DEFAULT_MASK_AVATAR = "gpt-bot";

const DEFAULT_MODEL_CONFIG = {
  model: "gpt-3.5-turbo",
  temperature: 1,
  max_tokens: 2000,
  presence_penalty: 0,
  frequency_penalty: 0,
  sendMemory: false,
  historyMessageCount: 4,
  compressMessageLengthThreshold: 1000,

} as ModelConfig

export interface MaskState {
  masks: Mask[];
  uploadMasks: () => {};
  fetchMasks: () => {};
}

export const useMaskStore = create<MaskState>()(
  persist((set, get) => ({
    masks: [],
    uploadMasks: async () => {
      // fetch((process.env.NEXT_PUBLIC_API_URL + "/mask/add_all"), { method: "post", headers: {"Content-Type": "application/json"}, body: JSON.stringify(CN_MASKS) }).then((res) => {
      //   console.log("masks=================================================" + res.text());
      //   set({ masks: get().masks })
      // }).catch(e => {
      //   console.error(e);
      // })
    },
    fetchMasks: async () => {
      fetch(process.env.NEXT_PUBLIC_API_URL + "/mask/all").then((res) => {
        return res.json();
      }).then((serverMasks: Mask[]) => {
        serverMasks.forEach((mask) => {
          mask.modelConfig = DEFAULT_MODEL_CONFIG;
        })
        set({ masks: serverMasks });
      })
        .catch(e => {
          console.error(e);
        })
    }
  }),
    { name: "mask" }
  )
)
