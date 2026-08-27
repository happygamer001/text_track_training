import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSms({ to, body }: { to: string; body: string }) {
  // TODO: wrap in try/catch and log failures to DeliveryLog once that write
  // path is built out — for now this just sends and lets errors bubble up.
  return client.messages.create({
    to,
    body,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
  });
}
