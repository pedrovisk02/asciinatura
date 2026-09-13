// Ler e gravar assinaturas no banco.
//
// Nenhuma consulta filtra por usuário: as regras de acesso do banco (RLS) já
// devolvem só as assinaturas de quem está logado, e o próprio banco preenche
// o dono ao criar.

import { supabase } from './config.js';

// Campos lidos, listados um a um em vez de "*", para a consulta não mudar
// sozinha se a tabela ganhar colunas novas.
const CAMPOS = 'id, nome, valor, ciclo, proxima_cobranca, categoria, ativa, criado_em';

export async function listarAssinaturas() {
  const { data, error } = await supabase
    .from('assinaturas')
    .select(CAMPOS)
    .order('criado_em', { ascending: true });

  if (error) throw error;
  return data;
}

export async function criarAssinatura({ nome, valor, ciclo, proximaCobranca, categoria }) {
  const { data, error } = await supabase
    .from('assinaturas')
    .insert({ nome, valor, ciclo, proxima_cobranca: proximaCobranca, categoria })
    .select(CAMPOS)
    .single();

  if (error) throw error;
  return data;
}
