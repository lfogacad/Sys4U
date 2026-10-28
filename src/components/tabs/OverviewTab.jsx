import React from 'react';
import { Activity, ChevronDown, ChevronRight, Wind, Utensils, Brain, HeartPulse, Droplets, Clock, Table as TableIcon, Edit3 } from 'lucide-react';
import { BH_HOURS } from '../../constants/clinicalLists';
import ModuloCulturas from '../ModuloCulturas';
import VisitaMultiTab from './VisitaMultiTab';

const OverviewTab = ({
  viewMode,
  abaTopo,
  setAbaTopo,
  save,
  isOverviewEditable,
  currentPatient,
  handleUnlockSAPS3,
  getMissingSAPS3,
  handleLockSAPS3,
  getDaysD1,
  getTempoVMText,
  historyOpen,
  setHistoryOpen,
  calculateEvacDays,
  calculateGlasgowTotal,
  renderValue,
  calculateDiurese12hMlKgH,
  calculateCreatinineClearance,
  setShowATBHistoryModal,
  getDaysD0,
  setShowHistoryModal,
  formatDateDDMM,
  updateLab,
  updateNested,
  handleBlurSave,
  userProfile,
  updateP
}) => {
  // Se o ModuloUTI não mandar o viewMode, ou não for overview, esconde.
  if (viewMode && viewMode !== "overview") return null;
  if (!currentPatient) return null;

  // Função minimalista: altera apenas a cor do texto da Hemoglobina
  const getHbColorClass = (hbValue) => {
    if (!hbValue || isNaN(parseFloat(hbValue))) return "text-slate-700"; // Normal
    
    const val = parseFloat(hbValue);
    if (val < 7) {
      return "text-red-600 font-black"; // Crítico (Vermelho escuro, bem forte)
    } else if (val < 8) {
      return "text-orange-500 font-bold"; // Atenção (Laranja, negrito normal)
    }
    return "text-slate-700"; // Normal
  };

  // Converte datas em string (ISO "2026-10-27" ou "DD/MM/AAAA" ou "DD/MM - HH:MM") em timestamp.
  // Usada para ordenar o historico_bh do mais recente para o mais antigo.
  const parseDateForSort = (str) => {
    if (!str) return 0;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-');
      return new Date(Number(y), Number(m) - 1, Number(d), 0, 0).getTime();
    }
    const dMatch = String(str).match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (dMatch) {
      const day = parseInt(dMatch[1], 10);
      const month = parseInt(dMatch[2], 10) - 1;
      const year = dMatch[3]
        ? (dMatch[3].length === 2 ? 2000 + parseInt(dMatch[3], 10) : parseInt(dMatch[3], 10))
        : new Date().getFullYear();
      return new Date(year, month, day, 0, 0).getTime();
    }
    return 0;
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left">
    <div className="flex gap-2 mb-4 border-b border-slate-200 pb-3">
      <button
        onClick={() => setAbaTopo('visaoGeral')}
        className={`px-4 py-2 rounded-t-xl font-bold text-sm transition-colors ${
          abaTopo === 'visaoGeral'
            ? 'bg-teal-600 text-white shadow-sm'
            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
        }`}
      >
        Visão Geral
      </button>
      <button
        onClick={() => setAbaTopo('visitaMulti')}
        className={`px-4 py-2 rounded-t-xl font-bold text-sm transition-colors ${
          abaTopo === 'visitaMulti'
            ? 'bg-teal-600 text-white shadow-sm'
            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
        }`}
      >
        Visita Multi
      </button>
    </div>

    {/* 🔸 ABRE A CONDICIONAL */}
    {abaTopo === 'visaoGeral' ? (
      <>      
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
          <Activity className="text-blue-500" /> Resumo do Plantão
        </h3>
      </div>

      <fieldset disabled={!isOverviewEditable} className="min-w-0 border-0 p-0 m-0">
        {/* CARTÃO SAPS 3 */}
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mb-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-xs font-bold text-purple-800 uppercase flex items-center gap-2">
              <Activity size={14} /> Índice de Gravidade (SAPS 3)
            </h4>
            {currentPatient.saps3?.isLocked && isOverviewEditable && (
              <button onClick={(e) => { e.preventDefault(); handleUnlockSAPS3(); }} className="text-[10px] bg-purple-200 text-purple-800 px-2 py-1 rounded hover:bg-purple-300 font-bold transition-colors">
                Destravar
              </button>
            )}
          </div>

          {currentPatient.saps3?.isLocked ? (
            <div className="flex gap-4 items-center">
              <div className="bg-white px-4 py-2 rounded-lg border border-purple-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Pontuação</span>
                <span className="text-xl font-bold text-purple-700">{currentPatient.saps3.lockedScore}</span>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg border border-red-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Mortalidade Esperada</span>
                <span className="text-xl font-bold text-red-600">{currentPatient.saps3.lockedProb}%</span>
              </div>
            </div>
          ) : (
            <div className="bg-white p-3 rounded-lg border border-purple-200">
              {(() => {
                const missing = typeof getMissingSAPS3 === 'function' ? getMissingSAPS3(currentPatient) : [];
                const isReady = missing.length === 0;
                return (
                  <div className="flex flex-col gap-2">
                    {!isReady ? (
                      <>
                        <p className="text-xs font-bold text-slate-600">Aguardando preenchimento nas primeiras 24h:</p>
                        <p className="text-[10px] text-red-600 font-bold bg-red-50 p-2 rounded border border-red-100">Faltam: {missing.join(", ")}</p>
                      </>
                    ) : (
                      <p className="text-xs font-bold text-green-600 bg-green-50 p-2 rounded border border-green-100 text-center">Todos os dados clínicos de admissão presentes!</p>
                    )}
                    <button disabled={!isReady || !isOverviewEditable} onClick={(e) => { e.preventDefault(); handleLockSAPS3(); }} className={`py-2 rounded-lg text-xs font-bold text-white transition-colors ${!isReady || !isOverviewEditable ? "bg-slate-300 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 shadow-md"}`}>
                      {isReady ? "Calcular e Salvar SAPS 3 Definitivo" : "Aguardando Requisitos..."}
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div><span className="text-xs font-bold text-gray-400 block uppercase">Diagnóstico Principal</span> <span className="font-medium text-slate-700">{currentPatient.diagnostico || "-"}</span></div>
          <div><span className="text-xs font-bold text-gray-400 block uppercase">Procedência</span> <span className="font-medium text-slate-700">{currentPatient.procedencia || "-"}</span></div>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mt-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Comorbidades / HPP</h4>
          <p className="text-sm">{currentPatient.comorbidades || "Nenhuma registrada."}</p>
          <div className="flex gap-4 mt-2 text-xs font-bold text-slate-500 border-t pt-2 border-slate-200">
            <span>Internação: {typeof getDaysD1 === 'function' ? getDaysD1(currentPatient.dataInternacao) : "-"}</span>
            <span className="text-cyan-700">Tempo de VM: {typeof getTempoVMText === 'function' ? getTempoVMText(currentPatient) : "-"}</span>
          </div>
        </div>
      </fieldset>

      <div className="bg-white p-4 rounded-xl border border-slate-200 mt-4">
        <button onClick={(e) => { e.preventDefault(); setHistoryOpen(!historyOpen); }} className="flex items-center gap-2 font-bold text-slate-700 w-full text-left">
          {historyOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />} História Clínica
        </button>
        {historyOpen && (
          <div className="mt-3 p-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-700 whitespace-pre-wrap min-h-[60px] text-left">
            {currentPatient.historiaClinica || "Nenhuma história clínica registrada."}
          </div>
        )}
      </div>

      {/* LINHA 1: VENTILAÇÃO, NUTRIÇÃO E ELIMINAÇÕES */}
      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <div className="p-4 bg-cyan-50 border border-cyan-100 rounded-xl">
          <h4 className="font-bold text-cyan-800 mb-2 flex items-center gap-2"><Wind size={16} /> Ventilação</h4>
          <p className="text-sm">Suporte: <b>{currentPatient.physio?.suporte || "Não informado"}</b></p>
          {currentPatient.physio?.suporte === "VM" && (
            <div className="mt-1 text-xs text-cyan-700">
              <span className="mr-2">Modo: <b>{currentPatient.physio?.parametro || "-"}</b></span>
              <span>PEEP: <b>{currentPatient.physio?.peep || "-"}</b></span>
            </div>
          )}
          {currentPatient.physio?.fiO2 && <p className="text-xs text-cyan-600 mt-1">FiO2: {currentPatient.physio.fiO2}%</p>}
        </div>

        <div className="p-4 bg-lime-50 border border-lime-100 rounded-xl">
          <h4 className="font-bold text-lime-800 mb-2 flex items-center gap-2"><Utensils size={16} /> Nutrição</h4>
          <p className="text-sm">Via: <b>{currentPatient.nutri?.via || "Aguarda Avaliação"}</b></p>
          {currentPatient.nutri?.via === "Oral" && <p className="text-xs text-lime-600 mt-1">Consistência: <b>{currentPatient.fono?.consistencia || "-"}</b></p>}
          {currentPatient.nutri?.via === "Enteral" && (
            <div className="text-xs text-lime-600 mt-1 space-y-0.5">
              <p>Fórmula: <b>{currentPatient.nutri?.tipoDietaEnteral || currentPatient.nutri?.tipoDieta || "-"}</b></p>
              <p>Vazão: <b>{currentPatient.nutri?.vazaoEnteral || "-"} ml/h</b></p>
            </div>
          )}
          {currentPatient.nutri?.via === "Parenteral" && (
            <div className="text-xs text-lime-600 mt-1 space-y-0.5">
              <p>Vazão: <b>{currentPatient.nutri?.vazaoParenteral || "-"} ml/h</b></p>
            </div>
          )}
          {currentPatient.nutri?.via === "Mista" && (
            <div className="text-xs text-lime-600 mt-1 space-y-1">
              {(currentPatient.nutri?.viasMistas || []).includes('Enteral') && (
                <p>Enteral: <b>{currentPatient.nutri?.tipoDietaEnteral || "-"}</b> • <b>{currentPatient.nutri?.vazaoEnteral || "-"} ml/h</b></p>
              )}
              {(currentPatient.nutri?.viasMistas || []).includes('Parenteral') && (
                <p>Parenteral: <b>{currentPatient.nutri?.vazaoParenteral || "-"} ml/h</b></p>
              )}
              {(currentPatient.nutri?.viasMistas || []).includes('Oral') && (
                <p>VO (Consistência): <b>{currentPatient.fono?.consistencia || "-"}</b></p>
              )}
              {(currentPatient.nutri?.viasMistas || []).length === 0 && (
                <p>Vias não especificadas</p>
              )}
            </div>
          )}
          {currentPatient.nutri?.caracteristicasDieta?.length > 0 && (
            <div className="mt-1 pt-1 border-t border-lime-200">
              <p className="text-[11px] text-lime-700 font-medium">Caract.: {currentPatient.nutri.caracteristicasDieta.join(", ")}</p>
            </div>
          )}
        </div>

        {(() => {
          const escStr = (v) => String(v ?? "").trim().toLowerCase();

          // Uma perda está "positiva" quando o valor registrado indica ocorrência real.
          // Regra: "sim"/"s" → sim; qualquer número > 0 → sim; "0", "", "-", "não" → não.
          const valorPositivo = (v) => {
            const s = escStr(v);
            if (!s) return false;
            if (["não", "nao", "n", "-", "0", "0,0"].includes(s)) return false;
            if (["sim", "s"].includes(s)) return true;
            if (s.includes("+")) return true;
            const num = parseFloat(s.replace(",", "."));
            if (!isNaN(num)) return num > 0;
            return false; // texto sem sentido numérico ("ausente", "nega", etc.)
          };

          // ============================================================
          // 1. EVACUAÇÃO — busca retrógrada: bh → histórico → nutri
          // ============================================================

          // Retorna a data (Date) da ocorrência mais recente de evacuação no BH atual.
          // Percorre as horas de 06h→00h (mais recente primeiro, pois o BH termina às 06h do dia seguinte).
          const ultimaEvacNoBH = (bh) => {
            if (!bh || !bh.losses) return null;
            const horas = Object.keys(bh.losses).sort().reverse(); // "23","22",...,"00"
            for (const h of horas) {
              const cel = bh.losses[h] || {};
              const evac = cel["Evacuação"] ?? cel["Evacuacao"] ?? cel["Fezes"];
              if (valorPositivo(evac)) {
                return { hora: h };
              }
            }
            return null;
          };

          // Procura na lista historico_bh (mais recente primeiro) e devolve quantos dias atrás.
          const acharEvacNoHistorico = () => {
            const hist = currentPatient.historico_bh;
            if (!Array.isArray(hist) || !hist.length) return null;

            // ordena por data decrescente
            const ordenado = [...hist]
              .filter((item) => item && item.date)
              .sort((a, b) => parseDateForSort(b.date) - parseDateForSort(a.date));

            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            for (const item of ordenado) {
              const achou = ultimaEvacNoBH(item);
              if (!achou) continue;

              // data do item histórico (aceita ISO ou DD/MM/AAAA)
              let dRef = null;
              if (/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
                const [y, m, d] = item.date.split("-");
                dRef = new Date(Number(y), Number(m) - 1, Number(d));
              } else {
                const m = item.date.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
                if (m) {
                  const ano = m[3]
                    ? m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
                    : new Date().getFullYear();
                  dRef = new Date(ano, Number(m[2]) - 1, Number(m[1]));
                }
              }
              if (!dRef) continue;

              const diffDias = Math.round((hoje.getTime() - dRef.getTime()) / 86400000);
              return diffDias;
            }
            return null;
          };

          let evacResult = "-";
          let isConstipado = false;

          // Passo 1: o BH atual tem evacuação?
          if (ultimaEvacNoBH(currentPatient.bh)) {
            evacResult = "Hoje";
          } else {
            // Passo 2: o BH anterior (bh_previous) tem evacuação?
            if (ultimaEvacNoBH(currentPatient.bh_previous)) {
              evacResult = "1 dia";
            } else {
              // Passo 3: histórico completo
              const diasHist = acharEvacNoHistorico();
              if (diasHist !== null) {
                evacResult = diasHist === 0 ? "Hoje" : diasHist === 1 ? "1 dia" : `${diasHist} dias`;
              } else {
                // Passo 4: fallback na nutri (data manual)
                const manual = currentPatient.gastro?.dataUltimaEvacuacao;
                if (manual) {
                  evacResult = typeof calculateEvacDays === "function"
                    ? calculateEvacDays(manual)
                    : "-";
                } else {
                  evacResult = "-";
                }
              }
            }
          }

          // Alerta de constipação: > 2 dias (não vale para "Hoje")
          const diasNum = parseInt(String(evacResult).replace(/\D/g, ""), 10);
          const temDiaComputavel = !isNaN(diasNum) && !String(evacResult).toLowerCase().includes("hoje");
          if (temDiaComputavel && diasNum > 2) isConstipado = true;

          // ============================================================
          // 2. VÔMITOS E DIARREIA — hoje e ontem (dia calendário)
          // ============================================================

          // Lê uma perda de uma célula de losses, aceitando variações de nome
          const lerPerda = (cel, perda) => {
            if (!cel) return undefined;
            if (perda === "Vômitos") {
              return cel["Vômitos"] ?? cel["Vômito"] ?? cel["Vomitos"] ?? cel["Vomito"];
            }
            if (perda === "Diarreia") {
              return cel["Diarreia"] ?? cel["Diarreias"];
            }
            return cel[perda];
          };

          // Varre um objeto de BH (bh, bh_previous) e diz se houve a perda
          const temPerdaNoBh = (bh, perda) => {
            if (!bh || !bh.losses) return false;
            for (const h of Object.keys(bh.losses)) {
              const cel = bh.losses[h] || {};
              if (valorPositivo(lerPerda(cel, perda))) return true;
            }
            return false;
          };

          // Varre o historico_bh inteiro e devolve a data (timestamp) mais recente
          // em que houve a perda. Ignora o registro de "date" igual ao dia de hoje
          // (esse já é o BH atual).
          // Diferença em dias de calendário entre a data do registro e hoje
          const diffDiasDaData = (dateStr) => {
            if (!dateStr) return null;
            let dRef = null;
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              const [y, m, d] = dateStr.split("-");
              dRef = new Date(Number(y), Number(m) - 1, Number(d));
            } else {
              const mm = String(dateStr).match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
              if (mm) {
                const ano = mm[3]
                  ? (mm[3].length === 2 ? 2000 + Number(mm[3]) : Number(mm[3]))
                  : new Date().getFullYear();
                dRef = new Date(ano, Number(mm[2]) - 1, Number(mm[1]));
              }
            }
            if (!dRef) return null;
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            return Math.round((hoje.getTime() - dRef.getTime()) / 86400000);
          };

          // Procura a perda no histórico respeitando a data:
          // devolve o menor diff em dias (mais recente), ou null se não houver.
          const diasPerdaNoHistorico = (perda) => {
            const hist = currentPatient.historico_bh;
            if (!Array.isArray(hist) || !hist.length) return null;
            let menor = null;
            for (const item of hist) {
              if (!item || !item.losses) continue;
              if (!temPerdaNoBh(item, perda)) continue;
              const d = diffDiasDaData(item.date);
              if (d === null || d < 0) continue;
              if (menor === null || d < menor) menor = d;
            }
            return menor;
          };

          // "hoje" = BH atual (inclui 00:00-06:00 da madrugada seguinte,
          //          porque no plantão essas horas ainda são do dia assistencial de hoje)
          // "ontem" = bh_previous OU qualquer registro de historico_bh
          const perdaHoje = (perda) => temPerdaNoBh(currentPatient.bh, perda);
          const perdaOntem = (perda) => temPerdaNoBh(currentPatient.bh_previous, perda);

          // Devolve o texto considerando quantos dias atrás ocorreu a perda.
          // Regra: hoje → "Hoje"; ontem (D1) → "Ontem"; D2+ → "Há N dias".
          // Só interessa hoje (D0) e ontem (D1). D2 ou mais não é exibido.
          const montarTextoPerda = (perda) => {
            if (perdaHoje(perda)) return "Hoje";
            if (perdaOntem(perda)) return "Ontem";

            const dHist = diasPerdaNoHistorico(perda);
            if (dHist === 0) return "Hoje";
            if (dHist === 1) return "Ontem";
            return "";
          };

          const diarreiaText = montarTextoPerda("Diarreia");
          const vomitoText = montarTextoPerda("Vômitos");

          return (
            <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
              <h4 className="font-bold text-orange-800 mb-3 flex items-center gap-2"><Activity size={16} /> Eliminações</h4>

              <div className="space-y-2">
                <p className="text-sm flex items-center flex-wrap gap-1.5 text-slate-700">
                  Últ. Evacuação:
                  <span className={isConstipado
                    ? "text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200 shadow-sm"
                    : "text-emerald-700 font-bold"}>
                    {evacResult}
                  </span>
                </p>

                {diarreiaText && <p className="text-sm text-slate-700">Diarreia: <b className="text-red-600">{diarreiaText}</b></p>}
                {vomitoText && <p className="text-sm text-slate-700">Vômitos: <b className="text-red-600">{vomitoText}</b></p>}
              </div>
            </div>
          );
        })()}
      </div>

      {/* LINHA 2: NEUROLÓGICO, CARDIO E RENAL */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
            <Brain size={14} /> Neurológico
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p>Glasgow: <b>{currentPatient.neuro?.glasgowAO && typeof calculateGlasgowTotal === 'function' ? calculateGlasgowTotal(currentPatient) : "-"}</b></p>
              
              {/* 👇 A etiqueta que guarda o valor antigo e mostra se o RASS estiver ativado */}
              {currentPatient.neuro?.rass && currentPatient.neuro?.glasgowPreSedacao && (
                <span className="inline-block mt-1 text-[10px] font-bold text-orange-700 bg-orange-100 border border-orange-200 px-1.5 py-0.5 rounded shadow-sm">
                  PRÉ-SEDAÇÃO: {currentPatient.neuro.glasgowPreSedacao}
                </span>
              )}
            </div>
            <p>RASS: <b>{currentPatient.neuro?.rass || "-"}</b></p>
          </div>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2"><HeartPulse size={14} /> Cardiovascular</h4>
          <div className="text-sm">
            <p>DVA: {currentPatient.cardio?.dva === true ? "Sim" : "Não"}</p>
            
            <p>Drogas: <span className={currentPatient.cardio?.dva === true && currentPatient.cardio?.drogasDVA?.length > 0 ? "text-red-600 font-bold" : ""}>
              
              {/* 👇 TRAVA TRIPLA: Ignora o renderValue, exige que dva seja literalmente "true" e formata sozinho */}
              {currentPatient.cardio?.dva === true && currentPatient.cardio?.drogasDVA?.length > 0 
                ? (Array.isArray(currentPatient.cardio.drogasDVA) ? currentPatient.cardio.drogasDVA.join(", ") : currentPatient.cardio.drogasDVA) 
                : "-"}
                
            </span></p>
          </div>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          
          {/* Cabeçalho do Card com Flexbox para o Aviso de HD */}
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
              <Droplets size={14} /> Renal / BH
            </h4>
            
            {/* 👇 A MÁGICA VISUAL DA HEMODIÁLISE */}
            {currentPatient.medical?.hemodialise === true && (
              <span className="bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow-sm animate-pulse">
                HD
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 text-sm mt-2">
            <p>Diurese (Últ. 12h): <b>{typeof calculateDiurese12hMlKgH === 'function' ? calculateDiurese12hMlKgH(currentPatient) : "-"}</b> ml/kg/h</p>
            <p>Clearance Cr: <b>{typeof calculateCreatinineClearance === 'function' ? calculateCreatinineClearance(currentPatient) : "-"}</b> {typeof calculateCreatinineClearance === 'function' && calculateCreatinineClearance(currentPatient) !== "Falta Sexo" && calculateCreatinineClearance(currentPatient) !== "---" ? "ml/min" : ""}</p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MONITORAMENTO DE CULTURAS (CCIH) - NOVO                   */}
      {/* ========================================================= */}
      <ModuloCulturas 
        currentPatient={currentPatient} 
        updateNested={updateNested} 
        apiKey={import.meta.env.VITE_GEMINI_API_KEY_MED || window.apiKey} 
      />

      {/* ANTIBIÓTICOS */}
      <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-xs font-bold text-orange-600 uppercase">Antibióticos Ativos</h4>
          <button onClick={() => setShowATBHistoryModal(true)} className="text-[10px] bg-orange-200 text-orange-800 px-2 py-1 rounded hover:bg-orange-300 font-bold flex items-center gap-1 transition-colors">
            <Clock size={12} /> ATBs Usados
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(currentPatient.antibiotics || []).map((a, i) => a.name && (
            <span key={i} className="text-xs font-bold bg-white border border-orange-200 px-2 py-1 rounded-lg text-orange-700">{a.name} ({typeof getDaysD0 === 'function' ? getDaysD0(a.date) : ""})</span>
          ))}
        </div>
      </div>

      {/* LABORATÓRIO E ANOTAÇÕES */}
        <div className="pt-4 border-t space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-blue-800">Laboratório</h3>
            <button onClick={() => setShowHistoryModal(true)} className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
              <TableIcon size={14} /> Visualizar Histórico
            </button>
          </div>
          
          <fieldset 
            disabled={!isOverviewEditable && !["Médico", "Desenvolvedor", "Admin"].includes(userProfile?.perfil)} 
            className="min-w-0 border-0 p-0 m-0"
          >
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="font-bold text-left pt-6">EXAME</div>
              
              <div className="bg-blue-100 p-1 rounded font-bold text-blue-600">{typeof formatDateDDMM === 'function' ? formatDateDDMM(currentPatient.labs?.today?.date) : "-"}</div>
              <div className="bg-slate-100 p-1 rounded font-bold text-slate-500">{typeof formatDateDDMM === 'function' ? formatDateDDMM(currentPatient.labs?.yesterday?.date) : "-"}</div>
              <div className="bg-slate-100 p-1 rounded font-bold text-slate-500">{typeof formatDateDDMM === 'function' ? formatDateDDMM(currentPatient.labs?.dayBefore?.date) : "-"}</div>
              
              {/* Renderização dos Exames */}
              {["Hemoglobina", "Leucócitos", "Ureia", "Creatinina", "Na (Sódio)", "K (Potássio)"].map((ex) => {
                const key = ex === "Hemoglobina" ? "hb" : ex === "Leucócitos" ? "leuco" : ex === "Ureia" ? "ureia" : ex === "Creatinina" ? "creat" : ex.includes("Na") ? "na" : "k";
                
                // Variáveis para os valores de hoje e dias anteriores
                const valToday = currentPatient.labs?.today?.[key] || "";
                const valYesterday = currentPatient.labs?.yesterday?.[key] || "";
                const valDayBefore = currentPatient.labs?.dayBefore?.[key] || "";

                // Cor do dia atual
                const todayTextColor = key === "hb" ? getHbColorClass(valToday) : "text-slate-700";
                
                // Cor dos dias anteriores
                const getPastHbTextColor = (val) => {
                  if (key !== "hb") return "text-slate-500";
                  if (!val || isNaN(parseFloat(val))) return "text-slate-500";
                  const pVal = parseFloat(val);
                  if (pVal < 7) return "text-red-600 font-bold";
                  if (pVal < 8) return "text-orange-500 font-bold";
                  return "text-slate-500";
                };

                return (
                  <React.Fragment key={ex}>
                    <div className="text-left py-2 font-medium">{ex}</div>
                    
                    {/* INPUT (HOJE) - Fundo sempre branco, apenas texto muda de cor */}
                    <input 
                      className={`text-center border-2 border-blue-100 bg-white rounded focus:border-blue-500 outline-none w-full transition-colors ${todayTextColor}`}
                      value={valToday} 
                      onChange={(e) => {
                        let dataReal = currentPatient.labs?.today?.date;
                        if (!dataReal) {
                          const hoje = new Date();
                          const ano = hoje.getFullYear();
                          const mes = String(hoje.getMonth() + 1).padStart(2, '0');
                          const dia = String(hoje.getDate()).padStart(2, '0');
                          dataReal = `${ano}-${mes}-${dia}`;
                        }
                        updateLab(dataReal, ex, e.target.value);
                      }} 
                      onBlur={() => typeof handleBlurSave === 'function' ? handleBlurSave(`Laboratório: Editou ${ex}`) : null}
                    />
                    
                    {/* CÉLULAS (ONTEM E ANTEONTEM) - Fundo sempre cinza claro, apenas texto muda de cor */}
                    <div className={`flex items-center justify-center border border-slate-200 bg-slate-50 rounded transition-colors ${getPastHbTextColor(valYesterday)}`}>
                      {valYesterday}
                    </div>
                    <div className={`flex items-center justify-center border border-slate-200 bg-slate-50 rounded transition-colors ${getPastHbTextColor(valDayBefore)}`}>
                      {valDayBefore}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </fieldset>
        
        <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
          <div className="flex justify-between mb-2">
            <h4 className="text-xs font-bold text-yellow-600 uppercase">Anotações / Pendências</h4>
            {["Médico", "Desenvolvedor", "Admin"].includes(userProfile?.perfil) && <Edit3 size={12} className="text-yellow-600" />}
          </div>
          
          {["Médico", "Desenvolvedor", "Admin"].includes(userProfile?.perfil) ? (
            <textarea 
              value={currentPatient.anotacoes || ""} 
              onChange={(e) => updateP("anotacoes", e.target.value)} 
              onBlur={() => typeof handleBlurSave === 'function' ? handleBlurSave("Visita Multi: Editou Anotações / Pendências") : null}
              className="w-full bg-transparent border-0 outline-none text-sm text-slate-700 resize-y min-h-[100px] focus:ring-0" 
              placeholder="Evolução, condutas, pendências..." 
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap min-h-[50px] text-left">{currentPatient.anotacoes || "Sem pendências."}</p>
          )}
        </div>
      </div>
      </>
      ) : (
        <VisitaMultiTab
          currentPatient={currentPatient}
          key={currentPatient?.id}
          userProfile={userProfile}
          save={save}
          calculateDiurese12hMlKgH={calculateDiurese12hMlKgH}
        />
      )}      
    </div>
  );
};

export default OverviewTab;