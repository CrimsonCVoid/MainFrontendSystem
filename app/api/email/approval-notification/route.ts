import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendApprovalNotification } from "@/lib/email";

/**
 * POST /api/email/approval-notification
 *
 * Called when a client approves an estimate.
 * Sends email notification to the project owner/team.
 *
 * Body: { shareToken: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { shareToken } = await request.json();

    if (!shareToken) {
      return NextResponse.json(
        { error: "Share token is required" },
        { status: 400 }
      );
    }

    // Create admin client to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get share details
    const { data: share, error: shareError } = await supabase
      .from("estimate_shares")
      .select("*")
      .eq("share_token", shareToken)
      .single();

    if (shareError || !share) {
      console.error("Share not found:", shareError);
      return NextResponse.json(
        { error: "Share not found" },
        { status: 404 }
      );
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*, user_id")
      .eq("id", share.project_id)
      .single();

    if (projectError || !project) {
      console.error("Project not found:", projectError);
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Get project owner's email
    const { data: owner, error: ownerError } = await supabase
      .from("users")
      .select("email, full_name, company_name")
      .eq("id", project.user_id)
      .single();

    if (ownerError || !owner?.email) {
      console.error("Owner not found:", ownerError);
      return NextResponse.json(
        { error: "Project owner not found" },
        { status: 404 }
      );
    }

    // Get organization name if available
    let orgName = owner.company_name || "Your Team";
    if (share.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", share.organization_id)
        .single();
      if (org?.name) {
        orgName = org.name;
      }
    }

    // Prepare email data
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.mymetalroofer.com";
    const projectUrl = `${appUrl}/projects/${project.id}`;

    const emailData = {
      recipientEmail: owner.email,
      recipientName: owner.full_name || undefined,
      projectName: project.name,
      clientName: share.client_name || share.client_email || "Client",
      approvedAt: share.approved_at || new Date().toISOString(),
      signaturePreview: share.signature_data?.image || undefined,
      projectUrl,
      companyName: orgName,
    };

    // Send the email
    const result = await sendApprovalNotification(emailData);

    if (!result.success) {
      console.error("Failed to send email:", result.error);
      return NextResponse.json(
        { error: "Failed to send notification email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Approval notification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
