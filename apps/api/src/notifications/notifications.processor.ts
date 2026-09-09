import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { NotificationType } from '@turnero/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildAppointmentEmail } from './email-templates';
import { MailerService } from './mailer.service';
import { bumpEmailRetry } from './retry';

const TICK_MS = 4000;

@Injectable()
export class NotificationsProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsProcessor.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.processPending().catch((err: Error) =>
        this.logger.error(err.stack ?? err.message),
      );
    }, TICK_MS);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async processPending() {
    if (this.running) {
      return { processed: 0 };
    }
    this.running = true;
    try {
      const jobs = await this.prisma.notificationJob.findMany({
        where: { status: 'PENDING', channel: 'EMAIL' },
        orderBy: { createdAt: 'asc' },
        take: 25,
      });
      let processed = 0;
      for (const job of jobs) {
        await this.processOne(job.id);
        processed += 1;
      }
      return { processed };
    } finally {
      this.running = false;
    }
  }

  async processOne(id: string) {
    const job = await this.prisma.notificationJob.findUnique({
      where: { id },
    });
    if (!job || job.status !== 'PENDING') {
      return;
    }
    try {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: job.appointmentId },
        include: {
          client: true,
          professional: true,
          branch: true,
          company: true,
        },
      });
      if (!appointment) {
        throw new Error('Turno inexistente');
      }
      const to = appointment.client.email;
      if (!to) {
        throw new Error('El cliente no tiene email');
      }
      const mail = buildAppointmentEmail({
        type: job.type as NotificationType,
        companyName: appointment.company.name,
        clientFirstName: appointment.client.firstName,
        serviceName: appointment.serviceNameSnapshot,
        professionalName: appointment.professional.displayName,
        branchName: appointment.branch.name,
        startAt: appointment.startAt,
        timeZone: appointment.company.timezone,
      });
      await this.mailer.send({
        from: appointment.company.contactEmail,
        to,
        subject: mail.subject,
        text: mail.text,
      });
      await this.prisma.notificationJob.update({
        where: { id: job.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          error: null,
          payload: {
            to,
            type: job.type,
            subject: mail.subject,
            mode: this.mailer.mode,
          },
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`job ${id} failed: ${message}`);
      const next = bumpEmailRetry(job.payload);
      await this.prisma.notificationJob.update({
        where: { id },
        data: {
          status: next.giveUp ? 'FAILED' : 'PENDING',
          error: message.slice(0, 500),
          payload: next.payload as Prisma.InputJsonValue,
        },
      });
    }
  }
}
