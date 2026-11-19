CREATE TABLE IF NOT EXISTS loanflow_workspaces (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS loanflow_documents (
  id UUID PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES loanflow_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mime TEXT NOT NULL,
  bytes BYTEA NOT NULL CHECK (octet_length(bytes) <= 3145728)
);
CREATE INDEX IF NOT EXISTS loanflow_documents_workspace_idx ON loanflow_documents(workspace_id);
