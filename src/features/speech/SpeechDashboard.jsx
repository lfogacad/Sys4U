import React from 'react';
import { Mic } from 'lucide-react';
import { FONO_COMPREENSAO, FONO_EXPRESSAO, FONO_EXPRESSAO_DETALHE, CONSISTENCIA_ALIMENTAR, UTENSILIOS_AGUA, FONO_INAPTO_VO } from '../../constants/clinicalLists';

const SpeechDashboard = ({
  currentPatient,
  isEditable,
  updateNested,
  toggleArrayItem,
  handleBlurSave // <-- Adicionado para a caixa preta
}) => {
  return (
    <fieldset disabled={!isEditable} className="space-y-6 animate-fadeIn min-w-0 border-0 p-0 m-0">
      <div className="p-4 border rounded-xl bg-pink-50/20">
        <h4 className="font-bold text-pink-800 mb-4 flex items-center gap-2">
          <Mic size={18} /> Avaliação Fonoaudiológica
        </h4>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-pink-100">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                Nível de Consciência
              </label>
              <input
                className="w-full p-2 border rounded"
                value={currentPatient.fono?.nivel_consciencia || ""}
                onChange={(e) => updateNested("fono", "nivel_consciencia", e.target.value)}
                onBlur={() => handleBlurSave("Fonoaudiologia: Editou Nível de Consciência")}
              />
            </div>

            <div className="bg-white p-4 rounded-lg border border-pink-100">
              <label className="block text-xs font-bold text-pink-700 uppercase mb-2">
                Compreensão
              </label>
              <select
                className="w-full p-2 border rounded"
                value={currentPatient.fono?.compreensao || ""}
                onChange={(e) => updateNested("fono", "compreensao", e.target.value)}
                onBlur={() => handleBlurSave("Fonoaudiologia: Avaliou Compreensão")}
              >
                <option value="">Selecione...</option>
                {FONO_COMPREENSAO.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="bg-white p-4 rounded-lg border border-pink-100">
              <label className="block text-xs font-bold text-pink-700 uppercase mb-2">
                Expressão Oral
              </label>
              <select
                className="w-full p-2 border rounded mb-2"
                value={currentPatient.fono?.expressao_oral || ""}
                onChange={(e) => updateNested("fono", "expressao_oral", e.target.value)}
                onBlur={() => handleBlurSave("Fonoaudiologia: Avaliou Expressão Oral")}
              >
                <option value="">Selecione...</option>
                {FONO_EXPRESSAO.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              {currentPatient.fono?.expressao_oral === "Alterada" && (
                <select
                  className="w-full p-2 border rounded bg-pink-50 animate-fadeIn"
                  value={currentPatient.fono?.expressao_oral_detalhe || ""}
                  onChange={(e) => updateNested("fono", "expressao_oral_detalhe", e.target.value)}
                  onBlur={() => handleBlurSave("Fonoaudiologia: Detalhou Expressão Oral Alterada")}
                >
                  <option value="">Detalhe...</option>
                  {FONO_EXPRESSAO_DETALHE.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-pink-100">
              <label className="block text-xs font-bold text-pink-700 uppercase mb-2">
                Consistência Alimentar Liberada
              </label>
              <select
                className="w-full p-2 border rounded"
                value={currentPatient.fono?.consistencia || ""}
                onChange={(e) => updateNested("fono", "consistencia", e.target.value)}
                onBlur={() => handleBlurSave("Fonoaudiologia: Liberou Consistência Alimentar")}
              >
                <option value="">Selecione...</option>
                {CONSISTENCIA_ALIMENTAR.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="bg-white p-4 rounded-lg border border-pink-100">
              <label className="block font-bold text-pink-700 mb-2">
                Água Oral Liberada?
              </label>
              <select
                className="w-full p-2 border border-pink-200 rounded outline-none focus:ring-2 focus:ring-pink-300 text-sm font-bold text-slate-700 mb-3"
                value={
                  currentPatient.fono?.toleraAgua === true || currentPatient.fono?.toleraAgua === "Sim" ? "Sim" :
                  currentPatient.fono?.toleraAgua === false || currentPatient.fono?.toleraAgua === "Não" ? "Não" : ""
                }
                onChange={(e) => updateNested("fono", "toleraAgua", e.target.value)}
                onBlur={() => handleBlurSave("Fonoaudiologia: Avaliou Liberação de Água Oral")}
              >
                <option value="">Aguardando Avaliação...</option>
                <option value="Sim">Sim (Liberada)</option>
                <option value="Não">Não (Suspensa)</option>
              </select>

              {(currentPatient.fono?.toleraAgua === "Sim" || currentPatient.fono?.toleraAgua === true) && (
                <div className="animate-fadeIn pt-2 border-t border-pink-50 mt-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Utensílio
                  </label>
                  <select
                    className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-pink-300 text-sm"
                    value={currentPatient.fono?.utensilioAgua || ""}
                    onChange={(e) => updateNested("fono", "utensilioAgua", e.target.value)}
                    onBlur={() => handleBlurSave("Fonoaudiologia: Definiu Utensílio para Água")}
                  >
                    <option value="">Selecione...</option>
                    {UTENSILIOS_AGUA.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 bg-red-50 border border-red-100 rounded-xl mb-4">
          <h4 className="font-bold text-red-800 mb-3 text-sm uppercase">
            Sinais de Inaptidão para Via Oral
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {FONO_INAPTO_VO.map((item) => {
              const voArray = Array.isArray(currentPatient.fono?.inapto_vo) ? currentPatient.fono.inapto_vo : [];
              return (
                <label key={item} className="flex items-start gap-2 text-xs text-red-700 cursor-pointer p-1 hover:bg-red-100 rounded transition-colors">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={voArray.includes(item)}
                    onChange={() => toggleArrayItem("fono", "inapto_vo", item)}
                    onBlur={() => handleBlurSave(`Fonoaudiologia: Alterou Sinal de Inaptidão (${item})`)}
                  />
                  {item}
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">
            Conduta / Plano Terapêutico
          </label>
          <textarea
            className="w-full p-3 border rounded h-24 outline-none focus:ring-2 focus:ring-pink-300 resize-y"
            value={currentPatient.fono?.conduta || ""}
            onChange={(e) => updateNested("fono", "conduta", e.target.value)}
            onBlur={() => handleBlurSave("Fonoaudiologia: Editou Conduta/Plano Terapêutico")}
            placeholder="Descreva a evolução fonoaudiológica, exercícios prescritos e condutas..."
          />
        </div>
      </div>
    </fieldset>
  );
};

export default SpeechDashboard;