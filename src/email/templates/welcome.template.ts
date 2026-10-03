interface WelcomeEmailTemplateParams {
  name?: string;
}

export function getWelcomeEmailTemplate(
  params: WelcomeEmailTemplateParams,
) {
  const displayName = params.name || 'there';

  return {
    subject: 'Welcome to our platform',

    text: `
Hello ${displayName},

Welcome to our platform.

Your account has been successfully created.

Thank you for joining us.

Best regards,
ThaiUp
`.trim(),

    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Welcome</title>
</head>

<body>
  <h2>Welcome, ${displayName}!</h2>

  <p>
    Your account has been successfully created.
  </p>

  <p>
    Thank you for joining us.
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