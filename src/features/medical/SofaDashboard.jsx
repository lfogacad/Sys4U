import React, { useState, useEffect } from 'react';
import { Activity, X, TrendingUp, Wind } from 'lucide-react';
import { getAutoSOFA2, getSOFAMortality, getBestGlasgowForSOFA, getAutoNEWSPaciente, formatDateDDMM, safeNumber } from '../../utils/core';

// ── GRÁFICO DE EVOLUÇÃO (SVG puro) ─────────────────────────────────────
const GraficoEvolucao = ({ registros }) => {
  const ordenados = [...(registros || [])]
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
    .slice(-12);

  if (ordenados.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 text-sm font-medium">
        Sem registros de evolução ainda. Os pontos são gravados automaticamente a cada mudança dos escores.
      </div>
    );
  }

  const W = 560, H = 220, padL = 34, padR = 12, padT = 18, padB = 26;
  const maxY = 24;
  const x = (i) => padL + (i * (W - padL - padR)) / Math.max(1, ordenados.length - 1);
  const y = (v) => padT + (1 - (Math.min(v, maxY) / maxY)) * (H - padT - padB);
  const linha = (chave) => ordenados.map((r, i) => `${x(i)},${y(Number(r[chave]) || 0)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {[0, 6, 12, 18, 24].map(g => (
        <g key={g}>
          <line x1={padL} y1={y(g)} x2={W - padR} y2={y(g)} stroke="#e2e8f0" strokeWidth="1" />
          <text x={4} y={y(g) + 3} fontSize="8" fill="#94a3b8" fontWeight="bold">{g}</text>
        </g>
      ))}
      <polyline points={linha('sofa')} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={linha('news')} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {ordenados.map((r, i) => (
        <g key={`${r.data}_${r.hora}`}>
          <circle cx={x(i)} cy={y(r.sofa)} r="4" fill="#6366f1" stroke="#fff" strokeWidth="1.5" />
          <circle cx={x(i)} cy={y(r.news)} r="4" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />
          <text x={x(i)} y={H - 8} fontSize="8" fill="#64748b" textAnchor="middle" fontWeight="bold" transform={ordenados.length > 6 ? `rotate(-28 ${x(i)} ${H - 8})` : undefined}>
            {String(r.dataBR || '').slice(0, 5)} {r.hora?.slice(0, 2)}h
          </text>
        </g>
      ))}
    </svg>
  );
};

// ── COMPONENTE PRINCIPAL ───────────────────────────────────────────────
export default function SofaDashboard({
  patient,
  updateNested,
  setPatients,
  activeTab,
  updateP,
  userIdentity
}) {
  const [modalEvolucao, setModalEvolucao] = useState(false);

  if (!patient) return null;

  // Último PAM registrado no BH atual (bh.vitals) — fallback quando sofa_data_technical.lastPAM não existe
  const getUltimoPAM = () => {
    const vitals = patient?.bh?.vitals || {};
    const horas = Object.keys(vitals).sort();
    for (let i = horas.length - 1; i >= 0; i--) {
      const v = vitals[horas[i]]?.['PAM'];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        return safeNumber(v);
      }
    }
    return null;
  };

  // Última contagem de plaquetas (labs preenchido pelo syncLabsFromHistory) — fallback
  const getUltimaPlat = () => {
    const labs = patient?.labs || {};
    for (const per of ['today', 'yesterday', 'dayBefore']) {
      const v = labs[per]?.plat;
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        return safeNumber(v);
      }
    }
    return null;
  };

  const currentSOFA = getAutoSOFA2(patient);
  // Usa o valor pré-computado se existir; senão calcula na hora
  const lastPAM = patient.sofa_data_technical?.lastPAM ?? getUltimoPAM();
  const lastPlat = patient.sofa_data_technical?.lastPlat ?? getUltimaPlat();
  const news = getAutoNEWSPaciente(patient);
  const noraDose = patient.sofa_data_technical?.lastNoraDose;
  const glasgow = getBestGlasgowForSOFA(patient);
  const hipercapnico = !!patient.sofa_data_technical?.newsHipercapnico;

  // ── REGISTRO AUTOMÁTICO: a cada mudança do SOFA-2 ou NEWS ─────────────
  useEffect(() => {
    if (!updateP || !patient) return;
    const agora = new Date();
    const dataISO = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
    const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:00`;

    const historico = patient.historico_escores || [];
    const ultimo = historico[historico.length - 1];

    // Dedupe: não duplica se o último registro tem o MESMO dia/hora E os MESMOS valores
    if (ultimo && ultimo.data === dataISO && ultimo.hora === horaAtual && ultimo.sofa === currentSOFA && ultimo.news === news.pontuacao) {
      return;
    }

    const novoRegistro = {
      id: `esc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      data: dataISO,
      dataBR: formatDateDDMM(dataISO),
      hora: horaAtual,
      sofa: currentSOFA,
      news: news.pontuacao,
      riscoNews: news.risco,
      escalaNews: news.escala,
      registradoPor: userIdentity || 'Não identificado',
      criadoEm: new Date().toISOString()
    };

    const p = { ...patient, historico_escores: [...historico, novoRegistro] };
    updateP(p);
    if (setPatients) {
      setPatients(prev => {
        const copia = [...prev];
        if (copia[activeTab]) copia[activeTab] = p;
        return copia;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSOFA, news.pontuacao]);

  // ── TOGGLE PACIENTE HIPERCÁPNICO (escala B) ───────────────────────────
  const toggleHipercapnico = () => {
    const p = patient;
    if (!p.sofa_data_technical) p.sofa_data_technical = {};
    p.sofa_data_technical.newsHipercapnico = !hipercapnico;
    updateP(p);
    if (setPatients) {
      setPatients(prev => {
        const copia = [...prev];
        if (copia[activeTab]) copia[activeTab] = p;
        return copia;
      });
    }
  };

  const sofaCor = currentSOFA >= 10 ? 'border-red-300 bg-red-50 text-red-700' : 'border-indigo-200 bg-indigo-50 text-indigo-700';
  const newsCor = news.pontuacao >= 7 ? 'border-red-300 bg-red-50 text-red-700'
    : news.pontuacao >= 5 ? 'border-amber-300 bg-amber-50 text-amber-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* SOFA-2 */}
            <div className={`px-3 py-2 rounded-lg border-2 ${sofaCor}`}>
              <span className="text-[9px] font-black uppercase opacity-70 block">SOFA-2</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black leading-none">{currentSOFA}</span>
                <span className="text-[9px] opacity-70 font-bold">/24 pts</span>
              </div>
              <span className="text-[8px] opacity-60 block">Mortalidade {getSOFAMortality(currentSOFA)}</span>
            </div>

            {/* NEWS */}
            <div className={`px-3 py-2 rounded-lg border-2 ${newsCor}`}>
              <span className="text-[9px] font-black uppercase opacity-70 block">NEWS {news.escala}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black leading-none">{news.pontuacao}</span>
                <span className="text-[9px] opacity-70 font-bold">/20</span>
              </div>
              <span className="text-[8px] opacity-60 block">{news.risco}{news.exigencia ? ' · p/ escalada' : ''}</span>
            </div>

            {/* Botão do gráfico */}
            <button
              onClick={() => setModalEvolucao(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors"
            >
              <TrendingUp size={14} /> Evolução
            </button>

            {/* Toggle Paciente Hipercápnico (Escala B) */}
            <button
              onClick={toggleHipercapnico}
              title="Paciente com insuficiência respiratória hipercápnica (DPOC) — usa a escala B do SpO2 (alvo 88-92%)"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border-2 transition-colors ${hipercapnico ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-slate-300 text-slate-600 hover:border-violet-300'}`}
            >
              <Wind size={14} /> {hipercapnico ? 'Hipercápnico (Escala B)' : 'Paciente hipercápnico?'}
            </button>
          </div>

          {/* Noradrenalina (compacto) */}
          <div className="flex items-center gap-2 text-[10px]">
            <span className={`px-2 py-1 rounded border font-black ${patient.sofa_data_technical?.noraDoubleDoseToday ? 'bg-amber-500/10 border-amber-400 text-amber-600' : 'bg-emerald-500/10 border-emerald-400 text-emerald-600'}`}>
              {patient.sofa_data_technical?.noraDoubleDoseToday ? 'DOSE DOBRADA' : 'DILUIÇÃO PADRÃO'}
            </span>
            {noraDose ? (
              <span className="bg-slate-800 text-white px-2 py-1 rounded font-black">{noraDose} <span className="text-[8px] font-bold opacity-70">mcg/kg/min</span></span>
            ) : null}
          </div>
        </div>

        {/* Chips técnicos discretos */}
        <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap gap-3 text-[8px] font-bold text-slate-400 uppercase">
          <span className="text-indigo-400">● SNC: {glasgow?.valor || 'S/ DADO'} <span className="opacity-60">({glasgow?.origem})</span></span>
          <span className={patient.sofa_data_technical?.lastPF ? 'text-indigo-400' : 'text-amber-500/60'}>● P/F: {patient.sofa_data_technical?.lastPF || 'S/ GASO'}</span>
          <span className={lastPAM ? (lastPAM < 70 ? "text-red-400 animate-pulse" : "text-indigo-400") : "text-amber-500/60"}>
            ● PAM: {lastPAM || 'S/ DADO'}
          </span>
          <span className="text-amber-400">● RENAL: {patient.sofa_data_technical?.renalReason || 'S/ DADO'}</span>
          <span className={lastPlat ? "text-indigo-400" : "text-amber-500/60"}>
            ● PLT: {lastPlat || 'S/ EXAME'}
          </span>
        </div>
      </div>

      {/* MODAL DE EVOLUÇÃO */}
      {modalEvolucao && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col border-4 border-indigo-500/20">
            <div className="bg-slate-800 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Activity size={20} /></div>
                <div>
                  <h2 className="text-lg font-black tracking-wide leading-tight">Evolução SOFA-2 &amp; NEWS</h2>
                  <p className="text-[10px] text-white/60 font-medium">Linha azul: SOFA-2 · Linha âmbar: NEWS</p>
                </div>
              </div>
              <button onClick={() => setModalEvolucao(false)} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 bg-slate-50 space-y-5">
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <GraficoEvolucao registros={patient.historico_escores || []} />
              </div>

              {(patient.historico_escores || []).length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 text-xs font-black text-slate-600 uppercase">Últimos registros</div>
                  <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
                    {[...(patient.historico_escores || [])].sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora)).slice(0, 10).map(r => (
                      <div key={r.id} className="px-4 py-2 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">{r.dataBR} · {r.hora}</span>
                        <span className="flex items-center gap-3">
                          <span className="font-black text-indigo-600">SOFA {r.sofa}</span>
                          <span className="font-black text-amber-600">NEWS {r.news}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setModalEvolucao(false)} className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}