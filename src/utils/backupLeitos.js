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

// 3) RESTAURAR: sobrescreve OU só preenche campos que estão vazios/faltando
export const restaurarSnapshot = async (snapshotId, { apenasCamposVazios = true } = {}) => {
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

  const restaurados = [];
  for (const [leitoId, dadosBackup] of Object.entries(leitos)) {
    const atualRef = doc(db, 'leitos_uti', leitoId);
    const atual = (await getDoc(atualRef)).data() || {};
    const payload = apenasCamposVazios
      ? mesclarPreenchendoVazios(atual, dadosBackup)
      : dadosBackup;
    await setDoc(atualRef, payload, { merge: true });
    restaurados.push(leitoId);
  }
  return restaurados;
};

// Mescla recursiva: preenche SÓ o que está undefined/nulo/vazio agora.
// Assim, dados bons registrados DEPOIS do apagamento não são sobrescritos.
const estaVazio = (v) =>
  v === undefined || v === null || v === '' ||
  (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);

const mesclarPreenchendoVazios = (atual, backup) => {
  const saida = { ...atual };
  for (const [chave, vBackup] of Object.entries(backup || {})) {

    // 🛡️ BH: só mescla se for o MESMO dia — nunca mistura ontem no hoje
    if (chave === 'bh') {
      if (!saida.bh || !saida.bh.date) {
        saida.bh = vBackup;                       // sem bh atual → pode copiar
      } else if (saida.bh.date === vBackup?.date) {
        saida.bh = mesclarPreenchendoVazios(saida.bh, vBackup); // mesmo dia
      }
      // datas diferentes → NÃO mescla (evita jogar ontem no hoje)
      continue;
    }

    // 🛡️ historico_bh: mescla por DATA (array) — recupera dias que faltam
    if (chave === 'historico_bh' && Array.isArray(vBackup)) {
      const atuais = Array.isArray(saida.historico_bh) ? saida.historico_bh : [];
      const datasExistentes = new Set(atuais.map(h => h && h.date).filter(Boolean));
      const novos = vBackup.filter(h => h && h.date && !datasExistentes.has(h.date));
      if (novos.length > 0) saida.historico_bh = [...atuais, ...novos];
      continue;
    }

    // ... lógica genérica original (inalterada) ...
    if (saida[chave] === undefined) {
      saida[chave] = vBackup;
    } else if (
      vBackup && typeof vBackup === 'object' && !Array.isArray(vBackup) &&
      saida[chave] && typeof saida[chave] === 'object' && !Array.isArray(saida[chave])
    ) {
      saida[chave] = mesclarPreenchendoVazios(saida[chave], vBackup);
    }
  }
  return saida;
};