import React from 'react';
import { Mic } from 'lucide-react';
import { FONO_COMPREENSAO, FONO_EXPRESSAO, FONO_EXPRESSAO_DETALHE, CONSISTENCIA_ALIMENTAR, UTENSILIOS_AGUA, FONO_INAPTO_VO } from '../../constants/clinicalLists';

const SpeechDashboard = ({
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
                            onChange={(e) =>
                              updateNested(
                                "fono",
                                "nivel_consciencia",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-pink-100">
                          <label className="block text-xs font-bold text-pink-700 uppercase mb-2">
                            Compreensão
                          </label>
                          <select
                            className="w-full p-2 border rounded"
                            value={currentPatient.fono?.compreensao || ""}
                            onChange={(e) =>
                              updateNested(
                                "fono",
                                "compreensao",
                                e.target.value
                              )
                            }
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
                            onChange={(e) =>
                              updateNested(
                                "fono",
                                "expressao_oral",
                                e.target.value
                              )
                            }
                          >
                            <option value="">Selecione...</option>
                            {FONO_EXPRESSAO.map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                          {currentPatient.fono?.expressao_oral ===
                            "Alterada" && (
                            <select
                              className="w-full p-2 border rounded bg-pink-50"
                              value={
                                currentPatient.fono?.expressao_oral_detalhe ||
                                ""
                              }
                              onChange={(e) =>
                                updateNested(
                                  "fono",
                                  "expressao_oral_detalhe",
                                  e.target.value
                                )
                              }
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
                            onChange={(e) =>
                              updateNested(
                                "fono",
                                "consistencia",
                                e.target.value
                              )
                            }
                          >
                            <option value="">Selecione...</option>
                            {CONSISTENCIA_ALIMENTAR.map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-pink-100">
                          <label className="flex items-center gap-2 font-bold text-pink-700 mb-2">
                            <input
                              type="checkbox"
                              checked={currentPatient.fono?.toleraAgua || false}
                              onChange={(e) =>
                                updateNested(
                                  "fono",
                                  "toleraAgua",
                                  e.target.checked
                                )
                              }
                            />{" "}
                            Água Oral Liberada?
                          </label>
                          {currentPatient.fono?.toleraAgua && (
                            <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                Utensílio
                              </label>
                              <select
                                className="w-full p-2 border rounded"
                                value={currentPatient.fono?.utensilioAgua || ""}
                                onChange={(e) =>
                                  updateNested(
                                    "fono",
                                    "utensilioAgua",
                                    e.target.value
                                  )
                                }
                              >
                                <option value="">Selecione...</option>
                                {UTENSILIOS_AGUA.map((u) => (
                                  <option key={u}>{u}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-pink-100">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                            Blue Dye Test
                          </label>
                          <select
                            className="w-full p-2 border rounded"
                            value={currentPatient.fono?.blue_dye || ""}
                            onChange={(e) =>
                              updateNested("fono", "blue_dye", e.target.value)
                            }
                          >
                            <option value="">Selecione...</option>
                            <option value="Negativo">Negativo</option>
                            <option value="Positivo">Positivo</option>
                            <option value="Não Realizado">Não Realizado</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl mb-4">
                      <h4 className="font-bold text-red-800 mb-3 text-sm uppercase">
                        Sinais de Inaptidão para Via Oral
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {FONO_INAPTO_VO.map((item) => {
                          const voArray = Array.isArray(
                            currentPatient.fono?.inapto_vo
                          )
                            ? currentPatient.fono.inapto_vo
                            : [];
                          return (
                            <label
                              key={item}
                              className="flex items-start gap-2 text-xs text-red-700 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={voArray.includes(item)}
                                onChange={() =>
                                  toggleArrayItem("fono", "inapto_vo", item)
                                }
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
                        className="w-full p-3 border rounded h-24"
                        value={currentPatient.fono?.conduta || ""}
                        onChange={(e) =>
                          updateNested("fono", "conduta", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </fieldset>
  );
};

export default SpeechDashboard;