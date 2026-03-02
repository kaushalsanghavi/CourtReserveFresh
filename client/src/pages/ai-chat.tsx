import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SendHorizontal } from "lucide-react";
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
    <div className="flex h-[70vh] min-h-[26rem] max-h-[calc(100vh-10rem)] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gradient-to-r from-ramp-green-50 via-white to-white px-4 py-3 sm:px-5">
        <p className="text-sm font-semibold text-gray-900">CourtReserve Assistant</p>
        <p className="text-xs text-gray-500">Ask about bookings, participation, and availability.</p>
      </div>
      <ScrollArea className="flex-1 px-3 py-3 sm:px-4 sm:py-4">
        <div className="space-y-3 sm:space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex items-end gap-2 sm:gap-3",
                message.sender === "user" ? "justify-end" : "justify-start",
              )}
            >
              {message.sender === "ai" && (
                <Avatar className="h-8 w-8 border border-border shadow-sm sm:h-9 sm:w-9">
                  <AvatarImage src="/ai-avatar.png" alt="AI" />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "max-w-[88%] rounded-2xl border p-3 text-sm leading-relaxed shadow-sm sm:max-w-[80%] sm:text-[15px]",
                  message.sender === "user"
                    ? "rounded-br-md border-ramp-green-200 bg-ramp-green-100 text-ramp-green-700"
                    : "rounded-bl-md border-gray-200 bg-gray-100 text-gray-800",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{message.text}</p>

                {message.sender === "ai" && message.meta?.decisionSummary && (
                  <div className="mt-3 rounded-md border border-gray-300 bg-white p-2 text-xs text-gray-700">
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
                <Avatar className="h-8 w-8 border border-border shadow-sm sm:h-9 sm:w-9">
                  <AvatarImage src="/user-avatar.png" alt="User" />
                  <AvatarFallback>You</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {sendMessageMutation.isPending && (
            <div className="flex items-end justify-start gap-2 sm:gap-3">
              <Avatar className="h-8 w-8 border border-border shadow-sm sm:h-9 sm:w-9">
                <AvatarImage src="/ai-avatar.png" alt="AI" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
              <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-ramp-green-200 bg-gradient-to-br from-ramp-green-50 via-white to-ramp-green-100 p-3 text-gray-800 shadow-sm sm:max-w-[80%] sm:p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1" aria-hidden="true">
                    {[0, 140, 280].map((delay) => (
                      <span
                        key={delay}
                        className="h-2 w-2 rounded-full bg-ramp-green-600 animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-gray-800">Thinking through your request...</p>
                </div>
                <div className="mt-3 space-y-1.5 text-xs sm:text-sm">
                  {STAGE_LABELS.map(({ stage, label }, index) => {
                    const status = stageStatus(pendingProgress?.events ?? [], stage);

                    return (
                      <div
                        key={stage}
                        className={cn(
                          "flex items-center justify-between rounded-md border px-2.5 py-2 transition-all",
                          status === "completed" && "border-ramp-green-300 bg-ramp-green-100 text-gray-800",
                          status === "failed" && "border-red-300 bg-red-50 text-red-800",
                          status === "active" &&
                            "border-ramp-green-300 bg-ramp-green-100 text-gray-800 animate-pulse",
                          status === "pending" && "border-gray-200 bg-white/75 text-gray-500",
                        )}
                        style={{ animationDelay: `${index * 80}ms` }}
                      >
                        <span>{label}</span>
                        <span
                          className={cn(
                            "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                            status === "completed" && "bg-ramp-green-600 text-white",
                            status === "failed" && "bg-red-600 text-white",
                            status === "active" &&
                              "bg-ramp-green-200 text-ramp-green-700 ring-2 ring-ramp-green-300 animate-pulse",
                            status === "pending" && "bg-gray-200 text-gray-500",
                          )}
                        >
                          {status === "completed" ? "✓" : status === "failed" ? "!" : status === "active" ? "…" : "○"}
                        </span>
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
      <div className="border-t border-gray-200 bg-white/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:p-4">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2 sm:gap-3">
          <Input
            type="text"
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="h-11 flex-1 rounded-full bg-white px-4 shadow-sm"
            disabled={sendMessageMutation.isPending}
          />
          <Button
            type="submit"
            disabled={sendMessageMutation.isPending}
            className="h-11 rounded-full px-4 sm:px-5"
          >
            <SendHorizontal className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
