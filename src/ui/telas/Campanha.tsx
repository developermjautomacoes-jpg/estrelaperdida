import { useState } from 'react';
import { nivelPorXp } from '../../engine/progressao';
import { obterProgresso } from '../../engine/save';
import type { Aventura, Cenario, Save } from '../../engine/types';

export interface Escalacao {
  jogadorId: string;
  heroiId: string;
}

interface Props {
  save: Save;
  aventuras: Aventura[];
  cenarios: Record<string, Cenario>;
  onJogar: (aventura: Aventura, cenario: Cenario, escalacao: Escalacao[]) => void;
  onVoltar: () => void;
}

export function Campanha({ save, aventuras, cenarios, onJogar, onVoltar }: Props) {
  const [aventuraId, setAventuraId] = useState(aventuras[0]?.id);
  const [escalacao, setEscalacao] = useState<Record<string, string>>({});
  const aventura = aventuras.find((a) => a.id === aventuraId);

  const niveis = save.jogadores.flatMap((j) => j.herois.map((h) => nivelPorXp(h.xp)));
  const liberada = (a: Aventura) => {
    const req = a.requisitos;
    if (!req) return true;
    if (req.nivelMinimo && Math.max(0, ...niveis) < req.nivelMinimo) return false;
    return (req.aventurasConcluidas ?? []).every((id) => {
      const p = save.progresso.find((x) => x.aventura === id);
      const av = aventuras.find((x) => x.id === id);
      return p && av && av.cenarios.every((c) => cenarios[c]?.numero.startsWith('s') || p.cenariosConcluidos.includes(c));
    });
  };

  const escalados: Escalacao[] = Object.entries(escalacao)
    .filter(([, h]) => h)
    .map(([jogadorId, heroiId]) => ({ jogadorId, heroiId }));

  return (
    <div className="tela">
      <button className="botao botao--leve" onClick={onVoltar}>
        ← Jogadores
      </button>
      <h1>Guilda da Lanterna</h1>

      <section className="bloco">
        <h2>Aventuras</h2>
        <div className="lista">
          {aventuras.map((a) => (
            <button key={a.id} className={`item ${a.id === aventuraId ? 'item--ativo' : ''}`} disabled={!liberada(a)} onClick={() => setAventuraId(a.id)}>
              <strong>{a.nome}</strong>
              <span>{liberada(a) ? a.descricao : 'Bloqueada: conclua os requisitos para liberar.'}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="bloco">
        <h2>Quem vai jogar</h2>
        <p className="dica">De 1 a 4 heróis, um por jogador.</p>
        {save.jogadores.map((j) => (
          <label key={j.id} className="linha">
            <span className="linha__nome">{j.nome}</span>
            <select value={escalacao[j.id] ?? ''} onChange={(ev) => setEscalacao((s) => ({ ...s, [j.id]: ev.target.value }))}>
              <option value="">Não vai jogar</option>
              {j.herois.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.nome} (nível {nivelPorXp(h.xp)})
                </option>
              ))}
            </select>
          </label>
        ))}
      </section>

      {aventura && (
        <ListaCenarios
          aventura={aventura}
          save={save}
          cenarios={cenarios}
          podeJogar={escalados.length >= 1 && escalados.length <= 4}
          onJogar={(c) => onJogar(aventura, c, escalados)}
        />
      )}
    </div>
  );
}

function ListaCenarios({ aventura, save, cenarios, podeJogar, onJogar }: { aventura: Aventura; save: Save; cenarios: Record<string, Cenario>; podeJogar: boolean; onJogar: (c: Cenario) => void }) {
  const p = obterProgresso(save, aventura.id, aventura.versao, aventura.cenarioInicial);
  return (
    <section className="bloco">
      <h2>{aventura.nome}</h2>
      <p className="dica">
        Lanternas acesas: {p.lanternas} · Cenários concluídos: {p.cenariosConcluidos.length}
        {Object.keys(p.escolhas).length > 0 && ` · Escolhas: ${Object.entries(p.escolhas).map(([k, v]) => `${k}: ${v}`).join(', ')}`}
      </p>
      <div className="lista">
        {p.cenariosDesbloqueados.map((id) => {
          const c = cenarios[id];
          if (!c) return null;
          const feito = p.cenariosConcluidos.includes(id);
          return (
            <button key={id} className={`item ${feito ? 'item--feito' : ''}`} disabled={!podeJogar || !!c.rascunho} onClick={() => onJogar(c)}>
              <strong>
                {c.numero} · {c.nome} {feito && '✓'}
              </strong>
              <span>{c.rascunho ? 'Em produção no estúdio — ainda sem mapa jogável.' : c.introducao}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
