import {
  Injectable,
  Logger,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import sgMail from '@sendgrid/mail';

import {
  getWelcomeEmailTemplate,
} from '@/email/templates/welcome.template.js';

import {
  getVerifyEmailTemplate,
} from '@/email/templates/verify-email.template.js';

import {
  getResetPasswordEmailTemplate,
} from '@/email/templates/reset-password.template.js';

import {
  getPasswordChangedEmailTemplate,
} from '@/email/templates/password-changed.template.js';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(
    EmailService.name,
  );

  private readonly fromEmail: string;

  constructor(
    private readonly config: ConfigService,
  ) {
    const apiKey =
      this.config.getOrThrow<string>(
        'SENDGRID_API_KEY',
      );

    this.fromEmail =
      this.config.getOrThrow<string>(
        'EMAIL_FROM',
      );

    sgMail.setApiKey(apiKey);

    this.logger.log(
      `EmailService initialized: ${this.fromEmail}`,
    );
  }

  async sendWelcomeEmail(
    to: string,
    name?: string,
  ) {
    const template =
      getWelcomeEmailTemplate({
        name,
      });

    return this.send({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendVerifyEmail(
    to: string,
    name: string | undefined,
    verificationUrl: string,
  ) {
    const template =
      getVerifyEmailTemplate({
        name,
        verificationUrl,
      });

    return this.send({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendResetPasswordEmail(
    to: string,
    name: string | undefined,
    resetUrl: string,
  ) {
    const template =
      getResetPasswordEmailTemplate({
        name,
        resetUrl,
      });

    return this.send({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendPasswordChangedEmail(
    to: string,
    name?: string,
  ) {
    const template =
      getPasswordChangedEmailTemplate({
        name,
      });

    return this.send({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  private async send(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }) {
    this.logger.log(
      `Sending email: ${this.fromEmail} -> ${params.to}`,
    );

    try {
      const [response] =
        await sgMail.send({
          from: this.fromEmail,
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
        });

      this.logger.log(
        `SendGrid response: ${response.statusCode} -> ${params.to}`,
      );

      return response;
    } catch (error: any) {
      this.logger.error(
        `SendGrid failed for ${params.to}`,
        error?.response?.body
          ? JSON.stringify(
              error.response.body,
            )
          : error?.stack,
      );

      throw error;
    }
  }
}