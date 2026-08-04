/**
 * Abre o WhatsApp de forma confiável, inclusive dentro de iframes de preview
 * (onde `window.open` para api.whatsapp.com pode ser bloqueado).
 */
export function openWhatsApp(numero: string, mensagem: string) {
  const url = `https://wa.me/${numero.replace(/\D/g, "")}?text=${encodeURIComponent(mensagem)}`;
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return url;
}
