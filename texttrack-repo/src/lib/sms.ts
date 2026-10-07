// SMS segment math. Plain (GSM-7) texts fit 160 chars in one segment, 153 per
// segment once split. Any character outside the GSM set (an em dash, curly
// quotes, emoji) switches the WHOLE message to UCS-2: 70 chars in one segment,
// 67 per segment once split — which can double what a message costs.

const GSM =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà^{}\\[~]|€";
const GSM_SET = new Set(GSM.split(""));

export function smsInfo(text: string): { segments: number; encoding: "GSM" | "UCS2"; length: number } {
  const chars = Array.from(text);
  const unicode = chars.some((c) => !GSM_SET.has(c));
  const length = chars.length;
  if (unicode) return { encoding: "UCS2", length, segments: length <= 70 ? 1 : Math.ceil(length / 67) };
  return { encoding: "GSM", length, segments: length <= 160 ? 1 : Math.ceil(length / 153) };
}

// Swap the common "smart" characters for plain ones so a message stays GSM-7.
export function toGsmFriendly(text: string): string {
  return text
    .replace(/\s*[—–]\s*/g, " - ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/ /g, " ");
}
