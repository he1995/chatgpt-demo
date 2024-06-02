import { ChatMessage, SubmitKey, createMessage, useAppConfig, useChatStore } from "../store";
import styles from "./chat.module.scss";
import Locale from "../locales";
import { Fragment, RefObject, useEffect, useMemo, useRef, useState } from "react";
import { CHAT_PAGE_SIZE, LAST_INPUT_KEY } from "../constant";
import { Avatar } from "./emoji";
import { MaskAvatar } from "./mask-page";
import { Markdown } from "./markdown";
import { autoGrowTextArea, getMessageImages, getMessageTextContent } from "../utils";
import { useDebouncedCallback } from "use-debounce";
import SendWhiteIcon from "../icons/send-white.svg";
import { IconButton } from "./button";


function useSubmitHandler() {
    const config = useAppConfig();
    const submitKey = config.submitKey;
    const isComposing = useRef(false);

    useEffect(() => {
        const onCompositionStart = () => {
            isComposing.current = true;
        };
        const onCompositionEnd = () => {
            isComposing.current = false;
        };

        window.addEventListener("compositionstart", onCompositionStart);
        window.addEventListener("compositionend", onCompositionEnd);

        return () => {
            window.removeEventListener("compositionstart", onCompositionStart);
            window.removeEventListener("compositionend", onCompositionEnd);
        };
    }, []);

    const shouldSubmit = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Fix Chinese input method "Enter" on Safari
        if (e.keyCode == 229) return false;
        if (e.key !== "Enter") return false;
        if (e.key === "Enter" && (e.nativeEvent.isComposing || isComposing.current))
            return false;
        return (
            (config.submitKey === SubmitKey.AltEnter && e.altKey) ||
            (config.submitKey === SubmitKey.CtrlEnter && e.ctrlKey) ||
            (config.submitKey === SubmitKey.ShiftEnter && e.shiftKey) ||
            (config.submitKey === SubmitKey.MetaEnter && e.metaKey) ||
            (config.submitKey === SubmitKey.Enter &&
                !e.altKey &&
                !e.ctrlKey &&
                !e.shiftKey &&
                !e.metaKey)
        );
    };

    return {
        submitKey,
        shouldSubmit,
    };
}

function useScrollToBottom(
    scrollRef: RefObject<HTMLDivElement>,
    detach: boolean = false,
) {
    // for auto-scroll

    const [autoScroll, setAutoScroll] = useState(true);
    function scrollDomToBottom() {
        const dom = scrollRef.current;
        if (dom) {
            requestAnimationFrame(() => {
                setAutoScroll(true);
                dom.scrollTo(0, dom.scrollHeight);
            });
        }
    }

    // auto scroll
    useEffect(() => {
        if (autoScroll && !detach) {
            scrollDomToBottom();
        }
    });

    return {
        scrollRef,
        autoScroll,
        setAutoScroll,
        scrollDomToBottom,
    };
}

