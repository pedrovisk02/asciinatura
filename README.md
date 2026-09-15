# Asciinatura

**Quanto custa o seu mês.** Um app web para acompanhar assinaturas recorrentes: quanto elas somam por mês e o que vai ser cobrado em seguida.

**App no ar / Live app:** https://asciinatura.onrender.com

[Português](#português) · [English](#english)

---

## Português

### O problema

Quase todo mundo tem entre 5 e 15 cobranças que se repetem: streaming, academia, armazenamento na nuvem, domínio, aplicativos assinados para testar e nunca cancelados. Duas coisas falham na prática: ninguém sabe de cabeça quanto isso soma por mês, e a cobrança chega de surpresa, numa data que a pessoa não lembrava.

### O que o app faz

- **Total do mês** com o valor mensal equivalente: uma assinatura anual de R$ 120 conta como R$ 10 por mês.
- **Chegando:** as cobranças dos próximos 30 dias, com quantos dias faltam.
- **Datas que se atualizam sozinhas:** se a data gravada já passou, o app avança de ciclo em ciclo até a próxima cobrança, sem ninguém precisar editar nada. Assinatura do dia 31 cai no último dia dos meses mais curtos e volta ao dia 31 quando dá.
- **Cancelar sem apagar:** a assinatura sai do total, continua registrada e pode ser reativada.
- **Conta com e-mail e senha:** a mesma lista no celular e no computador.

### Como foi feito

- **HTML, CSS e JavaScript puro**, com módulos, sem framework e sem etapa de build. A única dependência é a biblioteca do Supabase.
- **Supabase** para login e banco de dados (PostgreSQL).
- **Especificação e plano antes do código.** O problema, o escopo, o modelo de dados e os testes foram escritos e aprovados primeiro ([`docs/`](docs/)). A construção seguiu passos pequenos, cada um com um critério de "pronto quando".
- **Cálculos antes da tela.** As regras de valor mensal e de datas são funções puras, testadas antes de existir qualquer interface: 64 testes com o executor nativo do Node, sem bibliotecas de teste.
- **Desenvolvido com apoio de IA** (Claude Code), com cada decisão explicada e verificada.

### Segurança

- **Cada pessoa só enxerga e altera as próprias assinaturas**, garantido no banco por Row Level Security, e não só na tela. Criar e editar só é permitido nas colunas do formulário, então ninguém consegue gravar uma assinatura em nome de outra pessoa. Um script de teste em SQL confere essas regras com duas contas simuladas ([`banco/testes/`](banco/testes/)).
- **A chave do Supabase que aparece no código é a publicável**, feita para ficar visível no navegador. O que protege os dados são as regras do banco.
- **Política de segurança de conteúdo (CSP):** a página só carrega scripts do próprio site e da CDN da biblioteca, e só conversa com o projeto Supabase.
- **Verificação de integridade (SRI)** na biblioteca carregada por CDN.
- **Texto digitado nunca vira código:** o que a pessoa escreve vai para a tela sempre como texto.
- **Cabeçalhos de segurança** na hospedagem ([`render.yaml`](render.yaml)), por exemplo impedindo que outro site mostre o app dentro de um quadro.
- **Mensagens que não revelam** se um e-mail tem conta, no login e na recuperação de senha.

### Acessibilidade e visual

- Uso completo pelo teclado, incluindo o calendário próprio; leitores de tela são avisados do que muda; contraste das cores conferido.
- Identidade própria inspirada em arte ASCII: animações de letras desenhadas em canvas, que param para quem ativou "reduzir movimento" no aparelho.
- Fontes guardadas no próprio projeto, sem serviços externos.

### Rodar no computador

Precisa de Python 3 (servidor local) e Node.js 18 ou mais novo (testes).

```bash
python servidor.py
```

Abra http://localhost:8000. O servidor atende só este computador e serve apenas a pasta `publico/`.

```bash
node --test
```

Para usar outro projeto Supabase: rode `banco/01-tabela-assinaturas.sql` e `banco/02-limite-de-data.sql` no SQL Editor e troque o endereço e a chave publicável em `publico/js/config.js`.

### Estrutura

```
publico/        o que vai para o ar (única pasta publicada)
  index.html    telas e janelas
  css/          estilo, com a paleta em variáveis
  js/           app, login, banco, cálculos, validação e animações
  fontes/       Montserrat e JetBrains Mono, com as licenças
banco/          SQL da tabela, das regras de acesso e o teste das regras
testes/         testes dos cálculos, da validação e das mensagens de erro
docs/           especificação e plano de implementação
render.yaml     configuração da hospedagem no Render
servidor.py     servidor para testar no computador
```

### Próximos passos

Configurações com temas e modo escuro; excluir a conta e baixar os próprios dados; português e inglês, com real, euro e dólar; sugestões ao digitar o nome da assinatura; e-mails com a identidade do projeto; avisos antes da cobrança por e-mail e no celular; registrar assinaturas pelo WhatsApp com IA.

---

## English

### The problem

Most people have somewhere between 5 and 15 recurring charges: streaming, gym, cloud storage, domains, apps subscribed to "just to try" and never cancelled. Two things go wrong: nobody knows off the top of their head how much it all adds up to each month, and charges arrive by surprise, on dates people forgot.

### What the app does

- **Monthly total** using the monthly equivalent: a yearly subscription of R$ 120 counts as R$ 10 per month.
- **Coming up:** charges in the next 30 days, with how many days are left.
- **Dates that update themselves:** if a stored date has passed, the app moves it forward cycle by cycle to the next charge, with no manual editing. A subscription billed on the 31st falls on the last day of shorter months and returns to the 31st when possible.
- **Cancel without deleting:** the subscription leaves the total, stays on record and can be reactivated.
- **Email and password account:** the same list on phone and computer.

The interface is in Brazilian Portuguese and amounts are in Brazilian reais (R$). English and other currencies are on the roadmap.

### How it was built

- **Plain HTML, CSS and JavaScript** with ES modules, no framework and no build step. The only dependency is the Supabase client library.
- **Supabase** for authentication and the database (PostgreSQL).
- **Spec and plan before code.** The problem, scope, data model and test plan were written and approved first ([`docs/`](docs/), in Portuguese). Development followed small steps, each with a "done when" criterion.
- **Calculations before UI.** Monthly value and date rules are pure functions, tested before any interface existed: 64 tests using Node's built-in test runner, with no testing libraries.
- **Built with AI assistance** (Claude Code), with every decision explained and verified.

### Security

- **Each user can only see and change their own subscriptions**, enforced in the database with Row Level Security, not just in the UI. Inserts and updates are limited to the form's columns, so nobody can create a subscription on behalf of someone else. A SQL test script checks these rules with two simulated accounts ([`banco/testes/`](banco/testes/)).
- **The Supabase key in the code is the publishable one**, designed to be visible in the browser. The database rules are what protect the data.
- **Content Security Policy:** the page only loads scripts from itself and the library's CDN, and only talks to the Supabase project.
- **Subresource Integrity** on the CDN-loaded library.
- **User input never becomes code:** typed text is always rendered as text.
- **Security headers** at the host ([`render.yaml`](render.yaml)), for example preventing other sites from framing the app.
- **Messages that don't reveal** whether an email has an account, on sign-in and password recovery.

### Accessibility and design

- Fully usable with the keyboard, including the custom date picker; screen readers are told what changed; color contrast checked.
- A distinct identity inspired by ASCII art: letter animations drawn on canvas, which stop for people who enabled "reduce motion".
- Fonts self-hosted in the project, no external services.

### Run locally

Requires Python 3 (local server) and Node.js 18 or newer (tests).

```bash
python servidor.py
```

Open http://localhost:8000. The server only accepts connections from this computer and only serves the `publico/` folder.

```bash
node --test
```

To use your own Supabase project: run `banco/01-tabela-assinaturas.sql` and `banco/02-limite-de-data.sql` in the SQL Editor, then replace the project URL and publishable key in `publico/js/config.js`.

### Structure

```
publico/        what goes live (the only published folder)
  index.html    screens and dialogs
  css/          styles, with the palette in variables
  js/           app, auth, database, calculations, validation, animations
  fontes/       Montserrat and JetBrains Mono, with their licenses
banco/          SQL for the table, access rules and the rules test
testes/         tests for calculations, validation and error messages
docs/           specification and implementation plan (Portuguese)
render.yaml     hosting configuration on Render
servidor.py     local development server
```

Code identifiers are in Portuguese on purpose, so the author can read his own code without translating.

### Roadmap

Settings with themes and dark mode; delete account and download your data; Portuguese and English, with reais, euros and dollars; suggestions while typing a subscription name; branded account emails; reminders before charges by email and on phone; adding subscriptions through WhatsApp with AI.
