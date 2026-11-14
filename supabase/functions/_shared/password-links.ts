export function extractResetUrl(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return String(parsed?.tokenizedUrl ?? parsed?.resetUrl ?? parsed?.url ?? "").trim();
  } catch {
    return raw.trim();
  }
}

export function isHttpUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function requestPasswordLink(supabaseUrl: string, serviceRoleKey: string, email: string) {
  return fetch(`${supabaseUrl}/functions/v1/create-and-get-tokenized-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ email }),
  });
}

type EmailMessage = {
  From: string | undefined;
  To: string;
  Subject: string;
  HtmlBody: string;
  TextBody?: string;
};

export function sendPostmarkEmail(serverToken: string, message: EmailMessage) {
  return fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": serverToken,
    },
    body: JSON.stringify({ ...message, MessageStream: "outbound" }),
  });
}
