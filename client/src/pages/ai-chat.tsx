import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { ScrollArea } from "../components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { cn } from "../lib/utils";

type ScopeDecision = "IN_SCOPE" | "BORDERLINE" | "OUT_OF_SCOPE_CLEAR";
type ValidationOutcome = "passed" | "failed" | "skipped";

type AiTrace = {
  scopeDecision?: ScopeDecision;
  intent?: string;
  sql?: string;
  validationOutcome?: ValidationOutcome;
  rowCount?: number;
  execMs?: number;
  fallbackReason?: string;
};

type AiMeta = {
  requestId: string;
  confidence?: number;
  decisionSummary?: string;
  trace?: AiTrace;
};

type AiChatResponse = {
  reply: string;
  mode: "answer" | "refusal" | "clarify";
  meta?: AiMeta;
};

type AiChatStage =
  | "classifying_scope"
  | "generating_sql"
  | "validating_sql"
  | "running_query"
  | "synthesizing_answer";

type AiChatStageStatus = "started" | "completed" | "failed";

type AiProgressEvent = {
  requestId: string;
  stage: AiChatStage;
  status: AiChatStageStatus;
  message: string;
  timestamp: string;
};

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  mode?: "answer" | "refusal" | "clarify";
  meta?: AiMeta;
}

type PendingProgress = {
  requestId: string;
  events: AiProgressEvent[];
};

const STAGE_LABELS: Array<{ stage: AiChatStage; label: string }> = [
  { stage: "classifying_scope", label: "Classifying scope" },
  { stage: "generating_sql", label: "Generating SQL" },
  { stage: "validating_sql", label: "Validating SQL safety" },
  { stage: "running_query", label: "Running query" },
  { stage: "synthesizing_answer", label: "Synthesizing answer" },
];

