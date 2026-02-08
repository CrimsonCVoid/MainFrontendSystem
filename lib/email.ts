/**
 * EMAIL SERVICE LIBRARY
 *
 * Send transactional emails using Resend.
 * Includes templates for estimates, approvals, and notifications.
 */

// Note: Install resend with: npm install resend
// Add RESEND_API_KEY to your .env.local

// ============================================
// TYPES
// ============================================

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EstimateEmailData {
  recipientEmail: string;
  recipientName?: string;
  projectName: string;
  projectAddress?: string;
  estimateTotal: number;
  shareUrl: string;
  senderName: string;
  companyName: string;
  companyLogo?: string;
  notes?: string;
}

export interface ApprovalNotificationData {
  recipientEmail: string;
  recipientName?: string;
  projectName: string;
  clientName: string;
  approvedAt: string;
  signaturePreview?: string;
  projectUrl: string;
  companyName: string;
}

export interface SFPoolWarningData {
  recipientEmail: string;
  recipientName?: string;
  organizationName: string;
  currentBalance: number;
  warningThreshold: number;
  purchaseUrl: string;
}

export interface TeamInviteEmailData {
  recipientEmail: string;
  inviterName: string;
  organizationName: string;
  role: string;
  inviteUrl: string;
  expiresAt?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================
// EMAIL CLIENT SETUP
// ============================================

let resendClient: { emails: { send: (options: EmailSendOptions) => Promise<{ data?: { id: string }; error?: { message: string } }> } } | null = null;

interface EmailSendOptions {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

async function getResendClient() {
  if (resendClient) return resendClient;

  // Dynamic import to avoid issues if resend is not installed
  try {
    const { Resend } = await import("resend");
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.warn("RESEND_API_KEY not configured - emails will be logged only");
      return null;
    }

    resendClient = new Resend(apiKey);
    return resendClient;
  } catch (err) {
    console.warn("Resend not installed - emails will be logged only");
    return null;
  }
}

// ============================================
// EMAIL TEMPLATES
// ============================================

/**
 * Generate estimate email HTML
 */
function generateEstimateEmailHTML(data: EstimateEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your Roofing Estimate</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="padding: 32px 24px; text-align: center; background-color: #1a1a1a;">
        ${
          data.companyLogo
            ? `<img src="${data.companyLogo}" alt="${data.companyName}" style="max-height: 60px; max-width: 200px;">`
            : `<h1 style="margin: 0; color: #ffffff; font-size: 24px;">${data.companyName}</h1>`
        }
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 32px 24px;">
        <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 20px;">
          Your Roofing Estimate is Ready
        </h2>

        <p style="margin: 0 0 24px 0; color: #525252; font-size: 16px; line-height: 1.5;">
          Hi${data.recipientName ? ` ${data.recipientName}` : ""},
        </p>

        <p style="margin: 0 0 24px 0; color: #525252; font-size: 16px; line-height: 1.5;">
          ${data.senderName} from ${data.companyName} has prepared an estimate for your review.
        </p>

        <!-- Project Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">Project</p>
              <p style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 18px; font-weight: 600;">${data.projectName}</p>

              ${
                data.projectAddress
                  ? `
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">Address</p>
              <p style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 16px;">${data.projectAddress}</p>
              `
                  : ""
              }

              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">Estimated Total</p>
              <p style="margin: 0; color: #059669; font-size: 24px; font-weight: 700;">$${data.estimateTotal.toLocaleString()}</p>
            </td>
          </tr>
        </table>

        ${
          data.notes
            ? `
        <p style="margin: 0 0 24px 0; color: #525252; font-size: 16px; line-height: 1.5;">
          <strong>Note from ${data.senderName}:</strong><br>
          ${data.notes}
        </p>
        `
            : ""
        }

        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center; padding: 8px 0;">
              <a href="${data.shareUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                View Full Estimate
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; text-align: center;">
          Or copy this link: <a href="${data.shareUrl}" style="color: #2563eb;">${data.shareUrl}</a>
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 24px; background-color: #f9fafb; text-align: center;">
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          Sent by ${data.companyName} via MyMetalRoofer
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Generate approval notification HTML
 */
function generateApprovalEmailHTML(data: ApprovalNotificationData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Estimate Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="padding: 32px 24px; text-align: center; background-color: #059669;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Estimate Approved!</h1>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 32px 24px;">
        <p style="margin: 0 0 24px 0; color: #525252; font-size: 16px; line-height: 1.5;">
          Great news! ${data.clientName} has approved the estimate for <strong>${data.projectName}</strong>.
        </p>

        <!-- Approval Details -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ecfdf5; border-radius: 8px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 8px 0; color: #065f46; font-size: 14px;">Approved by</p>
              <p style="margin: 0 0 16px 0; color: #065f46; font-size: 18px; font-weight: 600;">${data.clientName}</p>

              <p style="margin: 0 0 8px 0; color: #065f46; font-size: 14px;">Approved on</p>
              <p style="margin: 0; color: #065f46; font-size: 16px;">${new Date(data.approvedAt).toLocaleString()}</p>
            </td>
          </tr>
        </table>

        ${
          data.signaturePreview
            ? `
        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">Client Signature:</p>
        <img src="${data.signaturePreview}" alt="Signature" style="max-width: 300px; border: 1px solid #e5e7eb; border-radius: 4px; margin-bottom: 24px;">
        `
            : ""
        }

        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center; padding: 8px 0;">
              <a href="${data.projectUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                View Project
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 24px; background-color: #f9fafb; text-align: center;">
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          ${data.companyName} • MyMetalRoofer
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Generate SF pool warning HTML
 */
function generateSFPoolWarningHTML(data: SFPoolWarningData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Low Square Footage Balance</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="padding: 32px 24px; text-align: center; background-color: #f59e0b;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Low SF Balance Alert</h1>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 32px 24px;">
        <p style="margin: 0 0 24px 0; color: #525252; font-size: 16px; line-height: 1.5;">
          Hi${data.recipientName ? ` ${data.recipientName}` : ""},
        </p>

        <p style="margin: 0 0 24px 0; color: #525252; font-size: 16px; line-height: 1.5;">
          Your organization <strong>${data.organizationName}</strong> is running low on square footage credits.
        </p>

        <!-- Balance Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border-radius: 8px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #92400e; font-size: 14px;">Current Balance</p>
              <p style="margin: 0; color: #92400e; font-size: 36px; font-weight: 700;">${data.currentBalance.toLocaleString()} SF</p>
              <p style="margin: 8px 0 0 0; color: #b45309; font-size: 14px;">Warning threshold: ${data.warningThreshold.toLocaleString()} SF</p>
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 24px 0; color: #525252; font-size: 16px; line-height: 1.5;">
          To continue verifying new projects, please top up your square footage pool.
        </p>

        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center; padding: 8px 0;">
              <a href="${data.purchaseUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                Purchase More SF
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 24px; background-color: #f9fafb; text-align: center;">
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          MyMetalRoofer
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// ============================================
// EMAIL SENDING FUNCTIONS
// ============================================

const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@mymetalroofer.com";

/**
 * Send estimate email to client
 */
export async function sendEstimateEmail(
  data: EstimateEmailData,
  pdfBuffer?: Buffer
): Promise<EmailResult> {
  const client = await getResendClient();
  const html = generateEstimateEmailHTML(data);
  const subject = `Your Roofing Estimate for ${data.projectName}`;

  // If no client, log the email
  if (!client) {
    console.log("📧 [Email] Would send estimate email:", {
      to: data.recipientEmail,
      subject,
    });
    return { success: true, messageId: "logged" };
  }

  try {
    const options: EmailSendOptions = {
      from: `${data.companyName} <${FROM_EMAIL}>`,
      to: [data.recipientEmail],
      subject,
      html,
    };

    // Add PDF attachment if provided
    if (pdfBuffer) {
      options.attachments = [
        {
          filename: `Estimate_${data.projectName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ];
    }

    const { data: result, error } = await client.emails.send(options);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Send approval notification to team
 */
export async function sendApprovalNotification(
  data: ApprovalNotificationData
): Promise<EmailResult> {
  const client = await getResendClient();
  const html = generateApprovalEmailHTML(data);
  const subject = `Estimate Approved: ${data.projectName}`;

  if (!client) {
    console.log("📧 [Email] Would send approval notification:", {
      to: data.recipientEmail,
      subject,
    });
    return { success: true, messageId: "logged" };
  }

  try {
    const { data: result, error } = await client.emails.send({
      from: `${data.companyName} <${FROM_EMAIL}>`,
      to: [data.recipientEmail],
      subject,
      html,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Send SF pool low warning
 */
export async function sendSFPoolWarning(data: SFPoolWarningData): Promise<EmailResult> {
  const client = await getResendClient();
  const html = generateSFPoolWarningHTML(data);
  const subject = `Low SF Balance Alert: ${data.organizationName}`;

  if (!client) {
    console.log("📧 [Email] Would send SF pool warning:", {
      to: data.recipientEmail,
      subject,
    });
    return { success: true, messageId: "logged" };
  }

  try {
    const { data: result, error } = await client.emails.send({
      from: `MyMetalRoofer <${FROM_EMAIL}>`,
      to: [data.recipientEmail],
      subject,
      html,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Send team invite email
 */
export async function sendTeamInviteEmail(data: TeamInviteEmailData): Promise<EmailResult> {
  const client = await getResendClient();
  const subject = `You've been invited to join ${data.organizationName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 32px 24px; text-align: center; background-color: #2563eb;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Team Invitation</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px 24px;">
        <p style="margin: 0 0 24px 0; color: #525252; font-size: 16px; line-height: 1.5;">
          ${data.inviterName} has invited you to join <strong>${data.organizationName}</strong> as a <strong>${data.role}</strong>.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center; padding: 8px 0;">
              <a href="${data.inviteUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                Accept Invitation
              </a>
            </td>
          </tr>
        </table>
        ${
          data.expiresAt
            ? `<p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; text-align: center;">This invitation expires on ${new Date(data.expiresAt).toLocaleDateString()}</p>`
            : ""
        }
      </td>
    </tr>
    <tr>
      <td style="padding: 24px; background-color: #f9fafb; text-align: center;">
        <p style="margin: 0; color: #6b7280; font-size: 14px;">MyMetalRoofer</p>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  if (!client) {
    console.log("📧 [Email] Would send team invite:", {
      to: data.recipientEmail,
      subject,
    });
    return { success: true, messageId: "logged" };
  }

  try {
    const { data: result, error } = await client.emails.send({
      from: `MyMetalRoofer <${FROM_EMAIL}>`,
      to: [data.recipientEmail],
      subject,
      html,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
