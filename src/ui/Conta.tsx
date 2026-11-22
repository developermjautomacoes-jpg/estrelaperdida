import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { criarConta, entrar, nuvemDisponivel, sair } from '../nuvem/nuvem';

export type StatusNuvem = 'desligada' | 'sincronizando' | 'salvo' | 'erro';

interface Props {
  usuario: User | null;
  status: StatusNuvem;
}

const TEXTO_STATUS: Record<StatusNuvem, string> = {
  desligada: '',
  sincronizando: 'Sincronizando…',
  salvo: 'Progresso salvo na nuvem ✓',
  erro: 'Sem conexão com a nuvem: o progresso fica salvo neste aparelho e sincroniza depois.',
};

export function Conta({ usuario, status }: Props) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [msg, setMsg] = useState<string>();
  const [ocupado, setOcupado] = useState(false);

  if (!nuvemDisponivel()) return null;

  if (usuario)
    return (
      <section className="bloco conta">
        <div>
          <strong>Conta da família:</strong> {usuario.email}
          <p className="dica">{TEXTO_STATUS[status]}</p>
        </div>
        <button className="botao botao--leve" onClick={() => sair()}>
          Sair
        </button>
      </section>
    );

  const agir = async (f: () => Promise<unknown>) => {
    setOcupado(true);
    setMsg(undefined);
    try {
      await f();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <section className="bloco">
      <h2>Conta da família</h2>
      <p className="dica">Entre para levar os heróis e conquistas para qualquer aparelho. Sem conta, o progresso fica só neste aparelho.</p>
      <form className="conta__form" onSubmit={(e) => e.preventDefault()}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail do responsável" aria-label="E-mail" autoComplete="email" />
        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha" aria-label="Senha" autoComplete="current-password" />
        <button className="botao" disabled={ocupado || !email || !senha} onClick={() => agir(() => entrar(email, senha))}>
          Entrar
        </button>
        <button
          className="botao botao--leve"
          disabled={ocupado || !email || senha.length < 6}
          onClick={() =>
            agir(async () => {
              const r = await criarConta(email, senha);
              if (r === 'confirmar') setMsg('Conta criada! Abra o link que enviamos para o seu e-mail e depois clique em Entrar.');
            })
          }
        >
          Criar conta
        </button>
      </form>
      {msg && <p className="dica">{msg}</p>}
    </section>
  );
}
