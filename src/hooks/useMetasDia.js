import { useState } from 'react';
import {
  determinarCategoriaAutor,
  podeConfirmarMeta as podeConfirmarMetaUtil,
  podeManipularMeta as podeManipularMetaUtil,
  nomeLegivelMeta
} from '../utils/metasAcoes';

export const useMetasDia = ({ currentPatient, updateP, handleBlurSave, userProfile }) => {
  const [novaMeta, setNovaMeta] = useState({ descricao: '' });
  const [modalCancelamento, setModalCancelamento] = useState(null);

  const dataISO = new Date().toLocaleDateString('sv-SE');
  const dataOntem = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('sv-SE');
  })();
  const ontemBR = dataOntem.split('-').reverse().join('/');

  const metas = currentPatient?.visita?.[dataISO]?.metas || [];
  const metasOntem = currentPatient?.visita?.[dataOntem]?.metas || [];

  const cumpridasOntem = metasOntem.filter(m => m.status === 'realizado');
  const canceladasOntem = metasOntem.filter(m => m.status === 'cancelado' || m.status === 'rejeitada');
  const naoCumpridasOntem = metasOntem.filter(m => m.status === 'pendente' || m.status === 'aguardando');

  const atualizarMetas = (novasMetas) => {
    const visita = currentPatient?.visita || {};
    updateP('visita', { ...visita, [dataISO]: { ...(visita[dataISO] || {}), metas: novasMetas } });
    if (typeof handleBlurSave === 'function') handleBlurSave('Visita Multi: Atualizou metas');
  };

  const adicionarMetaManual = (tipo, descricao) => {
    if (!descricao.trim()) return;
    atualizarMetas([...metas, {
      id: `meta_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      descricao: tipo && tipo !== 'Outro' ? `${tipo} — ${descricao}` : descricao,
      origem: 'manual', status: 'pendente', criadoEm: dataISO,
      adicionadoPor: determinarCategoriaAutor(userProfile, null),
      confirmadoPor: null, dataConfirmacao: null, dataRealizado: null,
      marcadoPor: null, marcadoEm: null,
      dataCancelamento: null, canceladoPor: null, justificativaCancelamento: null
    }]);
  };

  const confirmarMeta = (id) => {
    atualizarMetas(metas.map(m => m.id === id
      ? { ...m, status: 'pendente', confirmadoPor: userProfile?.nome || userProfile?.perfil, dataConfirmacao: dataISO }
      : m));
  };

  const rejeitarMeta = (id, justificativa) => {
    atualizarMetas(metas.map(m => m.id === id
      ? { ...m, status: 'rejeitada', canceladoPor: userProfile?.nome || userProfile?.perfil,
          dataCancelamento: dataISO, justificativaCancelamento: justificativa || 'Rejeitada' }
      : m));
  };

  const marcarRealizado = (id) => {
    atualizarMetas(metas.map(m => m.id === id
      ? { ...m, status: 'realizado', dataRealizado: dataISO,
          marcadoPor: userProfile?.nome || userProfile?.perfil,
          marcadoEm: new Date().toISOString() }
      : m));
  };

  const cancelarMeta = (id, justificativa) => {
    atualizarMetas(metas.map(m => m.id === id
      ? { ...m, status: 'cancelado', dataCancelamento: dataISO,
          canceladoPor: userProfile?.nome || userProfile?.perfil,
          justificativaCancelamento: justificativa || '' }
      : m));
  };

  const manterMetaOntem = (meta) => {
    if (metas.some(m => m.descricao === meta.descricao)) return;
    atualizarMetas([...metas, {
      ...meta,
      id: `meta_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      status: 'pendente', criadoEm: dataISO,
      dataRealizado: null, dataConfirmacao: null, dataCancelamento: null,
      confirmadoPor: null, canceladoPor: null, justificativaCancelamento: null
    }]);
  };

  const metaJaMantidaHoje = (meta) => metas.some(m => m.descricao === meta.descricao);

  return {
    metas, metasOntem, cumpridasOntem, canceladasOntem, naoCumpridasOntem,
    ontemBR, novaMeta, setNovaMeta, modalCancelamento, setModalCancelamento,
    adicionarMetaManual, confirmarMeta, rejeitarMeta, marcarRealizado,
    cancelarMeta, manterMetaOntem, metaJaMantidaHoje,
    podeConfirmarMeta: (m) => podeConfirmarMetaUtil(m, userProfile),
    podeManipularMeta: (m) => podeManipularMetaUtil(m, userProfile),
    nomeLegivelMeta
  };
};