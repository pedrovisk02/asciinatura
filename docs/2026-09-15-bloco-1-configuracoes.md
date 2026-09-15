# Bloco 1: conta, configurações e temas

**Base:** `docs/2026-09-13-design.md` (spec da Etapa 1). Este documento registra o que o Pedro decidiu, com rascunhos, em 14 e 15/09/2026.

**Status:** partes 1 a 3 decididas e implementadas (1 e 2 testadas pelo Pedro; 3 aguardando o teste dele). Partes 4 e 5 ainda passam por rascunho.

---

## Objetivo

Dar ao app um lugar para a conta e para as preferências, sem opções que ainda não funcionam. Cada área é uma página própria, e o gesto de voltar do celular leva à página anterior.

## Partes do bloco

1. Menu da "Conta" e formato das páginas.
2. Minha conta, com o nome também na criação de conta.
3. Aparência: paleta, claro ou escuro e tamanho do texto.
4. Tela inicial: saudação com o nome, esconder valores, ordenar a lista e janela do "Chegando" (7, 15 ou 30 dias).
5. Privacidade, Sobre (sem link do GitHub) e Sugestões e problemas.

Ficam para os blocos deles, e só aparecem quando forem feitos: baixar dados e excluir conta (bloco 2), idioma e moeda (bloco 3, com a semana do calendário mudando junto com o idioma), e-mail de recuperação (bloco 5, precisa de e-mail próprio e de função no servidor) e notificações (bloco 6). Não entram: sair de todos os aparelhos, opções de animação e alterar e-mail.

## Parte 1: menu e páginas

- **Botão "Conta" no celular:** gaveta verde que sobe, com "Olá, Nome!" (ou "Olá!" sem nome), o e-mail, botões "Minha conta" e "Configurações" e "Sair da conta" discreto embaixo.
- **Botão "Conta" no computador:** menu suspenso branco preso ao botão, com o e-mail, "Minha conta", "Configurações", um separador e "Sair".
- **Páginas no celular:** cartaz cinza no topo, com etiqueta e título grande, conteúdo em painéis e "Voltar" embaixo. "Configurações" é uma página com a lista das áreas.
- **Páginas no computador:** botão redondo "Voltar ao início" no topo, menu verde à esquerda com dois grupos ("Conta": Minha conta; "Configurações": as áreas) e, à direita, o mesmo cartaz cinza do celular com o nome da área.
- **Endereços:** `#/conta`, `#/configuracoes`, `#/configuracoes/aparencia` e `#/assinatura` (formulário). Voltar do celular, botões de voltar e F5 respeitam o endereço. Sem sessão, o endereço é guardado e aberto depois de entrar.
- **Efeito de embaralhar:** no computador, os nomes do menu se embaralham e se decifram ao passar o mouse; no celular, os textos se decifram quando a página abre, como nas outras telas.

## Parte 2: Minha conta

- **Carteirinha:** cartão verde com etiqueta "Nome", o nome grande, o e-mail e "Membro desde <mês> de <ano>", com manchas de letras ASCII atrás.
- **Alterar nome:** um "cantinho" no canto superior direito do cartão, separado por uma curva suave desenhada com linha fina, com um lápis dentro. Ao passar o mouse, o cantinho se destaca; ao clicar, ele encolhe suavemente para dentro do canto e só então abre a edição. No computador o nome vira campo no próprio cartão (Enter salva, Esc cancela); no celular sobe uma gaveta "Como quer ser chamado?". Ao salvar ou cancelar, o cantinho volta. Sem animação para quem pediu "reduzir movimento". Proporções refinadas no app, com revisão do Pedro.
- **Alterar senha:** linha que abre ao clicar, com senha atual e nova senha (mínimo 8). O app confere a senha atual antes de trocar.
- **Nome:** obrigatório ao criar conta ("Como quer ser chamado?", primeiro campo), de 1 a 30 caracteres depois de tirar os espaços das pontas. Contas antigas sem nome veem "Olá!" e podem preencher em Minha conta. Aparece no menu da Conta e, na parte 4, na saudação da tela inicial.

