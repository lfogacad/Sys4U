import React from 'react';
import { ClipboardSignature, X, CheckCircle, Scale, Utensils, Lock } from 'lucide-react';
import { RISCO_NUTRICIONAL, CARACTERISTICAS_DIETA, FORMULAS_ENTERAIS } from '../../constants/clinicalLists';
import {
  safeNum,
  calcularIdade,
  AMPUTACAO_PESO,
  AMPUTACAO_ESTATURA,
  NRS_INICIAL,
  NRS_ESTADO_NUTRICIONAL,
  NRS_GRAVIDADE,
  calcularNutricaoDerivada
} from '../../utils/core';

const NutriAdmissionModal = ({
  showNutriModal,
  setShowNutriModal,
  activeTab,
  currentPatient,
  nutriData,
  setNutriData,
  handleFinalizeNutriAdmission,
  isReadOnly // 🔑 RECEBENDO A TRAVA AQUI
}) => {
  if (!showNutriModal) return null;

  // Bloqueia a alteração das características da dieta se estiver no modo leitura
  const toggleCaracteristica = (item) => {
    if (isReadOnly) return; 
    
    setNutriData(prev => {
      let arr = prev.caracteristicasDieta || [];
      if (arr.includes(item)) arr = arr.filter(i => i !== item);
      else arr = [...arr, item];
      return { ...prev, caracteristicasDieta: arr };
    });
  };

  // ===== ESTIMATIVAS ANTROPOMÉTRICAS E NRS 2002 (via core.js) =====
  const deriv = calcularNutricaoDerivada(nutriData, currentPatient);
  const {
    idadePaciente,
    isFem,
    estaturaEstimada,
    estaturaCorrigida,
    pesoEstimado,
    pesoCorrigido,
    nrsEscore,
    nrsRisco,
    nrsClassificacao,
    fatorPeso,
    fatorEstatura
  } = deriv;

  // Opções de amputação (para a UI)
  const AMPUTACOES_OPCOES = [
    { id: 'mao', label: 'Mão' },
    { id: 'antebraco', label: 'Antebraço' },
    { id: 'braco', label: 'Braço inteiro' },
    { id: 'pe', label: 'Pé' },
    { id: 'perna_abaixo_joelho', label: 'Perna abaixo do joelho' },
    { id: 'perna_inteira', label: 'Perna inteira' }
  ];

  const toggleAmputacao = (id) => {
    if (isReadOnly) return;
    setNutriData(prev => {
      let arr = prev.amputacoes || [];
      if (arr.includes(id)) arr = arr.filter(x => x !== id);
      else arr = [...arr, id];
      return { ...prev, amputacoes: arr };
    });
  };

  const nrsInicial = nutriData.nrsInicial || [];
  const nrsEstado = nutriData.nrsEstado || '';
  const nrsGravidade = nutriData.nrsGravidade || '';
  const nrsInicialSim = NRS_INICIAL.some(q => nrsInicial.includes(q.id));
  const nrsEstadoPontos = NRS_ESTADO_NUTRICIONAL.find(e => e.id === nrsEstado)?.pontos || 0;
  const nrsGravidadePontos = NRS_GRAVIDADE.find(g => g.id === nrsGravidade)?.pontos || 0;
  const nrsIdadePontos = (idadePaciente !== null && idadePaciente >= 70) ? 1 : 0;
  
  const toggleNrsInicial = (id) => {
    if (isReadOnly) return;
    setNutriData(prev => {
      let arr = prev.nrsInicial || [];
      if (arr.includes(id)) arr = arr.filter(x => x !== id);
      else arr = [...arr, id];
      return { ...prev, nrsInicial: arr };
    });
  };  

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[80] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* CABEÇALHO INTELIGENTE: Muda de cor se estiver trancado */}
        <div className={`p-4 text-white flex justify-between items-center shrink-0 shadow ${isReadOnly ? 'bg-slate-700' : 'bg-lime-600'}`}>
          <h3 className="font-bold flex items-center gap-2 text-lg">
            {isReadOnly ? <Lock size={20} /> : <ClipboardSignature size={20} />} 
            Admissão Nutricional (Leito {activeTab + 1})
            {isReadOnly && <span className="ml-2 text-xs bg-slate-800 px-2 py-1 rounded-full uppercase tracking-wider">Modo Leitura</span>}
          </h3>
          <button onClick={() => setShowNutriModal(false)} className="hover:bg-black/20 p-1 rounded transition-colors"><X size={20} /></button>
        </div>

        {/* CORPO DO MODAL: Fica levemente opaco se for apenas leitura */}
        <div className={`p-6 overflow-y-auto space-y-6 bg-slate-50 flex-1 ${isReadOnly ? 'opacity-90' : ''}`}>
          
          <div className="p-5 bg-white border border-lime-100 rounded-xl shadow-sm">
            <h4 className="font-bold text-lime-800 mb-4 flex items-center gap-2 border-b pb-2"><Scale size={18} /> Antropometria e Risco</h4>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                  Peso Atual (kg) <span className="text-red-500 text-sm">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    disabled={isReadOnly}
                    className="w-full p-2.5 border-2 border-lime-200 rounded-lg outline-none font-bold text-slate-700 focus:border-lime-500 focus:ring-2 focus:ring-lime-100 disabled:bg-slate-100 disabled:text-slate-500"
                    value={nutriData.peso || ""}
                    onChange={(e) => setNutriData({ ...nutriData, peso: e.target.value })}
                    placeholder="Ex: 75.5"
                  />
                  <select
                    disabled={isReadOnly}
                    className="p-2.5 border-2 border-lime-200 rounded-lg text-sm bg-white font-bold outline-none disabled:bg-slate-100 disabled:text-slate-500"
                    value={nutriData.tipoMedicaoPeso || ""}
                    onChange={(e) => setNutriData({ ...nutriData, tipoMedicaoPeso: e.target.value })}
                  >
                    <option value="">Tipo...</option>
                    <option value="Aferido">Aferido</option>
                    <option value="Referido">Referido</option>
                    <option value="Estimado">Estimado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Risco Nutricional (NRS 2002)</label>
                <select
                  disabled={isReadOnly}
                  className="w-full p-2.5 border rounded-lg bg-white text-red-700 font-bold disabled:bg-slate-100 disabled:text-slate-500"
                  value={nutriData.risco_nutricional || ""}
                  onChange={(e) => setNutriData({ ...nutriData, risco_nutricional: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {RISCO_NUTRICIONAL.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            {/* ESTIMATIVAS ANTROPOMÉTRICAS */}
            <div className="mt-5 border-t border-lime-100 pt-4">
              <h5 className="font-bold text-sm text-lime-800 mb-3 flex items-center gap-2">📏 Estimativas Antropométricas</h5>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Altura do Joelho (cm)</label>
                  <input type="number" disabled={isReadOnly} className="w-full p-2.5 border-2 border-lime-200 rounded-lg font-bold text-slate-700 outline-none focus:border-lime-500 disabled:bg-slate-100 disabled:text-slate-500" value={nutriData.alturaJoelho || ""} onChange={(e) => setNutriData({ ...nutriData, alturaJoelho: e.target.value })} placeholder="Ex: 50" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Circunferência do Braço (cm)</label>
                  <input type="number" disabled={isReadOnly} className="w-full p-2.5 border-2 border-lime-200 rounded-lg font-bold text-slate-700 outline-none focus:border-lime-500 disabled:bg-slate-100 disabled:text-slate-500" value={nutriData.circBraco || ""} onChange={(e) => setNutriData({ ...nutriData, circBraco: e.target.value })} placeholder="Ex: 30" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Circunferência Abdominal (cm)</label>
                  <input type="number" disabled={isReadOnly} className="w-full p-2.5 border-2 border-lime-200 rounded-lg font-bold text-slate-700 outline-none focus:border-lime-500 disabled:bg-slate-100 disabled:text-slate-500" value={nutriData.circAbdominal || ""} onChange={(e) => setNutriData({ ...nutriData, circAbdominal: e.target.value })} placeholder="Ex: 90" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Circunferência da Panturrilha (cm)</label>
                  <input type="number" disabled={isReadOnly} className="w-full p-2.5 border-2 border-lime-200 rounded-lg font-bold text-slate-700 outline-none focus:border-lime-500 disabled:bg-slate-100 disabled:text-slate-500" value={nutriData.circPanturrilha || ""} onChange={(e) => setNutriData({ ...nutriData, circPanturrilha: e.target.value })} placeholder="Ex: 32" />
                </div>
              </div>

              {/* Dados do paciente (idade/sexo) */}
              <div className="grid md:grid-cols-2 gap-4 mt-3">
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-0.5">Sexo</p>
                  <p className="text-sm font-bold text-slate-700">{isFem ? 'Feminino' : sexoPaciente ? 'Masculino' : '—'}</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-0.5">Idade</p>
                  <p className="text-sm font-bold text-slate-700">{idadePaciente !== null ? `${idadePaciente} anos` : '—'}</p>
                </div>
              </div>

              {/* Amputações */}
              <div className="mt-3">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Amputações (se houver)</p>
                <div className="flex flex-wrap gap-2">
                  {AMPUTACOES_OPCOES.map(op => {
                    const selecionada = (nutriData.amputacoes || []).includes(op.id);
                    return (
                      <button key={op.id} type="button" disabled={isReadOnly}
                        onClick={() => toggleAmputacao(op.id)}
                        className={`px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all ${selecionada ? 'border-lime-600 bg-lime-100 text-lime-800' : 'border-slate-200 bg-white text-slate-500 hover:border-lime-300'} ${isReadOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                        {selecionada ? '✓ ' : ''}{op.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Resultados */}
              <div className="mt-4 grid md:grid-cols-2 gap-3">
                <div className="p-3 bg-lime-50 border border-lime-200 rounded-lg">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Estatura Estimada</p>
                  {estaturaCorrigida !== null ? (
                    <p className="text-lg font-black text-lime-700">{estaturaCorrigida.toFixed(1)} cm</p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Preencha altura do joelho</p>
                  )}
                  {estaturaEstimada !== null && fatorEstatura > 0 && (
                    <p className="text-[10px] text-slate-400 font-bold">Corrigida p/ amputação (base {estaturaEstimada.toFixed(1)} cm)</p>
                  )}
                </div>
                <div className="p-3 bg-lime-50 border border-lime-200 rounded-lg">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Peso Estimado</p>
                  {pesoCorrigido !== null ? (
                    <p className="text-lg font-black text-lime-700">{pesoCorrigido.toFixed(1)} kg</p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Preencha as 3 circunferências</p>
                  )}
                  {pesoEstimado !== null && fatorPeso > 0 && (
                    <p className="text-[10px] text-slate-400 font-bold">Corrigido p/ amputação (base {pesoEstimado.toFixed(1)} kg)</p>
                  )}
                  {/* Botão para usar o peso estimado no campo Peso Atual */}
                  {pesoCorrigido !== null && !isReadOnly && (
                    <button
                      type="button"
                      onClick={() => setNutriData({ ...nutriData, peso: pesoCorrigido.toFixed(1) })}
                      className="mt-2 w-full px-3 py-2 rounded-lg bg-lime-600 hover:bg-lime-700 text-white font-bold text-xs transition-colors"
                    >✓ Usar peso estimado</button>
                  )}
                </div>
              </div>
            </div>

            {/* TRIAGEM NRS 2002 */}
            <div className="mt-5 border-t border-lime-100 pt-4">
              <h5 className="font-bold text-sm text-lime-800 mb-3 flex items-center gap-2">🩺 Triagem NRS 2002</h5>

              {/* Etapa 1 — Triagem inicial */}
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Triagem Inicial (marque os itens presentes)</p>
              <div className="grid sm:grid-cols-2 gap-2 mb-3">
                {NRS_INICIAL.map(q => {
                  const marcada = nrsInicial.includes(q.id);
                  return (
                    <label key={q.id} className={`flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded border ${isReadOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                      <input type="checkbox" disabled={isReadOnly} checked={marcada} onChange={() => toggleNrsInicial(q.id)} /> {q.label}
                    </label>
                  );
                })}
              </div>

              {!nrsInicialSim ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-sm font-bold text-slate-600">Nenhum item da triagem inicial marcado — sem risco aparente.</p>
                  <p className="text-xs text-slate-400 font-bold mt-1">Reavaliar em 7 dias. Escore: 0</p>
                </div>
              ) : (
                <>
                  {/* Etapa 2 — Triagem final */}
                  <div className="grid md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Estado Nutricional Comprometido</label>
                      <select disabled={isReadOnly} className="w-full p-2.5 border-2 border-lime-200 rounded-lg font-bold text-slate-700 outline-none focus:border-lime-500 disabled:bg-slate-100 disabled:text-slate-500 bg-white" value={nrsEstado} onChange={(e) => setNutriData({ ...nutriData, nrsEstado: e.target.value })}>
                        <option value="">Selecione...</option>
                        {NRS_ESTADO_NUTRICIONAL.map(o => <option key={o.id} value={o.id}>{o.label} ({o.pontos} pts)</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Gravidade da Doença</label>
                      <select disabled={isReadOnly} className="w-full p-2.5 border-2 border-lime-200 rounded-lg font-bold text-slate-700 outline-none focus:border-lime-500 disabled:bg-slate-100 disabled:text-slate-500 bg-white" value={nrsGravidade} onChange={(e) => setNutriData({ ...nutriData, nrsGravidade: e.target.value })}>
                        <option value="">Selecione...</option>
                        {NRS_GRAVIDADE.map(o => <option key={o.id} value={o.id}>{o.label} ({o.pontos} pts)</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Resultado do escore */}
                  <div className={`mt-4 p-3 rounded-lg border ${nrsRisco ? 'bg-red-50 border-red-200' : 'bg-lime-50 border-lime-200'}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-500 uppercase">Escore Total</p>
                      <p className={`text-2xl font-black ${nrsRisco ? 'text-red-700' : 'text-lime-700'}`}>{nrsEscore} <span className="text-sm font-bold text-slate-400">pts</span></p>
                    </div>
                    <p className="text-sm font-bold mt-1">
                      <span className="text-slate-600">Estado nutricional:</span> {nrsEstadoPontos} pts · <span className="text-slate-600">Gravidade:</span> {nrsGravidadePontos} pts · <span className="text-slate-600">Idade (≥70):</span> {nrsIdadePontos} pts
                    </p>
                    <p className={`text-sm font-black mt-1 ${nrsRisco ? 'text-red-700' : 'text-lime-700'}`}>{nrsClassificacao}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="p-5 bg-white border border-lime-100 rounded-xl shadow-sm">
            <h4 className="font-bold text-lime-800 mb-4 flex items-center gap-2 border-b pb-2">Metas Nutricionais</h4>
            {/* Ajustado para 4 colunas no desktop e 2 no tablet */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Meta Calórica Total</label>
                <input type="number" disabled={isReadOnly} className="w-full p-2.5 border rounded-lg font-bold disabled:bg-slate-100 disabled:text-slate-500" value={nutriData.metaCalTotal || ""} onChange={(e) => setNutriData({ ...nutriData, metaCalTotal: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Meta Calórica Diária</label>
                <input type="number" disabled={isReadOnly} className="w-full p-2.5 border rounded-lg font-bold disabled:bg-slate-100 disabled:text-slate-500" value={nutriData.metaCalDiaria || ""} onChange={(e) => setNutriData({ ...nutriData, metaCalDiaria: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Meta Proteica Total</label>
                <input type="number" disabled={isReadOnly} className="w-full p-2.5 border rounded-lg font-bold disabled:bg-slate-100 disabled:text-slate-500" value={nutriData.metaProtTotal || ""} onChange={(e) => setNutriData({ ...nutriData, metaProtTotal: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Meta Proteica Diária</label>
                <input type="number" disabled={isReadOnly} className="w-full p-2.5 border rounded-lg font-bold disabled:bg-slate-100 disabled:text-slate-500" value={nutriData.metaProtDiaria || ""} onChange={(e) => setNutriData({ ...nutriData, metaProtDiaria: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="p-5 bg-white border border-lime-100 rounded-xl shadow-sm">
            <h4 className="font-bold text-lime-800 mb-4 flex items-center gap-2 border-b pb-2"><Utensils size={18} /> Dieta Inicial</h4>
            <div className="mb-5">
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Via Principal</label>
              <select disabled={isReadOnly} className="w-full p-3 border-2 border-lime-200 rounded-lg font-bold disabled:bg-slate-100 disabled:text-slate-500" value={nutriData.via || ""} onChange={(e) => setNutriData({ ...nutriData, via: e.target.value })}>
                <option value="">Selecione...</option>
                <option value="Oral">Oral</option>
                <option value="Enteral">Enteral</option>
                <option value="Parenteral">Parenteral</option>
                <option value="Zero">Zero</option>
                <option value="Mista">Mista</option>
              </select>
            </div>

            {/* SUBOPÇÕES QUANDO VIA = ENTERAL */}
            {nutriData.via === "Enteral" && (
              <div className="grid grid-cols-2 gap-3 mt-4 animate-fadeIn">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tipo/Fórmula (Enteral)</label>
                  <select
                    disabled={isReadOnly}
                    className="w-full p-2.5 border-2 border-lime-200 rounded-lg font-bold text-slate-700 outline-none focus:border-lime-500 disabled:bg-slate-100 disabled:text-slate-500 bg-white"
                    value={nutriData.tipoDietaEnteral || ""}
                    onChange={(e) => setNutriData({ ...nutriData, tipoDietaEnteral: e.target.value })}
                  >
                    <option value="">Selecione a fórmula enteral...</option>
                    {FORMULAS_ENTERAIS.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Vazão (ml/h) — Enteral</label>
                  <input
                    type="number"
                    disabled={isReadOnly}
                    className="w-full p-2.5 border-2 border-lime-200 rounded-lg font-bold text-slate-700 outline-none focus:border-lime-500 disabled:bg-slate-100 disabled:text-slate-500"
                    value={nutriData.vazaoEnteral || ""}
                    onChange={(e) => setNutriData({ ...nutriData, vazaoEnteral: e.target.value })}
                    placeholder="Ex: 50"
                  />
                </div>
              </div>
            )}

            {/* SUBOPÇÕES QUANDO VIA = PARENTERAL */}
            {nutriData.via === "Parenteral" && (
              <div className="mt-4 animate-fadeIn">
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Vazão (ml/h) — Parenteral</label>
                <input
                  type="number"
                  disabled={isReadOnly}
                  className="w-full p-2.5 border-2 border-lime-200 rounded-lg font-bold text-slate-700 outline-none focus:border-lime-500 disabled:bg-slate-100 disabled:text-slate-500"
                  value={nutriData.vazaoParenteral || ""}
                  onChange={(e) => setNutriData({ ...nutriData, vazaoParenteral: e.target.value })}
                  placeholder="Ex: 40"
                />
              </div>
            )}

            {/* SELEÇÃO MÚLTIPLA QUANDO VIA = MISTA */}
            {nutriData.via === "Mista" && (
              <div className="mt-4 p-4 bg-lime-50/50 border-2 border-lime-200 rounded-xl animate-fadeIn">
                <label className="text-xs font-bold text-slate-600 uppercase mb-2 block">
                  Vias que compõem a dieta mista
                </label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {['Parenteral', 'Enteral', 'Oral'].map((viaMista) => {
                    const selecionada = (nutriData.viasMistas || []).includes(viaMista);
                    return (
                      <button
                        key={viaMista}
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => {
                          if (isReadOnly) return;
                          setNutriData(prev => {
                            let arr = prev.viasMistas || [];
                            if (arr.includes(viaMista)) arr = arr.filter(v => v !== viaMista);
                            else arr = [...arr, viaMista];
                            return { ...prev, viasMistas: arr };
                          });
                        }}
                        className={`px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all ${
                          selecionada
                            ? 'border-lime-600 bg-lime-100 text-lime-800 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-lime-300'
                        } ${isReadOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                      >
                        {selecionada ? '✓ ' : ''}{viaMista}
                      </button>
                    );
                  })}
                </div>

                {/* SUBOPÇÕES POR VIA SELECIONADA */}
                {(nutriData.viasMistas || []).includes('Enteral') && (
                  <div className="grid grid-cols-2 gap-3 mb-3 animate-fadeIn">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tipo/Fórmula (Enteral)</label>
                      <select
                        disabled={isReadOnly}
                        className="w-full p-2.5 border-2 border-lime-200 rounded-lg font-bold text-slate-700 outline-none focus:border-lime-500 disabled:bg-slate-100 disabled:text-slate-500 bg-white"
                        value={nutriData.tipoDietaEnteral || ""}
                        onChange={(e) => setNutriData({ ...nutriData, tipoDietaEnteral: e.target.value })}
                      >
                        <option value="">Selecione a fórmula enteral...</option>
                        {FORMULAS_ENTERAIS.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Vazão (ml/h) — Enteral</label>
                      <input
                        type="number"
                        disabled={isReadOnly}
                        className="w-full p-2.5 border-2 border-lime-200 rounded-lg font-bold text-slate-700 outline-none focus:border-lime-500 disabled:bg-slate-100 disabled:text-slate-500"
                        value={nutriData.vazaoEnteral || ""}
                        onChange={(e) => setNutriData({ ...nutriData, vazaoEnteral: e.target.value })}
                        placeholder="Ex: 50"
                      />
                    </div>
                  </div>
                )}

                {(nutriData.viasMistas || []).includes('Parenteral') && (
                  <div className="mb-3 animate-fadeIn">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Vazão (ml/h) — Parenteral</label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      className="w-full p-2.5 border-2 border-lime-200 rounded-lg font-bold text-slate-700 outline-none focus:border-lime-500 disabled:bg-slate-100 disabled:text-slate-500"
                      value={nutriData.vazaoParenteral || ""}
                      onChange={(e) => setNutriData({ ...nutriData, vazaoParenteral: e.target.value })}
                      placeholder="Ex: 40"
                    />
                  </div>
                )}

                {(nutriData.viasMistas || []).includes('Oral') && (
                  <div className="p-3 bg-white border border-lime-200 rounded-lg text-xs text-slate-500 font-bold animate-fadeIn">
                    ✓ Via Oral selecionada — use as características da dieta abaixo para definir hipossódica, DM, laxativa, etc.
                  </div>
                )}
              </div>
            )}            
            {/* Características da dieta — quando via Oral ou Mista com Oral marcada */}
            {(nutriData.via === "Oral" || (nutriData.via === "Mista" && (nutriData.viasMistas || []).includes('Oral'))) && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {CARACTERISTICAS_DIETA.map((c) => (
                  <label key={c} className={`flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded border ${isReadOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                    <input type="checkbox" disabled={isReadOnly} checked={(nutriData.caracteristicasDieta || []).includes(c)} onChange={() => toggleCaracteristica(c)} /> {c}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RODAPÉ DO MODAL */}
        <div className="p-4 bg-white border-t flex justify-end gap-3 shrink-0">
          <button onClick={() => setShowNutriModal(false)} className="px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            {isReadOnly ? "Fechar" : "Cancelar"}
          </button>
          
          {/* 🔑 SÓ MOSTRA O BOTÃO DE SALVAR SE NÃO ESTIVER EM MODO LEITURA */}
          {!isReadOnly && (
            <button onClick={handleFinalizeNutriAdmission} className="px-6 py-2.5 rounded-xl font-bold text-white bg-lime-600 hover:bg-lime-700 flex items-center gap-2 shadow-md transition-colors">
              <CheckCircle size={18} /> Salvar Admissão
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NutriAdmissionModal;