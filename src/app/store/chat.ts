import { ChatMessage, DEFAULT_MASK_AVATAR, Mask } from "./mask";
import { nanoid } from "nanoid";
import Locale, { getLang } from "../locales";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { showToast } from "../components/ui-lib";
import { DEFAULT_INPUT_TEMPLATE, DEFAULT_MODELS, DEFAULT_SYSTEM_TEMPLATE, GEMINI_SUMMARIZE_MODEL, KnowledgeCutOffDate, ModelProvider, SUMMARIZE_MODEL } from "../constant";
import { ModelConfig, ModelType, useAppConfig } from "./config";
import { ClientApi, MultimodalContent, RequestMessage, getServerURL } from "../client/api";
import { estimateTokenLength } from "../utils/token";
import { getMessageTextContent, trimTopic } from "../utils";
import { ChatControllerPool } from "../client/controller";
import { prettyObject } from "../utils/format";


export function createMessage(override: Partial<ChatMessage>): ChatMessage {
    return {
        id: nanoid(),
        date: new Date().toLocaleString(),
        role: "user",
        content: "",
        ...override,
    };
}

function fillTemplateWith(input: string, modelConfig: ModelConfig) {
    const cutoff =
        KnowledgeCutOffDate[modelConfig.model] ?? KnowledgeCutOffDate.default;
    // Find the model in the DEFAULT_MODELS array that matches the modelConfig.model
    const modelInfo = DEFAULT_MODELS.find((m) => m.name === modelConfig.model);

    var serviceProvider = "OpenAI";
    if (modelInfo) {
        // TODO: auto detect the providerName from the modelConfig.model

        // Directly use the providerName from the modelInfo
        serviceProvider = modelInfo.provider.providerName;
    }

    const vars = {
        ServiceProvider: serviceProvider,
        cutoff,
        model: modelConfig.model,
        time: new Date().toString(),
        lang: getLang(),
        input: input,
    };

    let output = modelConfig.template ?? DEFAULT_INPUT_TEMPLATE;

    // remove duplicate
    if (input.startsWith(output)) {
        output = "";
    }

    // must contains {{input}}
    const inputVar = "{{input}}";
    if (!output.includes(inputVar)) {
        output += "\n" + inputVar;
    }

    Object.entries(vars).forEach(([name, value]) => {
        const regex = new RegExp(`{{${name}}}`, "g");
        output = output.replace(regex, value.toString()); // Ensure value is a string
    });

    return output;
}

function getSummarizeModel(currentModel: string) {
    // if it is using gpt-* models, force to use 3.5 to summarize
    if (currentModel.startsWith("gpt")) {
        return SUMMARIZE_MODEL;
    }
    return currentModel;
}

function uploadMessage(session: ChatSession, message: ChatMessage) {
    return fetch(getServerURL() + "/session/message/add?sessionId=" + session.id,
        {
            method: "post",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(message)
        })
}

function countMessages(msgs: ChatMessage[]) {
    return msgs.reduce(
        (pre, cur) => pre + estimateTokenLength(getMessageTextContent(cur)),
        0,
    );
}

export interface ChatSession {
    id: string;
    topic: string;
    messages: ChatMessage[];
    createTime: number;
    lastUpdate: number;
    mask: Mask;
}

export const DEFAULT_TOPIC = Locale.Store.DefaultTopic;
export const BOT_HELLO: ChatMessage = createMessage({
    role: "assistant",
    content: Locale.Store.BotHello,
});

export const createEmptyMask = () =>
    ({
        id: nanoid(),
        avatar: DEFAULT_MASK_AVATAR,
        name: DEFAULT_TOPIC,
        context: [],
        lang: getLang(),
        builtin: false,
        createdAt: Date.now(),
        modelConfig: {
            model: "gpt-3.5-turbo" as ModelType,
            temperature: 0.5,
            top_p: 1,
            max_tokens: 4000,
            presence_penalty: 0,
            frequency_penalty: 0,
            sendMemory: true,
            historyMessageCount: 4,
            compressMessageLengthThreshold: 1000,
            enableInjectSystemPrompts: true,
            template: DEFAULT_INPUT_TEMPLATE,
        },
    }) as Mask;

