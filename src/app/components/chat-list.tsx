import DeleteIcon from "../icons/delete.svg";
import styles from "./home.module.scss";

export function ChatItem(props: {
  onClick?: () => void;
  onDelete?: () => void;
  title: string;
  count: number;
  time: string;
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
  const sessions = [
    {id: "1", title: "小红书写手", count: 3, time: "2024/5/1 15:35:43"},
    {id: "2", title: "心灵导师", count: 0, time: "2024/5/2 18:00:00"},
    {id: "3", title: "以文搜图", count: 5, time: "2024/5/2 15:35:43"},
    {id: "4", title: "简历写手", count: 10, time: "2024/5/3 10:46:04"}
  ]
  return (
    <div
            className={styles["chat-list"]}
          >
            {sessions.map((item, i) => (
              <ChatItem
                title={item.title}
                time={item.time}
                count={item.count}
                key={item.id}
                onClick={() => {
                  
                }}
                onDelete={async () => {
                  
                }}
              />
            ))}
          </div>
  );
}
