interface TurnstileVerifyResponse {
  success: boolean;
  [key: string]: unknown;
}

export async function verifyTurnstileToken(
  token: string,
  secretKey: string,
  remoteIp?: string,
): Promise<boolean> {
  const body = new FormData();
  body.set('secret', secretKey);
  body.set('response', token);
  if (remoteIp) body.set('remoteip', remoteIp);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });

  if (!response.ok) return false;
  const result = (await response.json()) as TurnstileVerifyResponse;
  return result.success === true;
}
