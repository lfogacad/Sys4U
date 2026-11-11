import React, { useState } from 'react';
import { Microscope, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { ModalPortal } from './ModuloUTI';
import {
  TIPOS_CULTURA_PADRAO,
  dataHojeAmazonas,
  inserirCulturasDoDia
} from '../utils/culturasAcoes';

/**
 * Modal rápido de registro de culturas (CCIH).
 * Grava em currentPatient.culturas.lista usando a MESMA regra de
 * deduplicação da evolução médica (tipo + dataColeta).
 */
const ModalCulturaRapida = ({ isOpen, onClose, currentPatient, updateNested }) => {
  const [tipos, setTipos] = useState([]);
  const [outroDetalhe, setOutroDetalhe] = useState('');
  const [dataColeta, setDataColeta] = useState(dataHojeAmazonas());
  const [feedback, setFeedback] = useState(null);

  if (!isOpen) return null;

  const toggleTipo = (tipo) => {
    setFeedback(null);
    setTipos(prev => prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]);
  };

  const handleFechar = () => {
    setTipos([]);
    setOutroDetalhe('');
    setDataColeta(dataHojeAmazonas());
    setFeedback(null);
    onClose();
  };

  const handleSalvar = () => {
    if (!dataColeta) {
      setFeedback({ tipo: 'erro', texto: 'Informe a data da coleta.' });
      return;
    }
    if (tipos.length === 0) {
      setFeedback({ tipo: 'erro', texto: 'Selecione ao menos um material coletado.' });
      return;
    }
    if (tipos.includes('Outro') && !outroDetalhe.trim()) {
      setFeedback({ tipo: 'erro', texto: 'Especifique o material em "Outro".' });
      return;
    }

    const { listaFinal, adicionadas, ignoradas } = inserirCulturasDoDia({
      listaAtual: currentPatient?.culturas?.lista || [],
      tipos,
      outroDetalhe,
      dataColeta,
      origem: 'rapida'
    });

    if (adicionadas.length > 0) {
      updateNested('culturas', 'lista', listaFinal);
    }

    if (ignoradas.length > 0 && adicionadas.length === 0) {
      setFeedback({
        tipo: 'aviso',
        texto: `Já registrado nesta data: ${ignoradas.join(', ')}. Nada foi duplicado.`
      });
      return;
    }

    if (ignoradas.length > 0) {
      setFeedback({
        tipo: 'aviso-parcial',
        texto: `${adicionadas.length} cultura(s) registrada(s). Já existiam: ${ignoradas.join(', ')}.`
      });
      setTimeout(handleFechar, 1800);
      return;
    }

    handleFechar();
  };

  const dataBR = dataColeta ? dataColeta.split('-').reverse().join('/') : '';

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col animate-fadeIn">
          <div className="bg-orange-600 p-4 flex justify-between items-center text-white shrink-0">
            <h3 className="font-bold flex items-center gap-2 text-sm">
              <Microscope size={18} /> Adicionar Cultura (CCIH)
            </h3>
            <button onClick={handleFechar} className="text-orange-200 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Data da coleta</label>
              <input
                type="date"
                value={dataColeta}
                onChange={(e) => { setDataColeta(e.target.value); setFeedback(null); }}
                max={dataHojeAmazonas()}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-300"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Esta data é a referência para IRAS. Registrado como: {dataBR || '—'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase">Materiais coletados *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {TIPOS_CULTURA_PADRAO.map(tipo => (
                  <label
                    key={tipo}
                    className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer p-2 hover:bg-orange-50 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                      checked={tipos.includes(tipo)}
                      onChange={() => toggleTipo(tipo)}
                    />
                    {tipo}
                  </label>
                ))}
              </div>
            </div>

            {tipos.includes('Outro') && (
              <div className="animate-fadeIn">
                <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Especifique o material</label>
                <input
                  type="text"
                  placeholder="Ex: Líquor, Ponta de Cateter..."
                  value={outroDetalhe}
                  onChange={(e) => { setOutroDetalhe(e.target.value); setFeedback(null); }}
                  className="w-full p-2.5 border border-orange-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            )}

            {feedback && (
              <div className={`p-3 rounded-lg border flex items-start gap-2 text-xs font-bold ${
                feedback.tipo === 'erro'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                {feedback.tipo === 'erro'
                  ? <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  : <CheckCircle size={14} className="shrink-0 mt-0.5" />}
                <span>{feedback.texto}</span>
              </div>
            )}

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-[10px] text-slate-500 leading-relaxed">
                <strong>Sem duplicação:</strong> se o mesmo material já foi registrado nesta data — por este botão ou pela evolução médica — o sistema ignora automaticamente.
              </p>
            </div>
          </div>

          <div className="p-4 bg-white border-t flex justify-end gap-2 shrink-0">
            <button
              onClick={handleFechar}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-colors text-sm"
            >
              Adicionar Cultura
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ModalCulturaRapida;