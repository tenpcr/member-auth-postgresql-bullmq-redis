interface PasswordChangedEmailTemplateParams {
  name?: string;
}

export function getPasswordChangedEmailTemplate(
  params: PasswordChangedEmailTemplateParams,
) {
  const displayName = params.name || 'there';

  return {
    subject: 'Your password has been changed',

    text: `
Hello ${displayName},

Your account password has been changed successfully.

If you did not make this change, please contact support immediately.

Best regards,
TenPCR
`.trim(),

    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Password changed</title>
</head>

<body>
  <h2>Your password has been changed</h2>

  <p>
    Hello ${displayName},
  </p>

  <p>
    Your account password has been changed successfully.
  </p>

  <p>
    If you did not make this change, please contact support immediately.
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