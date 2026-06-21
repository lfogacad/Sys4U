import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Syringe } from 'lucide-react';
import { calculateAge } from '../../utils/core';

const BARREIRAS_LIST = [
  { key: 'higienizacao', label: 'Higienização das mãos' },
  { key: 'gorro', label: 'Gorro/Touca' },
  { key: 'avental', label: 'Avental Cirúrgico' },
  { key: 'mascara', label: 'Máscara' },
  { key: 'luvas', label: 'Luvas Estéreis' },
  { key: 'campos', label: 'Campos Estéreis Grandes' },
  { key: 'assepsia', label: 'Assepsia com Clorexidina Alcoólica 0,5%' },
  { key: 'tecnicaAssptica', label: 'Técnica Asséptica' },
  { key: 'curativo24h', label: 'Curativo com Gaze e Micropore a cada 24h' },
];

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTOS = ['00', '15', '30', '45'];

const initialForm = {
  horario: '00:00',
  tipoCateter: '',
  localInserção: '',
  indicacao: '',
  passagem: '',
  motivoTroca: '',
  puncaoUnica: 'Sim',
  quantasPuncoes: '',
  dificuldades: [],
  barreiras: BARREIRAS_LIST.reduce((acc, item) => {
    acc[item.key] = false;
    return acc;
  }, {}),
};

const CVCInsercaoModal = ({ isOpen, onClose, currentPatient, updateNested, gerarPDF, handleBlurSave, userProfile }) => {
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (isOpen) {
      setForm(initialForm);
    }
  }, [isOpen]);

  const toggleBarreira = (key) => {
    setForm((prev) => ({
      ...prev,
      barreiras: {
        ...prev.barreiras,
        [key]: !prev.barreiras[key],
      },
    }));
  };

  const toggleDificuldade = (d) => {
    setForm((prev) => {
      let novas = [...prev.dificuldades];
      if (d === 'Sem dificuldades') {
        novas = novas.includes(d) ? [] : [d];
      } else {
        if (novas.includes(d)) {
          novas = novas.filter((x) => x !== d);
        } else {
          novas = novas.filter((x) => x !== 'Sem dificuldades');
          novas.push(d);
        }
      }
      return { ...prev, dificuldades: novas };
    });
  };

  const salvar = () => {
    const itens = BARREIRAS_LIST.map((item) => ({
      key: item.key,
      label: item.label,
      cumprida: !!form.barreiras[item.key],
    }));
    const cumpridas = itens.filter((i) => i.cumprida).length;
    const total = itens.length;
    const todasCumpridas = cumpridas === total;
    const resumo = itens.map((i) => `${i.cumprida ? '✓' : '✗'} ${i.label}`).join('\n');

    const hoje = new Date();
    const dataISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    const horario = form.horario || '00:00';

    const registro = {
      data: dataISO,
      horario,
      tipoCateter: form.tipoCateter,
      localInserção: form.localInserção,
      indicacao: form.indicacao,
      passagem: form.passagem,
      motivoTroca: form.passagem === 'Troca' ? form.motivoTroca : '',
      puncaoUnica: form.puncaoUnica === 'Sim',
      quantasPuncoes: form.puncaoUnica === 'Não' ? form.quantasPuncoes : '',
      dificuldades: form.dificuldades.join(', '),
      barreiras: {
        itens,
        total,
        cumpridas,
        todasCumpridas,
        resumo,
      },
    };

    updateNested('enfermagem', 'ultimoCVC', registro);
    const antigo = currentPatient?.enfermagem?.historicoCVC || [];
    updateNested('enfermagem', 'historicoCVC', [...antigo, registro]);
    // Se for Shiley, atualiza os campos específicos de Shiley
    if (form.tipoCateter === 'Shiley') {
      updateNested('enfermagem', 'shileyData', dataISO);
      if (form.localInserção) {
        // Converte "Subclávia D" → "VSCD", "Jugular D" → "VJID", etc.
        const mapaLocal = {
          'Subclávia D': 'VSCD',
          'Subclávia E': 'VSCE',
          'Jugular D': 'VJID',
          'Jugular E': 'VJIE',
          'Femoral D': 'VFID',
          'Femoral E': 'VFIE',
        };
        updateNested('enfermagem', 'shileyLocal', mapaLocal[form.localInserção] || form.localInserção);
      }
    } else {
      // CVC normal
      updateNested('enfermagem', 'cvcData', dataISO);
      if (form.localInserção) {
        updateNested('enfermagem', 'cvcLocal', form.localInserção);
      }
    }

    handleBlurSave(
      `Inserção de CVC registrada: ${form.tipoCateter} em ${form.localInserção} às ${horario}. Punção única: ${form.puncaoUnica}. Barreiras: ${cumpridas}/${total}.`
    );

    // === 🔥 GERAR PDF AUTOMATICAMENTE ===
    const nomeProf = userProfile?.nome || "_____________________________";
    const conselhoProf = userProfile?.conselho || "CONSELHO";
    const numConselho = userProfile?.numeroConselho || "_________________";
    const printWindow = window.open("", "_blank");
    
    // Usa setTimeout para garantir que o Firestore salvou antes de gerar o PDF
    setTimeout(() => {
      gerarPDF_CVC(registro, nomeProf, conselhoProf, numConselho, printWindow, currentPatient);
    }, 500);

    onClose();
    setForm(initialForm);
  };

  // ==========================================
  // GERAR PDF DO CHECKLIST CVC (usada após salvar)
  // ==========================================
  const gerarPDF_CVC = (registro, nomeProf, conselhoProf, numConselho, printWindow) => {
    if (!currentPatient || !registro) return;

    const idade = calculateAge(currentPatient.dataNascimento) || "__";
    const hoje = new Date().toLocaleDateString('pt-BR');
    const dataProcedimento = registro.data?.split('-').reverse().join('/') || hoje;

    const barreiras = registro.barreiras?.itens || [];
    const totalBarreiras = registro.barreiras?.total || 0;
    const cumpridas = registro.barreiras?.cumpridas || 0;
    const todasOK = registro.barreiras?.todasCumpridas || false;

    let html = `<!DOCTYPE html>
<html><head><title>Checklist Inserção CVC - ${currentPatient.nome}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #222; }
  .header { border-bottom: 3px solid #1a5276; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header h1 { font-size: 16px; color: #1a5276; margin: 0 0 5px 0; text-transform: uppercase; }
  .header-info { font-size: 11px; color: #555; line-height: 1.6; }
  .paciente-box { background: #f0f4f8; border-left: 4px solid #1a5276; padding: 10px 15px; margin-bottom: 20px; border-radius: 0 6px 6px 0; }
  .paciente-box table { width: 100%; font-size: 12px; border-collapse: collapse; }
  .paciente-box td { padding: 3px 8px; }
  .paciente-box .label { font-weight: bold; color: #1a5276; width: 100px; }
  .section-title { font-size: 13px; font-weight: bold; color: #1a5276; margin: 18px 0 10px 0; padding-bottom: 4px; border-bottom: 1px solid #ddd; text-transform: uppercase; }
  .info-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; }
  .info-item { background: #f9f9f9; border: 1px solid #ddd; border-radius: 6px; padding: 8px 12px; flex: 1; min-width: 140px; }
  .info-item .tag { font-size: 9px; text-transform: uppercase; color: #888; font-weight: bold; display: block; margin-bottom: 2px; }
  .info-item .value { font-size: 13px; font-weight: bold; color: #333; }
  table.checklist { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  table.checklist th, table.checklist td { border: 1px solid #ccc; padding: 6px 8px; font-size: 11px; text-align: left; }
  table.checklist th { background: #1a5276; color: white; font-size: 10px; text-transform: uppercase; }
  table.checklist tr:nth-child(even) td { background: #f7f9fc; }
  .status-ok { color: #27ae60; font-weight: bold; }
  .status-no { color: #e74c3c; font-weight: bold; }
  .resultado-box { background: ${todasOK ? '#eafaf1' : '#fdedec'}; border: 2px solid ${todasOK ? '#27ae60' : '#e74c3c'}; border-radius: 8px; padding: 12px 15px; text-align: center; margin: 15px 0; }
  .resultado-box .big { font-size: 18px; font-weight: bold; color: ${todasOK ? '#27ae60' : '#e74c3c'}; }
  .resultado-box .small { font-size: 11px; color: #555; margin-top: 2px; }
  .assinatura { margin-top: 40px; border-top: 2px solid #333; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; }
  .assinatura div { text-align: center; flex: 1; }
  .assinatura .linha { margin-top: 35px; border-top: 1px solid #333; padding-top: 5px; font-weight: bold; }
  .footer { margin-top: 25px; font-size: 9px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 8px; }
</style></head><body>

  <div class="header">
    <div>
      <h1>Checklist de Inserção de CVC</h1>
      <div class="header-info">Data da impressão: ${hoje}</div>
    </div>
  </div>

  <div class="paciente-box">
    <table>
      <tr><td class="label">Paciente:</td><td><strong>${currentPatient.nome?.toUpperCase() || "___________________"}</strong></td><td class="label">Leito:</td><td><strong>${currentPatient.leito}</strong></td></tr>
      <tr><td class="label">Idade:</td><td>${idade} anos</td><td class="label">Data do Procedimento:</td><td><strong>${dataProcedimento}</strong></td></tr>
      <tr><td class="label">Sexo:</td><td>${currentPatient.sexo === 'F' ? 'Feminino' : 'Masculino'}</td><td class="label">Horário:</td><td><strong>${registro.horario || "__________"}</strong></td></tr>
    </table>
  </div>

  <div class="section-title">Dados do Procedimento</div>
  <div class="info-grid">
    <div class="info-item">
      <span class="tag">Tipo de Cateter</span>
      <span class="value">${registro.tipoCateter || "__________"}</span>
    </div>
    <div class="info-item">
      <span class="tag">Local de Inserção</span>
      <span class="value">${registro.localInserção || "__________"}</span>
    </div>
    <div class="info-item">
      <span class="tag">Indicação</span>
      <span class="value">${registro.indicacao || "__________"}</span>
    </div>
    <div class="info-item">
      <span class="tag">Passagem</span>
      <span class="value">${registro.passagem || "__________"}</span>
    </div>
    <div class="info-item">
      <span class="tag">Punção Única</span>
      <span class="value">${registro.puncaoUnica ? 'Sim ✅' : 'Não ❌'}</span>
    </div>
    ${registro.quantasPuncoes ? `<div class="info-item"><span class="tag">Nº de Pungões</span><span class="value">${registro.quantasPuncoes}</span></div>` : ''}
    ${registro.dificuldades ? `<div class="info-item" style="flex:2"><span class="tag">Dificuldades</span><span class="value">${registro.dificuldades}</span></div>` : ''}
  </div>

  <div class="section-title">Barreiras de Prevenção — Conformidade</div>
  <table class="checklist">
    <thead><tr><th style="width:30px">#</th><th>Item</th><th style="width:100px;text-align:center">Cumprida</th></tr></thead>
    <tbody>
      ${barreiras.map((b, i) => `
        <tr>
          <td style="text-align:center">${i + 1}</td>
          <td>${b.label || b.item || 'Item'}</td>
          <td style="text-align:center">${b.cumprida ? '<span class="status-ok">✅ Sim</span>' : '<span class="status-no">❌ Não</span>'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="resultado-box">
    <div class="big">${cumpridas} / ${totalBarreiras} — ${todasOK ? '✅ CONFORME' : '❌ NÃO CONFORME'}</div>
    <div class="small">Barreiras de prevenção de infecção relacionada a CVC</div>
  </div>

  <div class="section-title">Assinatura do Profissional</div>
  <div class="assinatura">
    <div>
      <div class="linha">${nomeProf}</div>
      <div style="font-size:10px;color:#666;margin-top:3px;">Enfermeiro(a) Responsável</div>
    </div>
    <div>
      <div class="linha">${conselhoProf} ${numConselho}</div>
      <div style="font-size:10px;color:#666;margin-top:3px;">Nº do Conselho Profissional</div>
    </div>
    <div>
      <div class="linha">${dataProcedimento}</div>
      <div style="font-size:10px;color:#666;margin-top:3px;">Data do Procedimento</div>
    </div>
  </div>

  <div class="footer">
    Documento gerado pelo Sys4U - UTI Municipal de Ariquemes | ${hoje}
  </div>

</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-blue-500/20 my-auto">
        <div className="bg-blue-600 p-5 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full">
              <Syringe size={20} />
            </div>
            <h2 className="text-lg font-black tracking-wide">Inserção CVC</h2>
          </div>
          <button
            type="button"
            className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 bg-slate-50 space-y-5 overflow-y-auto max-h-[70vh]">
          <div>
            <label className="text-xs font-bold text-slate-600 mb-2 block text-center">
              Horário do Procedimento
            </label>
            <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
              <select
                className="w-24 font-black text-2xl bg-transparent outline-none text-center"
                value={form.horario.split(':')[0] || '00'}
                onChange={(e) => {
                  const minutos = form.horario.split(':')[1] || '00';
                  setForm({ ...form, horario: `${e.target.value}:${minutos}` });
                }}
              >
                {HORAS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <span className="text-3xl font-black text-slate-300 pb-1">:</span>
              <select
                className="w-24 font-black text-2xl bg-transparent outline-none text-center"
                value={form.horario.split(':')[1] || '00'}
                onChange={(e) => {
                  const horas = form.horario.split(':')[0] || '00';
                  setForm({ ...form, horario: `${horas}:${e.target.value}` });
                }}
              >
                {MINUTOS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 mb-3 block text-center">
              Tipo de Cateter
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['CVC Duplo Lúmen', 'CVC Triplo Lúmen', 'Shiley'].map((op) => {
                const selected = form.tipoCateter === op;
                return (
                  <button
                    key={op}
                    type="button"
                    className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${
                      selected
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md scale-[1.02]'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200'
                    }`}
                    onClick={() => setForm({ ...form, tipoCateter: op })}
                  >
                    {op}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 mb-3 block text-center">
              Indicação
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Hemodiálise', 'DVA', 'NPT', 'Monitorização', 'Difícil Acesso'].map((op) => {
                const selected = form.indicacao === op;
                return (
                  <button
                    key={op}
                    type="button"
                    className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${
                      selected
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md scale-[1.02]'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200'
                    }`}
                    onClick={() => setForm({ ...form, indicacao: op })}
                  >
                    {op}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 mb-3 block text-center">
              Tipo de Passagem
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {['Nova Punção', 'Troca'].map((op) => {
                const selected = form.passagem === op;
                return (
                  <button
                    key={op}
                    type="button"
                    className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${
                      selected
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md scale-[1.02]'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200'
                    }`}
                    onClick={() =>
                      setForm({
                        ...form,
                        passagem: op,
                        motivoTroca: op === 'Nova Punção' ? '' : form.motivoTroca,
                      })
                    }
                  >
                    {op}
                  </button>
                );
              })}
            </div>
            {form.passagem === 'Troca' && (
              <input
                type="text"
                placeholder="Motivo da troca..."
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-300"
                value={form.motivoTroca}
                onChange={(e) => setForm({ ...form, motivoTroca: e.target.value })}
              />
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 mb-3 block text-center">
              Local da Inserção
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Subclávia D', val: 'Subclávia D' },
                { label: 'Subclávia E', val: 'Subclávia E' },
                { label: 'Jugular D', val: 'Jugular D' },
                { label: 'Jugular E', val: 'Jugular E' },
                { label: 'Femoral D', val: 'Femoral D' },
                { label: 'Femoral E', val: 'Femoral E' },
              ].map((op) => {
                const selected = form.localInserção === op.val;
                return (
                  <button
                    key={op.val}
                    type="button"
                    className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${
                      selected
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md scale-[1.02]'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200'
                    }`}
                    onClick={() => setForm({ ...form, localInserção: op.val })}
                  >
                    {op.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 mb-3 block text-center">
              Medidas de Barreira
            </label>
            <div className="space-y-2">
              {BARREIRAS_LIST.map((item) => {
                const ativo = !!form.barreiras[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-sm font-bold transition-all ${
                      ativo
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200'
                    }`}
                    onClick={() => toggleBarreira(item.key)}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                        ativo ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {ativo ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 mb-3 block text-center">
              Punção Única
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {['Sim', 'Não'].map((op) => {
                const selected = form.puncaoUnica === op;
                return (
                  <button
                    key={op}
                    type="button"
                    className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${
                      selected
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md scale-[1.02]'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200'
                    }`}
                    onClick={() => setForm({ ...form, puncaoUnica: op })}
                  >
                    {op}
                  </button>
                );
              })}
            </div>
            {form.puncaoUnica === 'Não' && (
              <input
                type="number"
                min={1}
                placeholder="Quantas punções?"
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm text-center outline-none focus:ring-2 focus:ring-blue-300"
                value={form.quantasPuncoes}
                onChange={(e) => setForm({ ...form, quantasPuncoes: e.target.value })}
              />
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 mb-3 block text-center">
              Dificuldades
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['Anatomia', 'Material', 'Técnica', 'Consentimento', 'Sem dificuldades'].map((d) => {
                const selected = form.dificuldades.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${
                      selected
                        ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-md scale-[1.02]'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-amber-200'
                    }`}
                    onClick={() => toggleDificuldade(d)}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-5 pt-4 border-t border-slate-200 shrink-0">
          <button
            type="button"
            className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg flex justify-center items-center gap-2 uppercase tracking-wider transition-colors"
            disabled={!form.horario || !form.tipoCateter || !form.localInserção}
            onClick={salvar}
          >
            <CheckCircle2 size={18} />
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CVCInsercaoModal;