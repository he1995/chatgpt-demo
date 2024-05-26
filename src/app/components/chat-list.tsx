import { useNavigate } from "react-router-dom";
import DeleteIcon from "../icons/delete.svg";
import { Mask, useChatStore } from "../store";
import styles from "./home.module.scss";
import { Path } from "../constant";

import Locale from "../locales";

export function ChatItem(props: {
  onClick?: () => void;
  onDelete?: () => void;
  title: string;
  count: number;
  time: string;
  selected: boolean;
  id: string;
  index: number;
  mask: Mask;
}) {
  return (
    <div
      className={styles["chat-item"]}
      onClick={props.onClick}
      title={props.title}
    >
      <>
          <div className={styles["chat-item-title"]}>{props.title}</div>
          <div className={styles["chat-item-info"]}>
            <div className={styles["chat-item-count"]}>
              {props.count}
            </div>
            <div className={styles["chat-item-date"]}>{props.time}</div>
          </div>
        </>

      <div
        className={styles["chat-item-delete"]}
        onClickCapture={(e) => {
          props.onDelete?.();
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <DeleteIcon />
      </div>
    </div>

  );
}

export interface ChatSession {
  id: string;
  title: string;
  count: number;
  time: string;
}

export function ChatList() {

  const [sessions, selectedIndex, selectSession] = useChatStore(
    (state) => [
      state.sessions,
      state.currentSessionIndex,
      state.selectSession,
    ],
  );
  const chatStore = useChatStore();
  const navigate = useNavigate();
  // const sessions = [
  //   {id: "1", title: "小红书写手", count: 3, time: "2024/5/1 15:35:43"},
  //   {id: "2", title: "心灵导师", count: 0, time: "2024/5/2 18:00:00"},
  //   {id: "3", title: "以文搜图", count: 5, time: "2024/5/2 15:35:43"},
  //   {id: "4", title: "简历写手", count: 10, time: "2024/5/3 10:46:04"}
  // ]
  return (
    <div
            className={styles["chat-list"]}
          >
            {sessions.map((item, i) => (
              <ChatItem
              title={item.topic}
              time={new Date(item.lastUpdate).toLocaleString()}
              count={item.messages.length}
              key={item.id}
              id={item.id}
              index={i}
              selected={i === selectedIndex}
              onClick={() => {
                navigate(Path.Chat);
                selectSession(i);
              }}
              onDelete={async () => {
                chatStore.deleteSession(i);
              }}
              mask={item.mask}
            />
            ))}
          </div>
  );
}
