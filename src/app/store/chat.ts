import { ChatMessage, DEFAULT_MASK_AVATAR, Mask } from "./mask";
import { nanoid } from "nanoid";
import Locale, { getLang } from "../locales";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { showToast } from "../components/ui-lib";
import { DEFAULT_INPUT_TEMPLATE, DEFAULT_MODELS, DEFAULT_SYSTEM_TEMPLATE, GEMINI_SUMMARIZE_MODEL, KnowledgeCutOffDate, ModelProvider, SUMMARIZE_MODEL } from "../constant";
import { ModelConfig, ModelType, useAppConfig } from "./config";
import { ClientApi, MultimodalContent, RequestMessage } from "../client/api";
import { estimateTokenLength } from "../utils/token";
import { getMessageTextContent, trimTopic } from "../utils";
import { identifyDefaultClaudeModel } from "../utils/checkers";
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

function countMessages(msgs: ChatMessage[]) {
    return msgs.reduce(
        (pre, cur) => pre + estimateTokenLength(getMessageTextContent(cur)),
        0,
    );
}

export interface ChatStat {
    tokenCount: number;
    wordCount: number;
    charCount: number;
}

export interface ChatSession {
    id: string;
    topic: string;

    memoryPrompt: string;
    messages: ChatMessage[];
    stat: ChatStat;
    lastUpdate: number;
    lastSummarizeIndex: number;
    clearContextIndex?: number;

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
        memoryPrompt: "",
        messages: [],
        stat: {
            tokenCount: 0,
            wordCount: 0,
            charCount: 0,
        },
        lastUpdate: Date.now(),
        lastSummarizeIndex: 0,

        mask: createEmptyMask(),
    };
}

export interface ChatState {
    deleteSession(i: number): unknown;
    onUserInput(userInput: string): Promise<void>;
    onNewMessage(botMessage: ChatMessage): unknown;
    summarizeSession(): unknown;
    updateStat(message: ChatMessage): unknown;
    updateCurrentSession(arg0: (session: any) => void): unknown;
    sessions: ChatSession[];
    currentSessionIndex: number;
    selectSession: (index: number) => void;
    newSession: (mask?: Mask) => void;
    currentSession: () => ChatSession;
    getMemoryPrompt: () => ChatMessage;
    getMessagesWithMemory: () => ChatMessage[];
}


