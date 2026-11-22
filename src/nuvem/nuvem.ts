import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { migrar } from '../engine/save';
import type { Save } from '../engine/types';

// Sincronização opcional com o Supabase. Sem as variáveis de ambiente,
// o jogo funciona normalmente só com o save local.

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && chave ? createClient(url, chave) : null;

export const nuvemDisponivel = () => !!supabase;

export const usuarioAtual = async (): Promise<User | null> => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
};

export const entrar = async (email: string, senha: string) => {
  if (!supabase) throw new Error('Nuvem não configurada');
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw new Error(traduzir(error.message));
};

export const criarConta = async (email: string, senha: string): Promise<'logado' | 'confirmar'> => {
  if (!supabase) throw new Error('Nuvem não configurada');
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw new Error(traduzir(error.message));
  return data.session ? 'logado' : 'confirmar';
};

export const sair = async () => {
  await supabase?.auth.signOut();
};

export const aoMudarSessao = (f: (u: User | null) => void) => {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_e, sessao) => f(sessao?.user ?? null));
  return () => data.subscription.unsubscribe();
};

export const baixarSave = async (userId: string): Promise<Save | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase.from('saves').select('dados').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? migrar(data.dados) : null;
};

export const enviarSave = async (userId: string, save: Save) => {
  if (!supabase) return;
  const { error } = await supabase
    .from('saves')
    .upsert({ user_id: userId, dados: save, versao: save.versao, atualizado_em: save.atualizadoEm });
  if (error) throw new Error(error.message);
};

/**
 * Junta o save local com o da nuvem: vale o mais recente.
 * Um save local vazio nunca apaga o da nuvem.
 */
export const escolherSave = (local: Save, remoto: Save | null): { save: Save; enviar: boolean } => {
  if (!remoto) return { save: local, enviar: local.jogadores.length > 0 };
  if (!local.jogadores.length) return { save: remoto, enviar: false };
  return local.atualizadoEm > remoto.atualizadoEm ? { save: local, enviar: true } : { save: remoto, enviar: false };
};

const traduzir = (m: string) =>
  m.includes('Invalid login credentials')
    ? 'E-mail ou senha incorretos.'
    : m.includes('Email not confirmed')
      ? 'Confirme o e-mail pelo link que enviamos antes de entrar.'
      : m.includes('already registered')
        ? 'Este e-mail já tem conta. Use "Entrar".'
        : m.includes('Password should be')
          ? 'A senha precisa ter pelo menos 6 caracteres.'
          : m;
