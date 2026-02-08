-- ============================================
-- REVENUE TRACKING & BILL OF MATERIALS SYSTEM
-- ============================================
-- Enables profitability tracking per project and material calculations

-- ============================================
-- PROJECT REVENUE TABLE
-- ============================================
-- Track estimated vs actual revenue/costs per project
CREATE TABLE IF NOT EXISTS project_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Revenue tracking
  estimated_revenue DECIMAL(12,2),
  actual_revenue DECIMAL(12,2),

  -- Cost tracking
  estimated_cost DECIMAL(12,2),
  actual_cost DECIMAL(12,2),

  -- Calculated margin (can be computed, but stored for reporting)
  margin_percent DECIMAL(5,2),

  -- Payment status
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),

  -- Invoice tracking
  invoice_number TEXT,
  invoice_sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,

  -- Audit
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one revenue record per project
  UNIQUE(project_id)
);

-- ============================================
-- MATERIAL COSTS TABLE
-- ============================================
-- Organization-specific material pricing reference
CREATE TABLE IF NOT EXISTS material_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Material identification
  material_type TEXT NOT NULL, -- e.g., "panel", "fastener", "trim", "accessory"
  material_name TEXT NOT NULL, -- e.g., "Standing Seam Panel 16\"", "Panel Clip"
  sku TEXT, -- Optional SKU/part number

  -- Pricing
  unit TEXT NOT NULL, -- e.g., "panel", "clip", "linear_ft", "sq_ft", "each"
  cost_per_unit DECIMAL(10,2) NOT NULL,

  -- Supplier info
  supplier TEXT,
  supplier_sku TEXT,

  -- Settings
  is_default BOOLEAN DEFAULT FALSE, -- Show by default in BOM
  is_active BOOLEAN DEFAULT TRUE,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique material per org
  UNIQUE(organization_id, material_type, material_name)
);

-- ============================================
-- PROJECT BOM TABLE
-- ============================================
-- Bill of materials for each project (can have manual overrides)
CREATE TABLE IF NOT EXISTS project_bom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Material reference (optional link to material_costs)
  material_cost_id UUID REFERENCES material_costs(id) ON DELETE SET NULL,

  -- Material details (can override material_costs values)
  material_type TEXT NOT NULL,
  material_name TEXT NOT NULL,

  -- Quantities
  quantity DECIMAL(12,2) NOT NULL,
  unit TEXT NOT NULL,

  -- Pricing (can override material_costs)
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(12,2),

  -- Calculation source
  is_auto_calculated BOOLEAN DEFAULT TRUE, -- FALSE if manually overridden

  -- Notes
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EMAIL QUEUE TABLE
-- ============================================
-- Queue for outgoing emails (estimates, notifications, etc.)
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Recipient
  to_email TEXT NOT NULL,
  to_name TEXT,

  -- Email content
  subject TEXT NOT NULL,
  template_type TEXT NOT NULL, -- e.g., "estimate", "approval", "sf_warning", "invite"
  template_data JSONB NOT NULL, -- Data to populate the template

  -- Attachments
  attachment_url TEXT, -- URL to PDF or other attachment
  attachment_name TEXT,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Timestamps
  scheduled_for TIMESTAMPTZ DEFAULT NOW(), -- When to send
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_project_revenue_project ON project_revenue(project_id);
CREATE INDEX IF NOT EXISTS idx_project_revenue_org ON project_revenue(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_revenue_status ON project_revenue(payment_status);
CREATE INDEX IF NOT EXISTS idx_material_costs_org ON material_costs(organization_id);
CREATE INDEX IF NOT EXISTS idx_material_costs_type ON material_costs(organization_id, material_type);
CREATE INDEX IF NOT EXISTS idx_project_bom_project ON project_bom(project_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_queue_org ON email_queue(organization_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE project_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_bom ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Project Revenue - org members can view/edit
CREATE POLICY "Users can view revenue for their org projects"
  ON project_revenue FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert revenue for their org projects"
  ON project_revenue FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update revenue for their org projects"
  ON project_revenue FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Material Costs - org members can view, admins can modify
CREATE POLICY "Users can view material costs for their org"
  ON material_costs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage material costs"
  ON material_costs FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT org_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Project BOM - org members can view/edit
CREATE POLICY "Users can view BOM for their org projects"
  ON project_bom FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE organization_id IN (
        SELECT org_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage BOM for their org projects"
  ON project_bom FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE organization_id IN (
        SELECT org_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- Email Queue - org members can view their org's emails
CREATE POLICY "Users can view emails for their org"
  ON email_queue FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create emails for their org"
  ON email_queue FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Auto-calculate margin when revenue/cost changes
CREATE OR REPLACE FUNCTION calculate_project_margin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.actual_revenue IS NOT NULL AND NEW.actual_cost IS NOT NULL AND NEW.actual_cost > 0 THEN
    NEW.margin_percent := ((NEW.actual_revenue - NEW.actual_cost) / NEW.actual_revenue) * 100;
  ELSIF NEW.estimated_revenue IS NOT NULL AND NEW.estimated_cost IS NOT NULL AND NEW.estimated_cost > 0 THEN
    NEW.margin_percent := ((NEW.estimated_revenue - NEW.estimated_cost) / NEW.estimated_revenue) * 100;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_margin
  BEFORE INSERT OR UPDATE ON project_revenue
  FOR EACH ROW
  EXECUTE FUNCTION calculate_project_margin();

-- Auto-calculate total_cost in BOM
CREATE OR REPLACE FUNCTION calculate_bom_total()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unit_cost IS NOT NULL AND NEW.quantity IS NOT NULL THEN
    NEW.total_cost := NEW.unit_cost * NEW.quantity;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_bom_total
  BEFORE INSERT OR UPDATE ON project_bom
  FOR EACH ROW
  EXECUTE FUNCTION calculate_bom_total();

-- ============================================
-- DEFAULT MATERIAL COSTS (seed data function)
-- ============================================
-- Call this when creating a new organization to seed default materials
CREATE OR REPLACE FUNCTION seed_default_material_costs(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO material_costs (organization_id, material_type, material_name, unit, cost_per_unit, is_default)
  VALUES
    -- Panels
    (p_org_id, 'panel', 'Standing Seam Panel (24ga)', 'panel', 45.00, true),
    (p_org_id, 'panel', 'Standing Seam Panel (22ga)', 'panel', 55.00, true),
    -- Fasteners
    (p_org_id, 'fastener', 'Panel Clip', 'clip', 1.50, true),
    (p_org_id, 'fastener', '#14 Self-Drilling Screw', 'screw', 0.15, true),
    (p_org_id, 'fastener', '#10 Pancake Screw', 'screw', 0.12, true),
    -- Trim
    (p_org_id, 'trim', 'Ridge Cap (10ft)', 'piece', 35.00, true),
    (p_org_id, 'trim', 'Drip Edge (10ft)', 'piece', 18.00, true),
    (p_org_id, 'trim', 'Valley Flashing (10ft)', 'piece', 28.00, true),
    (p_org_id, 'trim', 'Gable Trim (10ft)', 'piece', 22.00, true),
    -- Accessories
    (p_org_id, 'accessory', 'Butyl Tape Roll', 'roll', 25.00, true),
    (p_org_id, 'accessory', 'Pipe Boot (3")', 'each', 35.00, false),
    (p_org_id, 'accessory', 'Ridge Vent (4ft)', 'piece', 45.00, false)
  ON CONFLICT (organization_id, material_type, material_name) DO NOTHING;
END;
$$;
