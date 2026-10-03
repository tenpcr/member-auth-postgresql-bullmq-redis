interface VerifyEmailTemplateParams {
  name?: string;
  verificationUrl: string;
}

export function getVerifyEmailTemplate(
  params: VerifyEmailTemplateParams,
) {
  const displayName = params.name || 'there';

  return {
    subject: 'Verify your email address',

    text: `
Hello ${displayName},

Please verify your email address by opening the link below:

${params.verificationUrl}

This link will expire after a limited period of time.

If you did not create this account, you can safely ignore this email.

Best regards,
ThaiUp
`.trim(),

    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Verify your email</title>
</head>

<body>
  <h2>Verify your email address</h2>

  <p>
    Hello ${displayName},
  </p>

  <p>
    Please verify your email address by clicking the button below.
  </p>

  <p>
    <a
      href="${params.verificationUrl}"
      target="_blank"
      rel="noopener noreferrer"
    >
      Verify Email
    </a>
  </p>

  <p>
    This link will expire after a limited period of time.
  </p>

  <p>
    If you did not create this account, you can safely ignore this email.
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