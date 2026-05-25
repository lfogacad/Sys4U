import React, { useEffect } from 'react';
import { Wind, X, Shield, Activity, ClipboardCheck, FileText, Lock } from 'lucide-react';
import { ICU_MOBILITY_SCALE, SUPORTE_RESP_OPTS, MODOS_VM, ASPECTO_SECRECAO, COLORACAO_SECRECAO, QTD_SECRECAO } from '../../constants/clinicalLists';

const PhysioAdmissionModal = ({
  showPhysioModal,
  setShowPhysioModal,
  activeTab,
  physioData,
  setPhysioData,
  handleFinalizePhysioAdmission,
  handleSyncGasometriaAdmissao,
  isReadOnly
}) => {
  console.log("Dados recebidos no Modal:", physioData);
  
  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[80] flex items-center justify-center p-2 md:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto flex flex-col shadow-2xl">
        <div className={`p-4 text-white flex justify-between items-center sticky top-0 z-10 shadow ${isReadOnly ? 'bg-slate-700' : 'bg-cyan-600'}`}>
          <h3 className="font-bold flex items-center gap-2 text-lg">
            {isReadOnly ? <Lock size={20} /> : <Wind size={20} />} 
            Admissão Fisioterapêutica (Leito {activeTab + 1})
            {isReadOnly && <span className="ml-2 text-xs bg-slate-800 px-2 py-1 rounded-full uppercase tracking-wider">Imutável (Apenas Leitura)</span>}
          </h3>
          <button onClick={() => setShowPhysioModal(false)} className="hover:bg-black/20 p-1 rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Adiciona classe para bloquear cliques se isReadOnly for true */}
        <div className={`p-6 space-y-4 text-sm bg-slate-50 ${isReadOnly ? 'opacity-90 pointer-events-none' : ''}`}>
          
          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
            <label className="font-bold text-cyan-800 mb-2 block uppercase">Estado Geral</label>
            <textarea
              className="w-full p-3 border rounded-lg h-20 outline-none focus:ring-2 focus:ring-cyan-200 resize-y leading-relaxed text-slate-700"
              value={physioData.estadoGeral || ""}
              onChange={(e) => setPhysioData({ ...physioData, estadoGeral: e.target.value })}
              disabled={isReadOnly}
            />
          </div>
          
          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
            <label className="font-bold text-cyan-800 mb-2 block uppercase">Sistema Nervoso</label>
            <textarea
              className="w-full p-3 border rounded-lg h-28 outline-none focus:ring-2 focus:ring-cyan-200 resize-y leading-relaxed text-slate-700"
              value={physioData.sistemaNervoso || ""}
              onChange={(e) => setPhysioData({ ...physioData, sistemaNervoso: e.target.value })}
              disabled={isReadOnly}
            />
          </div>

          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
            <label className="font-bold text-cyan-800 mb-2 block uppercase">Sistema Respiratório</label>
            <textarea
              className="w-full p-3 border rounded-lg h-44 outline-none focus:ring-2 focus:ring-cyan-200 resize-y leading-relaxed text-slate-700"
              value={physioData.sistemaRespiratorio || ""}
              onChange={(e) => setPhysioData({ ...physioData, sistemaRespiratorio: e.target.value })}
              disabled={isReadOnly}
            />
          </div>

          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
            <label className="font-bold text-cyan-800 mb-2 block uppercase">Sistema Cardiovascular</label>
            <textarea
              className="w-full p-3 border rounded-lg h-28 outline-none focus:ring-2 focus:ring-cyan-200 resize-y leading-relaxed text-slate-700"
              value={physioData.sistemaCardiovascular || ""}
              onChange={(e) => setPhysioData({ ...physioData, sistemaCardiovascular: e.target.value })}
              disabled={isReadOnly}
            />
          </div>

          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
            <label className="font-bold text-cyan-800 mb-2 block uppercase">Sistema Digestivo</label>
            <textarea
              className="w-full p-3 border rounded-lg h-24 outline-none focus:ring-2 focus:ring-cyan-200 resize-y leading-relaxed text-slate-700"
              value={physioData.sistemaDigestivo || ""}
              onChange={(e) => setPhysioData({ ...physioData, sistemaDigestivo: e.target.value })}
              disabled={isReadOnly}
            />
          </div>

          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
            <label className="font-bold text-cyan-800 mb-2 block uppercase">Sistema Musculoesquelético</label>
            <textarea
              className="w-full p-3 border rounded-lg h-24 outline-none focus:ring-2 focus:ring-cyan-200 resize-y leading-relaxed text-slate-700"
              value={physioData.sistemaMusculoesqueletico || ""}
              onChange={(e) => setPhysioData({ ...physioData, sistemaMusculoesqueletico: e.target.value })}
              disabled={isReadOnly}
            />
          </div>

          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
            <label className="font-bold text-cyan-800 mb-2 block uppercase">Funcionalidade e Escalas</label>
            <textarea
              className="w-full p-3 border rounded-lg h-24 outline-none focus:ring-2 focus:ring-cyan-200 resize-y leading-relaxed text-slate-700 mb-4"
              value={physioData.funcionalidade || ""}
              onChange={(e) => setPhysioData({ ...physioData, funcionalidade: e.target.value })}
              disabled={isReadOnly}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-cyan-100 pt-4">
              <div>
                <label className="block text-xs font-bold text-cyan-700 mb-1">
                  Escore MRC (0-60) <span className="text-red-500 ml-0.5">*</span>
                </label>
                <input
                  type="number" min="0" max="60"
                  className="w-full p-2 border rounded bg-slate-50 outline-none focus:ring-2 focus:ring-cyan-200"
                  placeholder="Soma MRC..."
                  value={physioData.mrcScore || ""}
                  onChange={(e) => setPhysioData({ ...physioData, mrcScore: e.target.value })}
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-cyan-700 mb-1">
                  ICU Mobility Scale (IMS) <span className="text-red-500 ml-0.5">*</span>
                </label>
                <select
                  className="w-full p-2 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                  value={physioData.ims || ""}
                  onChange={(e) => setPhysioData({ ...physioData, ims: e.target.value })}
                  disabled={isReadOnly}
                >
                  <option value="">Selecione...</option>
                  {ICU_MOBILITY_SCALE.map((scale) => (
                    <option key={scale} value={scale}>{scale}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* --- NOVA SEÇÃO: SUPORTE VENTILATÓRIO --- */}
            <div className="mt-4 border-t border-cyan-100 pt-4">
              <label className="font-bold text-cyan-800 text-xs uppercase flex items-center gap-2 mb-3">
                <Wind size={14} className="text-cyan-600" /> 
                Suporte Ventilatório <span className="text-red-500 text-lg leading-none">*</span>
              </label>
              <select
                className="w-full p-2 border rounded mb-3 bg-white outline-none focus:ring-2 focus:ring-cyan-200 text-xs font-bold text-slate-700"
                value={physioData.suporte || ""}
                onChange={(e) => setPhysioData({ ...physioData, suporte: e.target.value })}
                disabled={isReadOnly}
              >
                <option value="">Selecione o suporte...</option>
                {SUPORTE_RESP_OPTS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>

              {(physioData.suporte === "Cateter Nasal" || physioData.suporte === "Máscara não reinalante" || physioData.suporte === "Macronebulização por TQT") && (
                <div className="mb-3 animate-fadeIn">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Fluxo de O2 (L/min)</label>
                  <input type="text" className="w-full p-2 border rounded bg-slate-50 text-xs" value={physioData.parametro || ""} onChange={(e) => setPhysioData({ ...physioData, parametro: e.target.value })} disabled={isReadOnly}/>
                </div>
              )}

              {physioData.suporte === "Venturi" && (
                <div className="mb-3 animate-fadeIn">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">FiO2 (%)</label>
                  <input type="number" className="w-full p-2 border rounded bg-slate-50 text-xs" value={physioData.fiO2 || ""} onChange={(e) => setPhysioData({ ...physioData, fiO2: e.target.value })} disabled={isReadOnly}/>
                </div>
              )}

              {physioData.suporte === "VNI" && (
                <div className="grid grid-cols-2 gap-2 mb-3 animate-fadeIn">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Modo (CPAP/BIPAP)</label>
                    <select className="w-full p-2 border rounded bg-slate-50 text-xs" value={physioData.parametro || ""} onChange={(e) => setPhysioData({ ...physioData, parametro: e.target.value })} disabled={isReadOnly}>
                      <option value="">...</option>
                      <option value="CPAP">CPAP</option>
                      <option value="BIPAP">BIPAP</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">FiO2 (%)</label>
                    <input type="number" className="w-full p-2 border rounded bg-slate-50 text-xs" value={physioData.fiO2 || ""} onChange={(e) => setPhysioData({ ...physioData, fiO2: e.target.value })} disabled={isReadOnly}/>
                  </div>
                </div>
              )}

              {physioData.suporte === "VM" && (
                <div className="mb-3 animate-fadeIn">
                  <div className="grid grid-cols-3 gap-2 mb-3 p-3 bg-slate-100 rounded-xl border border-slate-200 shadow-inner">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Data Intubação</label>
                      <input type="date" className="w-full p-2 border rounded bg-white text-xs" value={physioData.dataIntubacao || ""} onChange={(e) => setPhysioData({ ...physioData, dataIntubacao: e.target.value })} disabled={isReadOnly}/>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Nº TOT</label>
                      <input type="number" step="0.5" className="w-full p-2 border rounded bg-white text-xs text-center" placeholder="Ex: 8.0" value={physioData.numeroTOT || ""} onChange={(e) => setPhysioData({ ...physioData, numeroTOT: e.target.value })} disabled={isReadOnly}/>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Rima (cm)</label>
                      <input type="number" className="w-full p-2 border rounded bg-white text-xs text-center" placeholder="Ex: 22" value={physioData.rimaFixacao || ""} onChange={(e) => setPhysioData({ ...physioData, rimaFixacao: e.target.value })} disabled={isReadOnly}/>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                    <div className="col-span-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Modo</label>
                      <select className="w-full p-1.5 border rounded bg-slate-50 text-xs" value={physioData.parametro || ""} onChange={(e) => setPhysioData({ ...physioData, parametro: e.target.value })} disabled={isReadOnly}>
                        <option value="">...</option>
                        {MODOS_VM && MODOS_VM.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      {physioData.parametro === "VCV" ? (
                        <div className="animate-fadeIn">
                          <label className="text-[9px] font-bold uppercase text-blue-600">Vt (ml)</label>
                          <input type="number" className="w-full p-1.5 border rounded bg-blue-50 text-xs text-center font-bold text-blue-700" value={physioData.volCorrente || ""} onChange={(e) => setPhysioData({ ...physioData, volCorrente: e.target.value })} disabled={isReadOnly}/>
                        </div>
                      ) : physioData.parametro === "PCV" ? (
                        <div className="animate-fadeIn">
                          <label className="text-[9px] font-bold uppercase text-orange-600">PC (cmH2O)</label>
                          <input type="number" className="w-full p-1.5 border rounded bg-orange-50 text-xs text-center font-bold text-orange-700" value={physioData.pressaoControlada || ""} onChange={(e) => setPhysioData({ ...physioData, pressaoControlada: e.target.value })} disabled={isReadOnly}/>
                        </div>
                      ) : physioData.parametro === "PSV" ? (
                        <div className="animate-fadeIn">
                          <label className="text-[9px] font-bold uppercase text-green-600">PS (cmH2O)</label>
                          <input type="number" className="w-full p-1.5 border rounded bg-green-50 text-xs text-center font-bold text-green-700" value={physioData.pressaoSuporte || ""} onChange={(e) => setPhysioData({ ...physioData, pressaoSuporte: e.target.value })} disabled={isReadOnly}/>
                        </div>
                      ) : (
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Parâmetro</label>
                          <input type="text" disabled className="w-full p-1.5 border rounded bg-slate-100 text-xs cursor-not-allowed text-center" />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase">PEEP</label>
                      <input type="number" className="w-full p-1.5 border rounded bg-slate-50 text-xs text-center" value={physioData.peep || ""} onChange={(e) => setPhysioData({ ...physioData, peep: e.target.value })} disabled={isReadOnly}/>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase">FR</label>
                      <input type="number" className={`w-full p-1.5 border rounded text-xs text-center ${physioData.parametro === "PSV" ? "bg-slate-100 text-slate-400" : "bg-slate-50"}`} value={physioData.fr || ""} onChange={(e) => setPhysioData({ ...physioData, fr: e.target.value })} disabled={physioData.parametro === "PSV" || isReadOnly} />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase">T.ins</label>
                      <input type="number" step="0.1" className={`w-full p-1.5 border rounded text-xs text-center ${physioData.parametro === "PSV" ? "bg-slate-100 text-slate-400" : "bg-slate-50"}`} value={physioData.tIns || ""} onChange={(e) => setPhysioData({ ...physioData, tIns: e.target.value })} disabled={physioData.parametro === "PSV" || isReadOnly} />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase">I:E</label>
                      <input type="text" placeholder={physioData.parametro === "PSV" ? "-" : "1:2"} className={`w-full p-1.5 border rounded text-xs text-center ${physioData.parametro === "PSV" ? "bg-slate-100 text-slate-400" : "bg-slate-50"}`} value={physioData.relIE || ""} onChange={(e) => setPhysioData({ ...physioData, relIE: e.target.value })} disabled={physioData.parametro === "PSV" || isReadOnly} />
                    </div>

                    <div className="col-span-2 md:col-span-8 lg:col-span-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">FiO2(%)</label>
                      <input type="number" className="w-full p-1.5 border rounded bg-slate-50 text-xs text-center font-bold text-slate-700" value={physioData.fiO2 || ""} onChange={(e) => setPhysioData({ ...physioData, fiO2: e.target.value })} disabled={isReadOnly}/>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* --- NOVA SEÇÃO: VIA AÉREA E DISPOSITIVOS --- */}
            <div className="mt-4 border-t border-cyan-100 pt-4">
              <label className="font-bold text-cyan-800 text-xs uppercase flex items-center gap-2 mb-3">
                <Shield size={14} className="text-cyan-600" /> Via Aérea e Dispositivos
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Pressão do Cuff (cmH2O)</label>
                  <input type="number" className="w-full p-2 border rounded bg-slate-50 text-xs" placeholder="Ex: 25" value={physioData.cuff || ""} onChange={(e) => setPhysioData({ ...physioData, cuff: e.target.value })} disabled={isReadOnly}/>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase cursor-pointer h-5">
                    <input type="checkbox" checked={physioData.filtroHMEF || false} onChange={(e) => { const newData = { ...physioData, filtroHMEF: e.target.checked }; if (!e.target.checked) newData.dataHMEF = ""; setPhysioData(newData); }} disabled={isReadOnly}/>
                    Filtro HMEF
                  </label>
                  <input type="date" className={`w-full p-2 border rounded text-xs ${!physioData.filtroHMEF ? 'bg-gray-100 opacity-50' : 'bg-slate-50'}`} value={physioData.dataHMEF || ""} onChange={(e) => setPhysioData({ ...physioData, dataHMEF: e.target.value })} disabled={!physioData.filtroHMEF || isReadOnly} />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase cursor-pointer h-5">
                    <input type="checkbox" checked={physioData.sistemaFechado || false} onChange={(e) => { const newData = { ...physioData, sistemaFechado: e.target.checked }; if (!e.target.checked) newData.dataSFA = ""; setPhysioData(newData); }} disabled={isReadOnly}/>
                    Sistema Fechado (Trach Care)
                  </label>
                  <input type="date" className={`w-full p-2 border rounded text-xs ${!physioData.sistemaFechado ? 'bg-gray-100 opacity-50' : 'bg-slate-50'}`} value={physioData.dataSFA || ""} onChange={(e) => setPhysioData({ ...physioData, dataSFA: e.target.value })} disabled={!physioData.sistemaFechado || isReadOnly} />
                </div>

              </div>
            </div>

            {/* --- SECREÇÃO (ADMISSÃO) --- */}
            <div className="mt-4 border-t border-cyan-100 pt-4 mb-4">
              <label className="font-bold text-cyan-800 text-xs uppercase flex items-center gap-2 mb-3">
                Secreção
              </label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <label className="flex items-center gap-2 mb-2 text-xs text-slate-700 font-bold cursor-pointer">
                  <input type="checkbox" checked={physioData.secrecao || false} onChange={(e) => setPhysioData({ ...physioData, secrecao: e.target.checked })} disabled={isReadOnly}/>
                  Presente na Admissão?
                </label>
                
                {physioData.secrecao && (
                  <div className="grid grid-cols-3 gap-2 mt-3 animate-fadeIn">
                    <select className="p-2 border rounded bg-white text-xs" value={physioData.secrecaoAspecto || ""} onChange={(e) => setPhysioData({ ...physioData, secrecaoAspecto: e.target.value })} disabled={isReadOnly}>
                      <option value="">Aspecto...</option>
                      {ASPECTO_SECRECAO.map((a) => (<option key={a}>{a}</option>))}
                    </select>
                    <select className="p-2 border rounded bg-white text-xs" value={physioData.secrecaoColoracao || ""} onChange={(e) => setPhysioData({ ...physioData, secrecaoColoracao: e.target.value })} disabled={isReadOnly}>
                      <option value="">Coloração...</option>
                      {COLORACAO_SECRECAO.map((c) => (<option key={c}>{c}</option>))}
                    </select>
                    <select className="p-2 border rounded bg-white text-xs" value={physioData.secrecaoQtd || ""} onChange={(e) => setPhysioData({ ...physioData, secrecaoQtd: e.target.value })} disabled={isReadOnly}>
                      <option value="">Qtd...</option>
                      {QTD_SECRECAO.map((q) => (<option key={q}>{q}</option>))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* --- NOVA SEÇÃO: GASOMETRIA DE ADMISSÃO --- */}
            <div className="mt-4 border-t border-cyan-100 pt-4">
              <div className="flex flex-col md:flex-row justify-between md:items-center mb-3 gap-2">
                <label className="font-bold text-cyan-800 text-xs uppercase flex items-center gap-2">
                  <Activity size={14} className="text-red-500" /> Gasometria de Admissão
                </label>
                <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded-lg border border-red-100">
                  <span className="text-[10px] font-bold text-red-700 uppercase flex items-center gap-1">
                    Horário: 
                    {/* Asterisco vermelho se for obrigatório */}
                    {["gaso_pH", "gaso_pCO2", "gaso_PaO2", "gaso_BE", "gaso_HCO3", "gaso_SatO2", "gaso_FiO2"].some(k => physioData[k]) && !physioData.gasoHora && (
                      <span className="text-red-500 text-lg leading-none">*</span>
                    )}
                  </span>
                  <input 
                    type="time" 
                    // Se tiver algum dado preenchido e faltar a hora, a borda fica vermelha e pulsante
                    className={`p-1 border rounded bg-white text-xs font-bold transition-all ${
                      ["gaso_pH", "gaso_pCO2", "gaso_PaO2", "gaso_BE", "gaso_HCO3", "gaso_SatO2", "gaso_FiO2"].some(k => physioData[k]) && !physioData.gasoHora 
                      ? 'border-red-500 ring-2 ring-red-200 text-red-700' 
                      : 'border-red-200 text-red-700'
                    }`} 
                    value={physioData.gasoHora || ""} 
                    onChange={(e) => setPhysioData({ ...physioData, gasoHora: e.target.value })} 
                    onBlur={(e) => !isReadOnly && handleSyncGasometriaAdmissao && handleSyncGasometriaAdmissao({ ...physioData, gasoHora: e.target.value })} 
                    disabled={isReadOnly}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {[{id: "gaso_pH", label: "pH"}, {id: "gaso_pCO2", label: "pCO2"}, {id: "gaso_PaO2", label: "PaO2"}, {id: "gaso_BE", label: "BE"}, 
                  {id: "gaso_HCO3", label: "HCO3"}, {id: "gaso_SatO2", label: "SatO2"}, {id: "gaso_FiO2", label: "FiO2"}, {id: "gaso_PF", label: "P/F"}].map(param => (
                  <div key={param.id} className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-500 text-center mb-0.5">{param.label}</span>
                    <input type="text" className="w-full p-1.5 border rounded bg-slate-50 text-xs text-center" value={physioData[param.id] || ""} onChange={(e) => setPhysioData({ ...physioData, [param.id]: e.target.value })} onBlur={(e) => !isReadOnly && handleSyncGasometriaAdmissao && handleSyncGasometriaAdmissao({ ...physioData, [param.id]: e.target.value })} disabled={isReadOnly}/>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm mt-4">
            <label className="font-bold text-cyan-800 mb-2 block uppercase flex items-center gap-2">
              <ClipboardCheck size={16} className="text-cyan-600" /> Condutas Fisioterapêuticas
            </label>
            <textarea className="w-full p-3 border rounded-lg h-56 outline-none focus:ring-2 focus:ring-cyan-200 resize-y text-xs text-slate-700 bg-slate-50" value={physioData.condutas || ""} onChange={(e) => setPhysioData({ ...physioData, condutas: e.target.value })} disabled={isReadOnly}/>
          </div>
        </div>

        {/* ============================================================== */}
        {/* RODAPÉ DO MODAL (BOTÕES)                                       */}
        {/* ============================================================== */}
        <div className="p-4 bg-slate-100 border-t flex flex-col-reverse sm:flex-row justify-end gap-3 sticky bottom-0 z-10">
          <button onClick={() => setShowPhysioModal(false)} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors w-full sm:w-auto">
            {isReadOnly ? "Fechar" : "Cancelar"}
          </button>
          
          {/* BOTÃO DE SALVAR (Inteligente e com trava de segurança) */}
          {!isReadOnly && (() => {
            // Verifica se os campos vitais estão preenchidos
            const hasMrc = physioData.mrcScore !== "" && physioData.mrcScore !== undefined;
            const hasIms = physioData.ims !== "" && physioData.ims !== undefined;
            const hasSuporte = physioData.suporte !== "" && physioData.suporte !== undefined;
            
            const isFormValid = hasMrc && hasIms && hasSuporte;
            
            // Texto dinâmico para orientar a equipe
            let btnText = "Finalizar e Gerar Texto";
            if (!isFormValid) {
              const missing = [];
              if (!hasMrc) missing.push("MRC");
              if (!hasIms) missing.push("IMS");
              if (!hasSuporte) missing.push("Suporte");
              btnText = `Preencha: ${missing.join(", ")}`;
            }

            return (
              <button 
                onClick={handleFinalizePhysioAdmission} 
                disabled={!isFormValid}
                className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-colors flex items-center justify-center gap-2 w-full sm:w-auto ${
                  isFormValid 
                    ? "bg-cyan-600 hover:bg-cyan-700 cursor-pointer" 
                    : "bg-slate-400 cursor-not-allowed opacity-70"
                }`}
                title={!isFormValid ? "Preenchimento obrigatório pendente" : "Finalizar Admissão"}
              >
                {!isFormValid ? <Lock size={18} /> : <FileText size={18} />}
                {btnText}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default PhysioAdmissionModal;