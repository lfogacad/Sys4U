import React from 'react';
import { Scale, Utensils } from 'lucide-react';
import { CARACTERISTICAS_DIETA, CONSISTENCIA_ALIMENTAR, RISCO_NUTRICIONAL } from '../../constants/clinicalLists';
import { calculateEvacDays } from '../../utils/core';

const NutriDashboard = ({
  currentPatient,
  isEditable,
  updateNested,
  toggleArrayItem,
  handleBlurSave // <-- Adicionado para a caixa preta
}) => {
  return (
    <fieldset disabled={!isEditable} className="space-y-6 animate-fadeIn min-w-0 border-0 p-0 m-0">
      <div className="p-4 border rounded-xl bg-lime-50/20">
        <h4 className="font-bold text-lime-800 mb-4 flex items-center gap-2">
          <Scale size={18} /> Antropometria e Metas
        </h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <div className="lg:col-span-2">
            <label className="text-xs font-bold text-gray-500">Peso Atual (kg)</label>
            <div className="flex gap-2">
              <input
                type="number"
                className="w-full p-2 border rounded border-lime-300"
                value={currentPatient.nutri?.peso || ""}
                onChange={(e) => updateNested("nutri", "peso", e.target.value)}
                onBlur={() => handleBlurSave("Nutrição: Editou Peso Atual")}
              />
              <select
                className="p-2 border rounded text-xs bg-white"
                value={currentPatient.nutri?.tipoMedicaoPeso || ""}
                onChange={(e) => updateNested("nutri", "tipoMedicaoPeso", e.target.value)}
                onBlur={() => handleBlurSave("Nutrição: Alterou Tipo de Medição de Peso")}
              >
                <option value="">Medição...</option>
                <option value="Aferido">Aferido</option>
                <option value="Referido">Referido</option>
                <option value="Estimado">Estimado</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500">Altura (m/cm)</label>
            <input
              type="number"
              step="0.01"
              className="w-full p-2 border rounded"
              value={currentPatient.nutri?.altura || ""}
              onChange={(e) => updateNested("nutri", "altura", e.target.value)}
              onBlur={() => handleBlurSave("Nutrição: Editou Altura")}
            />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs font-bold text-gray-500">Peso Predito</label>
            <input
              type="number"
              className="w-full p-2 border rounded bg-slate-50 cursor-not-allowed" // Dica visual para não editar
              value={currentPatient.nutri?.pesoPredito || ""}
              onChange={(e) => updateNested("nutri", "pesoPredito", e.target.value)}
              onBlur={() => handleBlurSave("Nutrição: Editou Peso Predito Manualmente")}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-bold text-gray-500">Meta Calórica (kcal)</label>
            <input
              type="number"
              className="w-full p-2 border rounded"
              value={currentPatient.nutri?.metaCal || ""}
              onChange={(e) => updateNested("nutri", "metaCal", e.target.value)}
              onBlur={() => handleBlurSave("Nutrição: Editou Meta Calórica")}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500">Meta Proteica (g)</label>
            <input
              type="number"
              className="w-full p-2 border rounded"
              value={currentPatient.nutri?.metaProt || ""}
              onChange={(e) => updateNested("nutri", "metaProt", e.target.value)}
              onBlur={() => handleBlurSave("Nutrição: Editou Meta Proteica")}
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 bg-white p-3 rounded-lg border border-lime-200">
            <div className="flex items-end gap-2 mb-2">
              <span className="text-sm font-bold text-lime-700 leading-tight">Meta Atingida:</span>
              <input
                type="text"
                className="flex-1 min-w-0 p-1 border-b border-lime-500 outline-none text-sm bg-transparent"
                value={currentPatient.nutri?.atingido || ""}
                onChange={(e) => updateNested("nutri", "atingido", e.target.value)}
                onBlur={() => handleBlurSave("Nutrição: Editou % de Meta Atingida")}
              />
            </div>
            <textarea
              className="w-full text-xs p-2 border rounded outline-none h-12 bg-slate-50"
              placeholder="Anotações sobre a meta atingida..."
              value={currentPatient.nutri?.atingidoAnotacoes || ""}
              onChange={(e) => updateNested("nutri", "atingidoAnotacoes", e.target.value)}
              onBlur={() => handleBlurSave("Nutrição: Editou Anotações de Meta")}
            />
          </div>

          <div className="flex items-center gap-2 bg-white p-4 rounded-lg border border-red-200 h-fit">
            <span className="text-sm font-bold text-red-700">Risco Nutricional (NRS 2002):</span>
            <select
              className="p-1 border-b border-red-500 text-center outline-none bg-transparent font-bold text-red-800"
              value={currentPatient.nutri?.risco_nutricional || ""}
              onChange={(e) => updateNested("nutri", "risco_nutricional", e.target.value)}
              onBlur={() => handleBlurSave("Nutrição: Avaliou Risco Nutricional (NRS 2002)")}
            >
              <option value="">-</option>
              {RISCO_NUTRICIONAL.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-4 border rounded-xl bg-white shadow-sm">
          <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Utensils size={16} /> Dieta
          </h4>

          <label className="block text-xs font-bold text-gray-500 mb-1">Via de Administração</label>
          <select
            className="w-full p-2 border rounded mb-3 font-bold text-slate-700"
            value={currentPatient.nutri?.via || ""}
            onChange={(e) => updateNested("nutri", "via", e.target.value)}
            onBlur={() => handleBlurSave("Nutrição: Alterou Via de Administração da Dieta")}
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
              {CARACTERISTICAS_DIETA.map((c) => {
                const cArray = Array.isArray(currentPatient.nutri?.caracteristicasDieta) ? currentPatient.nutri.caracteristicasDieta : [];
                return (
                  <label key={c} className="flex items-center gap-1 text-xs font-semibold text-slate-700 cursor-pointer p-1 hover:bg-lime-50 rounded transition-colors">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 text-lime-600 rounded focus:ring-lime-500"
                      checked={cArray.includes(c)}
                      onChange={() => toggleArrayItem("nutri", "caracteristicasDieta", c)}
                      onBlur={() => handleBlurSave(`Nutrição: Alterou Característica da Dieta (${c})`)}
                    />{" "}
                    {c}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-pink-700 mb-1">Consistência da Dieta (Fono)</label>
            <select
              className="w-full p-2 border rounded bg-pink-50/30 text-pink-900 font-bold"
              value={currentPatient.fono?.consistencia || ""}
              onChange={(e) => updateNested("fono", "consistencia", e.target.value)}
              onBlur={() => handleBlurSave("Nutrição/Fono: Alterou Consistência da Dieta")}
            >
              <option value="">Selecione...</option>
              {CONSISTENCIA_ALIMENTAR.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          {(currentPatient.nutri?.via === "Enteral" || currentPatient.nutri?.via === "Parenteral") && (
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="Tipo/Fórmula"
                className="p-2 border rounded"
                value={currentPatient.nutri?.tipoDieta || ""}
                onChange={(e) => updateNested("nutri", "tipoDieta", e.target.value)}
                onBlur={() => handleBlurSave("Nutrição: Editou Tipo/Fórmula da Dieta")}
              />
              <input
                placeholder="Vazão (ml/h)"
                className="p-2 border rounded"
                value={currentPatient.nutri?.vazao || ""}
                onChange={(e) => updateNested("nutri", "vazao", e.target.value)}
                onBlur={() => handleBlurSave("Nutrição: Editou Vazão da Dieta")}
              />
            </div>
          )}
          {currentPatient.nutri?.via === "Mista" && (
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="Enteral: Vazão"
                className="p-2 border rounded"
                value={currentPatient.nutri?.vazao || ""}
                onChange={(e) => updateNested("nutri", "vazao", e.target.value)}
                onBlur={() => handleBlurSave("Nutrição: Editou Vazão da Dieta Mista")}
              />
              <div className="text-xs font-bold text-slate-500 p-2 border rounded bg-slate-50 flex items-center justify-center text-center">
                Oral / Fórmula Mista
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border rounded-xl bg-white shadow-sm flex flex-col h-full">
          <h4 className="font-bold text-slate-700 mb-4">Gastrointestinal</h4>
          <div className="grid grid-cols-2 gap-3 mb-auto">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Resíduo Gástrico (ml)</label>
              <input
                type="number"
                className="w-full p-2 border rounded text-center font-bold text-slate-700"
                value={currentPatient.nutri?.residuo || ""}
                onChange={(e) => updateNested("nutri", "residuo", e.target.value)}
                onBlur={() => handleBlurSave("Nutrição: Editou Resíduo Gástrico")}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Data Últ. Evacuação</label>
              <input
                type="date"
                className="w-full p-2 border rounded text-xs font-bold text-slate-700"
                value={currentPatient.gastro?.dataUltimaEvacuacao || ""}
                onChange={(e) => updateNested("gastro", "dataUltimaEvacuacao", e.target.value)}
                onBlur={() => handleBlurSave("Nutrição/Gastro: Editou Data da Última Evacuação")}
              />
            </div>
          </div>
          {currentPatient.gastro?.dataUltimaEvacuacao && (
            <div className="mt-4 p-2 bg-amber-50 border border-amber-200 rounded-lg text-center">
              <span className="text-xs font-bold text-amber-800 uppercase">
                Tempo sem evacuar:{" "}
                <span className="text-sm font-black">{calculateEvacDays(currentPatient.gastro.dataUltimaEvacuacao)}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-white border rounded-xl shadow-sm">
        <h4 className="font-bold text-slate-700 mb-2">Anotações Nutricionais</h4>
        <textarea
          className="w-full p-3 border rounded-lg h-32 text-sm outline-none focus:ring-2 focus:ring-lime-200 resize-y"
          placeholder="Evolução nutricional, condutas específicas, cálculos..."
          value={currentPatient.nutri?.anotacoes || ""}
          onChange={(e) => updateNested("nutri", "anotacoes", e.target.value)}
          onBlur={() => handleBlurSave("Nutrição: Editou Anotações Nutricionais")}
        />
      </div>
    </fieldset>
  );
};

export default NutriDashboard;