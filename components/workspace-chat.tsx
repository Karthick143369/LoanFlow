"use client";
import { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  X,
  Send,
  ArrowUpRight,
  RefreshCw,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import type { ChatAnswer } from "../lib/chat";
import type { Role } from "../lib/workflow";
type Reply = ChatAnswer & {
  asOf: string;
  workspaceVersion: number;
  mode: "built-in";
};
type Message = {
  id: number;
  author: "user" | "assistant";
  text: string;
  reply?: Reply;
};
const welcome: Message = {
  id: 0,
  author: "assistant",
  text: "Hi! I’m your LoanFlow workspace assistant. Ask about applications, amounts, statuses, attachments, recent activity, or what to do next. I use live records from this browser’s workspace.",
};
const initialSuggestions = [
  "Summarize my workspace",
  "Which applications need attention?",
  "How do I upload documents?",
];
export default function WorkspaceChat({
  role,
  ready,
  suspended,
  onOpenApplication,
}: {
  role: Role;
  ready: boolean;
  suspended: boolean;
  onOpenApplication: (id: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState(""),
    [messages, setMessages] = useState<Message[]>([welcome]),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [context, setContext] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null),
    end = useRef<HTMLDivElement>(null),
    launcher = useRef<HTMLButtonElement>(null),
    controller = useRef<AbortController | null>(null),
    inFlight = useRef(false),
    sequence = useRef(1);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (suspended) setOpen(false);
  }, [suspended]);
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        launcher.current?.focus();
      }
    }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);
  useEffect(() => {
    if (open)
      end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open, messages, pending, error]);
  async function send(question: string) {
    const message = question.trim();
    if (!message || inFlight.current || !ready) return;
    if (message.length > 1200) {
      setError("Keep your question under 1,200 characters.");
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError("");
    setDraft("");
    setMessages((prev) => [
      ...prev.slice(-38),
      { id: sequence.current++, author: "user", text: message },
    ]);
    const abort = new AbortController();
    controller.current = abort;
    const timer = setTimeout(() => abort.abort(), 20000);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, contextApplicationId: context }),
        signal: abort.signal,
      });
      const data = (await r.json()) as Reply & { error?: string };
      if (!r.ok)
        throw new Error(data.error || "Could not retrieve a response.");
      setMessages((prev) => [
        ...prev.slice(-39),
        {
          id: sequence.current++,
          author: "assistant",
          text: data.text,
          reply: data,
        },
      ]);
      setContext(data.contextApplicationId);
    } catch (e) {
      setError(
        e instanceof Error && e.name === "AbortError"
          ? "The request timed out. Please try again."
          : e instanceof Error
            ? e.message
            : "Something went wrong.",
      );
      setDraft(message);
    } finally {
      clearTimeout(timer);
      setPending(false);
      inFlight.current = false;
      controller.current = null;
      input.current?.focus();
    }
  }
  const latest = [...messages].reverse().find((m) => m.reply)?.reply;
  const suggestions = latest?.suggestions.length
    ? latest.suggestions
    : initialSuggestions;
  function close() {
    setOpen(false);
    launcher.current?.focus();
  }
  if (suspended) return null;
  return (
    <div className="workspace-chat">
      {open && (
        <section
          id="loanflow-chat"
          className="chat-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="chat-title"
        >
          <header className="chat-header">
            <span className="chat-logo">
              <MessageCircle size={20} />
            </span>
            <div>
              <h2 id="chat-title">LoanFlow assistant</h2>
              <p>Workspace answers, in one conversation</p>
            </div>
            <button
              type="button"
              className="chat-icon"
              aria-label="Start a new chat"
              title="Start a new chat"
              disabled={pending}
              onClick={() => {
                setMessages([welcome]);
                setContext(null);
                setDraft("");
                setError("");
                input.current?.focus();
              }}
            >
              <RefreshCw size={16} />
            </button>
            <button
              type="button"
              className="chat-icon"
              aria-label="Close assistant"
              onClick={close}
            >
              <X size={19} />
            </button>
          </header>
          <div className="chat-scope">
            <ShieldCheck size={13} />
            <span>Current workspace only</span>
            <span>{role} persona</span>
          </div>
          <div
            className="chat-messages"
            role="log"
            aria-label="Chat messages"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {messages.map((m) => (
              <article key={m.id} className={"chat-message " + m.author}>
                <span className="chat-author">
                  {m.author === "user" ? "You" : "LoanFlow assistant"}
                </span>
                <div className="chat-bubble">{m.text}</div>
                {m.reply && (
                  <>
                    <div className="chat-references">
                      {m.reply.references.map((ref) => (
                        <button
                          type="button"
                          key={ref.id}
                          onClick={() => {
                            close();
                            onOpenApplication(ref.id);
                          }}
                        >
                          <span>
                            <strong>{ref.name}</strong>
                            <small>
                              {ref.id} · {ref.status}
                            </small>
                          </span>
                          <ArrowUpRight size={15} />
                        </button>
                      ))}
                    </div>
                    <small className="chat-asof">
                      Workspace v{m.reply.workspaceVersion} · Checked{" "}
                      {new Date(m.reply.asOf).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </>
                )}
              </article>
            ))}
            {pending && (
              <div className="chat-thinking" role="status">
                <Loader2 size={14} className="spin" />
                Checking your workspace…
              </div>
            )}
            {error && (
              <div className="chat-error" role="alert">
                {error} Your question is back in the input so you can retry.
              </div>
            )}
            <div ref={end} />
          </div>
          {!pending && (
            <div className="chat-suggestions" aria-label="Suggested questions">
              {suggestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={!ready}
                  onClick={() => send(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <form
            className="chat-composer"
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
          >
            <label className="sr-only" htmlFor="chat-question">
              Ask LoanFlow assistant
            </label>
            <textarea
              id="chat-question"
              ref={input}
              rows={2}
              maxLength={1200}
              placeholder={
                ready
                  ? "Ask about your workspace…"
                  : "Waiting for the workspace…"
              }
              value={draft}
              disabled={pending || !ready}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  send(draft);
                }
              }}
            />
            <button
              type="submit"
              aria-label="Send question"
              disabled={pending || !ready || !draft.trim()}
            >
              {pending ? (
                <Loader2 className="spin" size={17} />
              ) : (
                <Send size={17} />
              )}
            </button>
          </form>
          <footer className="chat-footer">
            Built-in assistant · No AI key required · Read-only answers
          </footer>
        </section>
      )}
      <button
        ref={launcher}
        type="button"
        className={"chat-launcher " + (open ? "is-open" : "")}
        aria-label={
          open ? "Close LoanFlow assistant" : "Open LoanFlow assistant"
        }
        aria-expanded={open}
        aria-controls="loanflow-chat"
        onClick={() => (open ? close() : setOpen(true))}
      >
        {open ? <X size={19} /> : <MessageCircle size={21} />}
        <span>{open ? "Close chat" : "Ask LoanFlow"}</span>
        {!open && <span className="chat-launcher-dot" />}
      </button>
    </div>
  );
}
