/**
 * Configuração do selo "Powered by" (indicação / PLG).
 * Troque PARTNER_URL pela sua página de vendas, formulário ou WhatsApp comercial.
 * Ex.: "https://wa.me/5511999999999" ou "https://digitalsolutions.com.br"
 */
export const PARTNER_NAME = "Digital Solutions";
export const PARTNER_URL = "https://digitalsolutions.com.br";
export const PARTNER_LABEL = `Plataforma powered by ${PARTNER_NAME}`;
export const PARTNER_CTA = "Crie a sua também";

/** Slug simples usado como identificador da indicação (ref). */
export function toRefSlug(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48) || "cliente"
  );
}

/**
 * Monta o link de indicação com UTMs, identificando qual mentor/plataforma
 * originou o clique (ex.: ?ref=guerreiros_mentoria).
 */
export function buildPartnerUrl(platformName: string) {
  const ref = toRefSlug(platformName);
  try {
    const url = new URL(PARTNER_URL);
    url.searchParams.set("ref", ref);
    url.searchParams.set("utm_source", "plataforma_mentoria");
    url.searchParams.set("utm_medium", "powered_by_badge");
    url.searchParams.set("utm_campaign", ref);
    return url.toString();
  } catch {
    return PARTNER_URL;
  }
}
