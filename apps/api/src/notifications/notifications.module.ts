import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service';
import { NotificationsProcessor } from './notifications.processor';

@Module({
  providers: [MailerService, NotificationsProcessor],
  exports: [NotificationsProcessor, MailerService],
})
export class NotificationsModule {}
