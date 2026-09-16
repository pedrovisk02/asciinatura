# Bloco 1: conta, configurações e temas

**Base:** `docs/2026-09-13-design.md` (spec da Etapa 1). Este documento registra o que o Pedro decidiu, com rascunhos, em 14 e 15/09/2026.

**Status:** partes 1 a 4 decididas e implementadas (1 a 3 testadas pelo Pedro; 4 aguardando o teste dele). A parte 5 ainda passa por rascunho.

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


## Parte 4: tela inicial

- **Escolhido pelo Pedro:** a base do rascunho "I3 · Topo e gavetas" (entre I1, com os controles dentro do que eles mudam, e I2, com saudação grande e opções sempre à vista) com a simetria "S2 · Dois painéis gêmeos" (entre S1, barra branca só no título, e S3, títulos soltos). O pedido dele: não perder a simetria entre as duas colunas no computador.
- **Saudação:** o botão da conta mostra "Olá, Nome". Sem nome, continua "Conta". Nome longo termina em "..."; em celulares estreitos (até 420px), o ícone de pessoa sai do botão para caber. O leitor de tela ouve "Olá, Nome. Menu da conta".
- **Esconder valores:** ícone de olho no topo, ao lado da conta, só na tela inicial. Troca todo valor em reais da tela inicial por "••••" (total, blocos, linhas e o "R$ 120,00 por ano" das anuais); nomes e dias continuam. O total escondido tem sempre o mesmo tamanho, para não dar pista do valor. O leitor de tela ouve "valor escondido". O formulário de edição continua mostrando o valor.
- **"Chegando" e "Todas" em painéis gêmeos:** o "Chegando" passa a ficar dentro de um painel branco igual ao de "Todas", cada um com o título à esquerda e um ícone redondo no canto direito, na mesma altura. O bloco "Depois" ganhou uma cor diferente da superfície nas paletas em que as duas eram iguais (Pôster verde claro e escuro, Luxo dourado claro e escuro, Café claro, Ameixa claro); um teste confere isso nas 16 combinações.
- **Janela do "Chegando":** ícone de calendário, com 7, 15 ou 30 dias (padrão 30). O título e a frase de "nenhuma cobrança" acompanham.
- **Ordenar "Todas":** ícone de setas, com Nome (A a Z, o padrão), Maior valor (pelo valor por mês) e Próxima cobrança. Empate se resolve pelo nome.
- **Como abre:** no celular, gaveta verde como a da Conta; no computador, menu suspenso preso ao ícone, como o da Conta (Esc, clicar fora e trocar de página fecham; pelo teclado, o foco cai na opção valendo).
- **Animações (depois do primeiro teste, o Pedro achou as trocas "duras" e o menu sumindo sem animação; escolha entre rascunhos):**
  - Olho: "V1 · Letras embaralhadas". Os valores se embaralham em letras e se decifram já na forma nova, de cima para baixo, e um risco se desenha devagar por cima do olho. Recusados: desfoque e rolar para cima.
  - Dias do "Chegando" e ordem de "Todas": "T2 · Deslizar para o lugar", que o Pedro pediu "bem configurado". Primeiro o menu ou a gaveta termina de fechar; depois cada item que continua escorrega da posição antiga até a nova, quem sai desliza para a direita sumindo, quem chega entra pela esquerda, um depois do outro, e o painel muda de altura devagar, levando junto o que está embaixo. O bloco da próxima cobrança, ao ficar sozinho, alarga devagar. O título novo aparece suave. Recusados: esmaecer e letras que se reorganizam.
  - Menus e gavetas fecham com a animação de abrir ao contrário (o menu sobe e some, a janela desce e o fundo clareia), em todas as janelas do app, inclusive a de apagar.
  - Quem pediu "reduzir movimento" vê tudo trocar na hora.
  - **Ajustes depois do segundo teste do Pedro:** (1) ao voltar de um bloco para dois, o "Depois" começava invisível e estreito, com o texto quebrado, e esticava a altura do bloco verde por alguns quadros; agora ele fica preso no tamanho e no lugar finais, por baixo do verde, e aparece enquanto o verde encolhe (medido quadro a quadro: altura fixa do começo ao fim). (2) No efeito de decifrar de todas as telas, as letras sorteadas eram maiúsculas, mais largas, e o título "Nova assinatura" quebrava em duas linhas no meio do efeito; agora maiúscula vira maiúscula e minúscula vira minúscula, e as letras são sorteadas de modo que a largura somada até cada ponto fique igual à do original (medida na fonte do próprio texto), então as linhas quebram no mesmo lugar; texto de uma linha fica travado numa linha até o efeito acabar. Conferido simulando o efeito com o código real em início, nova assinatura, editar assinatura, Minha conta e Aparência, a 320, 375, 414 e 1280px: nenhuma altura mudou (com a regra antiga, o título do formulário pulava até 50px). (3) O calendário do formulário abre deslizando para baixo, empurrando os campos de baixo, e recolhe ao fechar (pedido do Pedro, sem rascunho). (4) Também a pedido dele, sem rascunho, com as animações que o app já tem: ao voltar para a tela inicial (do formulário, de Minha conta ou das configurações), a tela entra de novo como na primeira abertura, com blocos em sequência e textos se decifrando; o "Alterar senha" abre e recolhe deslizando, como o calendário; e o nome salvo aparece no cartão surgindo e se decifrando (depois de a gaveta descer, no celular), junto com o "Olá, Nome" do topo. (5) Ao esconder os valores, os pontinhos se embaralhavam em letras finas ("••ri"), por causa da regra de largura parecida; agora viram algarismos sorteados, como ao mostrar, e nas linhas o espaço dos pontinhos já tem a largura de quatro algarismos, para o nome ao lado não mudar de largura.
- **Onde fica guardado (decidido pelo Claude):** as três escolhas ficam no aparelho, como o tema, porque dizem respeito a quem está olhando para aquela tela. Mudar uma escolha redesenha a tela sem buscar as assinaturas de novo.

## Segurança

- O nome fica nos dados do usuário do Supabase e serve só para exibição; nenhuma regra de acesso depende dele. Vai para a tela sempre como texto.
- Trocar a senha exige a senha atual, conferida pelo login do Supabase.
- Nenhuma origem nova na política de segurança de conteúdo; nenhuma dependência nova.

## Testes

- **Automáticos (Node):** leitura das rotas e página anterior, leitura do tema e do tamanho do texto salvos, listas iguais no script inicial e no temas.js, nenhum tamanho de letra em pixels, bloco "Depois" diferente do painel, dias do "Chegando" e ordens de "Todas" (limites e empates), leitura das escolhas da tela inicial guardadas, validação do nome e da nova senha, texto de "membro desde".
- **Na cópia com dados falsos:** as mesmas cores de antes na Pôster verde clara (comparação automática das cores calculadas de cada elemento), cada paleta e modo, menu no celular e no computador, voltar do celular, F5 em cada endereço, carteirinha, cantinho do lápis, alterar senha e nome na criação de conta.
- **Pelo Pedro, na homologação:** o mesmo roteiro com a conta de teste, no computador e no celular.

## Publicação

O trabalho fica na branch `homol`. O Pedro testa na homologação e só depois da aprovação a `main` recebe as mudanças e o site oficial atualiza.
