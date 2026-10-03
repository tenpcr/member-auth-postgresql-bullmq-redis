import {
  Injectable,
  Logger,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import nodemailer, {
  type Transporter,
} from 'nodemailer';

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

  private readonly transporter: Transporter;

  private readonly fromEmail: string;

  constructor(
    private readonly config: ConfigService,
  ) {
    const host =
      this.config.getOrThrow<string>(
        'MAIL_HOST',
      );

    const port =
      this.config.getOrThrow<number>(
        'MAIL_PORT',
      );

    const user =
      this.config.getOrThrow<string>(
        'MAIL_USER',
      );

    const pass =
      this.config.getOrThrow<string>(
        'MAIL_PASS',
      );

    const secure =
      this.config.get<boolean>(
        'MAIL_SECURE',
        port === 465,
      );

    this.fromEmail =
      this.config.getOrThrow<string>(
        'EMAIL_FROM',
      );

    this.transporter =
      nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });

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
      const info =
        await this.transporter.sendMail({
          from: this.fromEmail,
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
        });

      this.logger.log(
        `Email sent: ${info.messageId} -> ${params.to}`,
      );

      return info;
    } catch (error: any) {
      this.logger.error(
        `Email failed for ${params.to}`,
        error?.stack ?? error,
      );

      throw error;
    }
  }
}