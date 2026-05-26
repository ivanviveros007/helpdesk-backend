import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('resend.apiKey'));
    this.frontendUrl = this.config.get<string>('frontend.url') ?? 'http://localhost:3000';
  }

  async sendInvitation(params: {
    email: string;
    org_nombre: string;
    token: string;
  }): Promise<void> {
    const { email, org_nombre, token } = params;
    const link = `${this.frontendUrl}/register?invite=${token}`;
    const apiKey = this.config.get<string>('resend.apiKey');
    this.logger.log(`[sendInvitation] to=${email} link=${link}`);
    this.logger.log(`[sendInvitation] RESEND_API_KEY present=${!!apiKey} length=${apiKey?.length ?? 0}`);
    try {
      const result = await this.resend.emails.send({
        from: 'HelpDesk AI <noreply@helpdesk-ai.cloud>',
        to: email,
        subject: `You've been invited to ${org_nombre} on HelpDesk AI`,
        html: this.buildInvitationHtml(email, org_nombre, link),
      });
      this.logger.log(`[sendInvitation] Resend response: ${JSON.stringify(result)}`);
    } catch (err) {
      this.logger.error(`[sendInvitation] FAILED for ${email}: ${JSON.stringify(err)}`);
      this.logger.error(err);
    }
  }

  async sendTicketAssigned(params: {
    tech: { nombre: string; email: string };
    ticket: {
      id: string;
      asunto: string;
      descripcion_raw: string;
      categoria: string | null;
      prioridad: number | null;
      nivel_asignado: number | null;
      razonamiento_ia: string | null;
      created_by_name: string | null;
    };
  }): Promise<void> {
    const { tech, ticket } = params;
    try {
      await this.resend.emails.send({
        from: 'HelpDesk AI <noreply@helpdesk-ai.cloud>',
        to: tech.email,
        subject: `🎫 New ticket assigned to you: ${ticket.asunto}`,
        html: this.buildAssignedHtml(tech, ticket),
      });
      this.logger.log(`Assignment email sent to ${tech.email} for ticket ${ticket.id}`);
    } catch (err) {
      this.logger.error(`Failed to send assignment email to ${tech.email}`, err);
    }
  }

  async sendTicketAssignedToUser(params: {
    user: { nombre: string; email: string };
    ticket: { id: string; asunto: string; prioridad: number | null; nivel_asignado: number | null };
    tech: { nombre: string };
  }): Promise<void> {
    const { user, ticket, tech } = params;
    try {
      await this.resend.emails.send({
        from: 'HelpDesk AI <noreply@helpdesk-ai.cloud>',
        to: user.email,
        subject: `🎫 Tu ticket fue asignado: ${ticket.asunto}`,
        html: this.buildAssignedToUserHtml(user, ticket, tech),
      });
      this.logger.log(`User assignment email sent to ${user.email} for ticket ${ticket.id}`);
    } catch (err) {
      this.logger.error(`Failed to send user assignment email to ${user.email}`, err);
    }
  }

  async sendInactivityAlert(params: {
    to: { nombre: string; email: string };
    ticket: { id: string; asunto: string };
    type: 'user_pending' | 'admin_not_started';
  }): Promise<void> {
    const { to, ticket, type } = params;
    const subject = type === 'user_pending'
      ? `⏰ Tu ticket espera tu respuesta: ${ticket.asunto}`
      : `⚠️ Ticket sin iniciar hace 48hs: ${ticket.asunto}`;
    const body = type === 'user_pending'
      ? `Hola <strong>${esc(to.nombre)}</strong>,<br><br>Uno de tus tickets lleva más de 48 horas esperando tu respuesta.<br><br><strong>${esc(ticket.asunto)}</strong>`
      : `Hola <strong>${esc(to.nombre)}</strong>,<br><br>El ticket <strong>${esc(ticket.asunto)}</strong> fue asignado hace más de 48 horas y aún no fue iniciado.`;
    try {
      await this.resend.emails.send({
        from: 'HelpDesk AI <noreply@helpdesk-ai.cloud>',
        to: to.email,
        subject,
        html: `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#374151;padding:32px">${body}<br><br><a href="${this.frontendUrl}" style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px">Ver ticket →</a></body></html>`,
      });
      this.logger.log(`Inactivity alert (${type}) sent to ${to.email} for ticket ${ticket.id}`);
    } catch (err) {
      this.logger.error(`Failed to send inactivity alert to ${to.email}`, err);
    }
  }

  async sendTicketResolved(params: {
    user: { nombre: string; email: string };
    ticket: { id: string; asunto: string };
  }): Promise<void> {
    const { user, ticket } = params;
    try {
      await this.resend.emails.send({
        from: 'HelpDesk AI <noreply@helpdesk-ai.cloud>',
        to: user.email,
        subject: `✅ Your ticket has been resolved: ${ticket.asunto}`,
        html: this.buildResolvedHtml(user, ticket),
      });
      this.logger.log(`Resolution email sent to ${user.email} for ticket ${ticket.id}`);
    } catch (err) {
      this.logger.error(`Failed to send resolution email to ${user.email}`, err);
    }
  }

  private buildInvitationHtml(email: string, org_nombre: string, link: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <tr>
          <td style="background:#4f46e5;padding:24px 32px">
            <p style="margin:0;color:#c7d2fe;font-size:13px;font-weight:500">HelpDesk AI</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700">You've been invited</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 16px;color:#374151;font-size:15px">You've been invited to join <strong>${esc(org_nombre)}</strong> on HelpDesk AI.</p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6">Click the button below to create your account. This link expires in 7 days.</p>
            <a href="${link}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">Accept Invitation →</a>
            <p style="margin:24px 0 0;font-size:12px;color:#9ca3af">Or copy this link: ${link}</p>
          </td>
        </tr>
        <tr>
          <td style="border-top:1px solid #f3f4f6;padding:16px 32px;text-align:center">
            <p style="margin:0;font-size:12px;color:#9ca3af">HelpDesk AI · This invitation was sent to ${esc(email)}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private buildAssignedHtml(
    tech: { nombre: string },
    ticket: {
      asunto: string;
      descripcion_raw: string;
      categoria: string | null;
      prioridad: number | null;
      nivel_asignado: number | null;
      razonamiento_ia: string | null;
      created_by_name: string | null;
    },
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <!-- Header -->
        <tr>
          <td style="background:#4f46e5;padding:24px 32px">
            <p style="margin:0;color:#c7d2fe;font-size:13px;font-weight:500">HelpDesk AI</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700">New Ticket Assigned</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 16px;color:#374151;font-size:15px">Hi <strong>${esc(tech.nombre)}</strong>, you have a new ticket assigned by AI:</p>
            <!-- Ticket card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px">
              <tr><td style="padding:20px">
                <p style="margin:0 0 12px;font-size:17px;font-weight:700;color:#111827">${esc(ticket.asunto)}</p>
                <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.5">${esc(ticket.descripcion_raw.slice(0, 300))}${ticket.descripcion_raw.length > 300 ? '…' : ''}</p>
                <table cellpadding="0" cellspacing="0">
                  ${ticket.categoria ? `<tr><td style="padding:2px 10px 2px 0;font-size:13px;color:#6b7280;white-space:nowrap">Category</td><td style="padding:2px 0;font-size:13px;font-weight:600;color:#111827">${esc(ticket.categoria)}</td></tr>` : ''}
                  ${ticket.prioridad != null ? `<tr><td style="padding:2px 10px 2px 0;font-size:13px;color:#6b7280;white-space:nowrap">Priority</td><td style="padding:2px 0;font-size:13px;font-weight:600;color:#111827">${ticket.prioridad}/10</td></tr>` : ''}
                  ${ticket.nivel_asignado != null ? `<tr><td style="padding:2px 10px 2px 0;font-size:13px;color:#6b7280;white-space:nowrap">Level</td><td style="padding:2px 0;font-size:13px;font-weight:600;color:#111827">Level ${ticket.nivel_asignado}</td></tr>` : ''}
                  ${ticket.created_by_name ? `<tr><td style="padding:2px 10px 2px 0;font-size:13px;color:#6b7280;white-space:nowrap">Submitted by</td><td style="padding:2px 0;font-size:13px;font-weight:600;color:#111827">${esc(ticket.created_by_name)}</td></tr>` : ''}
                </table>
              </td></tr>
              ${ticket.razonamiento_ia ? `
              <tr><td style="border-top:1px solid #e5e7eb;padding:16px 20px;background:#f0f9ff">
                <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#0369a1;text-transform:uppercase;letter-spacing:.05em">AI Reasoning</p>
                <p style="margin:0;font-size:13px;color:#0c4a6e;line-height:1.5">${esc(ticket.razonamiento_ia)}</p>
              </td></tr>` : ''}
            </table>
            <a href="${this.frontendUrl}/technician" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">View Ticket →</a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #f3f4f6;padding:16px 32px;text-align:center">
            <p style="margin:0;font-size:12px;color:#9ca3af">HelpDesk AI · You received this because you are an assigned technician</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private buildAssignedToUserHtml(
    user: { nombre: string },
    ticket: { asunto: string; prioridad: number | null; nivel_asignado: number | null },
    tech: { nombre: string },
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <tr>
          <td style="background:#4f46e5;padding:24px 32px">
            <p style="margin:0;color:#c7d2fe;font-size:13px;font-weight:500">HelpDesk AI</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700">🎫 Ticket Assigned</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 16px;color:#374151;font-size:15px">Hola <strong>${esc(user.nombre)}</strong>,</p>
            <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">Tu ticket fue asignado a un técnico y está siendo atendido:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;margin-bottom:24px">
              <tr><td style="padding:20px">
                <p style="margin:0;font-size:16px;font-weight:700;color:#111827">${esc(ticket.asunto)}</p>
                <p style="margin:12px 0 0;font-size:13px;color:#6b7280">Técnico asignado: <strong style="color:#4f46e5">${esc(tech.nombre)}</strong></p>
                ${ticket.nivel_asignado ? `<p style="margin:6px 0 0;font-size:13px;color:#6b7280">Nivel: <strong>${ticket.nivel_asignado}</strong></p>` : ''}
                ${ticket.prioridad ? `<p style="margin:6px 0 0;font-size:13px;color:#6b7280">Prioridad: <strong>${ticket.prioridad}/10</strong></p>` : ''}
              </td></tr>
            </table>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6">Podés hacer seguimiento de tu ticket en el portal.</p>
            <a href="${this.frontendUrl}/client/my-tickets" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">Ver mis tickets →</a>
          </td>
        </tr>
        <tr>
          <td style="border-top:1px solid #f3f4f6;padding:16px 32px;text-align:center">
            <p style="margin:0;font-size:12px;color:#9ca3af">HelpDesk AI · Recibiste este email porque creaste un ticket de soporte</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private buildResolvedHtml(
    user: { nombre: string },
    ticket: { asunto: string },
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <!-- Header -->
        <tr>
          <td style="background:#16a34a;padding:24px 32px">
            <p style="margin:0;color:#bbf7d0;font-size:13px;font-weight:500">HelpDesk AI</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700">✅ Ticket Resolved</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 16px;color:#374151;font-size:15px">Hi <strong>${esc(user.nombre)}</strong>,</p>
            <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">Your support ticket has been resolved by our team. Here's a summary:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:24px">
              <tr><td style="padding:20px">
                <p style="margin:0;font-size:16px;font-weight:700;color:#111827">${esc(ticket.asunto)}</p>
                <p style="margin:8px 0 0;font-size:13px;color:#16a34a;font-weight:600">Status: Resolved ✓</p>
              </td></tr>
            </table>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6">If you have further questions or the issue persists, please don't hesitate to open a new ticket.</p>
            <a href="${this.frontendUrl}/client/my-tickets" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">View My Tickets →</a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #f3f4f6;padding:16px 32px;text-align:center">
            <p style="margin:0;font-size:12px;color:#9ca3af">HelpDesk AI · You received this because you submitted a support ticket</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
