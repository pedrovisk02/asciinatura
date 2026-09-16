// Endereços das páginas (a parte depois do "#"), para o voltar do celular, os
// botões de voltar e o F5 levarem à página certa.
// Funções puras: testes em testes/rotas.test.js.

// Cada rota: o endereço e a rota "de cima", para onde o "Voltar" leva quando
// não há página anterior no histórico (por exemplo, depois de um F5).
const ROTAS = {
  inicio: { endereco: '#/', pai: null },
  assinatura: { endereco: '#/assinatura', pai: 'inicio' },
  conta: { endereco: '#/conta', pai: 'inicio' },
  configuracoes: { endereco: '#/configuracoes', pai: 'inicio' },
  aparencia: { endereco: '#/configuracoes/aparencia', pai: 'configuracoes' },
  privacidade: { endereco: '#/configuracoes/privacidade', pai: 'configuracoes' },
  sobre: { endereco: '#/configuracoes/sobre', pai: 'configuracoes' },
  sugestoes: { endereco: '#/configuracoes/sugestoes', pai: 'configuracoes' },
};

// Rotas que abrem a tela de conta e configurações, e não a tela inicial.
export const ROTAS_DE_AJUSTES = ['conta', 'configuracoes', 'aparencia', 'privacidade', 'sobre', 'sugestoes'];

// "#/conta" vira "conta". Endereço vazio vira "inicio". Um "#" que não começa
// com "#/" não é do app: é o que o Supabase põe no endereço ao voltar de um
// link de e-mail, e fica sem dono (null) para não ser apagado antes da hora.
export function lerRota(hash) {
  if (!hash || hash === '#' || hash === '#/') return 'inicio';
  if (!hash.startsWith('#/')) return null;
  const limpo = hash.replace(/\/+$/, '');
  const nome = Object.keys(ROTAS).find((chave) => ROTAS[chave].endereco === limpo);
  return nome ?? 'inicio';
}

export function enderecoDaRota(nome) {
  return (ROTAS[nome] ?? ROTAS.inicio).endereco;
}

export function rotaPai(nome) {
  return ROTAS[nome]?.pai ?? null;
}
