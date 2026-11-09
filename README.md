# Almanaque de Sentir

Site comercial de pensamentos, reflexões, fé e produtos digitais. Projeto original em Next.js 16, React 19, TypeScript, Supabase e Mercado Pago Checkout Pro.

## O que foi entregue

- Site editorial responsivo, com identidade vintage, SEO e compartilhamento social.
- Experiência **Uma palavra especial te espera**: pergaminho, pena animada, seleção de sentimentos, revelação letra por letra, compartilhamento e imagem para baixar.
- Vitrine de produtos digitais: pensamentos especiais a R$ 2,99, coleção por R$ 14,90 e e-book por R$ 24,90 (valores de teste comercial).
- Conteúdo real já cadastrado no projeto Supabase Almanaque de Sentir: 10 pensamentos gratuitos, 2 pensamentos individuais premium, 30 capítulos no e-book e 12 desses capítulos na coleção. Todos os conteúdos são originais, com reflexões de fé que indicam a passagem inspiradora, **sem reproduzir integralmente versões bíblicas protegidas**.
- Checkout Mercado Pago preparado com preferências de pagamento.
- Webhook validado por HMAC que consulta pagamento diretamente na API do Mercado Pago e exige igualdade de valor, moeda e referência antes de atualizar a compra.
- Área Minha biblioteca que verifica pagamento aprovado no banco e gera PDF personalizado do produto ao baixar.
- Painel administrativo seguro com login Supabase Auth, permissões via tabela `admin_users`, cadastro/edição de pensamentos, produtos, preços, associações e pedidos.
- Banco com RLS; conteúdo premium separado dos trechos públicos.

## 1. Publicar no Vercel

1. Extraia a pasta do ZIP em um diretório local e abra com VS Code.
2. Envie os arquivos para um **novo repositório do GitHub**, preferencialmente privado.
3. Na Vercel, clique em **Add New > Project**, importe o repositório; ela detectará Next.js.
4. Em **Settings > Environment Variables**, cadastre as variáveis abaixo. Não coloque senhas/chaves secretas no GitHub.
5. Faça o primeiro deploy. O site funciona em modo de visualização pública enquanto o checkout estiver desativado.

## 2. Variáveis de ambiente

Copie `.env.example` para `.env.local` em seu computador ou preencha diretamente na Vercel:

| Variável | Onde encontrar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto `ilpkqlhdulhjabgaqmgo` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase > Settings / API Keys > publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Settings / API Keys > Secret Key / service_role (somente no servidor) |
| `NEXT_PUBLIC_SITE_URL` | URL HTTPS final do site na Vercel, sem barra final |
| `MP_ACCESS_TOKEN` | Mercado Pago Developers > sua aplicação > Credenciais de produção |
| `MP_WEBHOOK_SECRET` | Mercado Pago Developers > Webhooks > assinatura secreta |
| `NEXT_PUBLIC_CHECKOUT_ENABLED` | `false` até concluir os testes; depois `true` |

**Importante:** as chaves secretas do Mercado Pago e do Supabase nunca devem começar com `NEXT_PUBLIC_`. Nunca envie prints dessas chaves no chat ou as suba ao GitHub. Se houver exposição, revogue e substitua imediatamente.

## 3. Primeiro administrador

O painel `/admin` não tem usuário ou senha padrão, de propósito. O acesso só deve ser liberado ao responsável.

1. No **Supabase > Authentication > Users**, crie ou convide o usuário que administrará a loja usando o e-mail pessoal do responsável.
2. Copie o `User UID` gerado para esse usuário.
3. No **SQL Editor** do projeto Almanaque de Sentir, execute:

```sql
insert into public.admin_users (user_id)
values ('COLE-AQUI-O-UUID-DO-USUARIO')
on conflict (user_id) do nothing;
```

4. Entre no `/admin` com o e-mail e a senha cadastrados no Supabase Auth.
5. Edite os textos, produtos e preços. Não ative os produtos até os testes do checkout passarem.

A administração só funciona para `auth.users.id` presente em `admin_users`. O cadastro é feito no servidor, nunca pela interface pública.

## 4. Ativar Mercado Pago

