import React from 'react';
import { Wind, X, Shield, Activity, ClipboardCheck, FileText } from 'lucide-react';
import { ICU_MOBILITY_SCALE, SUPORTE_RESP_OPTS, MODOS_VM, ASPECTO_SECRECAO, COLORACAO_SECRECAO, QTD_SECRECAO } from '../../constants/clinicalLists';

const PhysioAdmissionModal = ({
  showPhysioModal,
  setShowPhysioModal,
  activeTab,
  physioData,
  setPhysioData,
  handleFinalizePhysioAdmission
}) => {
  if (!showPhysioModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[80] flex items-center justify-center p-2 md:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto flex flex-col shadow-2xl">
        <div className="bg-cyan-600 p-4 text-white flex justify-between items-center sticky top-0 z-10 shadow">
          <h3 className="font-bold flex items-center gap-2 text-lg">
            <Wind size={20} /> Admissão Fisioterapêutica (Leito {activeTab + 1})
          </h3>
          <button onClick={() => setShowPhysioModal(false)} className="hover:bg-cyan-700 p-1 rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm bg-slate-50">
          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
            <label className="font-bold text-cyan-800 mb-2 block uppercase">Estado Geral</label>
            <textarea
              className="w-full p-3 border rounded-lg h-20 outline-none focus:ring-2 focus:ring-cyan-200 resize-y"
              value={physioData.estadoGeral || ""}
              onChange={(e) => setPhysioData({ ...physioData, estadoGeral: e.target.value })}
            />
          </div>
          
          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
            <label className="font-bold text-cyan-800 mb-2 block uppercase">Sistema Nervoso</label>
            <textarea
              className="w-full p-3 border rounded-lg h-28 outline-none focus:ring-2 focus:ring-cyan-200 resize-y"
              value={physioData.sistemaNervoso || ""}
              onChange={(e) => setPhysioData({ ...physioData, sistemaNervoso: e.target.value })}
            />
          </div>

          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
            <label className="font-bold text-cyan-800 mb-2 block uppercase">Sistema Respiratório</label>
            <textarea
              className="w-full p-3 border rounded-lg h-44 outline-none focus:ring-2 focus:ring-cyan-200 resize-y"
              value={physioData.sistemaRespiratorio || ""}
              onChange={(e) => setPhysioData({ ...physioData, sistemaRespiratorio: e.target.value })}
            />
          </div>

          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
            <label className="font-bold text-cyan-800 mb-2 block uppercase">Sistema Cardiovascular</label>
            <textarea
              className="w-full p-3 border rounded-lg h-28 outline-none focus:ring-2 focus:ring-cyan-200 resize-y"
              value={physioData.sistemaCardiovascular || ""}
              onChange={(e) => setPhysioData({ ...physioData, sistemaCardiovascular: e.target.value })}
            />
          </div>

          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
            <label className="font-bold text-cyan-800 mb-2 block uppercase">Sistema Digestivo</label>
            <textarea
              className="w-full p-3 border rounded-lg h-24 outline-none focus:ring-2 focus:ring-cyan-200 resize-y"
              value={physioData.sistemaDigestivo || ""}
              onChange={(e) => setPhysioData({ ...physioData, sistemaDigestivo: e.target.value })}
            />
          </div>

          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
            <label className="font-bold text-cyan-800 mb-2 block uppercase">Sistema Musculoesquelético</label>
            <textarea
              className="w-full p-3 border rounded-lg h-24 outline-none focus:ring-2 focus:ring-cyan-200 resize-y"
              value={physioData.sistemaMusculoesqueletico || ""}
              onChange={(e) => setPhysioData({ ...physioData, sistemaMusculoesqueletico: e.target.value })}
            />
          </div>

          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
            <label className="font-bold text-cyan-800 mb-2 block uppercase">Funcionalidade e Escalas</label>
            <textarea
              className="w-full p-3 border rounded-lg h-24 outline-none focus:ring-2 focus:ring-cyan-200 resize-y mb-4"
              value={physioData.funcionalidade || ""}
              onChange={(e) => setPhysioData({ ...physioData, funcionalidade: e.target.value })}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-cyan-100 pt-4">
              <div>
                <label className="block text-xs font-bold text-cyan-700 mb-1">Escore MRC (0-60)</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  className="w-full p-2 border rounded bg-slate-50 outline-none focus:ring-2 focus:ring-cyan-200"
                  placeholder="Soma MRC..."
                  value={physioData.mrcScore || ""}
                  onChange={(e) => setPhysioData({ ...physioData, mrcScore: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-cyan-700 mb-1">ICU Mobility Scale (IMS)</label>
                <select
                  className="w-full p-2 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                  value={physioData.ims || ""}
                  onChange={(e) => setPhysioData({ ...physioData, ims: e.target.value })}
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
                <Wind size={14} className="text-cyan-600" /> Suporte Ventilatório
              </label>
              <select
                className="w-full p-2 border rounded mb-3 bg-white outline-none focus:ring-2 focus:ring-cyan-200 text-xs font-bold text-slate-700"
                value={physioData.suporte || ""}
                onChange={(e) => setPhysioData({ ...physioData, suporte: e.target.value })}
              >
                <option value="">Selecione o suporte...</option>
                {SUPORTE_RESP_OPTS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>

              {(physioData.suporte === "Cateter Nasal" || physioData.suporte === "Máscara não reinalante" || physioData.suporte === "Tubo T") && (
                <div className="mb-3 animate-fadeIn">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Fluxo (L/min) / Detalhe</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                    value={physioData.parametro || ""}
                    onChange={(e) => setPhysioData({ ...physioData, parametro: e.target.value })}
                  />
                </div>
              )}

              {physioData.suporte === "Venturi" && (
                <div className="mb-3 animate-fadeIn">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">FiO2 (%)</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                    value={physioData.fiO2 || ""}
                    onChange={(e) => setPhysioData({ ...physioData, fiO2: e.target.value })}
                  />
                </div>
              )}

              {physioData.suporte === "VNI" && (
                <div className="grid grid-cols-2 gap-2 mb-3 animate-fadeIn">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Modo (CPAP/BIPAP)</label>
                    <select
                      className="w-full p-2 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                      value={physioData.parametro || ""}
                      onChange={(e) => setPhysioData({ ...physioData, parametro: e.target.value })}
                    >
                      <option value="">...</option>
                      <option value="CPAP">CPAP</option>
                      <option value="BIPAP">BIPAP</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">FiO2 (%)</label>
                    <input
                      type="number"
                      className="w-full p-2 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                      value={physioData.fiO2 || ""}
                      onChange={(e) => setPhysioData({ ...physioData, fiO2: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {physioData.suporte === "VM" && (
                <div className="mb-3 animate-fadeIn">
                  {/* --- DADOS DO TUBO OROTRAQUEAL --- */}
                  <div className="grid grid-cols-3 gap-2 mb-3 p-3 bg-slate-100 rounded-xl border border-slate-200 shadow-inner">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Data Intubação</label>
                      <input 
                        type="date" 
                        className="w-full p-2 border rounded bg-white text-xs outline-none focus:ring-2 focus:ring-cyan-200 text-slate-700" 
                        value={physioData.dataIntubacao || ""} 
                        onChange={(e) => setPhysioData({ ...physioData, dataIntubacao: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Nº TOT</label>
                      <input 
                        type="number" step="0.5" 
                        className="w-full p-2 border rounded bg-white text-xs outline-none focus:ring-2 focus:ring-cyan-200 text-center text-slate-700" 
                        placeholder="Ex: 8.0" 
                        value={physioData.numeroTOT || ""} 
                        onChange={(e) => setPhysioData({ ...physioData, numeroTOT: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Rima (cm)</label>
                      <input 
                        type="number" 
                        className="w-full p-2 border rounded bg-white text-xs outline-none focus:ring-2 focus:ring-cyan-200 text-center text-slate-700" 
                        placeholder="Ex: 22" 
                        value={physioData.rimaFixacao || ""} 
                        onChange={(e) => setPhysioData({ ...physioData, rimaFixacao: e.target.value })} 
                      />
                    </div>
                  </div>

                  {/* --- PARÂMETROS DO VENTILADOR --- */}
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                    <div className="col-span-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Modo</label>
                      <select
                        className="w-full p-1.5 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                        value={physioData.parametro || ""}
                        onChange={(e) => setPhysioData({ ...physioData, parametro: e.target.value })}
                      >
                        <option value="">...</option>
                        {MODOS_VM.map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Vol (ml)</label>
                      <input
                        type="number"
                        className="w-full p-1.5 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200 text-center"
                        value={physioData.volCorrente || ""}
                        onChange={(e) => setPhysioData({ ...physioData, volCorrente: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase">PEEP</label>
                      <input
                        type="number"
                        className="w-full p-1.5 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200 text-center"
                        value={physioData.peep || ""}
                        onChange={(e) => setPhysioData({ ...physioData, peep: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase">FR</label>
                      <input
                        type="number"
                        className="w-full p-1.5 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200 text-center"
                        value={physioData.fr || ""}
                        onChange={(e) => setPhysioData({ ...physioData, fr: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase">T.ins</label>
                      <input
                        type="number" step="0.1"
                        className="w-full p-1.5 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200 text-center"
                        value={physioData.tIns || ""}
                        onChange={(e) => setPhysioData({ ...physioData, tIns: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase">I:E</label>
                      <input
                        type="text" placeholder="1:2"
                        className="w-full p-1.5 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200 text-center"
                        value={physioData.relIE || ""}
                        onChange={(e) => setPhysioData({ ...physioData, relIE: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">FiO2(%)</label>
                      <input
                        type="number"
                        className="w-full p-1.5 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200 text-center"
                        value={physioData.fiO2 || ""}
                        onChange={(e) => setPhysioData({ ...physioData, fiO2: e.target.value })}
                      />
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
                
                {/* Cuff */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Pressão do Cuff (cmH2O)</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                    placeholder="Ex: 25"
                    value={physioData.cuff || ""}
                    onChange={(e) => setPhysioData({ ...physioData, cuff: e.target.value })}
                  />
                </div>

                {/* Filtro HMEF */}
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase cursor-pointer h-5">
                    <input
                      type="checkbox"
                      checked={physioData.filtroHMEF || false}
                      onChange={(e) => {
                        // Se desmarcar, limpa a data também
                        const newData = { ...physioData, filtroHMEF: e.target.checked };
                        if (!e.target.checked) newData.dataHMEF = "";
                        setPhysioData(newData);
                      }}
                    />
                    Filtro HMEF
                  </label>
                  <input
                    type="date"
                    className={`w-full p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-cyan-200 ${!physioData.filtroHMEF ? 'bg-gray-100 opacity-50 cursor-not-allowed' : 'bg-slate-50'}`}
                    value={physioData.dataHMEF || ""} // NOME CORRIGIDO AQUI
                    onChange={(e) => setPhysioData({ ...physioData, dataHMEF: e.target.value })} // NOME CORRIGIDO AQUI
                    disabled={!physioData.filtroHMEF}
                    title="Data da troca do Filtro HMEF"
                  />
                </div>

                {/* Sistema Fechado */}
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase cursor-pointer h-5">
                    <input
                      type="checkbox"
                      checked={physioData.sistemaFechado || false}
                      onChange={(e) => {
                        // Se desmarcar, limpa a data também
                        const newData = { ...physioData, sistemaFechado: e.target.checked };
                        if (!e.target.checked) newData.dataSFA = "";
                        setPhysioData(newData);
                      }}
                    />
                    Sistema Fechado (Trach Care)
                  </label>
                  <input
                    type="date"
                    className={`w-full p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-cyan-200 ${!physioData.sistemaFechado ? 'bg-gray-100 opacity-50 cursor-not-allowed' : 'bg-slate-50'}`}
                    value={physioData.dataSFA || ""} // NOME CORRIGIDO AQUI
                    onChange={(e) => setPhysioData({ ...physioData, dataSFA: e.target.value })} // NOME CORRIGIDO AQUI
                    disabled={!physioData.sistemaFechado}
                    title="Data da troca do Sistema Fechado"
                  />
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
                  <input
                    type="checkbox"
                    checked={physioData.secrecao || false}
                    onChange={(e) => setPhysioData({ ...physioData, secrecao: e.target.checked })}
                  />
                  Presente na Admissão?
                </label>
                
                {physioData.secrecao && (
                  <div className="grid grid-cols-3 gap-2 mt-3 animate-fadeIn">
                    <select
                      className="p-2 border rounded bg-white text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                      value={physioData.secrecaoAspecto || ""}
                      onChange={(e) => setPhysioData({ ...physioData, secrecaoAspecto: e.target.value })}
                    >
                      <option value="">Aspecto...</option>
                      {ASPECTO_SECRECAO.map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                    <select
                      className="p-2 border rounded bg-white text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                      value={physioData.secrecaoColoracao || ""}
                      onChange={(e) => setPhysioData({ ...physioData, secrecaoColoracao: e.target.value })}
                    >
                      <option value="">Coloração...</option>
                      {COLORACAO_SECRECAO.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <select
                      className="p-2 border rounded bg-white text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                      value={physioData.secrecaoQtd || ""}
                      onChange={(e) => setPhysioData({ ...physioData, secrecaoQtd: e.target.value })}
                    >
                      <option value="">Qtd...</option>
                      {QTD_SECRECAO.map((q) => (
                        <option key={q}>{q}</option>
                      ))}
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
                  <span className="text-[10px] font-bold text-red-700 uppercase">Horário:</span>
                  <input 
                    type="time" 
                    className="p-1 border rounded bg-white text-xs outline-none focus:ring-2 focus:ring-red-200 text-red-700 font-bold"
                    value={physioData.gasoHora || ""}
                    onChange={(e) => setPhysioData({ ...physioData, gasoHora: e.target.value })}
                    title="Se preenchido, os dados irão automaticamente para a tabela principal"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {[{id: "gaso_pH", label: "pH"}, {id: "gaso_pCO2", label: "pCO2"}, {id: "gaso_PaO2", label: "PaO2"}, {id: "gaso_BE", label: "BE"}, 
                  {id: "gaso_HCO3", label: "HCO3"}, {id: "gaso_SatO2", label: "SatO2"}, {id: "gaso_FiO2", label: "FiO2"}, {id: "gaso_PF", label: "P/F"}].map(param => (
                  <div key={param.id} className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-500 text-center mb-0.5">{param.label}</span>
                    <input
                      type="text"
                      className="w-full p-1.5 border rounded bg-slate-50 text-xs text-center outline-none focus:ring-2 focus:ring-cyan-200"
                      value={physioData[param.id] || ""}
                      onChange={(e) => setPhysioData({ ...physioData, [param.id]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-slate-400 mt-2 italic text-right">* Preencha o horário para salvar na tabela geral.</p>
            </div>
          </div>

          {/* --- NOVA SEÇÃO: CONDUTAS FISIOTERAPÊUTICAS --- */}
          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm mt-4">
            <label className="font-bold text-cyan-800 mb-2 block uppercase flex items-center gap-2">
              <ClipboardCheck size={16} className="text-cyan-600" /> Condutas Fisioterapêuticas
            </label>
            <textarea
              className="w-full p-3 border rounded-lg h-56 outline-none focus:ring-2 focus:ring-cyan-200 resize-y text-xs text-slate-700 bg-slate-50"
              value={physioData.condutas || ""}
              onChange={(e) => setPhysioData({ ...physioData, condutas: e.target.value })}
            />
          </div>
        </div>

        <div className="p-4 bg-slate-100 border-t flex flex-col-reverse sm:flex-row justify-end gap-3 sticky bottom-0 z-10">
          <button onClick={() => setShowPhysioModal(false)} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors w-full sm:w-auto">
            Cancelar
          </button>
          <button onClick={handleFinalizePhysioAdmission} className="px-6 py-3 rounded-xl font-bold text-white bg-cyan-600 hover:bg-cyan-700 shadow-lg transition-colors flex items-center justify-center gap-2 w-full sm:w-auto">
            <FileText size={18} /> Finalizar e Gerar Texto
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhysioAdmissionModal;