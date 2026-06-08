// Public landing-page contact. NEXT_PUBLIC_* ships in the browser bundle (visible
// by design — it's a clickable CTA), env only for config, not secrecy.
// wa.me format: country code, no "+" and no leading 0 (e.g. 212716862175).
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? "";
const WHATSAPP_PREFILL = "Bonjour Ayoub, je suis intéressé(e) par Jisr.";

export const CONTACT_WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_PREFILL)}`;
export const CONTACT_PHONE_DISPLAY =
  process.env.NEXT_PUBLIC_CONTACT_PHONE_DISPLAY ?? "";
export const CONTACT_PHONE_TEL = WHATSAPP_NUMBER ? `+${WHATSAPP_NUMBER}` : "";
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@jisr.ma";
