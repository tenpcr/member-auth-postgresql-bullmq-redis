import {
  Logger,
} from '@nestjs/common';

import {
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';

import {
  Job,
} from 'bullmq';

import {
  EmailService,
} from '@/email/email.service.js';

import {
  EmailJob,
} from '@/queue/email.producer.js';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(
    EmailProcessor.name,
  );

  constructor(
    private readonly emailService: EmailService,
  ) {
    super();

      this.logger.log('EmailProcessor initialized');
  }

  /**
   * Process email jobs from the queue.
   */
  async process(
    job: Job<EmailJob>,
  ) {
    this.logger.log(
      `Processing email job: ${job.name} (${job.id})`,
    );

    switch (job.data.type) {
      case 'welcome':
        await this.emailService.sendWelcomeEmail(
          job.data.to,
          job.data.name,
        );
        break;

      case 'verify-email':
        await this.emailService.sendVerifyEmail(
          job.data.to,
          job.data.name,
          job.data.verificationUrl,
        );
        break;

      case 'reset-password':
        await this.emailService.sendResetPasswordEmail(
          job.data.to,
          job.data.name,
          job.data.resetUrl,
        );
        break;

      case 'password-changed':
        await this.emailService.sendPasswordChangedEmail(
          job.data.to,
          job.data.name,
        );
        break;

      default:
        throw new Error(
          `Unsupported email job type: ${String(
            job.data,
          )}`,
        );
    }

    this.logger.log(
      `Email job completed: ${job.id}`,
    );
  }

  /**
   * Handle failed jobs.
   */
  async onFailed(
    job: Job<EmailJob> | undefined,
    error: Error,
  ) {
    this.logger.error(
      `Email job failed: ${job?.id ?? 'unknown'}`,
      error.stack,
    );
  }
}