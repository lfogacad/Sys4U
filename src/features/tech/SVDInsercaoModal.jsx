import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Droplets } from 'lucide-react';
import { calculateAge } from '../../utils/core';

const ITENS_CHECKLIST = [
  { key: 'privacidade', label: 'Privacidade do paciente garantida' },
  { key: 'higienizacao', label: 'Higienização das mãos' },
  { key: 'epi', label: 'Uso correto de EPI (gorro, máscara, luvas)' },
  { key: 'higieneIntima', label: 'Higiene íntima com água e sabão' },
  { key: 'higienizacaoPosHigiene', label: 'Higienização das mãos após higiene íntima' },
  { key: 'pacoteAberto', label: 'Pacote de cateterismo aberto corretamente' },
  { key: 'luvasEsteris', label: 'Luvas estéreis na técnica correta' },
  { key: 'antissepsia', label: 'Antissepsia da genitália com Clorexidina aquosa' },
  { key: 'xilocaina', label: 'Xilocaína estéril de uso único' },
  { key: 'xilocainaSeringa', label: 'Sondagem masc: 20ml xilocaína na seringa' },
  { key: 'campoFenestrado', label: 'Campo estéril fenestrado entre MMII' },
  { key: 'introducao1op', label: 'Introdução da sonda na 1ª oportunidade' },
  { key: 'tecnicaAssptica', label: 'Inserção do cateter na técnica asséptica' },
  { key: 'insuflacaoBalao', label: 'Insuflação do balão' },
  { key: 'fixacao', label: 'Fixação da sonda' },
  { key: 'higienizacaoPos', label: 'Higienização das mãos pós-procedimento' }
];

const INDICACOES = [
  'Retenção Urinária',
  'Monitorização Débito Urinário',
  'Cirurgia',
  'Lesão Renal Aguda',
  'Incontinência',
  'Outra'
];

const GENEROS = ['Masculino', 'Feminino'];

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTOS = ['00', '15', '30', '45'];

const initialForm = {
  horario: '00:00',
  indicacao: '',
  justificativa: '',
  genero: '',
  enfermeiroResponsavel: '',
  itens: ITENS_CHECKLIST.reduce((acc, item) => {
    acc[item.key] = false;
    return acc;
  }, {}),
  observacao: ''
};

