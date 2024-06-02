
import styles from "./mask-page.module.scss";

import LeftIcon from "../icons/left.svg";
import { Mask, useMaskStore } from "../store/mask";
import { Avatar, EmojiAvatar } from "./emoji";
import { useEffect } from "react";
import { useChatStore } from "../store/chat";

import { useNavigate } from "react-router-dom";
import { Path } from "../constant";

function MaskItem(props: { mask: Mask; onClick?: () => void }) {
  return (
    <div className={styles["mask"]} onClick={props.onClick}>
      <MaskAvatar
        avatar={props.mask.avatar}
      />
      <div className={styles["mask-name"] + " one-line"}>{props.mask.name}</div>
    </div>
  );
}

export function MaskAvatar(props: { avatar: string }) {
  return  (
    <Avatar avatar={props.avatar} />
  );
}

export function MaskPage() {

  const chatStore = useChatStore();
  const masks = useMaskStore((state) => state.masks);
  const fetchMasks = useMaskStore((state) => state.fetchMasks);
  // const uploadMasks = useMaskStore((state) => state.uploadMasks);
  const navigate = useNavigate();

  const startChat = (mask?: Mask) => {
    setTimeout(() => {
      chatStore.newSession(mask);
      navigate(Path.Chat);
    }, 10);
  };

  useEffect(() => {
    fetchMasks();
  }, [])

  return (
    <div className={styles["new-chat"]}>
      <div className={styles["mask-cards"]}>
        <div className={styles["mask-card"]}>
          <EmojiAvatar avatar="1f606" size={24} />
        </div>
        <div className={styles["mask-card"]}>
          <EmojiAvatar avatar="1f916" size={24} />
        </div>
        <div className={styles["mask-card"]}>
          <EmojiAvatar avatar="1f479" size={24} />
        </div>
      </div>

      <div className={styles["title"]}>{"挑选一个面具"}</div>
      <div className={styles["sub-title"]}>{"现在开始，与面具背后的灵魂思维碰撞"}</div>

      <div className={styles["mask-container"]}>
          {masks.map((mask, index) => (
            <MaskItem
              key={index}
              mask={mask}
              onClick={() => startChat(mask)}
            />
          ))}
        </div>
    </div>
  );
}