function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function stageStatus(
  events: AiProgressEvent[],
  stage: AiChatStage,
): "pending" | "active" | "completed" | "failed" {
  const stageEvents = events.filter((event) => event.stage === stage);
  const hasFailed = stageEvents.some((event) => event.status === "failed");
  if (hasFailed) {
    return "failed";
  }

  const hasCompleted = stageEvents.some((event) => event.status === "completed");
  if (hasCompleted) {
    return "completed";
  }

  const hasStarted = stageEvents.some((event) => event.status === "started");
  if (hasStarted) {
    return "active";
  }

  return "pending";
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = localStorage.getItem("ai-chat-messages");
    return savedMessages
      ? JSON.parse(savedMessages)
      : [
          {
            id: "welcome",
            text: "Hello! How can I help you with CourtReserve today?",
            sender: "ai",
          },
        ];
  });
  const [inputMessage, setInputMessage] = useState("");
  const [pendingProgress, setPendingProgress] = useState<PendingProgress | null>(null);
  const streamRef = useRef<EventSource | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    localStorage.setItem("ai-chat-messages", JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      messageText,
      requestId,
    }: {
      messageText: string;
      requestId: string;
    }): Promise<AiChatResponse> => {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageText,
          requestId,
          clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: `${Date.now()}-ai`,
          text: data.reply,
          sender: "ai",
          mode: data.mode,
          meta: data.meta,
        },
      ]);
      setInputMessage("");
      setPendingProgress(null);

      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }

      queryClient.invalidateQueries({ queryKey: ["aiChat"] });
    },
    onError: (error) => {
      console.error("AI chat error:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: `${Date.now()}-error`,
          text: "Oops! Something went wrong. Please try again.",
          sender: "ai",
          mode: "clarify",
          meta: {
            requestId: pendingProgress?.requestId ?? "unknown",
            decisionSummary: "Request failed before a valid AI response was returned.",
            trace: {
              validationOutcome: "failed",
              fallbackReason: "Network or server error",
            },
          },
        },
      ]);
      setPendingProgress(null);

      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() === "") return;

    const requestId = createRequestId();

    const eventSource = new EventSource(
      `/api/ai/chat/stream?requestId=${encodeURIComponent(requestId)}`,
    );

    eventSource.addEventListener("stage", (event) => {
      try {
        const parsed = JSON.parse((event as MessageEvent).data) as AiProgressEvent;
        setPendingProgress((previous) => {
          if (!previous || previous.requestId !== requestId) {
            return { requestId, events: [parsed] };
          }
          return { requestId, events: [...previous.events, parsed] };
        });
      } catch {
        // Ignore malformed progress events.
      }
    });

    eventSource.onerror = () => {
      eventSource.close();
      if (streamRef.current === eventSource) {
        streamRef.current = null;
      }
    };

    streamRef.current = eventSource;
    setPendingProgress({ requestId, events: [] });

    const newUserMessage: Message = {
      id: `${Date.now()}-user`,
      text: inputMessage,
      sender: "user",
    };

    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    sendMessageMutation.mutate({ messageText: inputMessage, requestId });
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-4rem)]">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex items-end gap-2",
                message.sender === "user" ? "justify-end" : "justify-start",
              )}
            >
              {message.sender === "ai" && (
                <Avatar>
                  <AvatarImage src="/ai-avatar.png" alt="AI" />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "max-w-[80%] p-3 rounded-lg",
                  message.sender === "user"
                    ? "bg-blue-500 text-white rounded-br-none"
                    : "bg-gray-200 text-gray-800 rounded-bl-none",
                )}
              >
                <p>{message.text}</p>

                {message.sender === "ai" && message.meta?.decisionSummary && (
                  <div className="mt-3 rounded border border-gray-300 bg-white p-2 text-xs text-gray-700">
                    <span className="font-semibold">Decision summary:</span>{" "}
                    {message.meta.decisionSummary}
                  </div>
                )}

                {message.sender === "ai" && message.meta?.trace && (
                  <details className="mt-2 text-xs text-gray-700">
                    <summary className="cursor-pointer font-medium">Trace details</summary>
                    <div className="mt-2 space-y-1">
                      {message.meta.trace.scopeDecision && (
                        <p>
                          <span className="font-semibold">Scope:</span>{" "}
                          {message.meta.trace.scopeDecision}
                        </p>
                      )}
                      {message.meta.trace.intent && (
                        <p>
                          <span className="font-semibold">Intent:</span> {message.meta.trace.intent}
                        </p>
                      )}
                      {message.meta.trace.validationOutcome && (
                        <p>
                          <span className="font-semibold">Validation:</span>{" "}
                          {message.meta.trace.validationOutcome}
                        </p>
                      )}
                      {typeof message.meta.trace.rowCount === "number" && (
                        <p>
                          <span className="font-semibold">Rows:</span> {message.meta.trace.rowCount}
                          {typeof message.meta.trace.execMs === "number"
                            ? ` | Exec: ${message.meta.trace.execMs}ms`
                            : ""}
                        </p>
                      )}
                      {message.meta.trace.fallbackReason && (
                        <p>
                          <span className="font-semibold">Reason:</span>{" "}
                          {message.meta.trace.fallbackReason}
                        </p>
                      )}
                      {message.meta.trace.sql && (
                        <div>
                          <p className="font-semibold">SQL:</p>
                          <pre className="mt-1 max-h-32 overflow-auto rounded bg-gray-100 p-2 text-[11px] leading-relaxed">
                            {message.meta.trace.sql}
                          </pre>
                        </div>
                      )}
                      {message.meta.requestId && (
                        <p>
                          <span className="font-semibold">Request ID:</span> {message.meta.requestId}
                        </p>
                      )}
                    </div>
                  </details>
                )}
              </div>
              {message.sender === "user" && (
                <Avatar>
                  <AvatarImage src="/user-avatar.png" alt="User" />
                  <AvatarFallback>You</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {sendMessageMutation.isPending && (
            <div className="flex items-end gap-2 justify-start">
              <Avatar>
                <AvatarImage src="/ai-avatar.png" alt="AI" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
              <div className="max-w-[80%] p-3 rounded-lg bg-gray-200 text-gray-800 rounded-bl-none">
                <p className="font-medium">AI is thinking...</p>
                <div className="mt-2 space-y-1 text-xs">
                  {STAGE_LABELS.map(({ stage, label }) => {
                    const status = stageStatus(pendingProgress?.events ?? [], stage);
                    const marker =
                      status === "completed"
                        ? "✓"
                        : status === "failed"
                          ? "✕"
                          : status === "active"
                            ? "…"
                            : "○";

                    return (
                      <div key={stage} className="flex items-center gap-2">
                        <span>{marker}</span>
                        <span>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <div className="p-4 border-t bg-white">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            type="text"
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1"
            disabled={sendMessageMutation.isPending}
          />
          <Button type="submit" disabled={sendMessageMutation.isPending}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
