"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDownLeft,
  Plus,
  Search,
  LayoutDashboard,
  Files,
  Activity,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Download,
  SlidersHorizontal,
  X,
  Check,
  Clock,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Command,
  Building2,
  Wallet,
  Users,
  LogOut,
  RefreshCw,
  Briefcase,
  ArrowLeft,
} from "lucide-react";
import WorkspaceChat from "../components/workspace-chat";
import type { Loan, Role, Status } from "../lib/workflow";
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
const compact = (n: number) =>
  n >= 10000000
    ? `₹${(n / 10000000).toFixed(2)}Cr`
    : n >= 100000
      ? `₹${(n / 100000).toFixed(1)}L`
      : money(n);
const initials = (s: string) =>
  s
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("");
const date = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const statuses: Status[] = [
  "Draft",
  "Submitted",
  "Under review",
  "Awaiting approval",
  "Approved",
  "Rejected",
];
function Badge({ status }: { status: string }) {
  return (
    <span className={"badge " + status.toLowerCase().replaceAll(" ", "-")}>
      <span />
      {status}
    </span>
  );
}
export default function App() {
  const [loans, setLoans] = useState<Loan[]>([]),
    [role, setRole] = useState<Role>("Officer"),
    [version, setVersion] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [view, setView] = useState("Overview"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All applications"),
    [sort, setSort] = useState("Newest first"),
    [selected, setSelected] = useState<string | null>(null),
    [newOpen, setNewOpen] = useState(false),
    [step, setStep] = useState(1),
    [reason, setReason] = useState(""),
    [tab, setTab] = useState("Details"),
    [page, setPage] = useState(1);
  const [editId, setEditId] = useState<string | null>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    purpose: "Home renovation",
    amount: 450000,
    income: 65000,
    term: 36,
  });
  async function refresh() {
    setError("");
    try {
      const r = await fetch("/api/workspace");
      const d = (await r.json()) as {
        error: string;
        loans: Loan[];
        role: Role;
        version: number;
      };
      if (!r.ok) throw Error(d.error);
      setLoans(d.loans);
      setRole(d.role);
      setVersion(d.version);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 4500);
      return () => clearTimeout(t);
    }
  }, [notice]);
  useEffect(() => {
    setPage(1);
  }, [query, filter, view]);
  useEffect(() => {
    if (!selected && !newOpen) return;
    lastFocus.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const first = dialog?.querySelector<HTMLElement>(
      "button,input,select,textarea,a[href]",
    );
    first?.focus();
    function trap(e: KeyboardEvent) {
      if (e.key !== "Tab" || !dialog) return;
      const items = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
        ),
      ).filter((x) => x.offsetParent !== null);
      if (!items.length) return;
      const a = items[0],
        b = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        b.focus();
      } else if (!e.shiftKey && document.activeElement === b) {
        e.preventDefault();
        a.focus();
      }
    }
    document.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", trap);
      lastFocus.current?.focus();
    };
  }, [selected, newOpen]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelected(null);
        setNewOpen(false);
      }
    }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, version, ...extra }),
      });
      const d = (await r.json()) as {
        error: string;
        loans: Loan[];
        role: Role;
        version: number;
      };
      if (!r.ok) throw Error(d.error);
      await refresh();
      setReason("");
      setNotice(
        action === "role"
          ? `Switched to ${extra.role} demo`
          : "Workspace updated successfully",
      );
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  const filtered = useMemo(
    () =>
      loans
        .filter(
          (l) =>
            (filter === "All applications" || l.status === filter) &&
            (view !== "Review queue" ||
              ["Submitted", "Under review", "Awaiting approval"].includes(
                l.status,
              )) &&
            (l.name + " " + l.id + " " + l.purpose)
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "Amount: high to low"
            ? b.amount - a.amount
            : b.created.localeCompare(a.created),
        ),
    [loans, filter, query, sort, view],
  );
  const loan = loans.find((l) => l.id === selected);
  const approved = loans.filter((l) => l.status === "Approved");
  const pending = loans.filter((l) =>
    ["Submitted", "Under review", "Awaiting approval"].includes(l.status),
  );
  const total = loans.reduce((s, l) => s + l.amount, 0);
  const activities = loans
    .flatMap((l) => l.history.map((h) => ({ ...h, name: l.name, id: l.id })))
    .sort((a, b) => b.at.localeCompare(a.at));
  function open(l: Loan) {
    setSelected(l.id);
    setReason("");
    setTab("Details");
    setError("");
  }
  function exportCsv() {
    const csv =
      "ID,Applicant,Purpose,Amount,Status\n" +
      filtered
        .map((l) =>
          [l.id, l.name, l.purpose, l.amount, l.status]
            .map((v) => '"' + String(v).replaceAll('"', '""') + '"')
            .join(","),
        )
        .join("\n");
    const u = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = u;
    a.download = "loanflow-applications.csv";
    a.click();
    URL.revokeObjectURL(u);
    setNotice("Application report exported");
  }
  async function upload(file: File) {
    if (!loan) return;
    if (file.size > 3 * 1024 * 1024) {
      setError("Use a file smaller than 3 MB");
      return;
    }
    setBusy(true);
    try {
      const f = new FormData();
      f.append("id", loan.id);
      f.append("file", file);
      const r = await fetch("/api/documents", { method: "POST", body: f });
      const d = (await r.json()) as {
        error: string;
        loans: Loan[];
        role: Role;
        version: number;
      };
      if (!r.ok) throw Error(d.error);
      await refresh();
      setNotice("Document uploaded");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="app-shell">
      <aside className="sidebar" inert={!!selected || newOpen}>
        <a className="brand" href="/" aria-label="LoanFlow home">
          <span className="brand-mark">
            <ArrowUpRight size={25} />
          </span>
          loanflow<span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <span className="workspace-logo">
            <Building2 size={19} />
          </span>
          <div>
            <strong>Acme Lending</strong>
            <small>Demo workspace</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {[
            { name: "Overview", icon: LayoutDashboard },
            { name: "Applications", icon: Files },
            { name: "Review queue", icon: ShieldCheck },
            { name: "Activity log", icon: Activity },
          ].map(({ name, icon: Icon }) => (
            <button
              aria-label={name}
              title={name}
              key={name}
              className={view === name ? "nav-item active" : "nav-item"}
              onClick={() => {
                setView(name);
                setFilter("All applications");
                setQuery("");
              }}
            >
              <Icon size={19} />
              {name}
              {name === "Review queue" && (
                <span className="nav-count">{pending.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-card">
            <span className="tiny-green">● PORTFOLIO PROJECT</span>
            <strong>Built for the real workflow.</strong>
            <p>Explore applications, review documents, and make decisions.</p>
            <span className="demo-tech">React · Next.js · PostgreSQL</span>
          </div>
          <div className="sidebar-foot">
            <span className="avatar dark">KK</span>
            <div>
              <strong>Karthikeyan K</strong>
              <small>Project developer</small>
            </div>
            <span className="online" />
          </div>
        </div>
      </aside>
      <div className="main-shell" inert={!!selected || newOpen}>
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <strong>{view}</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-pill">
              <span />
              Live demo
            </span>
            <span className="top-separator" />
            <span className="role-label">Viewing as</span>
            <select
              aria-label="Demo persona"
              className="role-select"
              value={role}
              disabled={busy}
              onChange={(e) => act("role", { role: e.target.value })}
            >
              {["Customer", "Officer", "Manager"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <span className="avatar top-avatar">
              {role === "Customer" ? "CU" : role === "Manager" ? "MG" : "OF"}
            </span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR LENDING WORKSPACE</div>
              <h1>
                {view === "Overview"
                  ? "A clearer view of your pipeline."
                  : view === "Applications"
                    ? "Every application. One place."
                    : view === "Review queue"
                      ? "Move good decisions forward."
                      : "A record of every step."}
              </h1>
              <p>
                {view === "Activity log"
                  ? "Follow the decisions and updates across your workspace."
                  : "Manage applications, track progress, and keep things moving."}
              </p>
            </div>
            <button
              className="button primary"
              onClick={() => {
                setEditId(null);
                setForm({
                  name: "",
                  email: "",
                  purpose: "Home renovation",
                  amount: 450000,
                  income: 65000,
                  term: 36,
                });
                setNewOpen(true);
                setStep(1);
                setError("");
              }}
            >
              <Plus size={17} />
              New application
            </button>
          </div>
          <div className="demo-banner">
            <div>
              <span className="banner-icon">
                <Command size={16} />
              </span>
              <span>
                <strong>Your interview-ready sandbox.</strong> Switch personas
                to explore the complete lending journey.
              </span>
            </div>
            <span className="banner-right">
              Fictional data · browser session <ShieldCheck size={14} />
            </span>
          </div>
          {error && (
            <div role="alert" className="error">
              <AlertCircle size={17} />
              <span>{error}</span>
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {loading ? (
            <div className="loading">
              <Loader2 className="spin" />
              Loading your workspace…
            </div>
          ) : (
            <>
              {view === "Overview" && (
                <>
                  <section className="metrics">
                    <Metric
                      label="Total applications"
                      value={String(loans.length)}
                      icon={<Files size={18} />}
                      foot="Across your lending pipeline"
                    />
                    <Metric
                      label="Pipeline value"
                      value={compact(total)}
                      icon={<Wallet size={18} />}
                      foot="Total requested loan amount"
                    />
                    <Metric
                      label="Awaiting action"
                      value={String(pending.length).padStart(2, "0")}
                      icon={<Clock size={18} />}
                      foot="Applications in your review queue"
                      accent
                    />
                    <Metric
                      label="Approved amount"
                      value={compact(
                        approved.reduce((s, l) => s + l.amount, 0),
                      )}
                      icon={<CheckCircle2 size={18} />}
                      foot={`${approved.length} applications approved`}
                    />
                  </section>
                  <section className="insights-grid">
                    <div className="panel pipeline-panel">
                      <div className="panel-title">
                        <div>
                          <h2>Application pipeline</h2>
                          <p>A snapshot of where things stand</p>
                        </div>
                        <span className="subtle-tag">All time</span>
                      </div>
                      <div className="pipeline-bar">
                        {statuses.map((s) => {
                          const n = loans.filter((l) => l.status === s).length;
                          return (
                            n > 0 && (
                              <div
                                key={s}
                                title={`${s}: ${n}`}
                                className={s.toLowerCase().replaceAll(" ", "-")}
                                style={{ flex: n }}
                              />
                            )
                          );
                        })}
                      </div>
                      <div className="pipeline-legend">
                        {statuses.map((s) => (
                          <button
                            key={s}
                            onClick={() => {
                              setFilter(s);
                              setView("Applications");
                            }}
                          >
                            <span
                              className={
                                "legend-dot " +
                                s.toLowerCase().replaceAll(" ", "-")
                              }
                            />
                            <span>{s}</span>
                            <strong>
                              {loans.filter((l) => l.status === s).length}
                            </strong>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="focus-card">
                      <div className="focus-top">
                        <span className="focus-icon">
                          <ShieldCheck size={22} />
                        </span>
                        <span className="focus-label">NEXT UP</span>
                      </div>
                      <h2>
                        Good decisions start
                        <br />
                        with a closer look.
                      </h2>
                      <p>
                        {pending.length} applications are ready for your
                        attention.
                      </p>
                      <button
                        onClick={() => {
                          setView("Review queue");
                          setFilter("All applications");
                        }}
                      >
                        Open review queue <ArrowUpRight size={18} />
                      </button>
                      <div className="focus-decoration" />
                    </div>
                  </section>
                </>
              )}
              {view !== "Activity log" ? (
                <section className="panel applications-panel">
                  <div className="applications-heading">
                    <div>
                      <h2>
                        {view === "Overview"
                          ? "Recent applications"
                          : view === "Review queue"
                            ? "Review queue"
                            : "All applications"}
                        <span className="count-tag">{filtered.length}</span>
                      </h2>
                      <p>
                        {view === "Review queue"
                          ? "Review submissions and move applications toward a decision."
                          : "A little less paperwork. A lot more progress."}
                      </p>
                    </div>
                    <button className="button" onClick={exportCsv}>
                      <Download size={15} />
                      Export<span className="hide-mobile"> report</span>
                    </button>
                  </div>
                  <div className="table-toolbar">
                    <div className="filter-tabs">
                      {[
                        "All applications",
                        "Submitted",
                        "Under review",
                        "Approved",
                      ].map((s) => (
                        <button
                          key={s}
                          className={filter === s ? "selected" : ""}
                          onClick={() => setFilter(s)}
                        >
                          {s === "All applications" ? "All applications" : s}
                        </button>
                      ))}
                    </div>
                    <div className="table-controls">
                      <label className="search-box">
                        <Search size={16} />
                        <input
                          aria-label="Search applications"
                          placeholder="Search applications..."
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </label>
                      <select
                        aria-label="Filter status"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option>All applications</option>
                        {statuses.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                      <select
                        aria-label="Sort applications"
                        className="sort-select"
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                      >
                        <option>Newest first</option>
                        <option>Amount: high to low</option>
                      </select>
                    </div>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Applicant</th>
                          <th>Loan purpose</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Created</th>
                          <th aria-label="Open application" />
                        </tr>
                      </thead>
                      <tbody>
                        {filtered
                          .slice((page - 1) * 6, page * 6)
                          .map((l, i) => (
                            <tr key={l.id} onClick={() => open(l)}>
                              <td>
                                <button
                                  className="applicant-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    open(l);
                                  }}
                                >
                                  <span className={"avatar avatar-" + (i % 4)}>
                                    {initials(l.name)}
                                  </span>
                                  <span>
                                    <strong>{l.name}</strong>
                                    <small>{l.id}</small>
                                  </span>
                                </button>
                              </td>
                              <td>
                                <span className="purpose-icon">
                                  <Briefcase size={14} />
                                </span>
                                {l.purpose}
                              </td>
                              <td className="amount">{money(l.amount)}</td>
                              <td>
                                <Badge status={l.status} />
                              </td>
                              <td className="date-cell">{date(l.created)}</td>
                              <td>
                                <ChevronRight size={16} />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {!filtered.length && (
                      <div className="empty">
                        <Search size={28} />
                        <h3>No applications found</h3>
                        <p>Try another search or create an application.</p>
                        <button
                          className="button"
                          onClick={() => {
                            setQuery("");
                            setFilter("All applications");
                          }}
                        >
                          Clear filters
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="table-footer">
                    <span>
                      Showing {filtered.length ? (page - 1) * 6 + 1 : 0}–
                      {Math.min(page * 6, filtered.length)} of {filtered.length}{" "}
                      applications
                    </span>
                    <div>
                      <button
                        aria-label="Previous page"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                      >
                        ←
                      </button>
                      {Array.from(
                        { length: Math.ceil(filtered.length / 6) },
                        (_, i) => (
                          <button
                            key={i}
                            className={page === i + 1 ? "current" : ""}
                            onClick={() => setPage(i + 1)}
                          >
                            {i + 1}
                          </button>
                        ),
                      )}
                      <button
                        aria-label="Next page"
                        disabled={page * 6 >= filtered.length}
                        onClick={() => setPage(page + 1)}
                      >
                        →
                      </button>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="panel activity-page">
                  <div className="panel-title">
                    <div>
                      <h2>Workspace activity</h2>
                      <p>Server-recorded events, newest first</p>
                    </div>
                    <button className="button" onClick={refresh}>
                      <RefreshCw size={15} />
                      Refresh
                    </button>
                  </div>
                  {activities.map((h, i) => (
                    <button
                      className="activity-row"
                      key={i}
                      onClick={() => {
                        setSelected(h.id);
                        setTab("Activity");
                      }}
                    >
                      <span className="event-dot">
                        <Activity size={16} />
                      </span>
                      <div>
                        <strong>{h.text}</strong>
                        <small>
                          {h.name} · {h.id} · {h.role}
                        </small>
                      </div>
                      <time>{date(h.at)}</time>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                </section>
              )}
              <footer className="page-footer">
                <span>
                  <span className="online" />
                  {error ? "Workspace needs attention" : "Workspace connected"}
                </span>
                <span>
                  LoanFlow <span className="footer-dot">/</span> Made to move
                  lending forward.
                </span>
                <span>Demo workspace · v1.0</span>
              </footer>
            </>
          )}
        </main>
      </div>
      <WorkspaceChat
        role={role}
        ready={!loading && loans.length > 0}
        suspended={!!selected || newOpen}
        onOpenApplication={(id) => {
          void refresh().then(() => {
            setSelected(id);
            setTab("Details");
            setReason("");
          });
        }}
      />
      {notice && (
        <div role="status" className="toast">
          <CheckCircle2 size={18} />
          {notice}
        </div>
      )}
      {loan && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Application review"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="drawer-header">
              <div>
                <span className="eyebrow">APPLICATION WORKSPACE</span>
                <h2>{loan.id}</h2>
              </div>
              <button
                className="icon-button"
                autoFocus
                aria-label="Close application"
                onClick={() => setSelected(null)}
              >
                <X size={20} />
              </button>
            </header>
            <div className="drawer-person">
              <span className="avatar large">{initials(loan.name)}</span>
              <div>
                <h2>{loan.name}</h2>
                <p>{loan.email}</p>
              </div>
              <Badge status={loan.status} />
            </div>
            <div className="drawer-tabs">
              {["Details", "Documents", "Activity"].map((t) => (
                <button
                  className={tab === t ? "active" : ""}
                  key={t}
                  onClick={() => setTab(t)}
                >
                  {t}
                  {t === "Documents" && <span>{loan.documents.length}</span>}
                </button>
              ))}
            </div>
            <div className="drawer-body">
              {error && (
                <div className="error" role="alert">
                  {error}
                </div>
              )}
              {tab === "Details" && (
                <>
                  <div className="loan-amount">
                    <small>REQUESTED AMOUNT</small>
                    <h2>{money(loan.amount)}</h2>
                    <span>
                      {loan.purpose} <span>·</span> {loan.term} month term
                    </span>
                  </div>
                  <h3 className="section-title">Application details</h3>
                  <div className="detail-grid">
                    <div>
                      <small>Monthly income</small>
                      <strong>{money(loan.income)}</strong>
                    </div>
                    <div>
                      <small>Loan tenure</small>
                      <strong>{loan.term} months</strong>
                    </div>
                    <div>
                      <small>Created on</small>
                      <strong>{date(loan.created)}</strong>
                    </div>
                    <div>
                      <small>Supporting documents</small>
                      <strong>{loan.documents.length} attached</strong>
                    </div>
                  </div>
                  <div className="review-checklist">
                    <ShieldCheck size={20} />
                    <div>
                      <strong>Review before making a decision</strong>
                      <p>
                        Check the supporting documents and record your
                        reasoning. This demo does not calculate credit
                        eligibility.
                      </p>
                    </div>
                  </div>
                  <h3 className="section-title">Workflow progress</h3>
                  <div className="workflow-steps">
                    {[
                      "Draft",
                      "Submitted",
                      "Under review",
                      "Awaiting approval",
                      "Approved",
                    ].map((s, i) => (
                      <div
                        className={
                          statuses.indexOf(loan.status) >= i &&
                          loan.status !== "Rejected"
                            ? "done"
                            : ""
                        }
                        key={s}
                      >
                        <span>
                          {statuses.indexOf(loan.status) > i ? (
                            <Check size={12} />
                          ) : (
                            i + 1
                          )}
                        </span>
                        <small>{s}</small>
                      </div>
                    ))}
                  </div>
                  {loan.status === "Rejected" && <Badge status="Rejected" />}
                </>
              )}
              {tab === "Documents" && (
                <>
                  <h3 className="section-title">Supporting documents</h3>
                  <p className="muted">
                    PDF, PNG, JPG or text files · Up to 3 MB each · Maximum 5
                  </p>
                  {loan.documents.map((d) => (
                    <div className="document" key={d.id}>
                      <span className="document-icon">
                        <FileText size={22} />
                      </span>
                      <div>
                        <strong>{d.name}</strong>
                        <small>
                          {d.sample
                            ? "Fictional sample document"
                            : `${Math.ceil(d.size / 1024)} KB`}
                        </small>
                      </div>
                      <a
                        className="icon-button"
                        aria-label={"Download " + d.name}
                        download={
                          d.sample ? "sample-income-statement.txt" : undefined
                        }
                        href={
                          d.sample
                            ? "/sample-income-statement.txt"
                            : "/api/documents?id=" + encodeURIComponent(d.id)
                        }
                      >
                        <Download size={18} />
                      </a>
                    </div>
                  ))}
                  {!loan.documents.length && (
                    <p className="empty-doc">No documents attached yet.</p>
                  )}
                  {role === "Customer" && loan.status === "Draft" && (
                    <label className="upload-zone">
                      <Upload size={26} />
                      <strong>
                        {busy ? "Uploading…" : "Choose a supporting document"}
                      </strong>
                      <span>Use fictional information for this demo</span>
                      <input
                        aria-label="Upload document"
                        type="file"
                        accept=".pdf,.txt,.png,.jpg,.jpeg"
                        disabled={busy}
                        onChange={(e) => {
                          if (e.target.files?.[0]) upload(e.target.files[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </>
              )}
              {tab === "Activity" && (
                <div className="timeline">
                  {loan.history.map((h, i) => (
                    <div key={i}>
                      <span className="timeline-dot" />
                      <strong>{h.text}</strong>
                      <small>
                        {h.role} · {new Date(h.at).toLocaleString("en-IN")}
                      </small>
                    </div>
                  ))}
                </div>
              )}
              <div className="decision-box">
                <h3>
                  {role === "Customer"
                    ? "Customer actions"
                    : role === "Officer"
                      ? "Officer review"
                      : "Manager decision"}
                </h3>
                <p className="muted">
                  Current demo persona: {role}. Switch personas in the top bar.
                </p>
                {role !== "Customer" && (
                  <label className="field">
                    Review note / decision reason
                    <textarea
                      placeholder="Record your findings and the reason for your decision…"
                      value={reason}
                      maxLength={2000}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                )}
                <div className="decision-actions">
                  {role === "Customer" && loan.status === "Draft" && (
                    <button
                      className="button"
                      onClick={() => {
                        setEditId(loan.id);
                        setForm({
                          name: loan.name,
                          email: loan.email,
                          purpose: loan.purpose,
                          amount: loan.amount,
                          income: loan.income,
                          term: loan.term,
                        });
                        setSelected(null);
                        setNewOpen(true);
                        setStep(1);
                      }}
                    >
                      Edit draft
                    </button>
                  )}
                  {role === "Customer" && loan.status === "Draft" && (
                    <button
                      disabled={busy}
                      className="button primary"
                      onClick={() => act("submit", { id: loan.id })}
                    >
                      Submit application
                      <ArrowRight size={16} />
                    </button>
                  )}
                  {role === "Officer" && loan.status === "Submitted" && (
                    <button
                      disabled={busy}
                      className="button primary"
                      onClick={() => act("review", { id: loan.id })}
                    >
                      Start review
                      <ArrowRight size={16} />
                    </button>
                  )}
                  {role === "Officer" && loan.status === "Under review" && (
                    <button
                      disabled={busy}
                      className="button primary"
                      onClick={() => act("recommend", { id: loan.id, reason })}
                    >
                      Recommend for approval
                      <ArrowRight size={16} />
                    </button>
                  )}
                  {role === "Manager" &&
                    loan.status === "Awaiting approval" && (
                      <>
                        <button
                          disabled={busy}
                          className="button danger"
                          onClick={() => act("reject", { id: loan.id, reason })}
                        >
                          Reject
                        </button>
                        <button
                          disabled={busy}
                          className="button primary"
                          onClick={() =>
                            act("approve", { id: loan.id, reason })
                          }
                        >
                          <Check size={16} />
                          Approve application
                        </button>
                      </>
                    )}
                  {role !== "Customer" && (
                    <button
                      disabled={busy || !reason.trim()}
                      className="button"
                      onClick={() => act("note", { id: loan.id, reason })}
                    >
                      Save note
                    </button>
                  )}
                </div>
                {((role === "Customer" && loan.status !== "Draft") ||
                  (role === "Officer" &&
                    !["Submitted", "Under review"].includes(loan.status)) ||
                  (role === "Manager" &&
                    loan.status !== "Awaiting approval")) && (
                  <p className="muted">
                    No status changes available for this persona at this stage.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
      {newOpen && (
        <div
          className="modal-backdrop centered"
          onClick={() => setNewOpen(false)}
        >
          <section
            className="new-modal"
            role="dialog"
            aria-modal="true"
            aria-label="New application"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="drawer-header">
              <div>
                <span className="eyebrow">LET’S GET STARTED</span>
                <h2>{editId ? "Edit draft" : "New application"}</h2>
              </div>
              <button
                autoFocus
                className="icon-button"
                aria-label="Close new application"
                onClick={() => setNewOpen(false)}
              >
                <X size={20} />
              </button>
            </header>
            {role !== "Customer" ? (
              <div className="modal-content">
                <div className="switch-prompt">
                  <Users size={32} />
                  <h3>Step into the customer’s shoes.</h3>
                  <p>
                    Applications are created by the Customer persona. Switch to
                    explore the application journey.
                  </p>
                  <button
                    disabled={busy}
                    className="button primary"
                    onClick={() => act("role", { role: "Customer" })}
                  >
                    Switch to Customer <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (step === 1) {
                    setStep(2);
                    return;
                  }
                  if (
                    await act(editId ? "update" : "create", {
                      loan: form,
                      id: editId,
                    })
                  ) {
                    setNewOpen(false);
                    setView("Applications");
                    setFilter("Draft");
                    setForm({
                      name: "",
                      email: "",
                      purpose: "Home renovation",
                      amount: 450000,
                      income: 65000,
                      term: 36,
                    });
                  }
                }}
              >
                <div className="form-progress">
                  <span className={step === 1 ? "active" : ""}>
                    01 <strong>Applicant details</strong>
                  </span>
                  <span className={step === 2 ? "active" : ""}>
                    02 <strong>Loan details</strong>
                  </span>
                </div>
                <div className="modal-content">
                  {error && (
                    <div className="error" role="alert">
                      {error}
                    </div>
                  )}
                  {step === 1 ? (
                    <>
                      <h3>Tell us about the applicant.</h3>
                      <p className="muted">
                        Please enter fictional details for this demo.
                      </p>
                      <label className="field">
                        Full name
                        <input
                          required
                          minLength={2}
                          maxLength={100}
                          placeholder="e.g. Arjun Menon"
                          value={form.name}
                          onChange={(e) =>
                            setForm({ ...form, name: e.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        Email address
                        <input
                          required
                          type="email"
                          placeholder="arjun@example.com"
                          value={form.email}
                          onChange={(e) =>
                            setForm({ ...form, email: e.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        Monthly income (₹)
                        <input
                          required
                          type="number"
                          min={1000}
                          max={100000000}
                          value={form.income}
                          onChange={(e) =>
                            setForm({ ...form, income: Number(e.target.value) })
                          }
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <h3>What are you planning?</h3>
                      <p className="muted">
                        Save a draft, then attach documents and submit.
                      </p>
                      <label className="field">
                        Loan purpose
                        <select
                          value={form.purpose}
                          onChange={(e) =>
                            setForm({ ...form, purpose: e.target.value })
                          }
                        >
                          {[
                            "Home renovation",
                            "Business expansion",
                            "Education",
                            "Vehicle purchase",
                            "Personal loan",
                          ].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        Requested amount (₹)
                        <input
                          required
                          type="number"
                          min={10000}
                          max={10000000}
                          value={form.amount}
                          onChange={(e) =>
                            setForm({ ...form, amount: Number(e.target.value) })
                          }
                        />
                        <small>₹10,000 to ₹1,00,00,000</small>
                      </label>
                      <label className="field">
                        Loan tenure
                        <select
                          value={form.term}
                          onChange={(e) =>
                            setForm({ ...form, term: Number(e.target.value) })
                          }
                        >
                          {[12, 24, 36, 48, 60].map((n) => (
                            <option key={n} value={n}>
                              {n} months
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="form-summary">
                        <span>{form.name}</span>
                        <strong>{money(form.amount)}</strong>
                      </div>
                    </>
                  )}
                </div>
                <footer className="modal-footer">
                  <button
                    className="button"
                    type="button"
                    onClick={() =>
                      step === 1 ? setNewOpen(false) : setStep(1)
                    }
                  >
                    {step === 1 ? "Cancel" : "Back"}
                  </button>
                  <button
                    className="button primary"
                    type="submit"
                    disabled={busy}
                  >
                    {busy
                      ? "Saving…"
                      : step === 1
                        ? "Continue"
                        : editId
                          ? "Save draft changes"
                          : "Save application draft"}
                    <ArrowRight size={16} />
                  </button>
                </footer>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function Metric({
  label,
  value,
  icon,
  foot,
  accent = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  foot: string;
  accent?: boolean;
}) {
  return (
    <div className={"metric " + (accent ? "metric-accent" : "")}>
      <div className="metric-label">
        {label}
        <span>{icon}</span>
      </div>
      <strong className="metric-value">{value}</strong>
      <div className="metric-foot">
        {accent && <span className="tiny-dot" />}
        {foot}
      </div>
    </div>
  );
}
