// Ler e gravar assinaturas no banco.
//
// Nenhuma consulta filtra por usuário: as regras de acesso do banco (RLS) já
// devolvem só as assinaturas de quem está logado, o próprio banco preenche o
// dono ao criar, e alterar ou apagar a assinatura de outra pessoa não afeta
// nenhuma linha (testado no Passo 2).

import { supabase } from './config.js';

// Campos lidos, listados um a um em vez de "*", para a consulta não mudar
// sozinha se a tabela ganhar colunas novas.
const CAMPOS = 'id, nome, valor, ciclo, proxima_cobranca, categoria, ativa, criado_em';

// Converte os nomes usados no app para os nomes das colunas do banco. Campo
// não informado (undefined) fica de fora e não é alterado.
function paraOBanco({ nome, valor, ciclo, proximaCobranca, categoria, ativa }) {
  const campos = { nome, valor, ciclo, proxima_cobranca: proximaCobranca, categoria, ativa };
  return Object.fromEntries(Object.entries(campos).filter(([, valorDoCampo]) => valorDoCampo !== undefined));
}

export async function listarAssinaturas() {
  const { data, error } = await supabase
    .from('assinaturas')
    .select(CAMPOS)
    .order('criado_em', { ascending: true });

  if (error) throw error;
  return data;
}

export async function criarAssinatura(campos) {
  const { data, error } = await supabase
    .from('assinaturas')
    .insert(paraOBanco(campos))
    .select(CAMPOS)
    .single();

  if (error) throw error;
  return data;
}

export async function atualizarAssinatura(id, campos) {
  const { data, error } = await supabase
    .from('assinaturas')
    .update(paraOBanco(campos))
    .eq('id', id)
    .select(CAMPOS)
    .single();

  // Se nenhuma linha foi alterada (apagada em outro aparelho, por exemplo),
  // o .single() devolve o erro PGRST116.
  if (error) throw error;
  return data;
}

export async function apagarAssinatura(id) {
  const { data, error } = await supabase
    .from('assinaturas')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) throw error;
  // Nenhuma linha apagada: trata do mesmo jeito que a alteração sem linha.
  if (data.length === 0) {
    throw Object.assign(new Error('Nenhuma assinatura apagada'), { code: 'PGRST116' });
  }
}
