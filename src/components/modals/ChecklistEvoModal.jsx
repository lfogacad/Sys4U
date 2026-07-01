import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, Bug, CheckCircle, Stethoscope, ArrowRight, ArrowLeft, Microscope, Activity } from 'lucide-react';
import { RASS_OPTS, GLASGOW_AO, GLASGOW_RV, GLASGOW_RM } from '../../constants/clinicalLists'; 

const ChecklistEvoModal = ({
  showChecklistEvo,
  setShowChecklistEvo,
  currentPatient,
  updateNested,
  updateP,
  confirmarEGerar
}) => {
  // ==========================================
  // ESTADOS DO MODAL DE 2 TEMPOS
  // ==========================================
  const [fase, setFase] = useState(1);
  const [erroValidacao, setErroValidacao] = useState("");

  // Estados da Fase 2 (Controle de Infecção / PAV)
  const [culturaHoje, setCulturaHoje] = useState(null);
  const [culturasTipos, setCulturasTipos] = useState([]);
  const [culturaOutro, setCulturaOutro] = useState("");
  
  const [imagemPulmonar, setImagemPulmonar] = useState(null);
  const [novoInfiltrado, setNovoInfiltrado] = useState(null);

  // Reseta o modal sempre que ele for aberto/fechado
  useEffect(() => {
    if (showChecklistEvo) {
      setFase(1);
      setErroValidacao("");
      setCulturaHoje(null);
      setCulturasTipos([]);
      setCulturaOutro("");
      setImagemPulmonar(null);
      setNovoInfiltrado(null);
    }
  }, [showChecklistEvo]);

  if (!showChecklistEvo || !currentPatient) return null;

  const med = currentPatient.medical || {};
  const neuro = currentPatient.neuro || {};
  const cardio = currentPatient.cardio || {};

  const toggleArrayItemLocal = (categoria, campoArray, item) => {
    const atual = currentPatient[categoria]?.[campoArray] || [];
    const novoArray = atual.includes(item) 
      ? atual.filter(i => i !== item) 
      : [...atual, item];
    updateNested(categoria, campoArray, novoArray);
  };

  const toggleTipoCultura = (tipo) => {
    if (culturasTipos.includes(tipo)) {
      setCulturasTipos(culturasTipos.filter(t => t !== tipo));
    } else {
      setCulturasTipos([...culturasTipos, tipo]);
    }
  };

  // ==========================================
  // VALIDAÇÃO E CONFIRMAÇÃO FINAL
  // ==========================================
  const handleFinalConfirm = () => {
    if (culturaHoje === null || imagemPulmonar === null) {
      setErroValidacao("Por favor, responda se houve coleta de cultura e imagem pulmonar.");
      return;
    }
    if (imagemPulmonar === 'sim' && novoInfiltrado === null) {
      setErroValidacao("Por favor, informe se há um novo infiltrado na imagem pulmonar.");
      return;
    }

    // ====================================================================
    // 🚨 A MÁGICA ACONTECE AQUI: GRAVANDO NO BANCO PARA O ROBÔ DA PAV LER
    // ====================================================================
    updateNested("medical", "imagemPulmonar", imagemPulmonar);
    updateNested("medical", "novoInfiltrado", imagemPulmonar === 'sim' ? novoInfiltrado : "nao");

    // Preparamos o pacote de dados para enviar direto para a evolução da IA
    const dadosEnvio = {
      // Como não temos a variável 'med' inteira no escopo da função, usamos o currentPatient para evitar erros
      estadoGeral: currentPatient?.medical?.estadoGeral || "REG",
      atbs: currentPatient?.medical?.antibioticosTextoIA || "",
      // Dados da CCIH
      culturaColetadaHoje: culturaHoje === 'sim',
      culturasTipos: culturasTipos,
      culturaOutroDetalhe: culturaOutro,
      // Incluímos no pacote caso a IA queira citar a imagem na evolução escrita
      imagemPulmonar: imagemPulmonar,
      novoInfiltrado: novoInfiltrado
    };

    setErroValidacao("");
    setShowChecklistEvo(false);

    // Passamos o pacote direto para a função generateAIEvolution
    setTimeout(() => {
      confirmarEGerar(dadosEnvio);
    }, 300);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-[90] flex justify-center items-center backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] transition-all duration-300">
        
        {/* CABEÇALHO */}
        <div className="p-4 bg-slate-800 text-white flex justify-between items-center shrink-0">
          <h3 className="font-bold flex items-center gap-2">
            <ShieldAlert size={18} className="text-amber-400" />
            {fase === 1 ? "Timeout Clínico: Sincronização de Dados" : "Checklist Obrigatório: CCIH e Risco"}
          </h3>
          <button onClick={() => setShowChecklistEvo(false)} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto bg-slate-50 flex-1">
          
          {/* ========================================== */}
          {/* FASE 1: CHECKLIST CLÍNICO TRADICIONAL        */}
          {/* ========================================== */}
          {fase === 1 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LADO ESQUERDO: GERAL E NEURO */}
                <div className="space-y-4">
                  <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase">Estado Geral</label>
                    <div className="flex gap-2">
                      {["BEG", "REG", "MEG"].map(eg => (
                        <button 
                          key={eg} 
                          onClick={() => updateNested("medical", "estadoGeral", eg)} 
                          className={`flex-1 py-1.5 rounded text-sm font-bold border transition-colors ${med.estadoGeral === eg ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                        >
                          {eg}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer mb-3">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-slate-800 rounded focus:ring-slate-800" 
                        checked={neuro.sedacao || false} 
                        onChange={(e) => updateNested("neuro", "sedacao", e.target.checked)} 
                      />
                      Paciente Sedado?
                    </label>
                    
                    {neuro.sedacao ? (
                      <div className="pl-6 space-y-3 border-l-2 border-slate-100 animate-fadeIn">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sedativos em uso</label>
                          <div className="grid grid-cols-2 gap-1">
                            {["Fentanil", "Midazolam", "Propofol", "Dexmedetomidina", "Cetamina"].map(sed => (
                              <label key={sed} className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                <input 
                                  type="checkbox" 
                                  checked={(neuro.drogasSedacao || []).includes(sed)} 
                                  onChange={() => toggleArrayItemLocal("neuro", "drogasSedacao", sed)}
                                /> {sed}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Escala RASS</label>
                          <select 
                            className="w-full p-1.5 border rounded text-sm bg-white outline-none focus:ring-2 focus:ring-slate-300"
                            value={neuro.rass || ""} 
                            onChange={(e) => updateNested("neuro", "rass", e.target.value)}
                          >
                            <option value="">Selecione...</option>
                            {RASS_OPTS.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="pl-6 animate-fadeIn">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Escala de Glasgow (AO / RV / RM)</label>
                        <div className="grid grid-cols-3 gap-2">
                          <select 
                            className="w-full p-1.5 border rounded text-xs bg-white outline-none focus:ring-2 focus:ring-slate-300"
                            value={neuro.glasgowAO || ""} 
                            onChange={(e) => updateNested("neuro", "glasgowAO", e.target.value)}
                          >
                            <option value="">AO</option>
                            {GLASGOW_AO.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                          
                          <select 
                            className="w-full p-1.5 border rounded text-xs bg-white outline-none focus:ring-2 focus:ring-slate-300"
                            value={neuro.glasgowRV || ""} 
                            onChange={(e) => updateNested("neuro", "glasgowRV", e.target.value)}
                          >
                            <option value="">RV</option>
                            {GLASGOW_RV.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                          
                          <select 
                            className="w-full p-1.5 border rounded text-xs bg-white outline-none focus:ring-2 focus:ring-slate-300"
                            value={neuro.glasgowRM || ""} 
                            onChange={(e) => updateNested("neuro", "glasgowRM", e.target.value)}
                          >
                            <option value="">RM</option>
                            {GLASGOW_RM.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        
                        <div className="text-right mt-2">
                          <span className="text-xs font-bold text-slate-600">Total Glasgow: </span>
                          <span className="text-sm font-black text-indigo-600">
                            {(() => {
                              const ao = parseInt(neuro.glasgowAO) || 0;
                              const rm = parseInt(neuro.glasgowRM) || 0;
                              const rvStr = neuro.glasgowRV || "";
                              
                              if (!neuro.glasgowAO && !rvStr && !neuro.glasgowRM) return "-";
                              
                              if (rvStr.startsWith("T") || rvStr.startsWith("1 - T")) return `${ao + rm}T`;
                              
                              const rv = parseInt(rvStr) || 0;
                              return ao + rm + rv;
                            })()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* LADO DIREITO: CARDIO E ATB */}
                <div className="space-y-4">
                  <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer mb-3">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-red-600 rounded focus:ring-red-500" 
                        checked={cardio.dva || false} 
                        onChange={(e) => updateNested("cardio", "dva", e.target.checked)} 
                      />
                      Uso de DVA?
                    </label>
                    
                    {cardio.dva && (
                      <div className="pl-6 grid grid-cols-2 gap-1 border-l-2 border-red-50 animate-fadeIn">
                        {["Noradrenalina", "Vasopressina", "Adrenalina", "Dobutamina", "Milrinone"].map(dva => (
                          <label key={dva} className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input 
                              type="checkbox" 
                              checked={(cardio.drogasDVA || []).includes(dva)} 
                              onChange={() => toggleArrayItemLocal("cardio", "drogasDVA", dva)}
                            /> {dva}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase flex items-center gap-1">
                      <Bug size={14} className="text-orange-500"/> Confirmar Antibióticos (D)
                    </label>
                    <textarea 
                      className="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-orange-200 h-16 resize-none bg-slate-50 focus:bg-white transition" 
                      value={med.antibioticosTextoIA || ""} 
                      onChange={(e) => updateNested("medical", "antibioticosTextoIA", e.target.value)} 
                      placeholder="Ex: Meropenem (D3) + Vancomicina (D3)" 
                    />
                  </div>
                </div>
              </div>

              {/* EXAME FÍSICO DA ADMISSÃO / EVOLUÇÃO */}
              <div className="bg-white p-4 rounded border border-slate-200 shadow-sm border-t-4 border-t-indigo-400">
                <label className="text-xs font-bold text-indigo-700 mb-3 uppercase flex items-center gap-1 border-b pb-2">
                  <Stethoscope size={16} /> Exame Físico
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  
                  {/* NÍVEL DE CONSCIÊNCIA (novo campo no topo) */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">NÍVEL DE CONSCIÊNCIA</label>
                    <textarea 
                      className="w-full p-2 border rounded text-xs bg-slate-50 focus:bg-white transition resize-none outline-none focus:ring-2 focus:ring-indigo-200" 
                      value={med.nivelConsciencia || currentPatient?.neuro?.nivelConsciencia || currentPatient?.admissionData?.exameNeuro || ""} 
                      onChange={(e) => updateNested("medical", "nivelConsciencia", e.target.value)} 
                      rows={2} 
                      placeholder="LOTE, TORPOROSO, SONOLENTO, SEDADO..."
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">GERAL</label>
                    <textarea className="w-full p-2 border rounded text-xs bg-slate-50 focus:bg-white transition resize-none outline-none focus:ring-2 focus:ring-indigo-200" value={med.exameGeral || ""} onChange={(e) => updateNested("medical", "exameGeral", e.target.value)} rows={2} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">AR</label>
                    <textarea className="w-full p-2 border rounded text-xs bg-slate-50 focus:bg-white transition resize-none outline-none focus:ring-2 focus:ring-indigo-200" value={med.exameAR || ""} onChange={(e) => updateNested("medical", "exameAR", e.target.value)} rows={2} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">ACV</label>
                    <textarea className="w-full p-2 border rounded text-xs bg-slate-50 focus:bg-white transition resize-none outline-none focus:ring-2 focus:ring-indigo-200" value={med.exameACV || ""} onChange={(e) => updateNested("medical", "exameACV", e.target.value)} rows={2} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">ABD.</label>
                    <textarea className="w-full p-2 border rounded text-xs bg-slate-50 focus:bg-white transition resize-none outline-none focus:ring-2 focus:ring-indigo-200" value={med.exameABD || ""} onChange={(e) => updateNested("medical", "exameABD", e.target.value)} rows={2} />
                  </div>
                  
                  {/* EXTREMIDADES */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">EXTREMIDADES</label>
                    <textarea className="w-full p-2 border rounded text-xs bg-slate-50 focus:bg-white transition resize-none outline-none focus:ring-2 focus:ring-indigo-200" value={med.exameExtremidades || ""} onChange={(e) => updateNested("medical", "exameExtremidades", e.target.value)} rows={2} />
                  </div>
                  
                  {/* PUPILAS */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">PUPILAS</label>
                    <textarea 
                      className="w-full p-2 border rounded text-xs bg-slate-50 focus:bg-white transition resize-none outline-none focus:ring-2 focus:ring-indigo-200" 
                      value={med.pupilas || currentPatient?.admissionData?.pupilas || ""} 
                      onChange={(e) => updateNested("medical", "pupilas", e.target.value)} 
                      rows={2} 
                      placeholder="Fotorreagentes, isocóricas..."
                    />
                  </div>

                  {/* OBSERVAÇÕES IMPORTANTES */}
                  <div className="md:col-span-2 border-t pt-4 mt-2">
                    <label className="text-[10px] font-black text-orange-600 uppercase tracking-wider">Observações Importantes</label>
                    <textarea 
                      className="w-full p-2 mt-1 border rounded text-xs bg-orange-50/30 focus:bg-white transition resize-none outline-none focus:ring-2 focus:ring-orange-200" 
                      placeholder="Anotações relevantes, pendências, avisos..." 
                      value={med.observacoesImportantes || ""} 
                      onChange={(e) => updateNested("medical", "observacoesImportantes", e.target.value)} 
                      rows={3} 
                    />
                  </div>

                  {/* EXAMES COMPLEMENTARES */}
                  <div className="md:col-span-2 mt-1">
                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Exames Complementares (Laboratório e Imagem)</label>
                    <textarea 
                      className="w-full p-2 mt-1 border rounded text-xs bg-slate-50 focus:bg-white transition resize-none outline-none focus:ring-2 focus:ring-indigo-200" 
                      placeholder="Descreva os achados relevantes dos exames..." 
                      value={med.examesComplementares || ""} 
                      onChange={(e) => updateNested("medical", "examesComplementares", e.target.value)} 
                      rows={3} 
                    />
                  </div>

                  {/* CONDUTA / PLANO TERAPÊUTICO */}
                  <div className="md:col-span-2 mt-1">
                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Conduta / Plano Terapêutico</label>
                    <textarea 
                      className="w-full p-2 mt-1 border rounded text-xs bg-indigo-50/30 focus:bg-white transition resize-none outline-none focus:ring-2 focus:ring-indigo-200 font-medium" 
                      placeholder="Planejamento para as próximas 24h..." 
                      value={med.condutaPlano || ""} 
                      onChange={(e) => updateNested("medical", "condutaPlano", e.target.value)} 
                      rows={4} 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* FASE 2: CHECKLIST OBRIGATÓRIO (PAV / CCIH)   */}
          {/* ========================================== */}
          {fase === 2 && (
            <div className="space-y-6 animate-fadeIn">
              {erroValidacao && (
                <div className="p-3 bg-red-100 border border-red-300 text-red-700 text-sm font-bold rounded-lg flex items-center gap-2">
                  <ShieldAlert size={16} /> {erroValidacao}
                </div>
              )}

              {/* PERGUNTA 1: CULTURAS */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-orange-500">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <Microscope className="text-orange-500" size={20} />
                  Foi coletado cultura hoje?
                </h4>
                <div className="flex gap-4 mb-4">
                  <button onClick={() => setCulturaHoje('sim')} className={`flex-1 py-3 rounded-lg border-2 font-bold transition-all ${culturaHoje === 'sim' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-slate-200 text-slate-500 hover:border-orange-300'}`}>SIM</button>
                  <button onClick={() => { setCulturaHoje('nao'); setCulturasTipos([]); setCulturaOutro(""); }} className={`flex-1 py-3 rounded-lg border-2 font-bold transition-all ${culturaHoje === 'nao' ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'}`}>NÃO</button>
                </div>

                {culturaHoje === 'sim' && (
                  <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 animate-fadeIn">
                    <label className="block text-xs font-bold text-slate-700 mb-3 uppercase">Selecione os materiais coletados:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {["Hemocultura", "Hemocultura pareada (CVC)", "Urocultura", "Secreção Traqueal", "Outro"].map(tipo => (
                        <label key={tipo} className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer p-2 hover:bg-orange-100/50 rounded transition-colors">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                            checked={culturasTipos.includes(tipo)}
                            onChange={() => toggleTipoCultura(tipo)}
                          /> {tipo}
                        </label>
                      ))}
                    </div>

                    {culturasTipos.includes("Outro") && (
                      <div className="mt-3 animate-fadeIn">
                        <input 
                          type="text" 
                          placeholder="Especifique o material (Ex: Líquor, Ponta de Cateter...)" 
                          className="w-full p-2.5 border border-orange-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                          value={culturaOutro}
                          onChange={(e) => setCulturaOutro(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* PERGUNTA 2: IMAGEM PULMONAR / PAV */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <Activity className="text-blue-500" size={20} />
                  Foi realizado exame de imagem pulmonar hoje?
                </h4>
                <div className="flex gap-4 mb-4">
                  <button onClick={() => setImagemPulmonar('sim')} className={`flex-1 py-3 rounded-lg border-2 font-bold transition-all ${imagemPulmonar === 'sim' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'}`}>SIM</button>
                  <button onClick={() => { setImagemPulmonar('nao'); setNovoInfiltrado(null); }} className={`flex-1 py-3 rounded-lg border-2 font-bold transition-all ${imagemPulmonar === 'nao' ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'}`}>NÃO</button>
                </div>

                {imagemPulmonar === 'sim' && (
                  <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 animate-fadeIn mt-4">
                    <label className="block text-sm font-bold text-slate-800 mb-3">Existe um novo infiltrado ou progressão de infiltrado existente?</label>
                    <div className="flex gap-4">
                      <button onClick={() => setNovoInfiltrado('sim')} className={`flex-1 py-2 rounded-lg border-2 font-bold text-sm transition-all ${novoInfiltrado === 'sim' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-slate-200 text-slate-500 hover:border-red-300'}`}>Sim, novo/progressivo</button>
                      <button onClick={() => setNovoInfiltrado('nao')} className={`flex-1 py-2 rounded-lg border-2 font-bold text-sm transition-all ${novoInfiltrado === 'nao' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300'}`}>Não</button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
        
        {/* RODAPÉ */}
        <div className="p-4 bg-white border-t flex justify-between gap-3 shrink-0">
          {fase === 1 ? (
            <>
              <button onClick={() => setShowChecklistEvo(false)} className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded transition-colors">Cancelar</button>
              <button 
                onClick={() => setFase(2)} 
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded shadow transition-colors flex items-center gap-2"
              >
                Confirmar <ArrowRight size={18} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setFase(1)} className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded transition-colors flex items-center gap-2">
                <ArrowLeft size={18} /> Voltar
              </button>
              <button 
                onClick={handleFinalConfirm} 
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow transition-colors flex items-center gap-2"
              >
                <CheckCircle size={18} /> Confirmar e Gerar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChecklistEvoModal;