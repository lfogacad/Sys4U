import React from 'react';
import { Scale, Utensils, Lock, ClipboardSignature, CheckSquare, Square } from 'lucide-react';
import { CARACTERISTICAS_DIETA, CONSISTENCIA_ALIMENTAR, RISCO_NUTRICIONAL } from '../../constants/clinicalLists';
import { calculateEvacDays } from '../../utils/core';

const NutriDashboard = ({
  currentPatient,
  isEditable,
  updateNested,
  toggleArrayItem,
  handleBlurSave,
  abrirAdmissaoNutri
}) => {

  if (!currentPatient?.nutri?.admitido) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-lime-50/50 border-2 border-dashed border-lime-200 rounded-2xl animate-fadeIn mt-4">
        <div className="w-20 h-20 bg-lime-100 text-lime-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
          <Lock size={40} />
        </div>
        <h3 className="text-xl font-black text-lime-800 mb-2 text-center">Admissão Nutricional Pendente</h3>
        <p className="text-slate-500 text-center max-w-md mb-6">
          Realize a admissão nutricional para definir os parâmetros base do paciente.
        </p>
        <button
          onClick={abrirAdmissaoNutri}
          disabled={!isEditable}
          className="flex items-center gap-2 px-8 py-4 bg-lime-600 hover:bg-lime-700 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
        >
          <ClipboardSignature size={24} /> Realizar Admissão Nutricional
        </button>
      </div>
    );
  }

  return (
    <fieldset disabled={!isEditable} className="space-y-6 animate-fadeIn min-w-0 border-0 p-0 m-0">
      
      <div className="flex justify-end mb-2">
        <button
          onClick={abrirAdmissaoNutri}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-lime-200 text-lime-700 hover:bg-lime-50 rounded-lg text-sm font-bold shadow-sm transition-colors"
        >
          <ClipboardSignature size={16} /> Editar Admissão Nutricional
        </button>
      </div>

      <div className="p-4 border rounded-xl bg-lime-50/20">
        <h4 className="font-bold text-lime-800 mb-4 flex items-center gap-2">
          <Scale size={18} /> Antropometria e Metas
        </h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="lg:col-span-2">
            <label className="text-xs font-bold text-gray-500">Peso Atual (kg)</label>
            <div className="flex gap-2">
              <input
                type="number"
                className="w-full p-2 border rounded border-lime-300 bg-white font-bold text-lime-900"
                value={currentPatient.nutri?.peso || ""}
                onChange={(e) => updateNested("nutri", "peso", e.target.value)}
                onBlur={() => handleBlurSave("Nutrição: Editou Peso")}
              />
              <select
                className="p-2 border rounded text-xs bg-white"
                value={currentPatient.nutri?.tipoMedicaoPeso || ""}
                onChange={(e) => updateNested("nutri", "tipoMedicaoPeso", e.target.value)}
              >
                <option value="">Medição...</option>
                <option value="Aferido">Aferido</option>
                <option value="Referido">Referido</option>
                <option value="Estimado">Estimado</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500">Altura (Fisio)</label>
            <input
              type="text"
              className="w-full p-2 border rounded bg-slate-100 cursor-not-allowed font-medium text-slate-600"
              value={currentPatient.nutri?.altura || "-"} 
              disabled
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500">Peso Predito</label>
            <input
              type="text"
              className="w-full p-2 border rounded bg-slate-100 cursor-not-allowed font-medium text-slate-600"
              value={currentPatient.nutri?.pesoPredito || "-"}
              disabled
            />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs font-bold text-red-700">Risco Nutricional (NRS 2002)</label>
            <select
              className="w-full p-2 border rounded bg-white font-bold text-red-800 border-red-200"
              value={currentPatient.nutri?.risco_nutricional || ""}
              onChange={(e) => updateNested("nutri", "risco_nutricional", e.target.value)}
            >
              <option value="">-</option>
              {RISCO_NUTRICIONAL.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {/* METAS DESBLOQUEADAS */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="text-xs font-bold text-lime-700 uppercase">Meta Calórica Total (kcal)</label>
            <input
              type="number"
              className="w-full p-2 border-2 border-lime-100 rounded bg-white font-black"
              value={currentPatient.nutri?.metaCalTotal || ""}
              onChange={(e) => updateNested("nutri", "metaCalTotal", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-lime-700 uppercase">Meta Calórica Diária (kcal)</label>
            <input
              type="number"
              className="w-full p-2 border-2 border-lime-100 rounded bg-white font-black"
              value={currentPatient.nutri?.metaCalDiaria || ""}
              onChange={(e) => updateNested("nutri", "metaCalDiaria", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-lime-700 uppercase">Meta Proteica Total (g)</label>
            <input
              type="number"
              className="w-full p-2 border-2 border-lime-100 rounded bg-white font-black"
              value={currentPatient.nutri?.metaProtTotal || ""}
              onChange={(e) => updateNested("nutri", "metaProtTotal", e.target.value)}
            />
          </div>
        </div>

        {/* CONTROLE DE METAS ATINGIDAS */}
        <div className="bg-white p-4 rounded-xl border border-lime-200 shadow-sm">
          <h5 className="text-xs font-bold text-slate-500 uppercase mb-3">Acompanhamento de Metas</h5>
          <div className="flex flex-wrap gap-6 mb-4">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700">
              <input 
                type="checkbox" className="w-5 h-5 accent-lime-600"
                checked={currentPatient.nutri?.metaCalDiariaAtingida || false}
                onChange={(e) => updateNested("nutri", "metaCalDiariaAtingida", e.target.checked)}
              /> Meta Calórica Diária Atingida
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700">
              <input 
                type="checkbox" className="w-5 h-5 accent-lime-600"
                checked={currentPatient.nutri?.metaCalTotalAtingida || false}
                onChange={(e) => updateNested("nutri", "metaCalTotalAtingida", e.target.checked)}
              /> Meta Calórica Total Atingida
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700">
              <input 
                type="checkbox" className="w-5 h-5 accent-lime-600"
                checked={currentPatient.nutri?.metaProtAtingida || false}
                onChange={(e) => updateNested("nutri", "metaProtAtingida", e.target.checked)}
              /> Meta Proteica Atingida
            </label>
          </div>
          <textarea
            className="w-full text-xs p-3 border rounded-lg outline-none h-16 bg-slate-50 focus:bg-white transition-colors"
            placeholder="Anotações sobre a meta atingida..."
            value={currentPatient.nutri?.atingidoAnotacoes || ""}
            onChange={(e) => updateNested("nutri", "atingidoAnotacoes", e.target.value)}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-4 border rounded-xl bg-white shadow-sm">
          <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Utensils size={16} /> Dieta</h4>
          <label className="block text-xs font-bold text-gray-500 mb-1">Via de Administração</label>
          <select
            className="w-full p-2 border rounded mb-3 font-bold text-slate-700"
            value={currentPatient.nutri?.via || ""}
            onChange={(e) => updateNested("nutri", "via", e.target.value)}
          >
            <option value="">Selecione...</option>
            <option value="Oral">Oral</option>
            <option value="Enteral">Enteral</option>
            <option value="Parenteral">Parenteral</option>
            <option value="Zero">Zero</option>
            <option value="Mista">Mista</option>
          </select>

          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 mb-1">Características da Dieta</label>
            <div className="flex flex-wrap gap-2">
              {CARACTERISTICAS_DIETA.map((c) => (
                <label key={c} className="flex items-center gap-1 text-xs font-semibold text-slate-700 cursor-pointer p-1 hover:bg-lime-50 rounded">
                  <input
                    type="checkbox"
                    checked={(currentPatient.nutri?.caracteristicasDieta || []).includes(c)}
                    onChange={() => toggleArrayItem("nutri", "caracteristicasDieta", c)}
                  /> {c}
                </label>
              ))}
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-xs font-bold text-pink-700 mb-1">Consistência (Fono)</label>
            <select
              className="w-full p-2 border rounded bg-pink-50/30 text-pink-900 font-bold"
              value={currentPatient.fono?.consistencia || ""}
              onChange={(e) => updateNested("fono", "consistencia", e.target.value)}
            >
              <option value="">Selecione...</option>
              {CONSISTENCIA_ALIMENTAR.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="p-4 border rounded-xl bg-white shadow-sm flex flex-col h-full">
          <h4 className="font-bold text-slate-700 mb-4">Tolerância Gastrointestinal</h4>
          
          {/* LÓGICA DE DETECÇÃO DO BH (Adicionada internamente) */}
          {(() => {
            const temRegistroPositivo = (valor) => {
              if (!valor) return false;
              const texto = String(valor).trim().toLowerCase();
              if (texto === "" || texto === "0" || texto === "n" || texto === "nao" || texto === "não" || texto === "-") return false;
              return true; 
            };

            let evacuouNoBH = false;
            if (currentPatient.bh?.losses) {
              Object.values(currentPatient.bh.losses).forEach(hora => {
                if (hora && (temRegistroPositivo(hora["Evacuação"]) || temRegistroPositivo(hora["Evacuacao"]) || temRegistroPositivo(hora["Fezes"]))) {
                  evacuouNoBH = true;
                }
              });
            }

            // Cálculo dos dias
            const dataSalva = currentPatient.gastro?.dataUltimaEvacuacao;
            const diasSemEvacuar = evacuouNoBH ? 0 : calculateEvacDays(dataSalva);

            return (
              <>
                <div className="mb-4">
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Aceitação da Dieta</label>
                  <select
                    className="w-full p-2 border rounded text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-lime-200"
                    value={currentPatient.nutri?.aceitacao || ""}
                    onChange={(e) => updateNested("nutri", "aceitacao", e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    <option value="Boa tolerância / 100% aceitação">Boa tolerância / 100%</option>
                    <option value="Aceitação parcial (> 50%)">Aceitação parcial (&gt; 50%)</option>
                    <option value="Aceitação ruim (< 50%)">Aceitação ruim (&lt; 50%)</option>
                    <option value="Recusa alimentar">Recusa alimentar</option>
                    <option value="Pausa dietética / Jejum">Pausa dietética / Jejum</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Sintomas TGI</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Náuseas", "Distensão"].map(sintoma => (
                      <label key={sintoma} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-3.5 h-3.5 rounded text-amber-500" 
                          checked={(currentPatient.nutri?.sintomasTGI || []).includes(sintoma)}
                          onChange={() => toggleArrayItem("nutri", "sintomasTGI", sintoma)}
                        /> {sintoma}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-auto pt-3 border-t border-slate-100">
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Última Evacuação</label>
                  
                  {evacuouNoBH ? (
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs font-bold text-green-700 uppercase">Registrada hoje no BH</span>
                    </div>
                  ) : (
                    <input
                      type="date"
                      className="w-full p-2 border rounded text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-lime-200"
                      value={dataSalva || ""}
                      onChange={(e) => updateNested("gastro", "dataUltimaEvacuacao", e.target.value)}
                    />
                  )}

                  {dataSalva || evacuouNoBH ? (
                    <div className="mt-2 p-1.5 bg-amber-50 border border-amber-200 rounded-lg text-center">
                      <span className="text-[10px] font-bold text-amber-800 uppercase">
                        Tempo sem evacuar: <span className="text-xs font-black">{diasSemEvacuar} {diasSemEvacuar === 1 ? 'dia' : 'dias'}</span>
                      </span>
                    </div>
                  ) : null}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      <div className="p-4 bg-white border rounded-xl shadow-sm">
        <h4 className="font-bold text-slate-700 mb-2">Anotações Nutricionais</h4>
        <textarea
          className="w-full p-3 border rounded-lg h-32 text-sm outline-none focus:ring-2 focus:ring-lime-200"
          value={currentPatient.nutri?.anotacoes || ""}
          onChange={(e) => updateNested("nutri", "anotacoes", e.target.value)}
          onBlur={() => handleBlurSave("Nutrição: Editou Anotações")}
        />
      </div>
    </fieldset>
  );
};

export default NutriDashboard;