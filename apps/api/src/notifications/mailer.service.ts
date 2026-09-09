import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export type OutgoingMail = {
  from: string;
  to: string;
  subject: string;
  text: string;
};

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: Transporter;
  readonly mode: 'smtp' | 'json';

  constructor() {
    const host = process.env.SMTP_HOST;
    if (host) {
      this.mode = 'smtp';
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_PORT === '465',
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              }
            : undefined,
      });
    } else {
      this.mode = 'json';
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
    }
  }

  async send(mail: OutgoingMail) {
    const info = await this.transporter.sendMail({
      from: process.env.SMTP_FROM || mail.from,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
    });
    if (this.mode === 'json') {
      this.logger.log(`email dry-run to=${mail.to} subject=${mail.subject}`);
    }
    return info;
  }
}
