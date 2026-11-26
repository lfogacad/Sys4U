// =====================================================
// BACKUP DE LEITOS — snapshots por horário
// =====================================================
import { collection, doc, getDocs, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

// 1) GERAR SNAPSHOT: lê todos os leitos e salva em backup_leitos/{timestamp}
export const gerarSnapshotLeitos = async (rotulo = 'manual') => {
  const ts = new Date();
  const snapshotId = ts.toISOString(); // ex.: "2026-10-08T19:00:00.000Z" — mantém ID único (não colide com o automático)
  const snap = await getDocs(collection(db, 'leitos_uti'));

  // Documento "cabeçalho" do snapshot (o seletor continua listando por aqui)
  const snapRef = doc(db, 'backup_leitos', snapshotId);
  const batch = writeBatch(db);
  batch.set(snapRef, { criadoEm: ts, rotulo });

  // 1 documento por leito na subcoleção — evita o limite de 1 MiB por documento
  snap.forEach(d => {
    batch.set(doc(snapRef, 'leitos', d.id), d.data());
  });

  await batch.commit();
  console.log(`[BACKUP] Snapshot ${snapshotId} salvo com ${snap.size} leitos`);
  return snapshotId;
};

// 2) LISTAR SNAPSHOTS (mais recente primeiro) — alimenta o seletor de horário
export const listarSnapshots = async () => {
    const snap = await getDocs(collection(db, 'backup_leitos'));
    const toMillis = (v) =>
      v && typeof v.toMillis === 'function' ? v.toMillis()
      : v instanceof Date ? v.getTime()
      : v ? new Date(v).getTime() : 0;
    return snap.docs
      .map(d => ({ id: d.id, rotulo: d.data().rotulo, criadoEm: d.data().criadoEm }))
      .sort((a, b) => toMillis(b.criadoEm) - toMillis(a.criadoEm));
  };

// 2b) LISTAR LEITOS PRESENTES EM UM SNAPSHOT — alimenta o seletor de leito
// Devolve exatamente os leitos que aquele backup contém, com o número e se
// havia paciente. Assim o seletor reflete o snapshot, e não um número fixo.
export const listarLeitosDoSnapshot = async (snapshotId) => {
  if (!snapshotId) return [];

  const snap = await getDoc(doc(db, 'backup_leitos', snapshotId));
  const leitosSnap = await getDocs(collection(db, 'backup_leitos', snapshotId, 'leitos'));

  const registros = [];
  if (leitosSnap.size > 0) {
    leitosSnap.forEach(d => registros.push([d.id, d.data()]));
  } else {
    // Fallback: snapshots ANTIGOS têm o campo `leitos` no próprio documento
    Object.entries(snap.exists() ? (snap.data().leitos || {}) : {})
      .forEach(([id, dados]) => registros.push([id, dados]));
  }

  return registros
    .map(([id, dados]) => ({
      id,
      numero: Number(String(id).replace('bed_', '')) || 0,
      ocupado: !!String(dados?.nome || '').trim(),
      nome: String(dados?.nome || '').trim()
    }))
    .sort((a, b) => a.numero - b.numero);
};

// 3) RESTAURAR: sobrescreve OU só preenche campos que estão vazios/faltando
// Opções:
//   apenasCamposVazios: true            → só preenche o que está vazio (padrão)
//   leitosAlvo: ['bed_4']               → restaura APENAS esses leitos (vazio = todos)
//   substituirLeitoVazio: true          → no modo sobrescrever, se o leito estiver
//                                         vazio no backup, LIMPA o documento atual
export const restaurarSnapshot = async (
  snapshotId,
  { apenasCamposVazios = true, leitosAlvo = [], substituirLeitoVazio = false } = {}
) => {
  const snap = await getDoc(doc(db, 'backup_leitos', snapshotId));
  if (!snap.exists()) throw new Error('Snapshot não encontrado');

  // NOVO formato: leitos ficam na subcoleção (1 doc por leito)
  let leitos = {};
  const leitosSnap = await getDocs(collection(db, 'backup_leitos', snapshotId, 'leitos'));
  if (leitosSnap.size > 0) {
    leitosSnap.forEach(d => { leitos[d.id] = d.data(); });
  } else {
    // Fallback: snapshots ANTIGOS ainda têm o campo `leitos` no próprio documento
    leitos = snap.data().leitos || {};
  }

  // Filtro de leito: só os alvos (se informado)
  const alvos = Array.isArray(leitosAlvo) && leitosAlvo.length > 0
    ? new Set(leitosAlvo)
    : null;

  const restaurados = [];
  for (const [leitoId, dadosBackup] of Object.entries(leitos)) {
    if (alvos && !alvos.has(leitoId)) continue;

    const atualRef = doc(db, 'leitos_uti', leitoId);
    const atual = (await getDoc(atualRef)).data() || {};

    let payload;
    if (apenasCamposVazios) {
      payload = mesclarPreenchendoVazios(atual, dadosBackup);
      await setDoc(atualRef, payload, { merge: true });
    } else {
      // Modo sobrescrever REAL: parte do estado atual para não perder campos
      // recentes que o backup não conhece, mas força os campos do backup.
      // Se `substituirLeitoVazio` estiver ligado e o backup for de um leito vazio,
      // apaga o documento para remover um paciente fantasma.
      const backupVazio = !dadosBackup.nome || String(dadosBackup.nome).trim() === '';

      if (backupVazio && substituirLeitoVazio) {
        // Limpa a identidade do paciente, preservando estruturas pesadas
        // que não fazem sentido apagar (histórico de BH, etc.).
        payload = {
          ...atual,
          id: leitoId,
          leito: Number(String(leitoId).replace('bed_', '')) || atual.leito,
          nome: '',
          cpf: '',
          dataNascimento: '',
          sexo: '',
          procedencia: '',
          diagnostico: '',
          comorbidades: '',
          dataInternacao: '',
          dataInternacaoISO: '',
          idInternacao: '',
          status: 'Vazio',
          statusInternacao: 'Vazio',
          visitor: undefined
        };
        Object.keys(payload).forEach(k => { if (payload[k] === undefined) delete payload[k]; });
        await setDoc(atualRef, payload, { merge: true });
        // Remove o nó `visita` inteiro (paciente fantasma costuma trazer visita antiga)
        await setDoc(atualRef, { visita: {} }, { merge: true });
      } else {
        payload = { ...atual, ...dadosBackup, id: leitoId };
        await setDoc(atualRef, payload, { merge: true });
      }
    }
    restaurados.push(leitoId);
  }
  return restaurados;
};

// =========================================================================
// MESCLA RECURSIVA — "só preenche o que está vazio"
// Regra geral: o valor ATUAL vence; o backup só entra onde não há dado.
// Arrays são UNIDOS (por id → date → data → valor), nunca substituídos,
// para recuperar itens apagados sem perder os criados depois.
// Exceção: CULTURA com atual "Pendente" e backup "Positivo" → backup vence.
// =========================================================================

const ehObjetoSimples = (v) =>
  !!v && typeof v === 'object' && !Array.isArray(v)
  && typeof v.toDate !== 'function' && !(v instanceof Date);

// Vazio = pode ser preenchido pelo backup.
// Array vazio conta como vazio (antes não contava — era o bug principal).
const estaVazio = (v) => {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (ehObjetoSimples(v)) return Object.keys(v).length === 0;
  return false;   // número, boolean, Timestamp, Date
};

// Chaves usadas para reconhecer "o mesmo item" em arrays de objetos.
const CHAVES_IDENTIDADE = ['id', 'date', 'dia', 'data', 'dataColeta', 'hora'];

const assinaturaItem = (v) => {
  try { return JSON.stringify(v); } catch { return String(v); }
};

// 🧫 Cultura = objeto com tipo (ex.: "Hemocultura") e status (Pendente/Positivo/Negativo)
const ehCultura = (o) =>
  ehObjetoSimples(o) && typeof o.tipo === 'string' && typeof o.status === 'string';

// Regra pedida: atual "Pendente" + backup "Positivo" → o backup assume
const backupVenceNaCultura = (atual, doBackup) => {
  if (!ehCultura(atual) || !ehCultura(doBackup)) return false;
  const stAtual = String(atual.status || '').trim().toLowerCase();
  const stBackup = String(doBackup.status || '').trim().toLowerCase();
  return stAtual === 'pendente' && stBackup === 'positivo';
};

// Backup assume o item, MAS não apaga com valor vazio o que o atual já tem.
// Preserva também campos que o backup desconhece (ex.: irasAssociada da CCIH).
const mesclarCulturaBackupVence = (atual, doBackup) => {
  const doBackupComDado = {};
  Object.entries(doBackup || {}).forEach(([k, v]) => {
    if (!estaVazio(v)) doBackupComDado[k] = v;
  });
  return { ...atual, ...doBackupComDado };
};

// União de arrays: recupera do backup o que falta no atual.
const unirArrays = (atuais, doBackup) => {
  const arrAtual = Array.isArray(atuais) ? atuais : [];
  const arrBackup = Array.isArray(doBackup) ? doBackup : [];
  if (arrBackup.length === 0) return arrAtual;
  if (arrAtual.length === 0) return arrBackup;

  // 1) Array de primitivos → união por valor
  const todosPrimitivos = [...arrAtual, ...arrBackup]
    .every(v => !ehObjetoSimples(v) && !Array.isArray(v));
  if (todosPrimitivos) {
    return Array.from(new Set([...arrAtual, ...arrBackup]));
  }

  // 2) Array de objetos → união pela primeira chave de identidade disponível
  const chave = CHAVES_IDENTIDADE.find(k =>
    arrAtual.some(o => ehObjetoSimples(o) && o[k] !== undefined && o[k] !== null) &&
    arrBackup.some(o => ehObjetoSimples(o) && o[k] !== undefined && o[k] !== null)
  );

  if (chave) {
    const porChave = new Map();
    const semChave = [];

    const registrar = (item, vemDoBackup) => {
      if (ehObjetoSimples(item) && item[chave] !== undefined && item[chave] !== null) {
        const k = String(item[chave]);
        if (!porChave.has(k)) {
          porChave.set(k, item);
        } else if (vemDoBackup) {
          const existente = porChave.get(k);
          // 🧫 Cultura Pendente no atual + Positivo no backup → backup ganha
          if (backupVenceNaCultura(existente, item)) {
            porChave.set(k, mesclarCulturaBackupVence(existente, item));
          } else {
            porChave.set(k, mesclarPreenchendoVazios(existente, item));
          }
        }
      } else {
        semChave.push(item);
      }
    };

    arrAtual.forEach(i => registrar(i, false));
    arrBackup.forEach(i => registrar(i, true));
    return [...porChave.values(), ...semChave];
  }

  // 3) Sem chave em comum → anexa apenas os itens que ainda não existem
  const existentes = new Set(arrAtual.map(assinaturaItem));
  const novos = [];
  arrBackup.forEach(item => {
    const a = assinaturaItem(item);
    if (existentes.has(a)) return;
    existentes.add(a);
    novos.push(item);
  });
  return novos.length > 0 ? [...arrAtual, ...novos] : arrAtual;
};

const mesclarPreenchendoVazios = (atual, backup) => {
  const saida = { ...(atual || {}) };

  for (const [chave, vBackup] of Object.entries(backup || {})) {

    // 🛡️ BH: só mescla se for o MESMO dia — nunca mistura ontem no hoje
    if (chave === 'bh') {
      if (!saida.bh || !saida.bh.date) {
        saida.bh = vBackup;
      } else if (saida.bh.date === vBackup?.date) {
        saida.bh = mesclarPreenchendoVazios(saida.bh, vBackup);
      }
      continue;
    }

    // 🛡️ bh_previous: snapshot COMPLETO de um dia fechado — restaura inteiro
    // ou não restaura nada. Mesclar campo a campo misturaria dias.
    if (chave === 'bh_previous') {
      if (estaVazio(saida.bh_previous) && !estaVazio(vBackup)) {
        saida.bh_previous = vBackup;
      }
      continue;
    }

    // 🔗 Arrays em geral → UNIÃO (culturas.lista, historico_bh, testados,
    // resistentes, exames...). Recupera itens apagados e preserva os novos.
    if (Array.isArray(vBackup)) {
      saida[chave] = unirArrays(saida[chave], vBackup);
      continue;
    }

    // Campo vazio no atual → o backup preenche
    if (estaVazio(saida[chave])) {
      if (!estaVazio(vBackup)) saida[chave] = vBackup;
      continue;
    }

    // Ambos são mapas → desce recursivamente
    // (physio, gasometriaHistory, examHistory, medical, nursing, culturas...)
    if (ehObjetoSimples(vBackup) && ehObjetoSimples(saida[chave])) {
      saida[chave] = mesclarPreenchendoVazios(saida[chave], vBackup);
    }
  }
  return saida;
};