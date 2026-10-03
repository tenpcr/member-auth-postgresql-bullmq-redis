import {
  Injectable,
} from '@nestjs/common';

import {
  InjectQueue,
} from '@nestjs/bullmq';

import {
  Queue,
} from 'bullmq';

export interface WelcomeEmailJob {
  type: 'welcome';
  to: string;
  name?: string;
}

export interface VerifyEmailJob {
  type: 'verify-email';
  to: string;
  name?: string;
  verificationUrl: string;
}

export interface ResetPasswordEmailJob {
  type: 'reset-password';
  to: string;
  name?: string;
  resetUrl: string;
}

export interface PasswordChangedEmailJob {
  type: 'password-changed';
  to: string;
  name?: string;
}

export type EmailJob =
  | WelcomeEmailJob
  | VerifyEmailJob
  | ResetPasswordEmailJob
  | PasswordChangedEmailJob;

@Injectable()
export class EmailProducer {
  constructor(
    @InjectQueue('email')
    private readonly emailQueue: Queue,
  ) {}

  /**
   * Queue a welcome email.
   */
 async sendWelcomeEmail(
  data: Omit<WelcomeEmailJob, 'type'>,
) {
  console.log('[EmailProducer] Sending welcome email:', data);

  const job = await this.emailQueue.add(
    'welcome',
    {
      type: 'welcome',
      ...data,
    },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: {
        age: 60 * 60,
      },
      removeOnFail: {
        age: 24 * 60 * 60,
      },
    },
  );

  console.log('[EmailProducer] Job created:', {
    id: job.id,
    name: job.name,
  });

  return job;
}

  /**
   * Queue an email verification message.
   */
  async sendVerifyEmail(
    data: Omit<VerifyEmailJob, 'type'>,
  ) {
    return this.emailQueue.add(
      'verify-email',
      {
        type: 'verify-email',
        ...data,
      },
      {
        attempts: 3,

        backoff: {
          type: 'exponential',
          delay: 5000,
        },

        removeOnComplete: {
          age: 60 * 60,
        },

        removeOnFail: {
          age: 24 * 60 * 60,
        },
      },
    );
  }

  /**
   * Queue a password reset email.
   */
  async sendResetPasswordEmail(
    data: Omit<ResetPasswordEmailJob, 'type'>,
  ) {
    return this.emailQueue.add(
      'reset-password',
      {
        type: 'reset-password',
        ...data,
      },
      {
        attempts: 3,

        backoff: {
          type: 'exponential',
          delay: 5000,
        },

        removeOnComplete: {
          age: 60 * 60,
        },

        removeOnFail: {
          age: 24 * 60 * 60,
        },
      },
    );
  }

  /**
   * Queue a password changed notification.
   */
  async sendPasswordChangedEmail(
    data: Omit<PasswordChangedEmailJob, 'type'>,
  ) {
    return this.emailQueue.add(
      'password-changed',
      {
        type: 'password-changed',
        ...data,
      },
      {
        attempts: 3,

        backoff: {
          type: 'exponential',
          delay: 5000,
        },

        removeOnComplete: {
          age: 60 * 60,
        },

        removeOnFail: {
          age: 24 * 60 * 60,
        },
      },
    );
  }
}