const SVDInsercaoModal = ({ isOpen, onClose, currentPatient, updateNested, handleBlurSave, userProfile, listaProfissionais = [] }) => {
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (isOpen) {
      setForm(initialForm);
    }
  }, [isOpen]);

  const toggleItem = (key) => {
    setForm((prev) => ({
      ...prev,
      itens: {
        ...prev.itens,
        [key]: !prev.itens[key]
      }
    }));
  };

  const handleHorarioChange = (tipo, valor) => {
    const [hora, minuto] = form.horario.split(':');
    const novoHorario = tipo === 'hora' ? `${valor}:${minuto}` : `${hora}:${valor}`;
    setForm((prev) => ({ ...prev, horario: novoHorario }));
  };

  const salvar = () => {
    const agora = new Date();
    const data = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;

    const itensArray = ITENS_CHECKLIST.map((item) => ({
      key: item.key,
      label: item.label,
      cumprida: !!form.itens[item.key]
    }));

    const cumpridas = itensArray.filter((item) => item.cumprida).length;
    const total = itensArray.length;
    const todasCumpridas = cumpridas === total;
    const resumo = `${cumpridas}/${total} itens`;

    const registro = {
      data,
      horario: form.horario,
      indicacao: form.indicacao,
      justificativa: form.indicacao === 'Outra' ? form.justificativa : '',
      genero: form.genero,
      enfermeiroResponsavel: form.enfermeiroResponsavel,
      itens: {
        itens: itensArray,
        total,
        cumpridas,
        todasCumpridas,
        resumo
      },
      observacao: form.observacao
    };

    const historicoAtual = currentPatient?.enfermagem?.historicoSVD || [];

    updateNested('enfermagem', 'ultimoSVD', registro);
    updateNested('enfermagem', 'historicoSVD', [...historicoAtual, registro]);
    updateNested('enfermagem', 'svdData', data);
    updateNested('enfermagem', 'svd', true);

    handleBlurSave(`Inserção de SVD registrada às ${form.horario} — Indicação: ${form.indicacao}`);

    // === 🔥 GERAR PDF AUTOMATICAMENTE ===
    const nomeProf = userProfile?.nome || "_____________________________";
    const conselhoProf = userProfile?.conselho || "CONSELHO";
    const numConselho = userProfile?.numeroConselho || "_________________";
    const printWindow = window.open("", "_blank");

    // Usa setTimeout para garantir que o Firestore salvou antes de gerar o PDF
    setTimeout(() => {
      gerarPDF_InsercaoSVD(registro, nomeProf, conselhoProf, numConselho, printWindow);
    }, 500);

    onClose();
    setForm(initialForm);
  };

    const gerarPDF_InsercaoSVD = (registro, nomeProf, conselhoProf, numConselho, printWindow) => {
    if (!currentPatient || !registro) return;
    const idade = calculateAge(currentPatient.dataNascimento) || "__";
    const hoje = new Date().toLocaleDateString('pt-BR');
    const dataProcedimento = registro.data?.split('-').reverse().join('/') || hoje;

    const itens = registro.itens?.itens || [];
    const total = registro.itens?.total || 0;
    const cumpridos = registro.itens?.cumpridas || 0;
    const todasOK = registro.itens?.todasCumpridas || false;

    const html = `<!DOCTYPE html>
<html><head><title>Passagem SVD - ${currentPatient.nome}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #222; }
  .header { border-bottom: 3px solid #e67e22; padding-bottom: 10px; margin-bottom: 20px; }
  .header h1 { font-size: 16px; color: #e67e22; margin: 0 0 5px 0; text-transform: uppercase; }
  .header-info { font-size: 11px; color: #555; }
  .paciente-box { background: #fef9f0; border-left: 4px solid #e67e22; padding: 10px 15px; margin-bottom: 20px; border-radius: 0 6px 6px 0; }
  .paciente-box table { width: 100%; font-size: 12px; border-collapse: collapse; }
  .paciente-box td { padding: 3px 8px; }
  .paciente-box .label { font-weight: bold; color: #e67e22; width: 100px; }
  .section-title { font-size: 13px; font-weight: bold; color: #e67e22; margin: 18px 0 10px 0; padding-bottom: 4px; border-bottom: 1px solid #ddd; text-transform: uppercase; }
  .info-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; }
  .info-item { background: #f9f9f9; border: 1px solid #ddd; border-radius: 6px; padding: 8px 12px; flex: 1; min-width: 140px; }
  .info-item .tag { font-size: 9px; text-transform: uppercase; color: #888; font-weight: bold; display: block; margin-bottom: 2px; }
  .info-item .value { font-size: 13px; font-weight: bold; color: #333; }
  table.checklist { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px; }
  table.checklist th, table.checklist td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
  table.checklist th { background: #e67e22; color: white; font-size: 9px; text-transform: uppercase; }
  table.checklist tr:nth-child(even) td { background: #fef9f0; }
  .status-ok { color: #27ae60; font-weight: bold; } .status-no { color: #e74c3c; font-weight: bold; }
  .resultado-box { background: ${todasOK ? '#eafaf1' : '#fdedec'}; border: 2px solid ${todasOK ? '#27ae60' : '#e74c3c'}; border-radius: 8px; padding: 12px 15px; text-align: center; margin: 15px 0; }
  .resultado-box .big { font-size: 18px; font-weight: bold; color: ${todasOK ? '#27ae60' : '#e74c3c'}; }
  .resultado-box .small { font-size: 11px; color: #555; margin-top: 2px; }
  .obs-box { background: #fffbf0; border: 1px solid #f0dca0; border-radius: 6px; padding: 10px 12px; margin: 15px 0; font-size: 11px; }
  .assinatura { margin-top: 40px; border-top: 2px solid #333; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; }
  .assinatura div { text-align: center; flex: 1; }
  .assinatura .linha { margin-top: 35px; border-top: 1px solid #333; padding-top: 5px; font-weight: bold; }
  .footer { margin-top: 25px; font-size: 9px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 8px; }
</style></head><body>
  <div class="header"><div><h1>Checklist de Passagem de SVD</h1><div class="header-info">Data da impressão: ${hoje}</div></div></div>
  <div class="paciente-box"><table>
    <tr><td class="label">Paciente:</td><td><strong>${currentPatient.nome?.toUpperCase() || "___________________"}</strong></td><td class="label">Leito:</td><td><strong>${currentPatient.leito}</strong></td></tr>
    <tr><td class="label">Idade:</td><td>${idade} anos</td><td class="label">Data do Procedimento:</td><td><strong>${dataProcedimento}</strong></td></tr>
    <tr><td class="label">Sexo:</td><td>${currentPatient.sexo === 'F' ? 'Feminino' : 'Masculino'}</td><td class="label">Horário:</td><td><strong>${registro.horario || "__________"}</strong></td></tr>
  </table></div>
  <div class="section-title">Dados do Procedimento</div>
  <div class="info-grid">
    ${registro.indicacao ? `<div class="info-item" style="flex:2"><span class="tag">Indicação</span><span class="value">${registro.indicacao}</span></div>` : ''}
    ${registro.justificativa ? `<div class="info-item" style="flex:2"><span class="tag">Justificativa</span><span class="value">${registro.justificativa}</span></div>` : ''}
    ${registro.enfermeiroResponsavel ? `<div class="info-item" style="flex:2"><span class="tag">Enfermeiro(a) Responsável</span><span class="value">${registro.enfermeiroResponsavel}</span></div>` : ''}
    <div class="info-item"><span class="tag">Gênero</span><span class="value">${registro.genero || 'N/A'}</span></div>
  </div>
  <div class="section-title">Lista de Verificação — Conformidade</div>
  <table class="checklist"><thead><tr><th style="width:30px">#</th><th>Item</th><th style="width:100px;text-align:center">Cumprida</th></tr></thead><tbody>
    ${itens.map((b, i) => `<tr><td style="text-align:center">${i+1}</td><td>${b.label || b.item}</td><td style="text-align:center">${b.cumprida ? '<span class="status-ok">✅ Sim</span>' : '<span class="status-no">❌ Não</span>'}</td></tr>`).join('')}
  </tbody></table>
  <div class="resultado-box"><div class="big">${cumpridos} / ${total} — ${todasOK ? '✅ CONFORME' : '❌ NÃO CONFORME'}</div><div class="small">Checklist de passagem de SVD</div></div>
  ${registro.observacao ? `<div class="section-title">Observações</div><div class="obs-box">${registro.observacao}</div>` : ''}
  <div class="section-title">Assinatura do Profissional</div>
  <div class="assinatura">
    <div><div class="linha">${nomeProf}</div><div style="font-size:10px;color:#666;margin-top:3px;">Enfermeiro(a) Responsável</div></div>
    <div><div class="linha">${conselhoProf} ${numConselho}</div><div style="font-size:10px;color:#666;margin-top:3px;">Nº do Conselho Profissional</div></div>
    <div><div class="linha">${dataProcedimento}</div><div style="font-size:10px;color:#666;margin-top:3px;">Data do Procedimento</div></div>
  </div>
  <div class="footer">Documento gerado pelo Sys4U - UTI Municipal de Ariquemes | ${hoje}</div>
</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 300);
  };

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-indigo-500/20 my-auto">
        <div className="bg-indigo-600 p-5 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full">
              <Droplets size={20} />
            </div>
            <h2 className="text-lg font-black tracking-wide">Inserção SVD</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"
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
                value={form.horario.split(':')[0] || '00'}
                onChange={(e) => handleHorarioChange('hora', e.target.value)}
                className="w-24 font-black text-2xl bg-transparent outline-none text-center"
              >
                {HORAS.map((hora) => (
                  <option key={hora} value={hora}>{hora}</option>
                ))}
              </select>
              <span className="text-3xl font-black text-slate-300 pb-1">:</span>
              <select
                value={form.horario.split(':')[1] || '00'}
                onChange={(e) => handleHorarioChange('minuto', e.target.value)}
                className="w-24 font-black text-2xl bg-transparent outline-none text-center"
              >
                {MINUTOS.map((minuto) => (
                  <option key={minuto} value={minuto}>{minuto}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 mb-3 block text-center">
              Indicação
            </label>
            <div className="grid grid-cols-2 gap-2">
              {INDICACOES.map((opcao) => {
                const selecionada = form.indicacao === opcao;
                return (
                  <button
                    key={opcao}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, indicacao: opcao }))}
                    className={`p-3 rounded-xl text-sm font-bold border-2 transition-all ${
                      selecionada
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {opcao}
                  </button>
                );
              })}
            </div>
          </div>

          {form.indicacao === 'Outra' && (
            <div>
              <input
                type="text"
                placeholder="Descreva a justificativa..."
                value={form.justificativa}
                onChange={(e) => setForm((prev) => ({ ...prev, justificativa: e.target.value }))}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-600 mb-3 block text-center">
              Gênero (tipo de sonda)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {GENEROS.map((opcao) => {
                const selecionada = form.genero === opcao;
                return (
                  <button
                    key={opcao}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, genero: opcao }))}
                    className={`p-3 rounded-xl text-sm font-bold border-2 transition-all ${
                      selecionada
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {opcao}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ENFERMEIRO(A) RESPONSÁVEL */}
          <div>
            <label className="text-xs font-bold text-slate-600 mb-3 block text-center">
              Enfermeiro(a) que realizou o procedimento
            </label>
            <select
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-bold text-center"
              value={form.enfermeiroResponsavel || ''}
              onChange={(e) => setForm({ ...form, enfermeiroResponsavel: e.target.value })}
            >
              <option value="">Selecione o profissional...</option>
              {listaProfissionais
                .filter(prof => prof.categoria?.toLowerCase() === 'enfermeiro')
                .map(prof => (
                  <option key={prof.id} value={prof.nome}>{prof.nome}</option>
                ))
              }
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 mb-3 block text-center">
              Itens do Procedimento
            </label>
            <div className="space-y-2">
              {ITENS_CHECKLIST.map((item) => {
                const ativo = !!form.itens[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleItem(item.key)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-sm font-bold transition-all ${
                      ativo
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-200'
                    }`}
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
            <textarea
              placeholder="Observações adicionais..."
              value={form.observacao}
              onChange={(e) => setForm((prev) => ({ ...prev, observacao: e.target.value }))}
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-300 min-h-[80px] resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 p-5 pt-4 border-t border-slate-200 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={!form.horario || !form.indicacao || !form.genero}
            className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg flex justify-center items-center gap-2 uppercase tracking-wider transition-colors"
          >
            <CheckCircle2 size={18} />
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SVDInsercaoModal;