/** Default transactional emails. Super Admin can override them in Email Templates. */
export const DEFAULT_TEMPLATES = [
  {
    key: "welcome",
    name: "Welcome / account created",
    subject: "Welcome to {{brand}}, {{name}} 🎉",
    html: `<h2 style="margin-top:0">Your canteen is ready</h2>
    <p>Hi {{name}},</p>
    <p>Your <b>{{tenant}}</b> workspace has been created on the <b>{{plan}}</b> plan. Your free trial runs until <b>{{trialEnds}}</b>.</p>
    <p><a href="{{consoleUrl}}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Open your dashboard</a></p>
<p>Quick start: 1) add meal sessions & menu 2) import employees 3) share the mobile app with employees.</p>`,
  },
  {
    key: "trial_ending",
    name: "Trial ending soon",
    subject: "Your {{brand}} trial ends in {{days}} day(s)",
    html: `<p>Hi {{name}},</p><p>The free trial for <b>{{tenant}}</b> ends on <b>{{endDate}}</b>. Choose a plan to keep your canteen running without interruption.</p>
<p><a href="{{billingUrl}}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Choose a plan</a></p>`,
  },
  {
    key: "renewal_reminder",
    name: "Subscription renewal reminder",
    subject: "Renewal reminder: {{plan}} plan expires on {{endDate}}",
    html: `<p>Hi {{name}},</p><p>Your <b>{{plan}}</b> subscription for <b>{{tenant}}</b> expires in <b>{{days}} day(s)</b> on {{endDate}}.</p>
<p>Renew now to avoid any disruption at your canteen counters.</p>
<p><a href="{{billingUrl}}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Renew subscription</a></p>`,
  },
  {
    key: "subscription_expired",
    name: "Subscription expired",
    subject: "Your {{brand}} subscription has expired",
    html: `<p>Hi {{name}},</p><p>The subscription for <b>{{tenant}}</b> expired on {{endDate}}. Your data is safe — renew to restore access for your team and employees.</p>
<p><a href="{{billingUrl}}" style="display:inline-block;background:#b91c1c;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Renew now</a></p>`,
  },
  {
    key: "payment_success",
    name: "Payment received",
    subject: "Payment received — Invoice {{invoiceNo}}",
    html: `<p>Hi {{name}},</p><p>We received your payment of <b>{{amount}}</b> for the <b>{{plan}}</b> plan ({{cycle}}).</p>
<p>Your subscription is active until <b>{{endDate}}</b>.</p><p>Invoice no: {{invoiceNo}}<br/>Payment id: {{paymentId}}</p>`,
  },
  {
    key: "daily_report",
    name: "Daily canteen report",
    subject: "{{tenant}} — daily report for {{date}}",
    html: `<p>Hi {{name}}, here is your canteen summary for <b>{{date}}</b>:</p>
<table cellpadding="8" style="border-collapse:collapse;width:100%">
<tr><td style="border-bottom:1px solid #e2e8f0">Meals served</td><td style="border-bottom:1px solid #e2e8f0;text-align:right"><b>{{meals}}</b></td></tr>
<tr><td style="border-bottom:1px solid #e2e8f0">Collected from employees/guests</td><td style="border-bottom:1px solid #e2e8f0;text-align:right"><b>{{revenue}}</b></td></tr>
<tr><td style="border-bottom:1px solid #e2e8f0">Billable to client (subsidy)</td><td style="border-bottom:1px solid #e2e8f0;text-align:right"><b>{{subsidy}}</b></td></tr>
<tr><td style="border-bottom:1px solid #e2e8f0">Guests served</td><td style="border-bottom:1px solid #e2e8f0;text-align:right"><b>{{guests}}</b></td></tr>
<tr><td style="border-bottom:1px solid #e2e8f0">Opted-in vs served</td><td style="border-bottom:1px solid #e2e8f0;text-align:right"><b>{{optedIn}} / {{meals}}</b></td></tr>
<tr><td>Food waste logged</td><td style="text-align:right"><b>{{waste}} kg</b></td></tr>
</table>
<p><b>By session:</b> {{sessions}}</p>
<p><a href="{{consoleUrl}}">Open dashboard →</a></p>`,
  },
  {
    key: "low_stock",
    name: "Low stock alert",
    subject: "Low stock alert — {{count}} item(s) below reorder level",
    html: `<p>Hi {{name}},</p><p>These ingredients are at or below reorder level:</p>{{itemsHtml}}<p><a href="{{consoleUrl}}/inventory">Open inventory →</a></p>`,
  },
  {
    key: "password_reset",
    name: "Password reset",
    subject: "Reset your {{brand}} password",
    html: `<p>Hi {{name}},</p><p>Use the link below to reset your password. It expires in 30 minutes.</p>
<p><a href="{{resetUrl}}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Reset password</a></p>
<p>If you didn't request this, ignore this email.</p>`,
  },
  {
    key: "staff_invite",
    name: "Team member invited",
    subject: "You've been added to {{tenant}} on {{brand}}",
    html: `<p>Hi {{name}},</p><p>{{inviter}} added you as <b>{{role}}</b> for <b>{{tenant}}</b>.</p>
<p>Login: {{email}}<br/>Temporary password: <b>{{password}}</b></p>
<p><a href="{{consoleUrl}}">Sign in →</a> (please change your password after signing in)</p>`,
  },
  {
    key: "lead_received",
    name: "New lead (to platform team)",
    subject: "New {{type}} request from {{name}} ({{company}})",
    html: `<p><b>{{name}}</b> — {{email}} — {{phone}}</p><p>Company: {{company}} · Employees: {{employees}}</p><p>{{message}}</p>`,
  },
];
