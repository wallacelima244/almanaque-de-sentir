/* CONFIGURAÇÃO PÚBLICA DO ALMANAQUE DE SENTIR
 * A chave publishable é pública por design. A proteção é feita pelas regras RLS do Supabase.
 * NUNCA colocar nesta pasta: access token do Mercado Pago, service_role, senha ou PDF pago.
 */
window.ALMANAQUE_CONFIG = {
  SUPABASE_URL: 'https://ilpkqlhdulhjabgaqmgo.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_44XB6AhPxMU5fa0IZEKBbg_dZbE_KXc',
  // Somente habilite depois de criar e testar um servidor que valida preços,
  // confirma o pagamento com o Mercado Pago e libera o arquivo privado.
  // Exemplo: https://SEU-PROJETO.supabase.co/functions/v1/criar-checkout
  CHECKOUT_ENDPOINT: ''
};