## Temas

- **Paletas:** Pôster verde (a atual), Luxo dourado, Índigo e sálvia, Jade e vermelho, Terracota e pêssego, Café, Ameixa e Concreto e metal, cada uma em claro e escuro. Na Jade e vermelho clara, o valor do total fica creme, com o jade do cartaz um pouco mais escuro para o número continuar legível.
- **Cores por papel:** o estilo deixa de usar nomes de cor (`--verde`, `--cinza`) e passa a usar papéis (`--fundo`, `--superficie`, `--destaque`, `--cartaz`, `--forte`, blocos de cobrança, tons das letras ASCII). Cada paleta só redefine os papéis. A Pôster verde clara continua idêntica à de hoje.
- **Regras:** botões nunca vermelhos; contraste mínimo de 4,5:1 para texto comum e 3:1 para números grandes em cada combinação; o erro ganha um tom claro nos modos escuros.
- **Onde fica guardado:** no próprio aparelho. Um script pequeno aplica o tema antes de a página aparecer, para a cor não piscar; o modo escuro só liga por escolha da pessoa.

## Parte 3: Aparência

- **Visual escolhido pelo Pedro: "A1 · Cartões e botões",** entre três rascunhos (os outros eram uma vitrine de mini telas e uma prévia ao vivo). Paletas em cartões com o nome e três bolinhas de cor (duas colunas no celular, quatro no computador; o escolhido fica na cor de destaque). Claro e escuro em dois botões lado a lado, com sol e lua. Tamanho do texto em três botões (A−, A e A+, com a letra crescendo), com uma linha de exemplo embaixo. No computador, "Modo" e "Tamanho do texto" ficam lado a lado.
- **Muda no clique,** sem botão de salvar. Por baixo, cada grupo é um conjunto de botões de rádio de verdade: setas do teclado trocam a opção e o leitor de tela ouve "Menor", "Normal" e "Maior".
- **Tamanho do texto:** Menor (90%), Normal (100%) e Maior (115%), guardado no aparelho, separado do tema, e aplicado antes de a página aparecer, como o tema. Todos os tamanhos de letra do estilo passaram a usar `rem` (decidido pelo Claude): mudar o tamanho da raiz muda todas as letras juntas, e o "Normal" também respeita o tamanho de letra escolhido no próprio navegador. As letras das animações ASCII não mudam, porque são enfeite. No tamanho normal, todas as letras fora da página Aparência ficaram idênticas às de antes (comparação automática no celular e no computador).
- **Títulos dos cartazes** diminuem sozinhos quando a palavra mais longa não cabe na largura do cartaz. Com o texto maior, "Configurações" saía do cartaz no celular; a mesma regra protege celulares estreitos no tamanho normal.


## Segurança

- O nome fica nos dados do usuário do Supabase e serve só para exibição; nenhuma regra de acesso depende dele. Vai para a tela sempre como texto.
- Trocar a senha exige a senha atual, conferida pelo login do Supabase.
- Nenhuma origem nova na política de segurança de conteúdo; nenhuma dependência nova.

## Testes

- **Automáticos (Node):** leitura das rotas e página anterior, leitura do tema e do tamanho do texto salvos, listas iguais no script inicial e no temas.js, nenhum tamanho de letra em pixels, validação do nome e da nova senha, texto de "membro desde".
- **Na cópia com dados falsos:** as mesmas cores de antes na Pôster verde clara (comparação automática das cores calculadas de cada elemento), cada paleta e modo, menu no celular e no computador, voltar do celular, F5 em cada endereço, carteirinha, cantinho do lápis, alterar senha e nome na criação de conta.
- **Pelo Pedro, na homologação:** o mesmo roteiro com a conta de teste, no computador e no celular.

## Publicação

O trabalho fica na branch `homol`. O Pedro testa na homologação e só depois da aprovação a `main` recebe as mudanças e o site oficial atualiza.