1. Sua mãe deve entrar em [Mercado Pago Developers](https://www.mercadopago.com.br/developers/) com a conta que receberá as vendas.
2. Crie uma aplicação de pagamento **Checkout Pro**.
3. Configure o Webhook de **Pagamentos** na URL `https://SEU-DOMINIO.vercel.app/api/webhook/mercadopago` (HTTPS obrigatório) e obtenha a assinatura secreta.
4. Preencha `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET` nas variáveis de ambiente. Confira também a URL final em `NEXT_PUBLIC_SITE_URL`.
5. Faça o deploy e valide o Webhook pelas ferramentas de teste do Mercado Pago.
6. Teste todo o ciclo com credenciais de teste compatíveis, inclusive valores, aprovação, pendência e falha.
7. Só depois altere `NEXT_PUBLIC_CHECKOUT_ENABLED=true` e, no painel `/admin`, ative os produtos prontos.
8. Teste novamente a compra real de um produto de menor valor, a emissão de PDF e o registro do pedido.

**Como funciona**: `/api/checkout` consulta preço real no servidor, registra pedido pendente, cria preferência no Mercado Pago, redireciona ao Checkout Pro. `/api/webhook/mercadopago` verifica HMAC, consulta o pagamento no Mercado Pago e só confirma se valor, moeda e referência batem. `/biblioteca` verifica a compra pelo código privado retornado no início da transação e permite visualizar/baixar os capítulos em PDF.

### Recuperação do acesso

A biblioteca guarda o acesso no navegador e fornece um botão **Copiar dados de acesso**, que o cliente deve salvar em local seguro. Este pacote **não envia e-mail de confirmação**: isso exige integração adicional com provedor de e-mails transacionais (por exemplo Resend), domínio verificado e consentimentos apropriados. Para uma operação comercial com grande volume, recomendamos ativar essa etapa antes da divulgação em massa.

## 5. Supabase e segurança

O projeto Supabase Almanaque de Sentir foi criado e o esquema, dados de exemplo e RLS foram cadastrados. O banco do Mercado Souza não foi modificado. A Dom Ruiz foi pausada, não apagada.

- `categories`: categorias de pensamentos.
- `thoughts` + `thought_contents`: prévias públicas e textos (o corpo premium não é consultável por visitantes).
- `products`, `product_thoughts`, `product_assets`: catálogo e capítulos associados aos produtos.
- `orders`, `order_items`: pedidos.
- `access_grants`: estrutura futura para concessões individualizadas.
- `admin_users`: identificadores autorizados a administrar.

O checkout usa `orders.checkout_token_hash`, que foi adicionado por migration e armazena apenas um hash SHA-256 do código secreto da compra.

**Segurança comercial**: antes do lançamento oficial, valide taxas do Mercado Pago para produtos de R$ 2,99, revise páginas legais (LGPD, política de privacidade e direito do consumidor), teste a recuperação de acesso e configure monitoramento de erros e limites de taxa para endpoints públicos.

## 6. Rodar localmente

```bash
npm install
cp .env.example .env.local
# Preencha sua .env.local
npm run dev
```

Acesse `http://localhost:3000`.

Para produção:

```bash
npm run typecheck
npm run build
```

**Validação realizada nesta entrega**: os 16 arquivos TypeScript/TSX foram testados quanto à sintaxe; o conteúdo do Supabase e os relacionamentos entre produtos e capítulos foram verificados. Não foi possível executar `npm install`/`next build` neste ambiente porque o registro npm estava indisponível. Rode os comandos acima após baixar; antes de ativar dinheiro real, execute testes ponta a ponta com Mercado Pago.

## 7. Marketing para vender

- Coloque na bio do TikTok: **“Uma palavra especial te espera. Abra gratuitamente no nosso site.”**
- Mantenha uma reflexão gratuita como porta de entrada; ela deve gerar vontade de compartilhar por identificação, não por pressão para pagar.
- Ofereça, abaixo do pensamento, a coleção de R$ 14,90 e o e-book de 30 dias; produtos de R$ 2,99 são experimentais por causa das taxas.
- Use um calendário editorial com vídeos sobre amor, saudade, recomeços e fé; acompanhe quais temas levam a mais visitas à página.
- Não faça promessas de cura, revelação divina individualizada ou resultado garantido. Versículos devem ter contexto e as reflexões devem ser distinguidas do texto bíblico.

---

**Feito para sentir, não apenas ler.**

### Experiência gratuita com pergaminho lacrado

Ao escolher um tema, o visitante vê um envelope/pergaminho fechado. Um botão acessível, **Abrir meu pensamento gratuito**, inicia uma animação de aproximadamente 1,45 segundo: o lacre some, a aba se levanta e o papel aparece. Em seguida, o pensamento é revelado letra a letra, com uma pequena pena acompanhando o texto. Depois, é possível compartilhar, salvar uma imagem PNG ou sortear outro pensamento. A experiência é grátis, sem cadastro e com layout adaptado ao celular. Em dispositivos que solicitam movimento reduzido, as transições visuais são reduzidas. O site precisa ser publicado para a versão funcionar online.