export const useChatStore = create<ChatState>()(
    persist((set, get) => ({
        sessions: [createEmptySession()],
        currentSessionIndex: 0,

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

            set((state) => ({
                currentSessionIndex: 0,
                sessions: [session].concat(state.sessions),
            }));
        },

        deleteSession(index: number) {
            const deletingLastSession = get().sessions.length === 1;
            const deletedSession = get().sessions.at(index);

            if (!deletedSession) return;

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

            // for undo delete action
            const restoreState = {
                currentSessionIndex: get().currentSessionIndex,
                sessions: get().sessions.slice(),
            };

            set(() => ({
                currentSessionIndex: nextIndex,
                sessions,
            }));

            showToast(
                Locale.Home.DeleteToast,
                {
                    text: Locale.Home.Revert,
                    onClick() {
                        set(() => restoreState);
                    },
                },
                5000,
            );
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

        getMemoryPrompt() {
            const session = get().currentSession();

            return {
                role: "system",
                content:
                    session.memoryPrompt.length > 0
                        ? Locale.Store.Prompt.History(session.memoryPrompt)
                        : "",
                date: "",
            } as ChatMessage;
        },

        getMessagesWithMemory() {
            const session = get().currentSession();
            const modelConfig = session.mask.modelConfig;
            const clearContextIndex = session.clearContextIndex ?? 0;
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

            // long term memory
            const shouldSendLongTermMemory =
                modelConfig.sendMemory &&
                session.memoryPrompt &&
                session.memoryPrompt.length > 0 &&
                session.lastSummarizeIndex > clearContextIndex;
            const longTermMemoryPrompts = shouldSendLongTermMemory
                ? [get().getMemoryPrompt()]
                : [];
            const longTermMemoryStartIndex = session.lastSummarizeIndex;

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
            const memoryStartIndex = shouldSendLongTermMemory
                ? Math.min(longTermMemoryStartIndex, shortTermMemoryStartIndex)
                : shortTermMemoryStartIndex;
            // and if user has cleared history messages, we should exclude the memory too.
            const contextStartIndex = Math.max(clearContextIndex, memoryStartIndex);
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
                ...longTermMemoryPrompts,
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

        summarizeSession() {
            const config = useAppConfig.getState();
            const session = get().currentSession();
            const modelConfig = session.mask.modelConfig;

            var api: ClientApi;
            api = new ClientApi(ModelProvider.GPT);


            // remove error messages if any
            const messages = session.messages;

            // should summarize topic after chating more than 50 words
            const SUMMARIZE_MIN_LEN = 50;
            if (
                config.enableAutoGenerateTitle &&
                session.topic === DEFAULT_TOPIC &&
                countMessages(messages) >= SUMMARIZE_MIN_LEN
            ) {
                const topicMessages = messages.concat(
                    createMessage({
                        role: "user",
                        content: Locale.Store.Prompt.Topic,
                    }),
                );
                api.llm.chat({
                    messages: topicMessages,
                    config: {
                        model: getSummarizeModel(session.mask.modelConfig.model),
                        stream: false,
                    },
                    onFinish(message) {
                        get().updateCurrentSession(
                            (session) =>
                            (session.topic =
                                message.length > 0 ? trimTopic(message) : DEFAULT_TOPIC),
                        );
                    },
                });
            }
            const summarizeIndex = Math.max(
                session.lastSummarizeIndex,
                session.clearContextIndex ?? 0,
            );
            let toBeSummarizedMsgs = messages
                .filter((msg) => !msg.isError)
                .slice(summarizeIndex);

            const historyMsgLength = countMessages(toBeSummarizedMsgs);

            if (historyMsgLength > modelConfig?.max_tokens ?? 4000) {
                const n = toBeSummarizedMsgs.length;
                toBeSummarizedMsgs = toBeSummarizedMsgs.slice(
                    Math.max(0, n - modelConfig.historyMessageCount),
                );
            }

            // add memory prompt
            toBeSummarizedMsgs.unshift(get().getMemoryPrompt());

            const lastSummarizeIndex = session.messages.length;

            console.log(
                "[Chat History] ",
                toBeSummarizedMsgs,
                historyMsgLength,
                modelConfig.compressMessageLengthThreshold,
            );

            if (
                historyMsgLength > modelConfig.compressMessageLengthThreshold &&
                modelConfig.sendMemory
            ) {
                /** Destruct max_tokens while summarizing
                 * this param is just shit
                 **/
                const { max_tokens, ...modelcfg } = modelConfig;
                api.llm.chat({
                    messages: toBeSummarizedMsgs.concat(
                        createMessage({
                            role: "system",
                            content: Locale.Store.Prompt.Summarize,
                            date: "",
                        }),
                    ),
                    config: {
                        ...modelcfg,
                        stream: true,
                        model: getSummarizeModel(session.mask.modelConfig.model),
                    },
                    onUpdate(message) {
                        session.memoryPrompt = message;
                    },
                    onFinish(message) {
                        console.log("[Memory] ", message);
                        get().updateCurrentSession((session) => {
                            session.lastSummarizeIndex = lastSummarizeIndex;
                            session.memoryPrompt = message; // Update the memory prompt for stored it in local storage
                        });
                    },
                    onError(err) {
                        console.error("[Summarize] ", err);
                    },
                });
            }
        },

        updateStat(message: ChatMessage) {
            get().updateCurrentSession((session) => {
                session.stat.charCount += message.content.length;
                // TODO: should update chat count and word count
            });
        },

        onNewMessage(message: ChatMessage) {
            get().updateCurrentSession((session) => {
                session.messages = session.messages.concat();
                session.lastUpdate = Date.now();
            });
            get().updateStat(message);
            get().summarizeSession();
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

            // save user's and bot's message
            get().updateCurrentSession((session) => {
                const savedUserMessage = {
                    ...userMessage,
                    content: mContent,
                };
                session.messages = session.messages.concat([
                    savedUserMessage,
                    botMessage,
                ]);
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
                },
                onFinish(message) {
                    botMessage.streaming = false;
                    if (message) {
                        botMessage.content = message;
                        get().onNewMessage(botMessage);
                    }
                    ChatControllerPool.remove(session.id, botMessage.id);
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
        { name: "chat" }
    ))