import { useMemo, useState } from 'react';
import { registro } from './content/registro';
import { criarBatalha, type EstadoBatalha } from './engine/batalha';
import { armazenamentoLocal, atualizarJogador, carregar, salvar } from './engine/save';
import type { Aventura, Cenario, Jogador, Save } from './engine/types';
import { finalizarBatalha } from './ui/finalizar';
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

  const gravar = (s: Save) => setSave(salvar(arm, s));
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