export default function Chat() {

    const chatStore = useChatStore();
    const session = chatStore.currentSession();
    const config = useAppConfig();
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [userInput, setUserInput] = useState("");
    const { submitKey, shouldSubmit } = useSubmitHandler();

    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const isScrolledToBottom = scrollRef?.current
        ? Math.abs(
            scrollRef.current.scrollHeight -
            (scrollRef.current.scrollTop + scrollRef.current.clientHeight),
        ) <= 1
        : false;
    const { setAutoScroll, scrollDomToBottom } = useScrollToBottom(
        scrollRef,
        isScrolledToBottom,
    );

    function scrollToBottom() {
        setMsgRenderIndex(renderMessages.length - CHAT_PAGE_SIZE);
        scrollDomToBottom();
    }

    const context: ChatMessage[] = useMemo(() => {
        return session.mask.context.slice();
    }, [session.mask.context]);

    const onInput = (text: string) => {
        setUserInput(text);
    };

    const doSubmit = (userInput: string) => {
        if (userInput.trim() === "") return;
        setIsLoading(true);
        chatStore
            .onUserInput(userInput)
            .then(() => setIsLoading(false));
        localStorage.setItem(LAST_INPUT_KEY, userInput);
        setUserInput("");
        inputRef.current?.focus();
        setAutoScroll(true);
    };


    // check if should send message
    const onInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // if ArrowUp and no userInput, fill with last input
        if (
            e.key === "ArrowUp" &&
            userInput.length <= 0 &&
            !(e.metaKey || e.altKey || e.ctrlKey)
        ) {
            setUserInput(localStorage.getItem(LAST_INPUT_KEY) ?? "");
            e.preventDefault();
            return;
        }
        if (shouldSubmit(e)) {
            doSubmit(userInput);
            e.preventDefault();
        }
    };



    const renderMessages = useMemo(() => {
        return context
            .concat(session.messages)
            .concat(
                isLoading
                    ? [
                        {
                            ...createMessage({
                                role: "assistant",
                                content: "……",
                            })
                        },
                    ]
                    : [],
            )
    }, [
        context,
        isLoading,
        session.messages,
    ]);

    const [msgRenderIndex, _setMsgRenderIndex] = useState(
        Math.max(0, renderMessages.length - CHAT_PAGE_SIZE),
    );
    function setMsgRenderIndex(newIndex: number) {
        newIndex = Math.min(renderMessages.length - CHAT_PAGE_SIZE, newIndex);
        newIndex = Math.max(0, newIndex);
        _setMsgRenderIndex(newIndex);
    }

    const messages = useMemo(() => {
        const endRenderIndex = Math.min(
            msgRenderIndex + 3 * CHAT_PAGE_SIZE,
            renderMessages.length,
        ); 
        return renderMessages.slice(msgRenderIndex, endRenderIndex);
    }, [msgRenderIndex, renderMessages]);

    // auto grow input
    const [inputRows, setInputRows] = useState(2);
    const measure = useDebouncedCallback(
        () => {
            const rows = inputRef.current ? autoGrowTextArea(inputRef.current) : 1;
            const inputRows = Math.min(
                20,
                Math.max(3, rows),
            );
            setInputRows(inputRows);
        },
        100,
        {
            leading: true,
            trailing: true,
        },
    );

    return (
        <div className={styles.chat} key={session.id}>
            <div className={`window-header`} data-tauri-drag-region>

                <div className={`window-header-title ${styles["chat-body-title"]}`}>
                    <div
                        className={`window-header-main-title ${styles["chat-body-main-title"]}`}
                    >
                        {session.topic}
                    </div>
                    <div className="window-header-sub-title">
                        {Locale.Chat.SubTitle(session.messages.length)}
                    </div>
                </div>

            </div>
            <div
                className={styles["chat-body"]}
                ref={scrollRef}
            >
                {messages.map((message, i) => {
                    const isUser = message.role === "user";
                    const isContext = i < context.length;
                    const showTyping = message.streaming;

                    return (
                        <Fragment key={message.id}>
                            <div
                                className={
                                    isUser ? styles["chat-message-user"] : styles["chat-message"]
                                }
                            >
                                <div className={styles["chat-message-container"]}>
                                    <div className={styles["chat-message-header"]}>
                                        <div className={styles["chat-message-avatar"]}>
                                        </div>
                                        {isUser ? (
                                            <Avatar avatar={config.avatar} />
                                        ) : (
                                            <>
                                                {["system"].includes(message.role) ? (
                                                    <Avatar avatar="2699-fe0f" />
                                                ) : (
                                                    <MaskAvatar
                                                        avatar={session.mask.avatar}
                                                    />
                                                )}
                                            </>
                                        )}
                                    </div>
                                    {showTyping && (
                                    <div className={styles["chat-message-status"]}>
                                        {Locale.Chat.Typing}
                                    </div>
                                )}
                                <div className={styles["chat-message-item"]}>
                                    <Markdown
                                        content={getMessageTextContent(message)}
                                        loading={
                                            message.streaming &&
                                            message.content.length === 0 &&
                                            !isUser
                                        }
                                        defaultShow={i >= messages.length - 6}
                                    />
                                    {getMessageImages(message).length == 1 && (
                                        <img
                                            className={styles["chat-message-item-image"]}
                                            src={getMessageImages(message)[0]}
                                            alt=""
                                        />
                                    )}
                                    {getMessageImages(message).length > 1 && (
                                        <div
                                            className={styles["chat-message-item-images"]}
                                            style={
                                                {
                                                    "--image-count": getMessageImages(message).length,
                                                } as React.CSSProperties
                                            }
                                        >
                                            {getMessageImages(message).map((image, index) => {
                                                return (
                                                    <img
                                                        className={
                                                            styles["chat-message-item-image-multi"]
                                                        }
                                                        key={index}
                                                        src={image}
                                                        alt=""
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className={styles["chat-message-action-date"]}>
                                    {isContext
                                        ? Locale.Chat.IsContext
                                        : message.date.toLocaleString()}
                                </div>
                                </div>
                            </div>
                        </Fragment>
                    );
                })}
            </div>
            <div className={styles["chat-input-panel"]}>
                <label
                    className={`${styles["chat-input-panel-inner"]}`}
                    htmlFor="chat-input"
                >
                    <textarea
                        id="chat-input"
                        ref={inputRef}
                        className={styles["chat-input"]}
                        onInput={(e) => onInput(e.currentTarget.value)}
                        value={userInput}
                        onKeyDown={onInputKeyDown}
                        onFocus={scrollToBottom}
                        onClick={scrollToBottom}
                        rows={inputRows}
                        autoFocus={true}
                        style={{
                            fontSize: config.fontSize,
                        }}
                    />
                    <IconButton
                        icon={<SendWhiteIcon />}
                        text={Locale.Chat.Send}
                        className={styles["chat-input-send"]}
                        type="primary"
                        onClick={() => doSubmit(userInput)}
                    />
                </label>
            </div>

        </div>

    )
}