function createEmptySession(): ChatSession {
    return {
        id: nanoid(),
        topic: DEFAULT_TOPIC,
        messages: [],
        createTime: Date.now(),
        lastUpdate: Date.now(),
        mask: createEmptyMask(),
    };
}

export interface ChatState {
    deleteSession(i: number): unknown;
    onUserInput(userInput: string): Promise<void>;
    onNewMessage(botMessage: ChatMessage): unknown;
    updateCurrentSession(arg0: (session: any) => void): unknown;
    sessions: ChatSession[];
    currentSessionIndex: number;
    selectSession: (index: number) => void;
    newSession: (mask?: Mask) => void;
    currentSession: () => ChatSession;
    getMessagesWithMemory: () => ChatMessage[];
}


export const useChatStore = create<ChatState>()(
    persist((set, get) => ({
        sessions: [createEmptySession()],
        currentSessionIndex: 0,

        loadSessions() {
            fetch(getServerURL() + "/session/all")
                .then((res) => {
                    return res.json();
                }).then((sessions: []) => {
                    if (sessions.length > 0) {
                        set((state) => ({
                            sessions: sessions
                        }));
                    }
                }).catch(e => {
                    console.error(e);
                    showToast("Error:" + e)
                })
        },

        selectSession(index: number) {
            set({
                currentSessionIndex: index,
            });
        },

        newSession(mask?: Mask) {
            const session = createEmptySession();

            if (mask) {
                session.mask = mask;
                session.topic = mask.name;
            }

            fetch(getServerURL() + "/session/add",
                {
                    method: "post",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(session)
                }).then((res) => {
                    set((state) => ({
                        currentSessionIndex: 0,
                        sessions: [session].concat(state.sessions),
                    }));
                }).catch(e => {
                    console.error(e);
                    showToast("Error:" + e)
                })
        },

        deleteSession(index: number) {
            //the last one
            const deletingLastSession = get().sessions.length === 1;
            const deletedSession = get().sessions.at(index);
            if (!deletedSession) return;

            fetch(
                getServerURL() + "/session/delete?sessionId=" + deletedSession.id,
                { method: "post" }
            ).then((res) => {
                const sessions = get().sessions.slice();
                sessions.splice(index, 1);
 
                const currentIndex = get().currentSessionIndex;
                let nextIndex = Math.min(
                    currentIndex - Number(index < currentIndex),
                    sessions.length - 1,
                );
                if (deletingLastSession) {
                    nextIndex = 0;
                    sessions.push(createEmptySession());
                }
                set(() => ({
                    currentSessionIndex: nextIndex,
                    sessions,
                }));

                showToast(Locale.Home.DeleteToast);
            }).catch((e) => {
                console.error(e);
                showToast("Error: " + e);
            })
        },

        currentSession() {
            let index = get().currentSessionIndex;
            const sessions = get().sessions;

            if (index < 0 || index >= sessions.length) {
                index = Math.min(sessions.length - 1, Math.max(0, index));
                set(() => ({ currentSessionIndex: index }));
            }

            const session = sessions[index];

            return session;
        },

        getMessagesWithMemory() {
            const session = get().currentSession();
            const modelConfig = session.mask.modelConfig;
            const messages = session.messages.slice();
            const totalMessageCount = session.messages.length;

            // in-context prompts
            const contextPrompts = session.mask.context.slice();

            // system prompts, to get close to OpenAI Web ChatGPT
            const shouldInjectSystemPrompts =
                modelConfig.enableInjectSystemPrompts &&
                session.mask.modelConfig.model.startsWith("gpt-");

            var systemPrompts: ChatMessage[] = [];
            systemPrompts = shouldInjectSystemPrompts
                ? [
                    createMessage({
                        role: "system",
                        content: fillTemplateWith("", {
                            ...modelConfig,
                            template: DEFAULT_SYSTEM_TEMPLATE,
                        }),
                    }),
                ]
                : [];
            if (shouldInjectSystemPrompts) {
                console.log(
                    "[Global System Prompt] ",
                    systemPrompts.at(0)?.content ?? "empty",
                );
            }

            // short term memory
            const shortTermMemoryStartIndex = Math.max(
                0,
                totalMessageCount - modelConfig.historyMessageCount,
            );

            // lets concat send messages, including 4 parts:
            // 0. system prompt: to get close to OpenAI Web ChatGPT
            // 1. long term memory: summarized memory messages
            // 2. pre-defined in-context prompts
            // 3. short term memory: latest n messages
            // 4. newest input message
            const memoryStartIndex = shortTermMemoryStartIndex;
            // and if user has cleared history messages, we should exclude the memory too.
            const contextStartIndex = memoryStartIndex;
            const maxTokenThreshold = modelConfig.max_tokens;

            // get recent messages as much as possible
            const reversedRecentMessages = [];
            for (
                let i = totalMessageCount - 1, tokenCount = 0;
                i >= contextStartIndex && tokenCount < maxTokenThreshold;
                i -= 1
            ) {
                const msg = messages[i];
                if (!msg || msg.isError) continue;
                tokenCount += estimateTokenLength(getMessageTextContent(msg));
                reversedRecentMessages.push(msg);
            }
            // concat all messages
            const recentMessages = [
                ...systemPrompts,
                ...contextPrompts,
                ...reversedRecentMessages.reverse(),
            ];

            return recentMessages;
        },

        updateCurrentSession(updater: (session: ChatSession) => void) {
            const sessions = get().sessions;
            const index = get().currentSessionIndex;
            updater(sessions[index]);
            set(() => ({ sessions }));
        },

        onNewMessage(message: ChatMessage) {
            get().updateCurrentSession((session) => {
                session.messages = session.messages.concat();
                session.lastUpdate = Date.now();
            });
        },

        async onUserInput(content: string) {
            const session = get().currentSession();
            const modelConfig = session.mask.modelConfig;

            const userContent = fillTemplateWith(content, modelConfig);
            console.log("[User Input] after template: ", userContent);

            let mContent: string | MultimodalContent[] = userContent;

            let userMessage: ChatMessage = createMessage({
                role: "user",
                content: mContent,
            });

            const botMessage: ChatMessage = createMessage({
                role: "assistant",
                streaming: true,
                model: modelConfig.model,
            });

            // get recent messages
            const recentMessages = get().getMessagesWithMemory();
            const sendMessages = recentMessages.concat(userMessage);
            const messageIndex = get().currentSession().messages.length + 1;

            // save user's and bot's message)
            get().updateCurrentSession((session) => {
                const savedUserMessage = {
                    ...userMessage,
                    content: mContent,
                };
                session.messages = session.messages.concat([
                    savedUserMessage,
                    botMessage,
                ]);
                uploadMessage(session, savedUserMessage).catch(e => {
                    console.error(e);
                    showToast("Error: " + e);
                })

            });

            var api: ClientApi = new ClientApi(ModelProvider.GPT);

            // make request
            api.llm.chat({
                messages: sendMessages,
                config: { ...modelConfig, stream: true },
                onUpdate(message) {
                    botMessage.streaming = true;
                    if (message) {
                        botMessage.content = message;
                    }
                    get().updateCurrentSession((session) => {
                        session.messages = session.messages.concat();
                    });

                    uploadMessage(session, botMessage).catch(e => {
                        console.error(e);
                        showToast("Error: " + e);
                    })
                },
                onFinish(message) {
                    botMessage.streaming = false;
                    if (message) {
                        botMessage.content = message;
                        get().onNewMessage(botMessage);
                    }
                    ChatControllerPool.remove(session.id, botMessage.id);
                    uploadMessage(session, botMessage).catch(e => {
                        console.error(e);
                        showToast("Error: " + e);
                    })
                },
                onError(error) {
                    const isAborted = error.message.includes("aborted");
                    botMessage.content +=
                        "\n\n" +
                        prettyObject({
                            error: true,
                            message: error.message,
                        });
                    botMessage.streaming = false;
                    userMessage.isError = !isAborted;
                    botMessage.isError = !isAborted;
                    get().updateCurrentSession((session) => {
                        session.messages = session.messages.concat();
                    });
                    ChatControllerPool.remove(
                        session.id,
                        botMessage.id ?? messageIndex,
                    );

                    console.error("[Chat] failed ", error);
                    uploadMessage(session, botMessage).catch(e => {
                        console.error(e);
                        showToast("Error: " + e);
                    })
                },
                onController(controller) {
                    // collect controller for stop/retry
                    ChatControllerPool.addController(
                        session.id,
                        botMessage.id ?? messageIndex,
                        controller,
                    );
                },
            });
        },

    }),
        { name: "chat-session" }
    ))