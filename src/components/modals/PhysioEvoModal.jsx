import React, { useState, useEffect } from 'react';
import { FileText, X, Copy, Activity, Shield, ClipboardCheck, Target, Wind } from 'lucide-react';
import { ICU_MOBILITY_SCALE, ASPECTO_SECRECAO, COLORACAO_SECRECAO, QTD_SECRECAO } from '../../constants/clinicalLists';

const PhysioEvoModal = ({
  showPhysioEvoModal,
  setShowPhysioEvoModal,
  currentPatient,
  updateNested,
  handleBlurSave,
  handleGeneratePhysioEvo
}) => {
  const [evolucaoData, setEvolucaoData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Inicializa o estado local com os dados atuais do paciente toda vez que o modal abre
  useEffect(() => {
    if (showPhysioEvoModal && currentPatient?.physio) {
      const physio = currentPatient.physio;
      setEvolucaoData({
        // Avaliação Respiratória
        expansibilidadeTipo: physio.expansibilidadeTipo || "",
        expansibilidadePredominio: physio.expansibilidadePredominio || "",
        auscultaPulmonar: physio.auscultaPulmonar || "",
        tosse: physio.tosse || "",
        secrecao: physio.secrecao || false,
        secrecaoAspecto: physio.secrecaoAspecto || "",
        secrecaoColoracao: physio.secrecaoColoracao || "",
        secrecaoQtd: physio.secrecaoQtd || "",
        desconfortoRespiratorio: physio.desconfortoRespiratorio || false,
        sinaisDesconforto: Array.isArray(physio.sinaisDesconforto) ? [...physio.sinaisDesconforto] : [],
        // Avaliação Musculoesquelética
        tonusMuscular: physio.tonusMuscular || "",
        retracoesMusculares: physio.retracoesMusculares || false,
        amplitudeMovimento: physio.amplitudeMovimento || "",
        amplitudeDescricao: physio.amplitudeDescricao || "",
        // Escalas Funcionais
        mrcScore: physio.mrcScore_plano || "",
        ims: physio.ims || "",
        // Condutas e Planejamento
        condutas: physio.condutas || "",
        planoMetas: physio.planoMetas || "",
        observacoes: physio.observacoes || "",
        intercorrencias: physio.intercorrencias || ""
      });
    }
  }, [showPhysioEvoModal, currentPatient]);

  if (!showPhysioEvoModal) return null;

  const handleFinalize = () => {
    setIsSaving(true);
    // Salva todos os campos no physio do paciente
    const campos = [
      'expansibilidadeTipo', 'expansibilidadePredominio', 'auscultaPulmonar',
      'tosse', 'secrecao', 'secrecaoAspecto', 'secrecaoColoracao', 'secrecaoQtd',
      'desconfortoRespiratorio', 'sinaisDesconforto',
      'tonusMuscular', 'retracoesMusculares', 'amplitudeMovimento', 'amplitudeDescricao',
      'mrcScore', 'ims',
      'condutas', 'planoMetas', 'observacoes', 'intercorrencias'
    ];

    campos.forEach(campo => {
      updateNested("physio", campo, evolucaoData[campo]);
    });

    handleBlurSave("Fisioterapia: Evolução diária finalizada");
    
    // Dispara a geração do texto de evolução
    if (typeof handleGeneratePhysioEvo === 'function') {
      setTimeout(() => {
        handleGeneratePhysioEvo();
        setIsSaving(false);
        setShowPhysioEvoModal(false);
      }, 100);
    } else {
      setIsSaving(false);
      setShowPhysioEvoModal(false);
    }
  };

  const handleCopyToClipboard = () => {
    // Monta o texto formatado da evolução
    const mobText = Array.isArray(evolucaoData.mobilizacao) && evolucaoData.mobilizacao.length > 0
      ? `Mobilização: ${evolucaoData.mobilizacao.join(", ")}`
      : "";
    const mrcText = evolucaoData.mrcScore ? `Escore MRC: ${evolucaoData.mrcScore}` : "";
    const imsText = evolucaoData.ims ? `IMS: ${evolucaoData.ims}` : "";

    const sinaisTexto = Array.isArray(evolucaoData.sinaisDesconforto) && evolucaoData.sinaisDesconforto.length > 0
      ? `Sinais de desconforto: ${evolucaoData.sinaisDesconforto.join("; ")}. `
      : "Sem sinais de desconforto respiratório. ";

    const secrecaoTexto = evolucaoData.secrecao
      ? `Secreção presente (${evolucaoData.secrecaoAspecto || ""} / ${evolucaoData.secrecaoColoracao || ""} / ${evolucaoData.secrecaoQtd || ""}). `
      : "Sem secreção. ";

    const texto = [
      `EVOLUÇÃO FISIOTERAPÊUTICA`,
      ``,
      `Avaliação Respiratória: Expansibilidade ${evolucaoData.expansibilidadeTipo || "não avaliada"} (predomínio ${evolucaoData.expansibilidadePredominio || "não avaliado"}). ` +
        `Ausculta pulmonar: ${evolucaoData.auscultaPulmonar || "sem alterações"}. ` +
        `Tosse ${evolucaoData.tosse || "não avaliada"}. ${secrecaoTexto}` +
        `${sinaisTexto}`,
      ``,
      `Avaliação Musculoesquelética: Tônus ${evolucaoData.tonusMuscular || "não avaliado"}. ` +
        `Amplitude de movimento ${evolucaoData.amplitudeMovimento || "não avaliada"}. ` +
        `${evolucaoData.retracoesMusculares ? "Retrações musculares presentes. " : ""}` +
        `${evolucaoData.amplitudeDescricao ? `Articulações comprometidas: ${evolucaoData.amplitudeDescricao}. ` : ""}` +
        `${mrcText ? mrcText + ". " : ""}` +
        `${imsText ? imsText + "." : ""}`,
      ``,
      `Condutas Realizadas: ${evolucaoData.condutas || "condutas conforme avaliação"}`,
      ``,
      `Plano/Metas: ${evolucaoData.planoMetas || "manter condutas"}`,
      `Observações: ${evolucaoData.observacoes || "sem observações adicionais"}`,
      ``,
      `Intercorrências: ${evolucaoData.intercorrencias || "nenhuma intercorrência no plantão"}`
    ].join("\n");

    navigator.clipboard.writeText(texto);
    alert("Evolução copiada com sucesso! Cole no prontuário eletrônico do hospital.");
  };

  const updateField = (field, value) => {
    setEvolucaoData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSinalDesconforto = (sinal) => {
    setEvolucaoData(prev => {
      const current = Array.isArray(prev.sinaisDesconforto) ? [...prev.sinaisDesconforto] : [];
      const updated = current.includes(sinal)
        ? current.filter(s => s !== sinal)
        : [...current, sinal];
      return { ...prev, sinaisDesconforto: updated };
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[90] flex items-center justify-center p-2 md:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-white w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col">
        
        {/* HEADER */}
        <div className="p-4 bg-gradient-to-r from-cyan-700 to-blue-800 text-white flex justify-between items-center sticky top-0 z-10 shadow shrink-0">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <FileText size={20} className="text-cyan-300" />
            Evolução Diária - {currentPatient?.nome || "Paciente"}
          </h2>
          <button onClick={() => setShowPhysioEvoModal(false)} className="hover:bg-black/20 p-1 rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* CORPO */}
        <div className="p-6 space-y-5 text-sm bg-slate-50">
          
          {/* ============================================================ */}
          {/* BLOCO 1: AVALIAÇÃO RESPIRATÓRIA */}
          {/* ============================================================ */}
          <div className="bg-white p-5 border border-sky-100 rounded-xl shadow-sm">
            <h4 className="font-bold text-sky-800 text-xs uppercase mb-4 flex items-center gap-2 border-b border-sky-100 pb-3">
              <Activity size={15} className="text-sky-600" /> Avaliação Respiratória
            </h4>

            {/* Expansibilidade Torácica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Expansibilidade Torácica</label>
                <select
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-700 outline-none focus:ring-2 focus:ring-sky-200"
                  value={evolucaoData.expansibilidadeTipo || ""}
                  onChange={(e) => updateField('expansibilidadeTipo', e.target.value)}
                >
                  <option value="">Simetria...</option>
                  <option value="Simétrica">Simétrica</option>
                  <option value="Assimétrica">Assimétrica</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">&nbsp;</label>
                <select
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-700 outline-none focus:ring-2 focus:ring-sky-200"
                  value={evolucaoData.expansibilidadePredominio || ""}
                  onChange={(e) => updateField('expansibilidadePredominio', e.target.value)}
                >
                  <option value="">Predomínio...</option>
                  <option value="Costal">Costal</option>
                  <option value="Abdominal">Abdominal</option>
                  <option value="Misto">Misto</option>
                </select>
              </div>
            </div>

            {/* Ausculta Pulmonar */}
            <div className="mb-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Ausculta Pulmonar</label>
              <textarea
                className="w-full p-3 border border-slate-200 rounded-lg bg-white text-xs text-slate-700 outline-none focus:ring-2 focus:ring-sky-200 resize-y h-16 leading-relaxed"
                value={evolucaoData.auscultaPulmonar || ""}
                onChange={(e) => updateField('auscultaPulmonar', e.target.value)}
                placeholder="Ex: MVF s/ RA. ou MV reduzido em bases..."
              />
            </div>

            {/* Tosse */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Tosse</label>
                <select
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-700 outline-none focus:ring-2 focus:ring-sky-200"
                  value={evolucaoData.tosse || ""}
                  onChange={(e) => updateField('tosse', e.target.value)}
                >
                  <option value="">Selecione...</option>
                  <option value="Eficaz">Eficaz</option>
                  <option value="Ineficaz">Ineficaz</option>
                  <option value="Ausente">Ausente</option>
                </select>
              </div>
            </div>

            {/* Secreção */}
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <label className="flex items-center gap-2 mb-2 text-xs text-slate-700 font-bold cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5" checked={evolucaoData.secrecao || false} onChange={(e) => updateField('secrecao', e.target.checked)} />
                Secreção Presente?
              </label>
              {evolucaoData.secrecao && (
                <div className="grid grid-cols-3 gap-2 mt-3 animate-fadeIn">
                  <select className="p-2 border rounded bg-white text-xs" value={evolucaoData.secrecaoAspecto || ""} onChange={(e) => updateField('secrecaoAspecto', e.target.value)}>
                    <option value="">Aspecto...</option>
                    {ASPECTO_SECRECAO.map((a) => (<option key={a}>{a}</option>))}
                  </select>
                  <select className="p-2 border rounded bg-white text-xs" value={evolucaoData.secrecaoColoracao || ""} onChange={(e) => updateField('secrecaoColoracao', e.target.value)}>
                    <option value="">Coloração...</option>
                    {COLORACAO_SECRECAO.map((c) => (<option key={c}>{c}</option>))}
                  </select>
                  <select className="p-2 border rounded bg-white text-xs" value={evolucaoData.secrecaoQtd || ""} onChange={(e) => updateField('secrecaoQtd', e.target.value)}>
                    <option value="">Qtd...</option>
                    {QTD_SECRECAO.map((q) => (<option key={q}>{q}</option>))}
                  </select>
                </div>
              )}
            </div>

            {/* Sinais de Desconforto Respiratório */}
            <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
              <label className="flex items-center gap-2 mb-2 text-xs font-bold text-amber-800 cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 text-amber-600" checked={evolucaoData.desconfortoRespiratorio || false} onChange={(e) => updateField('desconfortoRespiratorio', e.target.checked)} />
                Sinais de Desconforto Respiratório
              </label>
              {evolucaoData.desconfortoRespiratorio && (
                <div className="grid grid-cols-2 gap-2 mt-3 animate-fadeIn">
                  {[
                    "Retração supraclavicular",
                    "Batimento de asa de nariz",
                    "Tiragem intercostal",
                    "Tiragem subcostal",
                    "Respiração paradoxal",
                    "Uso da musculatura abdominal na expiração"
                  ].map((sinal) => (
                    <label key={sinal} className="flex items-center gap-2 text-[11px] font-semibold text-amber-900 cursor-pointer hover:bg-amber-100/50 p-1 rounded transition-colors">
                      <input type="checkbox" className="w-3.5 h-3.5 text-amber-600 rounded focus:ring-amber-500" checked={Array.isArray(evolucaoData.sinaisDesconforto) && evolucaoData.sinaisDesconforto.includes(sinal)} onChange={() => toggleSinalDesconforto(sinal)} />
                      {sinal}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* BLOCO 2: AVALIAÇÃO MUSCULOESQUELÉTICA */}
          {/* ============================================================ */}
          <div className="bg-white p-5 border border-emerald-100 rounded-xl shadow-sm">
            <h4 className="font-bold text-emerald-800 text-xs uppercase mb-4 flex items-center gap-2 border-b border-emerald-100 pb-3">
              <Activity size={15} className="text-emerald-600" /> Avaliação Musculoesquelética
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Tônus Muscular</label>
                <select
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-700 outline-none focus:ring-2 focus:ring-emerald-200"
                  value={evolucaoData.tonusMuscular || ""}
                  onChange={(e) => updateField('tonusMuscular', e.target.value)}
                >
                  <option value="">Selecione...</option>
                  <option value="Normotônico">Normotônico</option>
                  <option value="Hipotônico">Hipotônico</option>
                  <option value="Hipertônico">Hipertônico</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Amplitude de Movimento</label>
                <select
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-700 outline-none focus:ring-2 focus:ring-emerald-200"
                  value={evolucaoData.amplitudeMovimento || ""}
                  onChange={(e) => {
                    updateField('amplitudeMovimento', e.target.value);
                    if (e.target.value !== "Reduzida") {
                      updateField('amplitudeDescricao', "");
                    }
                  }}
                >
                  <option value="">Selecione...</option>
                  <option value="Preservada">Preservada</option>
                  <option value="Reduzida">Reduzida</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Retrações Musculares</label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer mt-4">
                  <input type="checkbox" className="w-3.5 h-3.5" checked={evolucaoData.retracoesMusculares || false} onChange={(e) => updateField('retracoesMusculares', e.target.checked)} />
                  Presentes
                </label>
              </div>
            </div>
            {evolucaoData.amplitudeMovimento === "Reduzida" && (
              <div className="mt-4 animate-fadeIn">
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Articulações comprometidas</label>
                <textarea
                  className="w-full p-3 border border-slate-200 rounded-lg bg-white text-xs text-slate-700 outline-none focus:ring-2 focus:ring-emerald-200 resize-y h-16"
                  value={evolucaoData.amplitudeDescricao || ""}
                  onChange={(e) => updateField('amplitudeDescricao', e.target.value)}
                  placeholder="Relacione as articulações com ADM reduzida..."
                />
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* BLOCO 3: ESCALAS FUNCIONAIS */}
          {/* ============================================================ */}
          <div className="bg-white p-5 border border-purple-100 rounded-xl shadow-sm">
            <h4 className="font-bold text-purple-800 text-xs uppercase mb-4 flex items-center gap-2 border-b border-purple-100 pb-3">
              <Activity size={15} className="text-purple-600" /> Escalas Funcionais
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-purple-700 mb-1">
                  Escore MRC (0-60) <span className="text-red-500 ml-0.5">*</span>
                </label>
                <input
                  type="number" min="0" max="60"
                  className="w-full p-2 border border-purple-200 rounded-lg bg-white text-xs text-center font-bold text-purple-900 outline-none focus:ring-2 focus:ring-purple-200"
                  placeholder="Soma MRC..."
                  value={evolucaoData.mrcScore || ""}
                  onChange={(e) => updateField('mrcScore', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-purple-700 mb-1">
                  ICU Mobility Scale (IMS) <span className="text-red-500 ml-0.5">*</span>
                </label>
                <select
                  className="w-full p-2 border border-purple-200 rounded-lg bg-white text-xs font-bold text-purple-900 outline-none focus:ring-2 focus:ring-purple-200"
                  value={evolucaoData.ims || ""}
                  onChange={(e) => updateField('ims', e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {ICU_MOBILITY_SCALE.map((scale) => (
                    <option key={scale} value={scale}>{scale}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* BLOCO 4: CONDUTAS E PLANEJAMENTO */}
          {/* ============================================================ */}
          <div className="space-y-4">
            {/* Condutas Fisioterapêuticas */}
            <div className="bg-white p-5 border border-teal-100 rounded-xl shadow-sm">
              <h4 className="font-bold text-teal-800 text-xs uppercase mb-4 flex items-center gap-2 border-b border-teal-100 pb-3">
                <ClipboardCheck size={15} className="text-teal-600" /> Condutas Fisioterapêuticas Realizadas
              </h4>
              <textarea
                className="w-full p-3 border border-teal-200 rounded-lg bg-white text-xs text-slate-700 outline-none focus:ring-2 focus:ring-teal-200 resize-y h-28 leading-relaxed"
                value={evolucaoData.condutas || ""}
                onChange={(e) => updateField('condutas', e.target.value)}
                placeholder="• Monitorização contínua de sinais vitais e vigilância respiratória;..."
              />
            </div>

            {/* Plano / Metas */}
            <div className="bg-white p-5 border border-green-100 rounded-xl shadow-sm">
              <h4 className="font-bold text-green-800 text-xs uppercase mb-4 flex items-center gap-2 border-b border-green-100 pb-3">
                <Target size={15} className="text-green-600" /> Plano / Metas para o Próximo Plantão
              </h4>
              <textarea
                className="w-full p-3 border border-green-200 rounded-lg bg-white text-xs text-slate-700 outline-none focus:ring-2 focus:ring-green-200 resize-y h-24 leading-relaxed"
                value={evolucaoData.planoMetas || ""}
                onChange={(e) => updateField('planoMetas', e.target.value)}
                placeholder="Ex: Manter desmame ventilatório, progredir sedestação beira-leito..."
              />
            </div>

            {/* Observações Importantes */}
            <div className="bg-white p-5 border border-orange-100 rounded-xl shadow-sm">
              <h4 className="font-bold text-orange-800 text-xs uppercase mb-4 flex items-center gap-2 border-b border-orange-100 pb-3">
                <FileText size={15} className="text-orange-600" /> Observações Importantes
              </h4>
              <textarea
                className="w-full p-3 border border-orange-200 rounded-lg bg-white text-xs text-slate-700 outline-none focus:ring-2 focus:ring-orange-200 resize-y h-24 leading-relaxed"
                value={evolucaoData.observacoes || ""}
                onChange={(e) => updateField('observacoes', e.target.value)}
                placeholder="Ex: Paciente apresentou agitação psicomotora à noite, necessitou contenção..."
              />
            </div>

            {/* Intercorrências */}
            <div className="bg-white p-5 border border-red-100 rounded-xl shadow-sm">
              <h4 className="font-bold text-red-800 text-xs uppercase mb-4 flex items-center gap-2 border-b border-red-100 pb-3">
                <Shield size={15} className="text-red-600" /> Intercorrências do Plantão
              </h4>
              <textarea
                className="w-full p-3 border border-red-200 rounded-lg bg-white text-xs text-slate-700 outline-none focus:ring-2 focus:ring-red-200 resize-y h-20 leading-relaxed"
                value={evolucaoData.intercorrencias || ""}
                onChange={(e) => updateField('intercorrencias', e.target.value)}
                placeholder="Relate intercorrências ocorridas durante o plantão..."
              />
            </div>
          </div>

        </div>

        {/* RODAPÉ */}
        <div className="p-4 bg-slate-100 border-t flex flex-col-reverse sm:flex-row justify-between items-center gap-3 sticky bottom-0 z-10 shrink-0">
          <button onClick={() => setShowPhysioEvoModal(false)} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors w-full sm:w-auto">
            Fechar
          </button>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={handleCopyToClipboard}
              className="px-6 py-3 bg-white border-2 border-cyan-600 text-cyan-700 rounded-xl font-bold hover:bg-cyan-50 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Copy size={18} /> Copiar Texto
            </button>
            <button
              onClick={handleFinalize}
              disabled={isSaving}
              className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-colors flex items-center justify-center gap-2 w-full sm:w-auto ${isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600'}`}
            >
              <FileText size={18} /> {isSaving ? "Salvando..." : "Finalizar e Gerar Evolução"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PhysioEvoModal;