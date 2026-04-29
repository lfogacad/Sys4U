import React from 'react';
import { UserPlus, X, AlertTriangle, FileText, Lock } from 'lucide-react';
import { ESCALA_DOR, PRECAUCOES, BRADEN_OPTIONS, MORSE_OPTIONS } from '../../constants/clinicalLists';

const NursingAdmissionModal = ({
  showNursingModal,
  setShowNursingModal,
  activeTab,
  nursingData,
  setNursingData,
  handleFinalizeNursingAdmission,
  isReadOnly // <-- NOVA PROP: Define se o modal está travado para edição
}) => {
  if (!showNursingModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[80] flex items-center justify-center p-2 md:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto flex flex-col shadow-2xl">
        <div className={`p-4 text-white flex justify-between items-center sticky top-0 z-10 shadow ${isReadOnly ? 'bg-slate-700' : 'bg-green-600'}`}>
          <h3 className="font-bold flex items-center gap-2 text-lg">
            {isReadOnly ? <Lock size={20} /> : <UserPlus size={20} />} 
            Admissão de Enfermagem (Leito {activeTab + 1})
            {isReadOnly && <span className="ml-2 text-xs bg-slate-800 px-2 py-1 rounded-full uppercase tracking-wider">Imutável (Apenas Leitura)</span>}
          </h3>
          <button onClick={() => setShowNursingModal(false)} className="hover:bg-black/20 p-1 rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className={`p-6 space-y-6 text-sm ${isReadOnly ? 'opacity-90 pointer-events-none' : ''}`}>
          {/* CUIDADOS GERAIS */}
          <div className="p-4 border rounded-xl bg-orange-50/20 shadow-sm">
            <h4 className="font-bold text-orange-800 mb-3">Cuidados Gerais</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Escala de Dor</label>
                <select className="w-full p-2 border rounded bg-white" value={nursingData.dor || ""} onChange={(e) => setNursingData({ ...nursingData, dor: e.target.value })} disabled={isReadOnly}>
                  <option value="">Selecione...</option>
                  {ESCALA_DOR.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 font-bold text-slate-700">
                  <input type="checkbox" className="w-4 h-4" checked={nursingData.hemodialise || false} onChange={(e) => setNursingData({ ...nursingData, hemodialise: e.target.checked })} disabled={isReadOnly}/> Hemodiálise
                </label>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precauções</label>
                <select className="w-full p-2 border rounded bg-white" value={nursingData.precaucao || ""} onChange={(e) => setNursingData({ ...nursingData, precaucao: e.target.value })} disabled={isReadOnly}>
                  <option value="">Selecione...</option>
                  {PRECAUCOES.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* INVASIVOS E DISPOSITIVOS */}
          <div className="p-4 border rounded-xl bg-orange-50/20 shadow-sm">
            <h4 className="font-bold text-orange-800 mb-3">Invasivos e Dispositivos</h4>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">AVP (Local/Data)</label>
                <div className="flex gap-2">
                  <input className="w-full p-2 border rounded" placeholder="Local" value={nursingData.avpLocal || ""} onChange={(e) => setNursingData({ ...nursingData, avpLocal: e.target.value })} disabled={isReadOnly}/>
                  <input type="date" className="w-40 p-2 border rounded" value={nursingData.avpData || ""} onChange={(e) => setNursingData({ ...nursingData, avpData: e.target.value })} disabled={isReadOnly}/>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">CVC/PICC (Local/Data)</label>
                <div className="flex gap-2">
                  <input className="w-full p-2 border rounded" placeholder="Local" value={nursingData.cvcLocal || ""} onChange={(e) => setNursingData({ ...nursingData, cvcLocal: e.target.value })} disabled={isReadOnly}/>
                  <input type="date" className="w-40 p-2 border rounded" value={nursingData.cvcData || ""} onChange={(e) => setNursingData({ ...nursingData, cvcData: e.target.value })} disabled={isReadOnly}/>
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
                  <input type="checkbox" checked={nursingData.svd || false} onChange={(e) => setNursingData({ ...nursingData, svd: e.target.checked })} disabled={isReadOnly}/> SVD (Data)
                </label>
                <input type="date" className={`w-full p-2 border rounded ${!nursingData.svd ? "bg-gray-100 opacity-50" : "bg-white"}`} value={nursingData.svdData || ""} onChange={(e) => setNursingData({ ...nursingData, svdData: e.target.value })} disabled={!nursingData.svd || isReadOnly} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">SNE (Fixação cm / Data)</label>
                <div className="flex gap-2">
                  <input className="w-full p-2 border rounded" placeholder="cm" value={nursingData.sneCm || ""} onChange={(e) => setNursingData({ ...nursingData, sneCm: e.target.value })} disabled={isReadOnly}/>
                  <input type="date" className="w-32 p-2 border rounded" value={nursingData.sneData || ""} onChange={(e) => setNursingData({ ...nursingData, sneData: e.target.value })} disabled={isReadOnly}/>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Drenos</label>
                <input className="w-full p-2 border rounded" placeholder="Tipo/Características" value={nursingData.drenoTipo || ""} onChange={(e) => setNursingData({ ...nursingData, drenoTipo: e.target.value })} disabled={isReadOnly}/>
              </div>
            </div>
          </div>

          {/* PELE E CURATIVOS */}
          <div className="p-4 border rounded-xl bg-orange-50/20 shadow-sm">
            <h4 className="font-bold text-orange-800 mb-3">Pele e Curativos</h4>
            <textarea placeholder="Lesões por pressão (Local / Estágio)..." className="w-full p-2 border rounded mb-3 h-16 outline-none focus:ring-2 focus:ring-orange-200" value={nursingData.lesaoLocal || ""} onChange={(e) => setNursingData({ ...nursingData, lesaoLocal: e.target.value })} disabled={isReadOnly}/>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-bold text-gray-500 mb-1 block">Tipo de Curativo</label>
                <input className="w-full p-2 border rounded" placeholder="Descritivo do curativo" value={nursingData.curativoTipo || ""} onChange={(e) => setNursingData({ ...nursingData, curativoTipo: e.target.value })} disabled={isReadOnly}/>
              </div>
              <div className="w-40">
                <label className="text-xs font-bold text-gray-500 mb-1 block">Data Curativo</label>
                <input type="date" className="w-full p-2 border rounded" value={nursingData.curativoData || ""} onChange={(e) => setNursingData({ ...nursingData, curativoData: e.target.value })} disabled={isReadOnly}/>
              </div>
            </div>
          </div>

          {/* ESCALA BRADEN */}
          <div className="p-5 bg-orange-50 border border-orange-200 rounded-xl shadow-sm">
            <h4 className="font-bold text-orange-800 mb-4 text-sm uppercase flex items-center gap-2">
              <AlertTriangle size={16} /> Escala de Braden (Obrigatório)
            </h4>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Object.entries(BRADEN_OPTIONS).map(([key, options]) => (
                <div key={key}>
                  <label className="text-xs font-bold text-orange-700 uppercase mb-2 block">
                    {key === "percepcao" ? "Percepção Sensorial" : key === "friccao" ? "Fricção / Cisalhamento" : key}
                  </label>
                  <select className="w-full p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-orange-300" value={nursingData[`braden_${key}`] || ""} onChange={(e) => setNursingData({ ...nursingData, [`braden_${key}`]: e.target.value })} disabled={isReadOnly}>
                    <option value="">Selecione...</option>
                    {options.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* ESCALA MORSE */}
          <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl shadow-sm">
            <h4 className="font-bold text-blue-800 mb-4 text-sm uppercase flex items-center gap-2">
              <AlertTriangle size={16} /> Escala de Morse (Obrigatório)
            </h4>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Object.entries(MORSE_OPTIONS).map(([key, options]) => (
                <div key={key}>
                  <label className="text-xs font-bold text-blue-700 uppercase mb-2 block">
                    {key === "historico" ? "Histórico de Quedas" : key === "diagnostico" ? "Diagnóstico Secundário" : key === "auxilio" ? "Auxílio na Marcha" : key === "terapiaIV" ? "Terapia Endovenosa" : key === "estadoMental" ? "Estado Mental" : key}
                  </label>
                  <select className="w-full p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-300" value={nursingData[`morse_${key}`] || ""} onChange={(e) => setNursingData({ ...nursingData, [`morse_${key}`]: e.target.value })} disabled={isReadOnly}>
                    <option value="">Selecione...</option>
                    {options.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-100 border-t flex flex-col-reverse sm:flex-row justify-end gap-3 sticky bottom-0 z-10">
          <button onClick={() => setShowNursingModal(false)} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors w-full sm:w-auto">
            {isReadOnly ? "Fechar" : "Cancelar"}
          </button>
          
          {/* SÓ MOSTRA O BOTÃO DE FINALIZAR SE NÃO ESTIVER EM MODO LEITURA */}
          {!isReadOnly && (
            <button onClick={handleFinalizeNursingAdmission} className="px-6 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg transition-colors flex items-center justify-center gap-2 w-full sm:w-auto">
              <FileText size={18} /> Finalizar e Gerar Texto
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NursingAdmissionModal;