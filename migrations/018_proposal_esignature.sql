-- Migration: ESIGN-compliant proposal e-signature system
-- Description: Persists proposal snapshots, captures email-OTP identity
--              verification, records signatures with full ESIGN/UETA
--              audit trail (IP, UA, document hash, timestamps, consent
--              acknowledgments).
-- Created: 2026-04-20

-- ---------------------------------------------------------------------------
-- 1. proposals: immutable snapshot of a proposal sent for signature.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Shareable signing token (opaque, URL-safe, unpredictable).
  signing_token TEXT NOT NULL UNIQUE,

  -- Frozen content at send time. Never mutated after signing; new versions
  -- create new proposals rows. document_hash is SHA-256 of the canonical
  -- JSON — proves signed content hasn't been altered post-signature.
  content_json JSONB NOT NULL,
  document_hash TEXT NOT NULL,

  -- Signer-side metadata captured by sender when sending.
  signer_email TEXT NOT NULL,
  signer_name TEXT,

  -- Lifecycle: 'draft' before send, 'sent' after email dispatch,
  -- 'viewed' once signer opens the link, 'signed' on completion,
  -- 'voided' if sender cancels, 'expired' if past expires_at.
  status TEXT NOT NULL DEFAULT 'sent' CHECK (
    status IN ('draft', 'sent', 'viewed', 'signed', 'voided', 'expired')
  ),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),

  -- Sender-facing audit trail.
  sent_at TIMESTAMPTZ DEFAULT now(),
  first_viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  void_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposals_project ON proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_proposals_org ON proposals(organization_id);
CREATE INDEX IF NOT EXISTS idx_proposals_token ON proposals(signing_token);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);

COMMENT ON TABLE proposals IS
  'Immutable proposal snapshots sent for e-signature. content_json + document_hash freeze exactly what the signer is agreeing to.';

-- ---------------------------------------------------------------------------
-- 2. proposal_otps: short-lived email verification codes (MFA for signers).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proposal_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,

  -- Email the OTP was sent to (snapshot; proposal.signer_email may change
  -- if sender edits, but already-issued OTPs remain bound to their email).
  email TEXT NOT NULL,

  -- 6-digit code stored hashed (bcrypt or sha256-salt). Never plaintext.
  code_hash TEXT NOT NULL,

  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,

  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
  verified_at TIMESTAMPTZ,

  -- Sender IP/UA at issue time (for rate-limiting + abuse signals).
  request_ip INET,
  request_ua TEXT
);

CREATE INDEX IF NOT EXISTS idx_proposal_otps_proposal ON proposal_otps(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_otps_email ON proposal_otps(email);
CREATE INDEX IF NOT EXISTS idx_proposal_otps_expires ON proposal_otps(expires_at);

COMMENT ON TABLE proposal_otps IS
  'Email-OTP verification records for signer identity. Codes hashed, rate-limited, 10-min TTL. Counts as "identity verification" under ESIGN Act.';

-- ---------------------------------------------------------------------------
-- 3. proposal_signatures: the signature + full ESIGN/UETA audit trail.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proposal_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL UNIQUE REFERENCES proposals(id) ON DELETE CASCADE,

  -- Signer info captured on the signing page (verified by OTP).
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,

  -- The signature itself. signature_data_url holds either:
  --   (a) a data:image/png;base64,... canvas drawing, or
  --   (b) a data:text/typed;... style-typed signature (stored as SVG).
  signature_data_url TEXT NOT NULL,
  signature_method TEXT NOT NULL CHECK (signature_method IN ('drawn', 'typed')),

  -- ESIGN intent: the exact consent phrases the signer checked.
  consent_to_esign BOOLEAN NOT NULL,
  consent_to_terms BOOLEAN NOT NULL,
  consent_text_version TEXT NOT NULL DEFAULT 'v1',

  -- Identity verification record: link to the OTP that proved this email.
  verifying_otp_id UUID REFERENCES proposal_otps(id) ON DELETE SET NULL,
  otp_verified_at TIMESTAMPTZ NOT NULL,

  -- Audit metadata — these are the legal pillars.
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signer_ip INET NOT NULL,
  signer_ua TEXT NOT NULL,

  -- Document integrity proof. Must match proposals.document_hash;
  -- if they ever diverge, the signed record is invalid.
  document_hash_at_sign TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposal_signatures_proposal ON proposal_signatures(proposal_id);

COMMENT ON TABLE proposal_signatures IS
  'ESIGN-compliant signature record. Contains signature data, consent acknowledgments, OTP verification link, IP/UA/timestamp audit trail, and document hash at sign time.';

-- ---------------------------------------------------------------------------
-- 4. RLS policies
-- ---------------------------------------------------------------------------
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_signatures ENABLE ROW LEVEL SECURITY;

-- Proposals: sender can CRUD their own; signer endpoints use the service
-- role client, so no anon-read policy here.
CREATE POLICY proposals_sender_all ON proposals
  FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- OTPs + signatures: service-role only (all public access goes through
-- the Next.js API routes which use the service role client).
CREATE POLICY proposal_otps_service_only ON proposal_otps FOR ALL USING (false);
CREATE POLICY proposal_signatures_service_only ON proposal_signatures FOR ALL USING (false);

-- ---------------------------------------------------------------------------
-- 5. Helper: auto-update updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION _proposals_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proposals_updated_at ON proposals;
CREATE TRIGGER trg_proposals_updated_at
BEFORE UPDATE ON proposals
FOR EACH ROW EXECUTE FUNCTION _proposals_touch_updated_at();
