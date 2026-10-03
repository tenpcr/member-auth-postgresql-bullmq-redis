interface ResetPasswordEmailTemplateParams {
  name?: string;
  resetUrl: string;
}

export function getResetPasswordEmailTemplate(
  params: ResetPasswordEmailTemplateParams,
) {
  const displayName = params.name || 'there';

  return {
    subject: 'Reset your password',

    text: `
Hello ${displayName},

We received a request to reset your password.

Open the link below to create a new password:

${params.resetUrl}

This link will expire after a limited period of time.

If you did not request a password reset, you can safely ignore this email.

Best regards,
ThaiUp
`.trim(),

    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reset your password</title>
</head>

<body>
  <h2>Reset your password</h2>

  <p>
    Hello ${displayName},
  </p>

  <p>
    We received a request to reset your password.
  </p>

  <p>
    Click the button below to create a new password.
  </p>

  <p>
    <a
      href="${params.resetUrl}"
      target="_blank"
      rel="noopener noreferrer"
    >
      Reset Password
    </a>
  </p>

  <p>
    This link will expire after a limited period of time.
  </p>

  <p>
    If you did not request a password reset, you can safely ignore this email.
  </p>

  <p>
    Best regards,<br>
    TenPCR
  </p>
</body>
</html>
`.trim(),
  };
}