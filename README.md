# Lalumi Store

Site da loja conectado ao Supabase: catálogo com categorias/subcategorias
dinâmicas, carrossel editável, estoque com auditoria por nota fiscal,
ofertas por período, relatórios, gestão de usuários, login de clientes
(com recuperação de senha) e um painel de Administração completo para
quem tiver a permissão de master.

## 1. Configurar o banco (se ainda não fez)

No painel do Supabase, em **SQL Editor**, rode nesta ordem:

1. `lalumi-supabase-schema.sql`
2. `lalumi-supabase-schema-part2-checkout.sql`
3. `lalumi-supabase-schema-part3-admin-features.sql` ⬅ **novo**, roda por
   último. Cria as tabelas de categorias, carrossel, auditoria de estoque
   e ofertas, além de liberar o master pra ver/editar qualquer usuário.

Depois, para virar administradora (master), rode (trocando o e-mail pelo seu):

```sql
update public.profiles set role = 'master'
where id = (select id from auth.users where email = 'seu-email@exemplo.com');
```

Você só consegue rodar esse comando **depois** de já ter criado sua conta
pelo próprio site (botão "Entrar" → "Cadastre-se").

## 2. Rodar o site no seu computador

Pré-requisito: [Node.js](https://nodejs.org) instalado (versão 18 ou mais recente).

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

As credenciais do Supabase já estão preenchidas no arquivo `.env`
(a chave `anon` é pública, pode ficar aí sem problema).

## 3. Publicar o site (Vercel ou Netlify)

1. Crie uma conta gratuita em [vercel.com](https://vercel.com) ou [netlify.com](https://netlify.com)
2. Suba esta pasta (arraste no painel deles, ou conecte um repositório do GitHub)
3. Nas configurações do projeto, adicione as variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (os mesmos valores do arquivo `.env`)
4. Publique — você recebe um link público (ex: `lalumi-store.vercel.app`)
5. Se tiver um domínio próprio, aponte ele para esse projeto nas
   configurações de domínio da Vercel/Netlify, e depois atualize o
   "Site URL" em Authentication → URL Configuration no Supabase pra
   apontar pro domínio novo (senão os e-mails de confirmação e de
   redefinição de senha voltam pro endereço antigo).

## Como funciona o login

- **Cliente**: qualquer pessoa que se cadastra no site vira `cliente`
  automaticamente. Ela consegue comprar, ver "Meus pedidos" e usar o
  "Esqueci minha senha" na tela de login.
- **Master**: definida manualmente com o comando SQL acima (ou depois,
  direto pela tela "Administração → Usuários", sem precisar mexer no
  banco de novo). Vê o botão "Administração", com acesso a Estoque,
  Relatórios e Usuários.
- As regras de permissão ficam garantidas no próprio banco de dados
  (Row Level Security), não apenas na tela — então mesmo que alguém
  tente burlar pelo navegador, o banco recusa.

## O que tem dentro de "Administração"

- **Estoque**: Cadastro de produto (com categoria/subcategoria — cria
  na hora se ainda não existir — e várias fotos), Entrada de produto
  (busca por código/descrição, dá baixa por nota fiscal), Produtos
  (editar tudo, arquivar ou excluir — excluir é bloqueado se o produto
  já tiver movimentação, pra nunca perder o histórico), Auditoria
  (todas as entradas e saídas, com filtro por período) e Ofertas
  (desconto por período — antes e depois, o preço volta ao normal
  sozinho).
- **Relatórios**: Mais vendidos, Zerados e Pedidos (todos os pedidos
  da loja, com busca por cliente ou número).
- **Usuários**: todo mundo cadastrado, com busca e filtro por
  permissão. Clicar abre os dados completos e um seletor pra trocar
  entre Cliente e Administrador.

Todo relatório tem botão de **Exportar XLSX** (planilha de verdade) e
**Exportar PDF** (baixa um HTML pronto pra imprimir/salvar como PDF).

## Estrutura do projeto

```
src/
  App.jsx                          → loja, carrinho, checkout, cabeçalho
  supabaseClient.js                → conexão com o Supabase
  lib/helpers.js                   → cores, validações, máscaras, ofertas
  components/
    Shared.jsx                       → estrela mascote, ProductThumb, Pill
    AuthModal.jsx                     → login/cadastro/esqueci a senha
    UpdatePasswordModal.jsx           → tela de criar senha nova
    ProductDetailModal.jsx            → escolha de tamanho/quantidade
    OrderHistory.jsx                  → histórico de pedidos do cliente
    admin/
      AdminHub.jsx                     → menu central de Administração
      CategoryManager.jsx              → categorias/subcategorias/tamanhos
      CarouselManager.jsx              → artes do carrossel da home
      InventoryPanel.jsx                → cadastro, entrada, produtos, auditoria, ofertas
      ReportsPanel.jsx                  → mais vendidos, zerados, pedidos
      UsersPanel.jsx                    → usuários e permissões
      ExportButtons.jsx                 → exportar XLSX/PDF (usado nos relatórios)
```

## Próximas melhorias possíveis

- Trocar as fotos (hoje guardadas em base64 dentro do banco) pelo
  **Supabase Storage**, que é feito sob medida para arquivos e deixa
  o site mais rápido.
- Notificação por e-mail automática a cada novo pedido.
