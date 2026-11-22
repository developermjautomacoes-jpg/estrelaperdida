import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { registro } from './content/registro';
import { criarBatalha, type EstadoBatalha } from './engine/batalha';
import { armazenamentoLocal, atualizarJogador, carregar, salvar } from './engine/save';
import type { Aventura, Cenario, Jogador, Save } from './engine/types';
import { finalizarBatalha } from './ui/finalizar';
import { aoMudarSessao, baixarSave, enviarSave, escolherSave, usuarioAtual } from './nuvem/nuvem';
import { Conta, type StatusNuvem } from './ui/Conta';
import { Batalha } from './ui/telas/Batalha';
import { Campanha, type Escalacao } from './ui/telas/Campanha';
import { Jogadores } from './ui/telas/Jogadores';
import { Perfil } from './ui/telas/Perfil';
import { Resultado } from './ui/telas/Resultado';

type Tela =
  | { nome: 'jogadores' }
  | { nome: 'perfil'; jogadorId: string }
  | { nome: 'campanha' }
  | { nome: 'batalha'; aventura: Aventura; cenario: Cenario; estado: EstadoBatalha }
  | { nome: 'resultado'; aventura: Aventura; cenario: Cenario; estado: EstadoBatalha };

export default function App() {
  const reg = useMemo(() => registro(), []);
  const arm = useMemo(() => armazenamentoLocal(), []);
  const [save, setSave] = useState<Save>(() => carregar(arm));
  const [tela, setTela] = useState<Tela>({ nome: 'jogadores' });

  const [usuario, setUsuario] = useState<User | null>(null);
  const [status, setStatus] = useState<StatusNuvem>('desligada');
  const usuarioRef = useRef<User | null>(null);

  const subir = (s: Save) => {
    const u = usuarioRef.current;
    if (!u) return;
    setStatus('sincronizando');
    enviarSave(u.id, s)
      .then(() => setStatus('salvo'))
      .catch(() => setStatus('erro'));
  };

  // Ao entrar na conta, junta o save local com o da nuvem (vale o mais recente).
  const conectar = async (u: User | null) => {
    usuarioRef.current = u;
    setUsuario(u);
    if (!u) return setStatus('desligada');
    setStatus('sincronizando');
    try {
      const remoto = await baixarSave(u.id);
      setSave((local) => {
        const r = escolherSave(local, remoto);
        salvar(arm, r.save);
        if (r.enviar) subir(r.save);
        else setStatus('salvo');
        return r.save;
      });
    } catch {
      setStatus('erro');
    }
  };

  useEffect(() => {
    usuarioAtual().then(conectar);
    return aoMudarSessao((u) => {
      if (u?.id !== usuarioRef.current?.id) conectar(u);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gravar = (s: Save) => {
    const novo = salvar(arm, s);
    setSave(novo);
    subir(novo);
  };
  const gravarJogador = (j: Jogador) => gravar(atualizarJogador(save, j));
  const aventuras = reg.pacotes.filter((p) => !p.aventura.biblioteca).map((p) => p.aventura);

  const jogar = (aventura: Aventura, cenario: Cenario, escalacao: Escalacao[]) => {
    const participantes = escalacao.map(({ jogadorId, heroiId }) => {
      const heroi = save.jogadores.find((j) => j.id === jogadorId)!.herois.find((h) => h.id === heroiId)!;
      return { jogadorId, heroi, classe: reg.classes[heroi.classe] };
    });
    const estado = criarBatalha(cenario, reg.monstros, participantes, Date.now() >>> 0);
    setTela({ nome: 'batalha', aventura, cenario, estado });
  };

  switch (tela.nome) {
    case 'jogadores':
      return (
        <Jogadores
          conta={<Conta usuario={usuario} status={status} />}
          jogadores={save.jogadores}
          onCriar={gravarJogador}
          onAbrir={(id) => setTela({ nome: 'perfil', jogadorId: id })}
          onCampanha={() => setTela({ nome: 'campanha' })}
        />
      );
    case 'perfil': {
      const j = save.jogadores.find((x) => x.id === tela.jogadorId)!;
      return <Perfil jogador={j} classes={reg.classes} conquistas={reg.conquistas} onSalvar={gravarJogador} onVoltar={() => setTela({ nome: 'jogadores' })} />;
    }
    case 'campanha':
      return <Campanha save={save} aventuras={aventuras} cenarios={reg.cenarios} onJogar={jogar} onVoltar={() => setTela({ nome: 'jogadores' })} />;
    case 'batalha':
      return (
        <Batalha
          key={tela.estado.rng}
          cenario={tela.cenario}
          monstros={reg.monstros}
          inicial={tela.estado}
          onFim={(estado) => setTela({ ...tela, nome: 'resultado', estado })}
          onSair={() => setTela({ nome: 'campanha' })}
        />
      );
    case 'resultado':
      return (
        <Resultado
          cenario={tela.cenario}
          estado={tela.estado}
          onConcluir={(escolha) => {
            const r = finalizarBatalha(save, tela.aventura, tela.cenario, tela.estado, reg.conquistas, escolha);
            gravar(r.save);
            return r.resumo;
          }}
          onVoltar={() => setTela({ nome: 'campanha' })}
        />
      );
  }
}
