import React from 'react';

const BadgeStatusMeta = ({ status }) => {
  const mapa = {
    aguardando: { texto: 'AGUARDANDO', classe: 'bg-amber-100 text-amber-700 border-amber-300' },
    pendente:   { texto: 'PENDENTE',   classe: 'bg-blue-100 text-blue-700 border-blue-300' },
    realizado:  { texto: 'REALIZADO',  classe: 'bg-green-100 text-green-700 border-green-300' },
    cancelado:  { texto: 'CANCELADO',  classe: 'bg-slate-100 text-slate-600 border-slate-300' },
    rejeitada:  { texto: 'REJEITADA',  classe: 'bg-red-100 text-red-700 border-red-300' }
  };
  const s = mapa[status] || mapa.pendente;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${s.classe}`}>
      {s.texto}
    </span>
  );
};

/**
 * Painel de Metas do Dia — reutilizável em qualquer aba.
 * Todas as dependências (estado, handlers) vêm por props.
 */
export default function PainelMetasDia({
  metas = [],
  metasOntem = [],
  cumpridasOntem = [],
  naoCumpridasOntem = [],
  canceladasOntem = [],
  ontemBR = '',
  novaMeta = { descricao: '' },
  setNovaMeta = () => {},
  setModalCancelamento = () => {},
  adicionarMetaManual = () => {},
  confirmarMeta = () => {},
  rejeitarMeta = () => {},
  marcarRealizado = () => {},
  manterMetaOntem = () => {},
  metaJaMantidaHoje = () => false,
  podeConfirmarMeta = () => false,
  podeManipularMeta = () => false,
  nomeLegivelMeta = (m) => m?.descricao || '',
  compacto = false
}) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl ${compacto ? 'p-4' : 'p-5'}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">
          🎯 Metas do Dia
        </h4>
      </div>

      {/* METAS DE ONTEM */}
      {metasOntem.length > 0 && (
        <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl p-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Metas de Ontem ({ontemBR})</p>
          {cumpridasOntem.length > 0 && <p className="text-xs text-green-700 font-semibold mb-1">✓ Cumpridas: {cumpridasOntem.length}</p>}
          {naoCumpridasOntem.map(m => (
            <div key={m.id} className="flex items-center justify-between gap-2 py-1 flex-wrap">
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-bold text-sm">✗</span>
                <div className="text-sm">
                  <span className="font-semibold text-slate-700">{m.descricao}</span>
                  <span className="text-red-600 font-bold text-xs ml-2">NÃO CUMPRIDA</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => manterMetaOntem(m)}
                  disabled={metaJaMantidaHoje(m)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                    metaJaMantidaHoje(m)
                      ? 'bg-green-100 text-green-700 border border-green-300 cursor-default'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >{metaJaMantidaHoje(m) ? '✓ Mantida hoje' : '✓ Manter'}</button>
                <button
                  onClick={() => setModalCancelamento({ id: m.id, justificativa: '', acao: 'cancelar_ontem', exigeJustificativa: true })}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                >✗ Cancelar</button>
              </div>
            </div>
          ))}
          {canceladasOntem.map(m => (
            <div key={m.id} className="py-1">
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-bold text-sm">✗</span>
                <div className="text-sm">
                  <span className="font-semibold text-slate-700 line-through">{m.descricao}</span>
                  <span className="text-red-600 font-bold text-xs ml-2">CANCELADA</span>
                  <p className="text-xs text-slate-500 italic">Justificativa: {m.justificativaCancelamento}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADICIONAR META */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Adicionar meta</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={novaMeta.descricao}
            onChange={e => setNovaMeta({ ...novaMeta, descricao: e.target.value })}
            placeholder="Descreva a meta (ex: manter SVD, RX tórax controle...)"
            className="flex-1 p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-300"
          />
          <button
            onClick={() => { adicionarMetaManual('', novaMeta.descricao); setNovaMeta({ ...novaMeta, descricao: '' }); }}
            disabled={!novaMeta.descricao.trim()}
            className="px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm disabled:opacity-50 transition-colors"
          >
            + Adicionar
          </button>
        </div>
      </div>

      {/* LISTA DE METAS */}
      {metas.length === 0 ? (
        <p className="text-sm text-slate-400 italic">Nenhuma meta para hoje.</p>
      ) : (
        <div className="space-y-2">
          {metas.map(m => (
            <div key={m.id} className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <BadgeStatusMeta status={m.status} />
                <span className="text-sm font-semibold text-slate-700">{nomeLegivelMeta(m)}</span>
                {m.status === 'cancelado' && (
                  <span className="text-xs text-slate-500 italic w-full">Justificativa: {m.justificativaCancelamento}</span>
                )}
                {m.status === 'realizado' && m.marcadoPor && (
                  <span className="text-[10px] text-slate-400">por {m.marcadoPor}</span>
                )}
              </div>
              <div className="flex gap-2">
                {m.status === 'aguardando' && podeConfirmarMeta(m) && (
                  <>
                    <button onClick={() => confirmarMeta(m.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">✓ Confirmar</button>
                    <button onClick={() => {
                      if ((m.origem || '').startsWith('auto_')) {
                        rejeitarMeta(m.id, '');
                      } else {
                        setModalCancelamento({ id: m.id, justificativa: '', acao: 'rejeitar', exigeJustificativa: true });
                      }
                    }} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors">✗ Rejeitar</button>
                  </>
                )}
                {m.status === 'pendente' && podeManipularMeta(m) && (
                  <>
                    <button onClick={() => marcarRealizado(m.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors">✓ Marcar realizado</button>
                    <button onClick={() => setModalCancelamento({ id: m.id, justificativa: '', acao: 'cancelar', exigeJustificativa: true })} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors">✗ Cancelar</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}