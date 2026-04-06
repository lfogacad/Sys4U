import React from 'react';
import { Scale, Utensils } from 'lucide-react';
import { CARACTERISTICAS_DIETA, CONSISTENCIA_ALIMENTAR, RISCO_NUTRICIONAL } from '../../constants/clinicalLists';
import { calculateEvacDays } from '../../utils/core';

const NutriDashboard = ({
  currentPatient,
  isEditable,
  updateNested,
  toggleArrayItem
}) => {
  return (
    <fieldset
                  disabled={!isEditable}
                  className="space-y-6 animate-fadeIn min-w-0 border-0 p-0 m-0"
                >
                  <div className="p-4 border rounded-xl bg-lime-50/20">
                    <h4 className="font-bold text-lime-800 mb-4 flex items-center gap-2">
                      <Scale size={18} /> Antropometria e Metas
                    </h4>
                    <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                      <div className="lg:col-span-2">
                        <label className="text-xs font-bold text-gray-500">
                          Peso Atual (kg)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            className="w-full p-2 border rounded border-lime-300"
                            value={currentPatient.nutri?.peso || ""}
                            onChange={(e) =>
                              updateNested("nutri", "peso", e.target.value)
                            }
                          />
                          <select
                            className="p-2 border rounded text-xs bg-white"
                            value={currentPatient.nutri?.tipoMedicaoPeso || ""}
                            onChange={(e) =>
                              updateNested(
                                "nutri",
                                "tipoMedicaoPeso",
                                e.target.value
                              )
                            }
                          >
                            <option value="">Medição...</option>
                            <option value="Aferido">Aferido</option>
                            <option value="Referido">Referido</option>
                            <option value="Estimado">Estimado</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500">
                          Altura (m/cm)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full p-2 border rounded"
                          value={currentPatient.nutri?.altura || ""}
                          onChange={(e) =>
                            updateNested("nutri", "altura", e.target.value)
                          }
                        />
                      </div>
                      <div className="lg:col-span-2">
                        <label className="text-xs font-bold text-gray-500">
                          Peso Predito
                        </label>
                        <input
                          type="number"
                          className="w-full p-2 border rounded"
                          value={currentPatient.nutri?.pesoPredito || ""}
                          onChange={(e) =>
                            updateNested("nutri", "pesoPredito", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500">
                          Meta Calórica (kcal)
                        </label>
                        <input
                          type="number"
                          className="w-full p-2 border rounded"
                          value={currentPatient.nutri?.metaCal || ""}
                          onChange={(e) =>
                            updateNested("nutri", "metaCal", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500">
                          Meta Proteica (g)
                        </label>
                        <input
                          type="number"
                          className="w-full p-2 border rounded"
                          value={currentPatient.nutri?.metaProt || ""}
                          onChange={(e) =>
                            updateNested("nutri", "metaProt", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 bg-white p-3 rounded-lg border border-lime-200">
                        
                        {/* items-end ajuda a alinhar o texto com a linha do input */}
                        <div className="flex items-end gap-2 mb-2">
                          <span className="text-sm font-bold text-lime-700 leading-tight">
                            Meta Atingida:
                          </span>
                          <input
                            type="text"
                            // min-w-0 permite que o input encolha no celular sem estourar o layout
                            className="flex-1 min-w-0 p-1 border-b border-lime-500 outline-none text-sm bg-transparent"
                            value={currentPatient.nutri?.atingido || ""}
                            onChange={(e) =>
                              updateNested("nutri", "atingido", e.target.value)
                            }
                          />
                        </div>

                        <textarea
                          className="w-full text-xs p-2 border rounded outline-none h-12 bg-slate-50"
                          placeholder="Anotações sobre a meta atingida..."
                          value={currentPatient.nutri?.atingidoAnotacoes || ""}
                          onChange={(e) =>
                            updateNested(
                              "nutri",
                              "atingidoAnotacoes",
                              e.target.value
                            )
                          }
                        ></textarea>
                      </div>

                      <div className="flex items-center gap-2 bg-white p-4 rounded-lg border border-red-200 h-fit">
                        <span className="text-sm font-bold text-red-700">
                          Risco Nutricional (NRS 2002):
                        </span>
                        <select
                          className="p-1 border-b border-red-500 text-center outline-none bg-transparent"
                          value={currentPatient.nutri?.risco_nutricional || ""}
                          onChange={(e) =>
                            updateNested(
                              "nutri",
                              "risco_nutricional",
                              e.target.value
                            )
                          }
                        >
                          <option value="">-</option>
                          {RISCO_NUTRICIONAL.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-4 border rounded-xl bg-white">
                      <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Utensils size={16} /> Dieta
                      </h4>

                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        Via de Administração
                      </label>
                      <select
                        className="w-full p-2 border rounded mb-3"
                        value={currentPatient.nutri?.via || ""}
                        onChange={(e) =>
                          updateNested("nutri", "via", e.target.value)
                        }
                      >
                        <option value="">Selecione...</option>
                        <option value="Oral">Oral</option>
                        <option value="Enteral">Enteral</option>
                        <option value="Parenteral">Parenteral</option>
                        <option value="Zero">Zero</option>
                        <option value="Mista">Mista</option>
                      </select>

                      <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-500 mb-1">
                          Características da Dieta
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {CARACTERISTICAS_DIETA.map((c) => {
                            const cArray = Array.isArray(
                              currentPatient.nutri?.caracteristicasDieta
                            )
                              ? currentPatient.nutri.caracteristicasDieta
                              : [];
                            return (
                              <label
                                key={c}
                                className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={cArray.includes(c)}
                                  onChange={() =>
                                    toggleArrayItem(
                                      "nutri",
                                      "caracteristicasDieta",
                                      c
                                    )
                                  }
                                />{" "}
                                {c}
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-xs font-bold text-pink-700 mb-1">
                          Consistência da Dieta (Fono)
                        </label>
                        <select
                          className="w-full p-2 border rounded bg-pink-50/30"
                          value={currentPatient.fono?.consistencia || ""}
                          onChange={(e) =>
                            updateNested("fono", "consistencia", e.target.value)
                          }
                        >
                          <option value="">Selecione...</option>
                          {CONSISTENCIA_ALIMENTAR.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      {(currentPatient.nutri?.via === "Enteral" ||
                        currentPatient.nutri?.via === "Parenteral") && (
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            placeholder="Tipo/Fórmula"
                            className="p-2 border rounded"
                            value={currentPatient.nutri?.tipoDieta || ""}
                            onChange={(e) =>
                              updateNested("nutri", "tipoDieta", e.target.value)
                            }
                          />
                          <input
                            placeholder="Vazão (ml/h)"
                            className="p-2 border rounded"
                            value={currentPatient.nutri?.vazao || ""}
                            onChange={(e) =>
                              updateNested("nutri", "vazao", e.target.value)
                            }
                          />
                        </div>
                      )}
                      {currentPatient.nutri?.via === "Mista" && (
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            placeholder="Enteral: Vazão"
                            className="p-2 border rounded"
                            value={currentPatient.nutri?.vazao || ""}
                            onChange={(e) =>
                              updateNested("nutri", "vazao", e.target.value)
                            }
                          />
                          <div className="text-xs text-slate-500 p-2 border rounded bg-slate-50 flex items-center justify-center text-center">
                            Oral / Fórmula Mista
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 border rounded-xl bg-white">
                      <h4 className="font-bold text-slate-700 mb-4">
                        Gastrointestinal
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-bold text-gray-500">
                            Resíduo Gástrico (ml)
                          </label>
                          <input
                            type="number"
                            className="w-full p-2 border rounded"
                            value={currentPatient.nutri?.residuo || ""}
                            onChange={(e) =>
                              updateNested("nutri", "residuo", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500">
                            Data Últ. Evacuação
                          </label>
                          <input
                            type="date"
                            className="w-full p-2 border rounded"
                            value={
                              currentPatient.gastro?.dataUltimaEvacuacao || ""
                            }
                            onChange={(e) =>
                              updateNested(
                                "gastro",
                                "dataUltimaEvacuacao",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                      {currentPatient.gastro?.dataUltimaEvacuacao && (
                        <p className="text-xs text-right mt-1 text-slate-400">
                          Tempo:{" "}
                          {calculateEvacDays(
                            currentPatient.gastro.dataUltimaEvacuacao
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-white border rounded-xl">
                    <h4 className="font-bold text-slate-700 mb-2">
                      Anotações Nutricionais
                    </h4>
                    <textarea
                      className="w-full p-3 border rounded-lg h-32 text-sm"
                      placeholder="Evolução nutricional, condutas específicas, cálculos..."
                      value={currentPatient.nutri?.anotacoes || ""}
                      onChange={(e) =>
                        updateNested("nutri", "anotacoes", e.target.value)
                      }
                    />
                  </div>
                </fieldset>
  );
};

export default NutriDashboard;