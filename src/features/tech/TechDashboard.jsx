import React, { useState, useEffect } from 'react';
import { AlertCircle, ShieldAlert, Droplets, UserCheck, Clock, Printer, Scale, X, PlusCircle, 
         Activity, Unlock, Lock, AlertTriangle, CheckCircle, Edit3, Calendar, Coffee, ArrowRight, CheckCircle2,
         ClipboardList, Utensils, ShowerHead, RefreshCw, Smile, ShieldPlus, Bandage, Wind, Package,
         FileText, Copy, Syringe, Scissors, Snowflake, TestTube, ChevronDown, ChevronRight } from 'lucide-react';
import { BH_HOURS, BH_GAINS, BH_LOSSES } from '../../constants/clinicalLists';
import { calculateAge, formatDateDDMM, getManausDateStr, safeNumber } from '../../utils/core';
import { doc, updateDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import CVCInsercaoModal from './CVCInsercaoModal';
import SVDInsercaoModal from './SVDInsercaoModal';

const TechDashboard = ({
  currentPatient,
  patients,
  activeTab,
  setPatients,
  save,
  isEditable,
  selectedDate,
  setSelectedDate,
  unlockedDates,
  handleUnlockHistoricalBH,
  handleLockHistoricalBH,  
  displayedBH,
  bhTotals,
  isBHReadOnly,
  handlePrintBH,
  handleAutoCalcInsensible,
  updateBH,
  updateNested,
  setCurrentNoraHour,
  setCurrentNoraRate,
  setShowNoraModal,
  handleBlurSave
}) => {

  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState("");
  const [registrosOpen, setRegistrosOpen] = useState(false);
  const [showCVCModal, setShowCVCModal] = useState(false);
  const [showSVDModal, setShowSVDModal] = useState(false);
  const [listaProfissionais, setListaProfissionais] = useState([]);

  // =========================================================================
  // FUNÇÃO AUXILIAR: ARREDONDA A HORA ATUAL PARA 00, 15, 30 OU 45
  // =========================================================================
  const getHoraAtualArredondada = () => {
    const agora = new Date();
    let horas = agora.getHours();
    let minutos = agora.getMinutes();

    const resto = minutos % 15;
    if (resto < 8) {
      minutos -= resto; // Arredonda para baixo
    } else {
      minutos += (15 - resto); // Arredonda para cima
    }

    if (minutos === 60) {
      minutos = 0;
      horas = (horas + 1) % 24;
    }

    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
  };

  // =========================================================================
  // ESTADOS E FUNÇÕES DO MODAL DE DIETA VO
  // =========================================================================
  const [modalDieta, setModalDieta] = useState({
    isOpen: false,
    step: 1,
    horario: "", // NOVO: Horário da oferta
    refeicao: "", // NOVO: Tipo de refeição
    tipos: { solida: false, liquida: false },
    consumo: { solida: null, liquida: null } 
  });

  const salvarDietaVO = () => {
    const up = [...patients];
    const p = JSON.parse(JSON.stringify(up[activeTab]));

    if (!p.enfermagem) p.enfermagem = {};
    if (!p.enfermagem.historico_dieta_vo) p.enfermagem.historico_dieta_vo = [];

    // Cria o registro com a data exata do clique, mas salva o horário e tipo informados
    const novoRegistro = {
      dataHoraRegistro: new Date().toISOString(),
      horarioRefeicao: modalDieta.horario,
      tipoRefeicao: modalDieta.refeicao,
      tiposOferecidos: modalDieta.tipos,
      consumo: modalDieta.consumo
    };

    p.enfermagem.historico_dieta_vo.push(novoRegistro);

    up[activeTab] = p;
    setPatients(up);
    save(up[activeTab], `Enfermagem: Registrou Dieta VO (${modalDieta.refeicao})`);
    
    // Fecha o modal e reseta
    setModalDieta({ isOpen: false, step: 1, horario: "", refeicao: "", tipos: { solida: false, liquida: false }, consumo: { solida: null, liquida: null } });
  };

  // =========================================================================
  // ESTADOS E FUNÇÕES DO MODAL DE BANHO
  // =========================================================================
  const [modalBanho, setModalBanho] = useState({
    isOpen: false,
    horario: "",
    tipo: ""
  });

  const salvarBanho = () => {
    const up = [...patients];
    const p = JSON.parse(JSON.stringify(up[activeTab]));

    if (!p.enfermagem) p.enfermagem = {};
    if (!p.enfermagem.historico_banho) p.enfermagem.historico_banho = [];

    const novoRegistro = {
      dataHoraRegistro: new Date().toISOString(),
      horario: modalBanho.horario,
      tipo: modalBanho.tipo
    };

    p.enfermagem.historico_banho.push(novoRegistro);

    up[activeTab] = p;
    setPatients(up);
    save(up[activeTab], `Enfermagem: Registrou Banho (${modalBanho.tipo})`);
    
    setModalBanho({ isOpen: false, horario: "", tipo: "" });
  };

  // =========================================================================
  // ESTADOS E FUNÇÕES DO MODAL DE DECÚBITO
  // =========================================================================
  const [modalDecubito, setModalDecubito] = useState({
    isOpen: false,
    horario: "",
    posicao: ""
  });

  const salvarDecubito = () => {
    const up = [...patients];
    const p = JSON.parse(JSON.stringify(up[activeTab]));

    if (!p.enfermagem) p.enfermagem = {};
    if (!p.enfermagem.historico_decubito) p.enfermagem.historico_decubito = [];

    const novoRegistro = {
      dataHoraRegistro: new Date().toISOString(),
      horario: modalDecubito.horario,
      posicao: modalDecubito.posicao
    };

    p.enfermagem.historico_decubito.push(novoRegistro);

    up[activeTab] = p;
    setPatients(up);
    save(up[activeTab], `Enfermagem: Mudança de Decúbito (${modalDecubito.posicao})`);
    
    setModalDecubito({ isOpen: false, horario: "", posicao: "" });
  };

  // =========================================================================
  // ESTADOS E FUNÇÕES DOS MODAIS DE HIGIENE (ORAL E ÍNTIMA)
  // =========================================================================
  const [modalHigieneOral, setModalHigieneOral] = useState({ isOpen: false, horario: "" });
  const [modalHigieneIntima, setModalHigieneIntima] = useState({ isOpen: false, horario: "" });

  const salvarHigieneOral = () => {
    const up = [...patients];
    const p = JSON.parse(JSON.stringify(up[activeTab]));

    if (!p.enfermagem) p.enfermagem = {};
    if (!p.enfermagem.historico_higiene_oral) p.enfermagem.historico_higiene_oral = [];

    p.enfermagem.historico_higiene_oral.push({
      dataHoraRegistro: new Date().toISOString(),
      horario: modalHigieneOral.horario
    });

    up[activeTab] = p;
    setPatients(up);
    save(up[activeTab], "Enfermagem: Registrou Higiene Oral");
    setModalHigieneOral({ isOpen: false, horario: "" });
  };

  const salvarHigieneIntima = () => {
    const up = [...patients];
    const p = JSON.parse(JSON.stringify(up[activeTab]));

    if (!p.enfermagem) p.enfermagem = {};
    if (!p.enfermagem.historico_higiene_intima) p.enfermagem.historico_higiene_intima = [];

    p.enfermagem.historico_higiene_intima.push({
      dataHoraRegistro: new Date().toISOString(),
      horario: modalHigieneIntima.horario
    });

    up[activeTab] = p;
    setPatients(up);
    save(up[activeTab], "Enfermagem: Registrou Higiene Íntima");
    setModalHigieneIntima({ isOpen: false, horario: "" });
  };

  // =========================================================================
  // ESTADOS E FUNÇÕES DO MODAL DE ASPIRAÇÃO VAS
  // =========================================================================
  const [modalAspiracao, setModalAspiracao] = useState({
    isOpen: false,
    horario: "",
    quantidade: "",
    caracteristica: ""
  });

  const salvarAspiracao = () => {
    const up = [...patients];
    const p = JSON.parse(JSON.stringify(up[activeTab]));

    if (!p.enfermagem) p.enfermagem = {};
    if (!p.enfermagem.historico_aspiracao_vas) p.enfermagem.historico_aspiracao_vas = [];

    p.enfermagem.historico_aspiracao_vas.push({
      dataHoraRegistro: new Date().toISOString(),
      horario: modalAspiracao.horario,
      quantidade: modalAspiracao.quantidade,
      caracteristica: modalAspiracao.caracteristica
    });

    up[activeTab] = p;
    setPatients(up);
    save(up[activeTab], `Enfermagem: Registrou Aspiração VAS (${modalAspiracao.quantidade}, ${modalAspiracao.caracteristica})`);
    
    setModalAspiracao({ isOpen: false, horario: "", quantidade: "", caracteristica: "" });
  };

  // =========================================================================
  // ESTADOS E FUNÇÕES DO MODAL DE TROCA DE FRALDA
  // =========================================================================
  const [modalFralda, setModalFralda] = useState({
    isOpen: false,
    horario: "",
    evacuacao: null, // null, "Sim", "Não"
    diarreica: false,
    quantidade: "" // NOVO: Quantificação da evacuação (+, ++, +++, ++++)
  });

const salvarFralda = () => {
    const up = [...patients];
    const p = JSON.parse(JSON.stringify(up[activeTab]));

    if (!p.enfermagem) p.enfermagem = {};
    if (!p.enfermagem.historico_fralda) p.enfermagem.historico_fralda = [];

    // 1. Salva no histórico individual da fralda
    p.enfermagem.historico_fralda.push({
      dataHoraRegistro: new Date().toISOString(),
      horario: modalFralda.horario,
      evacuacao: modalFralda.evacuacao,
      diarreica: modalFralda.evacuacao === "Sim" ? modalFralda.diarreica : false,
      quantidade: modalFralda.evacuacao === "Sim" ? modalFralda.quantidade : ""
    });

    // =========================================================================
    // 2. INTEGRAÇÃO AUTOMÁTICA COM O BALANÇO HÍDRICO (BH)
    // =========================================================================
    if (modalFralda.evacuacao === "Sim" && modalFralda.horario) {
      // Pega a hora e os minutos digitados
      const [horaStr, minStr] = modalFralda.horario.split(':');
      let hora = parseInt(horaStr, 10);
      const min = parseInt(minStr, 10);
      
      // Arredonda para a hora mais próxima (ex: 14:35 vira 15h, 14:20 vira 14h)
      if (min >= 30) {
        hora = (hora + 1) % 24;
      }
      
      // 🔥 A GRANDE MUDANÇA ESTÁ AQUI: formato "HH:00" em vez de "HHh"
      const horaBH = `${String(hora).padStart(2, '0')}:00`;

      // Garante que a estrutura do BH existe para não quebrar a tela
      if (!p.bh) p.bh = { date: getManausDateStr(), inputs: {}, losses: {}, vitals: {} };
      if (!p.bh.losses) p.bh.losses = {};
      if (!p.bh.losses[horaBH]) p.bh.losses[horaBH] = {};

      // Injeta a quantidade (+, ++, etc) na linha "Evacuação"
      p.bh.losses[horaBH]["Evacuação"] = modalFralda.quantidade;

      // Se for diarreica, injeta o "S" na linha "Diarreia"
      if (modalFralda.diarreica) {
        p.bh.losses[horaBH]["Diarreia"] = "S";
      }
    }

    up[activeTab] = p;
    setPatients(up);
    
    // 3. Gera o Log de Auditoria
    let logMsg = `Enfermagem: Registrou Troca de Fralda`;
    if (modalFralda.evacuacao === "Sim") {
      logMsg += ` (Evacuação: Sim [${modalFralda.quantidade}]${modalFralda.diarreica ? ' - Diarreica' : ''})`;
    } else {
      logMsg += ` (Apenas Diurese/Seca)`;
    }
    
    save(up[activeTab], logMsg);
    
    // 4. Reseta e fecha o modal
    setModalFralda({ isOpen: false, horario: "", evacuacao: null, diarreica: false, quantidade: "" });
  };

  // =========================================================================
  // ESTADOS, OPÇÕES E FUNÇÕES DO MODAL DE CURATIVO
  // =========================================================================
  const [modalCurativo, setModalCurativo] = useState({
    isOpen: false,
    horario: "",
    tipo: "",
    localizacao: ""
  });

  const OPCOES_CURATIVO = {
    "Acesso Periférico": ["MSD", "MSE", "MID", "MIE", "Jugular Externa D", "Jugular Externa E"],
    "Acesso Central": ["Subclávia D", "Subclávia E", "Jugular Interna D", "Jugular Interna E", "Femoral D", "Femoral E", "PICC MSD", "PICC MSE"],
    "Catéter de HD": ["Subclávia D", "Subclávia E", "Jugular Interna D", "Jugular Interna E", "Femoral D", "Femoral E"],
    "Dreno de Tórax": ["Hemitórax Direito", "Hemitórax Esquerdo", "Mediastino"],
    "Dreno Abdominal": ["Flanco Direito", "Flanco Esquerdo", "Fossa Ilíaca Direita", "Fossa Ilíaca Esquerda", "Pélvico", "Epigástrio"],
    "Ferida Operatória": ["Abdominal", "Torácica", "Craniana", "Cervical", "MMSS", "MMII", "Outro"],
    "Úlcera por Pressão": ["Sacral", "Calcâneo D", "Calcâneo E", "Isquiática D", "Isquiática E", "Trocantérica D", "Trocantérica E", "Occipital"]
  };

  const salvarCurativo = () => {
    const up = [...patients];
    const p = JSON.parse(JSON.stringify(up[activeTab]));

    if (!p.enfermagem) p.enfermagem = {};
    if (!p.enfermagem.historico_curativo) p.enfermagem.historico_curativo = [];

    p.enfermagem.historico_curativo.push({
      dataHoraRegistro: new Date().toISOString(),
      horario: modalCurativo.horario,
      tipo: modalCurativo.tipo,
      localizacao: modalCurativo.localizacao
    });

    up[activeTab] = p;
    setPatients(up);
    save(up[activeTab], `Enfermagem: Registrou Curativo (${modalCurativo.tipo} - ${modalCurativo.localizacao})`);
    
    setModalCurativo({ isOpen: false, horario: "", tipo: "", localizacao: "" });
  }

  // 
  // ESTADOS E FUNÇÕES DOS NOVOS MODAIS (ACESSO, TRICOTOMIA, CRIO E INSULINA)
  // 
  const [modalAcesso, setModalAcesso] = useState({ isOpen: false, horario: "", local: "", calibre: "" });
  const [modalTricotomia, setModalTricotomia] = useState({ isOpen: false, horario: "", local: "" });
  const [modalCrioterapia, setModalCrioterapia] = useState({ isOpen: false, horario: "" });
  const [modalInsulina, setModalInsulina] = useState({ isOpen: false, horario: "", tipo: "", dose: "" });

  const salvarAcesso = () => {
    const up = [...patients];
    const p = JSON.parse(JSON.stringify(up[activeTab]));
    if (!p.enfermagem) p.enfermagem = {};
    if (!p.enfermagem.historico_acesso) p.enfermagem.historico_acesso = [];

    // 1. Salva no histórico do botão
    p.enfermagem.historico_acesso.push({
      dataHoraRegistro: new Date().toISOString(),
      horario: modalAcesso.horario,
      local: modalAcesso.local,
      calibre: modalAcesso.calibre
    });

    // 🔥 2. INTEGRAÇÃO: Atualiza o painel da enfermagem automaticamente
    p.enfermagem.avpLocal = modalAcesso.local;
    // Pega a data de hoje no formato YYYY-MM-DD para o input type="date"
    p.enfermagem.avpData = getManausDateStr();

    up[activeTab] = p;
    setPatients(up);
    save(up[activeTab], `Enfermagem: Registrou Acesso Periférico (${modalAcesso.calibre} em ${modalAcesso.local})`);
    setModalAcesso({ isOpen: false, horario: "", local: "", calibre: "" });
  };

  const salvarTricotomia = () => {
    const up = [...patients];
    const p = JSON.parse(JSON.stringify(up[activeTab]));
    if (!p.enfermagem) p.enfermagem = {};
    if (!p.enfermagem.historico_tricotomia) p.enfermagem.historico_tricotomia = [];

    p.enfermagem.historico_tricotomia.push({
      dataHoraRegistro: new Date().toISOString(),
      horario: modalTricotomia.horario,
      local: modalTricotomia.local
    });

    up[activeTab] = p;
    setPatients(up);
    save(up[activeTab], `Enfermagem: Registrou Tricotomia (${modalTricotomia.local})`);
    setModalTricotomia({ isOpen: false, horario: "", local: "" });
  };

  const salvarCrioterapia = () => {
    const up = [...patients];
    const p = JSON.parse(JSON.stringify(up[activeTab]));
    if (!p.enfermagem) p.enfermagem = {};
    if (!p.enfermagem.historico_crioterapia) p.enfermagem.historico_crioterapia = [];

    p.enfermagem.historico_crioterapia.push({
      dataHoraRegistro: new Date().toISOString(),
      horario: modalCrioterapia.horario
    });

    up[activeTab] = p;
    setPatients(up);
    save(up[activeTab], `Enfermagem: Registrou Crioterapia`);
    setModalCrioterapia({ isOpen: false, horario: "" });
  };

  const salvarInsulina = () => {
    const up = [...patients];
    const p = JSON.parse(JSON.stringify(up[activeTab]));
    if (!p.enfermagem) p.enfermagem = {};
    if (!p.enfermagem.historico_insulina) p.enfermagem.historico_insulina = [];

    // 1. Salva no histórico do botão
    p.enfermagem.historico_insulina.push({
      dataHoraRegistro: new Date().toISOString(),
      horario: modalInsulina.horario,
      tipo: modalInsulina.tipo,
      dose: modalInsulina.dose
    });

    // 2. INTEGRAÇÃO AUTOMÁTICA COM O BALANÇO HÍDRICO (SINAIS VITAIS)
    if (modalInsulina.horario && modalInsulina.tipo && modalInsulina.dose) {
      const [horaStr, minStr] = modalInsulina.horario.split(':');
      let hora = parseInt(horaStr, 10);
      const min = parseInt(minStr, 10);
      
      if (min >= 30) {
        hora = (hora + 1) % 24;
      }
      
      // 🔥 A GRANDE MUDANÇA ESTÁ AQUI: formato "HH:00" em vez de "HHh"
      const horaBH = `${String(hora).padStart(2, '0')}:00`;

      if (!p.bh) p.bh = { date: getManausDateStr(), inputs: {}, losses: {}, vitals: {} };
      if (!p.bh.vitals) p.bh.vitals = {};
      if (!p.bh.vitals[horaBH]) p.bh.vitals[horaBH] = {};

      const sufixo = modalInsulina.tipo === 'NPH' ? 'N' : 'R';
      const novoRegistro = `${modalInsulina.dose}${sufixo}`;

      const registroAtual = p.bh.vitals[horaBH]["Insulina"] || "";

      if (registroAtual) {
        p.bh.vitals[horaBH]["Insulina"] = `${registroAtual}/${novoRegistro}`;
      } else {
        p.bh.vitals[horaBH]["Insulina"] = novoRegistro;
      }
    }

    up[activeTab] = p;
    setPatients(up);
    
    save(up[activeTab], `Enfermagem: Registrou Insulina (${modalInsulina.tipo} - ${modalInsulina.dose} UI)`);
    setModalInsulina({ isOpen: false, horario: "", tipo: "", dose: "" });
  };

  // =========================================================================
  // ESTADOS E FUNÇÕES DO RELATÓRIO DE ENFERMAGEM
  // =========================================================================
  const [modalRelatorio, setModalRelatorio] = useState({ isOpen: false, texto: "" });

    const gerarRelatorioEnfermagem = () => {
    const enf = currentPatient.enfermagem || {};
    let eventos = [];

    const dataHoje = getManausDateStr();

    // Função auxiliar para os modais
    const addEvent = (historico, formatador) => {
      if (Array.isArray(historico)) {
        historico.forEach(item => {
          if (item.horario && item.dataHoraRegistro && item.dataHoraRegistro.startsWith(dataHoje)) {
            eventos.push({ horario: item.horario, texto: formatador(item) });
          }
        });
      }
    };

    // Extraindo dados dos modais
    addEvent(enf.historico_dieta_vo, (i) => {
      let txt = `Dieta VO (${i.tipoRefeicao}).`;
      if (i.tiposOferecidos?.solida) txt += ` Sólida: ${i.consumo?.solida}% consumido.`;
      if (i.tiposOferecidos?.liquida) txt += ` Líquida: ${i.consumo?.liquida}% consumido.`;
      return txt;
    });
    addEvent(enf.historico_banho, (i) => `Banho: ${i.tipo}.`);
    addEvent(enf.historico_decubito, (i) => `Mudança de Decúbito: ${i.posicao}.`);
    addEvent(enf.historico_higiene_oral, () => `Higiene Oral realizada.`);
    addEvent(enf.historico_higiene_intima, () => `Higiene Íntima realizada.`);
    addEvent(enf.historico_curativo, (i) => `Troca/Avaliação de Curativo: ${i.tipo} (${i.localizacao}).`);
    addEvent(enf.historico_aspiracao_vas, (i) => `Aspiração VAS: Secreção ${i.quantidade.toLowerCase()}, aspecto ${i.caracteristica.toLowerCase()}.`);
    addEvent(enf.historico_fralda, (i) => {
      let txt = `Troca de Fralda.`;
      if (i.evacuacao === "Sim") {
        txt += ` Evacuação: Sim [${i.quantidade}]`;
        if (i.diarreica) txt += ` (Fezes Diarreicas).`;
        else txt += `.`;
      } else {
        txt += ` Apenas diurese/seca.`;
      }
      return txt;
    });
    addEvent(enf.historico_acesso, (i) => `Acesso Periférico: ${i.calibre} em ${i.local}.`);
    addEvent(enf.historico_tricotomia, (i) => `Tricotomia: ${i.local}.`);
    addEvent(enf.historico_crioterapia, () => `Crioterapia realizada.`);
    addEvent(enf.historico_insulina, (i) => `Insulina: ${i.tipo} - ${i.dose} UI.`);

    // 🔥 NOVO: Extraindo Diurese diretamente da tabela do Balanço Hídrico (BH)
    if (currentPatient.bh && currentPatient.bh.losses) {
      // Verifica se o BH atual é de hoje (para não puxar diurese de dias anteriores)
      const dataBH = currentPatient.bh.date;
      if (!dataBH || dataBH.startsWith(dataHoje)) {
        Object.keys(currentPatient.bh.losses).forEach(horaBH => {
          const volumeDiurese = currentPatient.bh.losses[horaBH]["Diurese"];
          // Se tiver algum valor digitado na coluna "Diurese" para este horário
          if (volumeDiurese && volumeDiurese.toString().trim() !== "") {
            // Converte "08h" para "08:00" para ficar no mesmo padrão do relatório
            const horaFormatada = horaBH.replace('h', ':00').padStart(5, '0');
            eventos.push({ 
              horario: horaFormatada, 
              texto: `Desprezado diurese (${volumeDiurese} ml).` 
            });
          }
        });
      }
    }

    // Ordena todos os eventos de HOJE por horário (do mais cedo pro mais tarde)
    eventos.sort((a, b) => a.horario.localeCompare(b.horario));

    // 🔥 CORREÇÃO: Pega a data da "pasta" do plantão e formata para DD/MM/AAAA
    const dataDoPlantao = selectedDate || currentPatient.bh?.date || getManausDateStr();
    const dataFormatada = dataDoPlantao.split('-').reverse().join('/');

    // Monta o texto final
    let relatorio = `=== ANOTAÇÃO DE ENFERMAGEM ===\n`;
    relatorio += `Paciente: ${currentPatient.nome}\n`;
    relatorio += `Data do Plantão: ${dataFormatada}\n\n`;

    if (eventos.length > 0) {
      eventos.forEach(ev => {
        relatorio += `[${ev.horario}] ${ev.texto}\n`;
      });
    } else {
      relatorio += `Nenhum procedimento pontual registrado no sistema no dia de hoje.\n`;
    }

    // Adiciona o texto livre do textarea no final
    if (enf.anotacoes_tech && enf.anotacoes_tech.trim() !== "") {
      relatorio += `\n--- OBSERVAÇÕES GERAIS ---\n${enf.anotacoes_tech.trim()}\n`;
    }

    setModalRelatorio({ isOpen: true, texto: relatorio });
  };

  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(collection(db, "profissionais"), (snapshot) => {
      const dados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setListaProfissionais(dados);
    }, (error) => {
      console.error("Erro ao buscar profissionais:", error);
    });
    return () => unsubscribe;
  }, []);

  // SISTEMA ANTI-ERRO DE DIGITAÇÃO ===
  const LIMITS = {
    gains: { "Dieta SNE/GTT": { min: 0, max: 900 }, "Água": { min: 0, max: 999 }, "Soro basal": { min: 0, max: 500 }, "Diluição EV": { min: 0, max: 500 }, "Volume": { min: 0, max: 1000 }, "Midazolan": { min: 0, max: 100 }, "Fentanil": { min: 0, max: 100 }, "Noradrenalina": { min: 0, max: 100 }, "Dobutamina": { min: 0, max: 100 }, "Hemocomponentes": { min: 0, max: 500 } },
    losses: { "Diurese": { min: 0, max: 2000 }, "Drenos": { min: 0, max: 5000 }, "SNG/SNE": { min: 0, max: 999 }, "HD": { min: 0, max: 9999 } },
    vitals: { "Temp (ºC)": { min: 20, max: 45 }, "FC (bpm)": { min: 0, max: 350 }, "FR (irpm)": { min: 0, max: 99 }, "PAS": { min: 0, max: 300 }, "PAD": { min: 0, max: 200 }, "PAM": { min: 0, max: 250 }, "SpO2 (%)": { min: 0, max: 100 }, "HGT (mg/dL)": { min: 0, max: 600 } }
  };

  const getLimits = (category, item) => {
    if (!LIMITS[category]) return null;
    const matchedKey = Object.keys(LIMITS[category]).find(k => item.includes(k));
    return matchedKey ? LIMITS[category][matchedKey] : null;
  };

  const handleValidatedChange = (hour, category, item, e) => {
    let val = e.target.value;
    if (val === "") { updateBH(hour, category, item, val); return; }
    
    const limits = getLimits(category, item);
    if (limits) {
      // Exceção: Se for HGT, pula a trava que bloqueia letras
      if (item !== "HGT (mg/dL)" && item !== "Diurese") {
        if (!/^-?\d*[.,]?\d*$/.test(val)) return;
      }
      
      // Mantém a trava de valor máximo apenas se o que foi digitado for um número
      const numVal = parseFloat(val.replace(',', '.'));
      if (!isNaN(numVal) && numVal > limits.max) return; 
    }
    
    updateBH(hour, category, item, val);
  };

  const checkMinLimitOnBlur = (hour, category, item, e) => {
    let val = e.target.value;
    handleBlurSave(`BH: Editou ${item} às ${hour}h (${category === 'gains' ? 'Ganho' : category === 'losses' ? 'Perda' : 'Sinal Vital'})`);
    if (val === "") return;
    const numVal = parseFloat(val.replace(',', '.'));
    if (!isNaN(numVal)) {
      const limits = getLimits(category, item);
      if (limits && numVal < limits.min) {
        alert(`ATENÇÃO de SEGURANÇA:\n\nO valor inserido em ${item} é inferior ao mínimo permitido (${limits.min}).\nO dado foi removido para evitar erros no Prontuário.`);
        updateBH(hour, category, item, ""); 
        handleBlurSave(`Segurança BH: O sistema bloqueou um valor irreal (${val}) no campo ${item} às ${hour}h`);
      }
    }
  };

  // ==============================================================
  // EXTRAÇÃO DE DATAS DISPONÍVEIS DO PACIENTE
  // ==============================================================
  const allBHDates = [];
  if (currentPatient.bh?.date) allBHDates.push(currentPatient.bh.date);
  if (currentPatient.historico_bh && Array.isArray(currentPatient.historico_bh)) {
    currentPatient.historico_bh.forEach(h => {
      if (h.date && !allBHDates.includes(h.date)) allBHDates.push(h.date);
    });
  }
  // Ordena as datas da mais recente para a mais antiga
  allBHDates.sort((a, b) => new Date(b) - new Date(a));

  const isCurrentDay = selectedDate === currentPatient.bh?.date;
  const viewingPreviousBH = !isCurrentDay;

  // ==============================================================
  // GERADOR DE PDF DO BALANÇO HÍDRICO
  // ==============================================================
  const handleCustomPrintBH = () => {
    const printWindow = window.open("", "_blank");
    
    let html = `<html><head><title>Balanço Hídrico - Leito ${currentPatient.leito}</title>
    <style>
      @page { size: A4 portrait; margin: 10mm; }
      body { font-family: Arial, sans-serif; font-size: 8px; margin: 0; padding: 0; color: #000; }
      .header { display: flex; justify-content: space-between; border-bottom: 2px solid black; padding-bottom: 4px; margin-bottom: 8px; font-weight: bold; font-size: 11px; text-transform: uppercase; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 8px; table-layout: fixed; }
      th, td { border: 1px solid #000; padding: 2px 1px; text-align: center; height: 12px; overflow: hidden; white-space: nowrap; font-size: 8px; }
      th { background-color: #eee; font-weight: bold; }
      .col-item { width: 15%; text-align: left; padding-left: 3px; font-weight: bold; }
      .col-hour { width: 3%; }
      .col-total { width: 4.5%; font-weight: bold; background-color: #eee; }
      .row-header { background-color: #ddd; font-weight: bold; text-align: left; padding-left: 5px; font-size: 9px; }
      .summary-container { display: flex; justify-content: space-between; border: 2px solid #000; padding: 6px 15px; font-size: 9px; font-weight: bold; margin-bottom: 12px; background-color: #f9f9f9; border-radius: 4px; }
      .summary-item { text-align: center; }
      .summary-val { font-size: 13px; display: block; margin-top: 3px; }
    </style></head><body>`;

    const age = calculateAge(currentPatient.dataNascimento) || "__";
    const dateStr = viewingPreviousBH ? displayedBH.date : getManausDateStr();
    
    html += `<div class="header">
      <span>PACIENTE: ${currentPatient.nome?.toUpperCase() || "___________________"}</span>
      <span>IDADE: ${age}a</span>
      <span>LEITO: ${currentPatient.leito}</span>
      <span>DATA: ${formatDateDDMM(dateStr)}</span>
    </div>`;

    // TABELA 1: BALANÇO HÍDRICO
    html += `<table><thead><tr><th class="col-item">ITEM</th>`;
    BH_HOURS.forEach(h => html += `<th class="col-hour">${h.split(":")[0]}</th>`);
    html += `<th class="col-total">TOTAL</th></tr></thead><tbody>`;

    // GANHOS
    html += `<tr><td colspan="26" class="row-header">GANHOS (+)</td></tr>`;
    [...BH_GAINS, ...(displayedBH.customGains || [])].forEach(item => {
        let rowTotal = 0;
        let rowHtml = `<tr><td class="col-item">${item}</td>`;
        BH_HOURS.forEach(h => {
            const val = displayedBH.gains[h]?.[item] || "";
            rowTotal += safeNumber(val);
            rowHtml += `<td>${val}</td>`;
        });
        rowHtml += `<td class="col-total">${rowTotal || ""}</td></tr>`;
        html += rowHtml;
    });

    // PERDAS
    html += `<tr><td colspan="26" class="row-header">PERDAS (-)</td></tr>`;
    [...BH_LOSSES, ...(displayedBH.customLosses || [])].forEach(item => {
        let rowTotal = 0;
        let rowHtml = `<tr><td class="col-item">${item}</td>`;
        BH_HOURS.forEach(h => {
            const val = displayedBH.losses[h]?.[item] || "";
            rowTotal += safeNumber(val);
            rowHtml += `<td>${val}</td>`;
        });
        
        let displayTotal = rowTotal;
        if (item === "Diurese") {
            let totalIrrig = 0;
            if (displayedBH.irrigation) Object.values(displayedBH.irrigation).forEach(v => totalIrrig += safeNumber(v));
            displayTotal = rowTotal - totalIrrig;
        }
        rowHtml += `<td class="col-total">${displayTotal || ""}</td></tr>`;
        html += rowHtml;
    });

    // IRRIGAÇÃO VESICAL
    let irrigTotal = 0;
    let irrigHtml = `<tr><td class="col-item" style="background-color: #fff9c4;">Irrigação Vesical</td>`;
    BH_HOURS.forEach(h => {
        const val = displayedBH.irrigation?.[h] || "";
        irrigTotal += safeNumber(val);
        irrigHtml += `<td style="background-color: #fffde7;">${val}</td>`;
    });
    irrigHtml += `<td class="col-total">${irrigTotal || ""}</td></tr>`;
    html += irrigHtml;
    html += `</tbody></table>`;

    // QUADRO DE RESUMO (TOTAIS)
    let pi = displayedBH.insensibleLoss !== undefined && displayedBH.insensibleLoss !== "" && displayedBH.insensibleLoss !== 0
        ? safeNumber(displayedBH.insensibleLoss)
        : (safeNumber(currentPatient.nutri?.peso) > 0 ? Math.round(safeNumber(currentPatient.nutri?.peso) * 12) : 0);

    const calcTotalPerdas = Math.round((bhTotals.totalLosses || 0) + pi);
    const calcDaily = Math.round(bhTotals.dailyBalance || 0);
    const calcAcc = Math.round(bhTotals.accumulated || 0);

    html += `<div class="summary-container">
        <div class="summary-item">TOTAL GANHOS<br><span class="summary-val" style="color: #008000;">+${Math.round(bhTotals.totalGains || 0)}</span></div>
        <div class="summary-item">TOTAL PERDAS (+PI ${pi})<br><span class="summary-val" style="color: #d32f2f;">-${calcTotalPerdas}</span></div>
        <div class="summary-item">BALANÇO 24H<br><span class="summary-val" style="color: ${calcDaily >= 0 ? '#1976d2' : '#f57c00'};">${calcDaily > 0 ? '+' : ''}${calcDaily}</span></div>
        <div class="summary-item">BH ANT.<br><span class="summary-val">${displayedBH.accumulated || 0}</span></div>
        <div class="summary-item">TOTAL ATUAL<br><span class="summary-val">${calcAcc > 0 ? '+' : ''}${calcAcc}</span></div>
    </div>`;

    // TABELA 2: SINAIS VITAIS
    html += `<table><thead><tr><th class="col-item">SINAIS VITAIS</th>`;
    BH_HOURS.forEach(h => html += `<th class="col-hour">${h.split(":")[0]}</th>`);
    html += `</tr></thead><tbody>`;
    
    ["Temp (ºC)", "FC (bpm)", "FR (irpm)", "PAS", "PAD", "PAM", "SpO2 (%)", "HGT (mg/dL)", "Insulina"].forEach(param => {
        html += `<tr><td class="col-item">${param}</td>`;
        BH_HOURS.forEach(h => {
            const val = displayedBH.vitals[h]?.[param] || "";
            html += `<td>${val}</td>`;
        });
        html += `</tr>`;
    });
    html += `</tbody></table>`;

    html += `</body></html>`;
    
    printWindow.document.write(html);
    printWindow.document.close();
    
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 250);
  };

  // VARIÁVEIS DE MAPEAMENTO
  const currentGains = [...BH_GAINS, ...(displayedBH?.customGains || [])];
  const currentLosses = [...BH_LOSSES, ...(displayedBH?.customLosses || [])];
  const currentVitals = ["Temp (ºC)", "FC (bpm)", "FR (irpm)", "PAS", "PAD", "PAM", "SpO2 (%)", "HGT (mg/dL)", "Insulina"];
  const numCols = BH_HOURS.length - 1;

  // NAVEGAÇÃO POR TECLADO
  const handleGridKeyDown = (e, gridId, rowIndex, colIndex, maxRow, maxCol) => {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(e.key)) return;
    e.preventDefault();
    let nextRow = rowIndex; let nextCol = colIndex; let targetGrid = gridId;

    if (e.key === "ArrowUp") {
      if (rowIndex > 0) nextRow = rowIndex - 1;
      else {
        if (gridId === "losses") { targetGrid = "gains"; nextRow = currentGains.length - 1; } 
        else if (gridId === "irrig") { targetGrid = "losses"; nextRow = currentLosses.length - 1; }
      }
    }
    if (e.key === "ArrowDown" || e.key === "Enter") {
      if (rowIndex < maxRow) nextRow = rowIndex + 1;
      else {
        if (gridId === "gains") { targetGrid = "losses"; nextRow = 0; } 
        else if (gridId === "losses") { targetGrid = "irrig"; nextRow = 0; }
      }
    }
    if (e.key === "ArrowLeft") nextCol = Math.max(0, colIndex - 1);
    if (e.key === "ArrowRight") nextCol = Math.min(maxCol, colIndex + 1);

    const nextInput = document.querySelector(`input[data-grid="${targetGrid}"][data-row="${nextRow}"][data-col="${nextCol}"]`);
    if (nextInput) { nextInput.focus(); setTimeout(() => nextInput.select(), 10); }
  };

  if (!displayedBH) return <div className="p-8 text-center text-slate-500 font-bold">Carregando Balanço Hídrico...</div>;

  return (
    <div className="space-y-8 animate-fadeIn print:space-y-0 print:m-0 print:p-0 bh-print-container">
      <div id="print-header" className="hidden print:flex w-full justify-between items-center text-xs font-bold border-b-2 border-black pb-2 mb-1 text-black">
        <span className="flex-1">PACIENTE: {currentPatient.nome?.toUpperCase() || "___________"}</span>
        <span className="w-20 text-center">IDADE: {calculateAge(currentPatient.dataNascimento) || "__"}a</span>
        <span className="w-20 text-center">LEITO: {currentPatient.leito}</span>
        <span className="w-24 text-right">DATA: {formatDateDDMM(displayedBH.date || getManausDateStr())}</span>
      </div>

      {/* ============================================================ */}
      {/* BANNERS DE ALERTA E DESTRAVAMENTO DE AUDITORIA               */}
      {/* ============================================================ */}
      
      {/* 1. Aviso de Histórico Bloqueado (Com botão de destravar) */}
      {isBHReadOnly && !isCurrentDay && !unlockedDates?.includes(selectedDate) && (
        <div className="bg-slate-100 border border-slate-300 text-slate-700 p-3 rounded-xl mb-4 text-sm font-bold flex flex-col md:flex-row items-center justify-between gap-3 print:hidden shadow-inner">
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-slate-500 shrink-0" />
            <span>VISUALIZANDO HISTÓRICO: O Balanço Hídrico de dias anteriores é apenas para leitura e auditoria.</span>
          </div>
          <button 
            onClick={() => setShowUnlockModal(true)} 
            className="bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shadow-sm"
          >
            <Unlock size={16} /> Liberar Edição
          </button>
        </div>
      )}
      
      {/* 2. Aviso de Histórico Destravado (Modo Auditoria) */}
      {unlockedDates?.includes(selectedDate) && (
        <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded-xl mb-4 text-sm font-bold flex flex-col md:flex-row items-center justify-between gap-3 print:hidden shadow-inner animate-pulse">
          <div className="flex items-center gap-3">
            <Unlock size={20} className="text-red-500 shrink-0" />
            <span>MODO DE AUDITORIA ATIVADO: O bloqueio foi removido. Edições neste balanço histórico estão sendo registradas no log de segurança da UTI.</span>
          </div>
          <button 
            onClick={handleLockHistoricalBH} 
            className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shadow-md"
            title="Trancar prontuário novamente"
          >
            <Lock size={16} /> Encerrar Edição
          </button>
        </div>
      )}

      {/* 3. Aviso de Plantão Atual Bloqueado (Expirou as 08h) */}
      {isBHReadOnly && isCurrentDay && (
        <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded-xl mb-4 text-sm font-bold flex items-center gap-3 print:hidden shadow-inner">
          <Clock size={20} className="text-red-500" />
          EDIÇÃO BLOQUEADA: O prazo regulamentar para edição (08:00) deste balanço já expirou. Acesso apenas para leitura.
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL DE JUSTIFICATIVA (A CAIXA PRETA)                       */}
      {/* ============================================================ */}
      {showUnlockModal && (
        <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border-t-8 border-red-600">
            <h3 className="text-xl font-black text-red-700 mb-2 flex items-center gap-2">
              <AlertTriangle size={24} /> Abertura de Prontuário Fechado
            </h3>
            <p className="text-sm text-slate-600 mb-4 font-medium">
              Você está solicitando a edição de um Balanço Hídrico arquivado ({formatDateDDMM(selectedDate)}). Esta ação exige justificativa legal e ficará gravada no log permanente da UTI.
            </p>
            
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Justificativa da Edição Retrospectiva:</label>
            <textarea
              className="w-full border border-slate-300 rounded-xl p-3 h-28 outline-none focus:ring-2 focus:ring-red-500 text-sm bg-slate-50"
              placeholder="Descreva o motivo detalhadamente. Ex: Correção de volume de diurese das 04h00 do plantão noturno..."
              value={unlockReason}
              onChange={e => setUnlockReason(e.target.value)}
            />
            
            <div className="flex justify-end gap-3 mt-5">
              <button 
                onClick={() => { setShowUnlockModal(false); setUnlockReason(""); }} 
                className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if(unlockReason.trim().length < 10) return alert("A justificativa deve conter pelo menos 10 caracteres.");
                  handleUnlockHistoricalBH(selectedDate, unlockReason);
                  setShowUnlockModal(false);
                  setUnlockReason("");
                }}
                className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-md transition-colors flex items-center gap-2"
              >
                <Unlock size={18} /> Confirmar Abertura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHECK DE IDENTIFICAÇÃO DO PACIENTE */}
      <div className={`p-4 rounded-xl border transition-all duration-300 flex items-center justify-between shadow-sm print:hidden mb-6 ${
          currentPatient.enfermagem?.identificacaoCorreta ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'
        }`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl transition-colors hidden sm:flex ${currentPatient.enfermagem?.identificacaoCorreta ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
            <UserCheck size={24} />
          </div>
          <div>
            <h4 className={`text-sm font-bold ${currentPatient.enfermagem?.identificacaoCorreta ? 'text-emerald-800' : 'text-slate-700'}`}>Identificação Correta do Paciente</h4>
            <p className="text-xs text-slate-500 mt-1 pr-2">Confirmo que o paciente possui pulseira e placa no leito com os dados corretos.</p>
          </div>
        </div>
        
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input 
            type="checkbox" className="sr-only peer" checked={!!currentPatient.enfermagem?.identificacaoCorreta} disabled={!isEditable}
            onChange={async (e) => {
              const novoValor = e.target.checked;
              updateNested("enfermagem", "identificacaoCorreta", novoValor);
              try {
                let idBruto = currentPatient.id !== undefined ? currentPatient.id : currentPatient.leito;
                const apenasNumero = String(idBruto).replace(/bed_/g, "");
                const docId = `bed_${apenasNumero === "0" ? "1" : apenasNumero}`;
                await updateDoc(doc(db, "leitos_uti", docId), { "enfermagem.identificacaoCorreta": novoValor });

                // =========================================================================
                // 💡 AUDITORIA GLOBAL: Registo do Check de Identificação
                // =========================================================================
                if (typeof registrarLogAuditoria === "function") {
                  registrarLogAuditoria(
                    "SEGURANÇA: IDENTIFICAÇÃO DO PACIENTE", 
                    `Status de identificação alterado para: ${novoValor ? "Confirmada (Pulseira/Placa)" : "Pendente/Incorreta"}`, 
                    `Leito ${apenasNumero === "0" ? "1" : apenasNumero}`, 
                    currentPatient.nome
                  );
                }

              } catch (error) { console.error("Erro crítico ao salvar identificação:", error); }
            }}
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 disabled:opacity-50"></div>
        </label>
      </div>

      {/* ========================================================================= */}
      {/* NOVO BLOCO: REGISTROS DIÁRIOS (BOTÕES DE ACESSO RÁPIDO) - RETRÁTIL        */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 print:hidden animate-fadeIn">
        
        {/* BOTÃO QUE ABRE/FECHA A SEÇÃO */}
        <button 
          onClick={(e) => { e.preventDefault(); setRegistrosOpen(!registrosOpen); }} 
          className="flex items-center gap-2 font-bold text-slate-700 w-full text-left"
        >
          {registrosOpen ? <ChevronDown size={20} className="text-indigo-600" /> : <ChevronRight size={20} className="text-slate-400" />} 
          <ClipboardList className={registrosOpen ? "text-indigo-600" : "text-slate-400"} size={18} />
          Registros Diários
        </button>
        
        {/* CONTEÚDO QUE APARECE QUANDO ESTÁ ABERTO */}
        {registrosOpen && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            <button 
              onClick={(e) => {
                e.preventDefault();
                const horaAtual = getHoraAtualArredondada();
                setModalDieta({ isOpen: true, step: 1, horario: horaAtual, refeicao: "", tipos: { solida: false, liquida: false }, consumo: { solida: null, liquida: null } });
              }}
              className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all text-slate-600 hover:text-indigo-700 hover:shadow-sm group"
            >
              <Utensils size={22} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <span className="text-[10px] font-bold uppercase text-center">Dieta VO</span>
            </button>
            
            <button 
              onClick={(e) => {
                e.preventDefault();
                const horaAtual = getHoraAtualArredondada();
                setModalBanho({ isOpen: true, horario: horaAtual, tipo: "" });
              }}
              className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all text-slate-600 hover:text-indigo-700 hover:shadow-sm group"
            >
              <ShowerHead size={22} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <span className="text-[10px] font-bold uppercase text-center">Banho</span>
            </button>
            
            <button 
              onClick={(e) => {
                e.preventDefault();
                const horaAtual = getHoraAtualArredondada();
                setModalDecubito({ isOpen: true, horario: horaAtual, posicao: "" });
              }}
              className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all text-slate-600 hover:text-indigo-700 hover:shadow-sm group"
            >
              <RefreshCw size={22} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <span className="text-[10px] font-bold uppercase text-center">Decúbito</span>
            </button>
            
            <button 
              onClick={(e) => {
                e.preventDefault();
                const horaAtual = getHoraAtualArredondada();
                setModalHigieneOral({ isOpen: true, horario: horaAtual });
              }}
              className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all text-slate-600 hover:text-indigo-700 hover:shadow-sm group"
            >
              <Smile size={22} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <span className="text-[10px] font-bold uppercase text-center">Higiene Oral</span>
            </button>
            
            <button 
              onClick={(e) => {
                e.preventDefault();
                const horaAtual = getHoraAtualArredondada();
                setModalHigieneIntima({ isOpen: true, horario: horaAtual });
              }}
              className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all text-slate-600 hover:text-indigo-700 hover:shadow-sm group"
            >
              <ShieldPlus size={22} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <span className="text-[10px] font-bold uppercase text-center">Higiene Íntima</span>
            </button>
            
            <button 
              onClick={(e) => {
                e.preventDefault();
                const horaAtual = getHoraAtualArredondada();
                setModalCurativo({ isOpen: true, horario: horaAtual, tipo: "", localizacao: "" });
              }}
              className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all text-slate-600 hover:text-indigo-700 hover:shadow-sm group"
            >
              <Bandage size={22} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <span className="text-[10px] font-bold uppercase text-center">Curativo</span>
            </button>
            
            <button 
              onClick={(e) => {
                e.preventDefault();
                const horaAtual = getHoraAtualArredondada();
                setModalAspiracao({ isOpen: true, horario: horaAtual, quantidade: "", caracteristica: "" });
              }}
              className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all text-slate-600 hover:text-indigo-700 hover:shadow-sm group"
            >
              <Wind size={22} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <span className="text-[10px] font-bold uppercase text-center">Aspiração VAS</span>
            </button>
            
            <button 
              onClick={(e) => {
                e.preventDefault();
                const horaAtual = getHoraAtualArredondada();
                setModalFralda({ isOpen: true, horario: horaAtual, evacuacao: null, diarreica: false, quantidade: "" });
              }}
              className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all text-slate-600 hover:text-indigo-700 hover:shadow-sm group"
            >
              <Package size={22} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <span className="text-[10px] font-bold uppercase text-center">Troca de Fralda</span>
            </button>

            <button 
              onClick={(e) => { e.preventDefault(); setModalAcesso({ isOpen: true, horario: getHoraAtualArredondada(), local: "", calibre: "" }); }}
              className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all text-slate-600 hover:text-indigo-700 hover:shadow-sm group"
            >
              <Syringe size={22} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <span className="text-[10px] font-bold uppercase text-center">Acesso Periférico</span>
            </button>

            <button 
              onClick={(e) => { e.preventDefault(); setModalTricotomia({ isOpen: true, horario: getHoraAtualArredondada(), local: "" }); }}
              className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all text-slate-600 hover:text-indigo-700 hover:shadow-sm group"
            >
              <Scissors size={22} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <span className="text-[10px] font-bold uppercase text-center">Tricotomia</span>
            </button>

            <button 
              onClick={(e) => { e.preventDefault(); setModalCrioterapia({ isOpen: true, horario: getHoraAtualArredondada() }); }}
              className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all text-slate-600 hover:text-indigo-700 hover:shadow-sm group"
            >
              <Snowflake size={22} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <span className="text-[10px] font-bold uppercase text-center">Crioterapia</span>
            </button>

            <button 
              onClick={(e) => { e.preventDefault(); setModalInsulina({ isOpen: true, horario: getHoraAtualArredondada(), tipo: "", dose: "" }); }}
              className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all text-slate-600 hover:text-indigo-700 hover:shadow-sm group"
            >
              <TestTube size={22} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <span className="text-[10px] font-bold uppercase text-center">Insulina</span>
            </button>

            {/* --- NOVOS BOTÕES: CVC e SVD --- */}
            <button 
              onClick={(e) => {
                e.preventDefault();
                setShowCVCModal({ isOpen: true, step: 1, horario: getHoraAtualArredondada(), tipoCateter: "", localInserção: "", indicacao: "", passagem: "", puncaoUnica: false, quantasPuncoes: "", dificuldades: "", motivoTroca: "", observacao: "", barreiras: null });
              }}
              className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all text-slate-600 hover:text-indigo-700 hover:shadow-sm group"
            >
              <Syringe size={22} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <span className="text-[10px] font-bold uppercase text-center">Inserção CVC</span>
            </button>

            <button 
              onClick={(e) => {
                e.preventDefault();
                setShowSVDModal({ isOpen: true, step: 1, horario: getHoraAtualArredondada(), indicacao: "", justificativa: "", genero: "", itens: {}, observacao: "" });
              }}
              className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all text-slate-600 hover:text-indigo-700 hover:shadow-sm group"
            >
              <Droplets size={22} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <span className="text-[10px] font-bold uppercase text-center">Inserção SVD</span>
            </button>

          </div>
        )}
      </div>
      {/* ========================================================================= */}

      {/* CABEÇALHO COM SELETOR DE DATAS */}
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4 mb-2 print:hidden bg-blue-50/50 p-4 rounded-xl border border-blue-100">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Droplets className="text-blue-600" /> 
          Controle Hídrico e Vital
        </h3>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-bold text-blue-800 uppercase bg-blue-100 px-2 py-1 rounded">Data do Plantão:</label>
          <select
            value={selectedDate || ""}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg text-sm font-bold bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm min-w-[140px]"
          >
            {allBHDates.length === 0 && <option value="">Sem registros</option>}
            {allBHDates.map(date => (
              <option key={date} value={date}>
                {formatDateDDMM(date)} {date === currentPatient.bh?.date ? " (Plantão Atual)" : ""}
              </option>
            ))}
          </select>
          
          <button onClick={handleCustomPrintBH} className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors ml-auto md:ml-0">
            <Printer size={16} /> Imprimir Relatório
          </button>
        </div>
      </div>

      <fieldset disabled={isBHReadOnly} className="min-w-0 border-0 p-0 m-0 space-y-4">
        <div className="flex items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl print:hidden">
          <div className="flex items-center gap-1 md:gap-2">
            <Scale size={16} className="text-slate-400 hidden sm:block" />
            <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Peso (kg):</span>
            <input 
              type="text" 
              value={currentPatient.nutri?.peso || ""} 
              disabled 
              className="w-14 md:w-20 p-1 border rounded text-center text-[10px] md:text-sm font-bold bg-gray-100 text-gray-500" 
              placeholder="---" 
            />
          </div>
          <div className="flex items-center text-[10px] md:text-xs font-bold text-slate-500 whitespace-nowrap flex-shrink-0">
            PI Total: 
            <input 
              type="text" 
              value={
                (displayedBH?.insensibleLoss && displayedBH.insensibleLoss !== 0 && displayedBH.insensibleLoss !== "0")
                  ? displayedBH.insensibleLoss
                  : (parseFloat(String(currentPatient.nutri?.peso || "0").replace(",", ".")) > 0 
                      ? Math.round(parseFloat(String(currentPatient.nutri?.peso).replace(",", ".")) * 12) 
                      : "")
              }
              onChange={(e) => updateNested("bh", "insensibleLoss", e.target.value)} 
              onBlur={() => handleBlurSave("BH: Alterou manualmente a Perda Insensível (PI)")}
              title="Calculado automaticamente (Peso x 12). Digite para substituir em caso de febre/sudorese."
              className="w-12 md:w-16 p-1 border rounded text-center ml-1 md:ml-2 bg-white text-slate-800 outline-none focus:ring-2 focus:ring-blue-200" 
            /> ml
          </div>
        </div>

        <div>
          <div className="overflow-x-auto border rounded-xl print:overflow-visible print:border-none print:w-full">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="bg-blue-600 text-white print:bg-gray-300 print:text-black">
                  <th className="p-2 text-left min-w-[120px] sticky left-0 z-10 bg-blue-600 print:bg-gray-300 print:p-1">ITEM</th>
                  {BH_HOURS.map((h) => <th key={h} className="p-1 min-w-[25px] border-l border-blue-500 print:border-black">{h.split(":")[0]}</th>)}
                  <th className="p-2 min-w-[40px] bg-blue-700 print:bg-gray-400 print:border-black print:border-l">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-green-50 print:bg-white">
                  <td colSpan={26} className="text-left p-1 font-bold text-green-700 sticky left-0 bg-green-50 print:bg-white print:text-black border border-black">
                    GANHOS (+)
                  </td>
                </tr>
                  {currentGains.map((item, rowIndex) => {
                  let rowTotal = 0;
                  
                  // 🔥 NOVO: Estado inicial da cor para esta linha (começa preto)
                  let currentNoraState = false; 
                  const isNoraRow = item.toLowerCase().includes("nora");
                  
                  // Pega a data do plantão atual para ler o histórico correto
                  const bhDate = displayedBH?.date || getManausDateStr(); 
                  const noraHistory = currentPatient.sofa_data_technical?.noraDoseHistory?.[bhDate] || {};

                  BH_HOURS.forEach((h) => (rowTotal += safeNumber(displayedBH.gains[h]?.[item])));
                  return (
                    <tr key={item} className="hover:bg-slate-200 transition-colors group border-b print:border-black">
                      <td className="p-1 text-left font-medium text-slate-600 sticky left-0 bg-white group-hover:bg-slate-200 transition-colors border-r print:border-black print:text-black">
                        <div className="flex justify-between items-center">
                          <span>{item}</span>
                          {displayedBH.customGains?.includes(item) && isEditable && !viewingPreviousBH && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                if (window.confirm(`Excluir a linha de ganho "${item}"?`)) {
                                  const up = [...patients];
                                  up[activeTab].bh.customGains = up[activeTab].bh.customGains.filter((g) => g !== item);
                                  if (up[activeTab].bh.gains) {
                                    Object.keys(up[activeTab].bh.gains).forEach((hour) => {
                                      if (up[activeTab].bh.gains[hour]) delete up[activeTab].bh.gains[hour][item];
                                    });
                                  }
                                  setPatients(up);
                                  save(up[activeTab], `BH: Excluiu linha customizada de Ganho (${item})`);
                                }
                              }}
                              className="text-slate-400 hover:text-red-500 print:hidden" title="Excluir Ganho"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                      {BH_HOURS.map((h, colIndex) => {
                        
                        // 🔥 NOVO: Se houver um registro de mudança de dose NESTA hora, atualiza a cor daqui pra frente!
                        if (isNoraRow && noraHistory[h] !== undefined) {
                          currentNoraState = noraHistory[h];
                        }

                        // Só pinta de vermelho se for Nora, se o estado atual for dobrado, e se a célula não estiver vazia
                        const hasValue = displayedBH.gains[h]?.[item];
                        const textClass = (isNoraRow && currentNoraState && hasValue) ? "text-red-600 font-bold" : "";

                        return (
                          <td key={h} className="p-0 border-r border-slate-100 print:border-black print:overflow-visible">
                            <input
                              type="text"
                              data-grid="gains" data-row={rowIndex} data-col={colIndex}
                              className={`w-full h-full text-center outline-none bg-transparent focus:bg-blue-50 p-0.5 print:hidden ${textClass}`}
                              value={displayedBH.gains[h]?.[item] || ""}
                              onKeyDown={(e) => handleGridKeyDown(e, "gains", rowIndex, colIndex, currentGains.length - 1, numCols)}
                              onChange={(e) => handleValidatedChange(h, "gains", item, e)}
                              onBlur={(e) => {
                                checkMinLimitOnBlur(h, "gains", item, e);
                                const val = e.target.value;
                                const newVal = parseFloat(val.replace(',', '.')) || 0;
                                const isNora = item.toLowerCase().includes("nora");
                                const todayStr = getManausDateStr();
                                const modalAlreadyShownToday = currentPatient.sofa_data_technical?.noraModalShown_date === todayStr;
                                const hourIndex = BH_HOURS.indexOf(h);
                                const prevHour = hourIndex > 0 ? BH_HOURS[hourIndex - 1] : null;
                                const prevRate = prevHour ? parseFloat((displayedBH.gains[prevHour]?.[item] || "0").replace(',', '.')) : 0;
                                const isFirstTime = !modalAlreadyShownToday && val && val !== "0";
                                const isSignificantDrop = prevRate > 0 && newVal > 0 && newVal <= (prevRate * 0.5);
                                const isSignificantIncrease = prevRate > 0 && newVal > 0 && newVal >= (prevRate * 1.3);
                                if (isNora && !viewingPreviousBH && (isFirstTime || isSignificantDrop || isSignificantIncrease)) {
                                  setCurrentNoraHour(h);
                                  setCurrentNoraRate(val);
                                  setShowNoraModal(true);
                                }
                              }}
                            />
                            <span className={`hidden print:block text-center text-[8px] w-full align-middle ${textClass}`}>
                              {displayedBH.gains[h]?.[item] || ""}
                            </span>
                          </td>
                        );
                      })}
                      <td className="font-bold text-slate-700 bg-slate-50 print:bg-white print:text-black print:border-black text-[9px]">{rowTotal || ""}</td>
                    </tr>
                  );
                })}
                {isEditable && !viewingPreviousBH && (
                  <tr className="print:hidden">
                    <td colSpan={26} className="text-left sticky left-0 bg-white border-r print:border-black border-b p-1">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const n = prompt("Nome do novo ganho:");
                          if (n && n.trim()) {
                            const up = [...patients];
                            if (!up[activeTab].bh.customGains) up[activeTab].bh.customGains = [];
                            if (!up[activeTab].bh.customGains.includes(n.trim()) && !BH_GAINS.includes(n.trim())) {
                              up[activeTab].bh.customGains.push(n.trim());
                              setPatients(up);
                              save(up[activeTab], `BH: Adicionou nova linha customizada de Ganho (${n.trim()})`);
                            }
                          }
                        }}
                        className="text-blue-600 hover:text-blue-800 font-bold text-[10px] flex items-center gap-1 w-full p-1" title="Adicionar Linha de Ganho"
                      >
                        <PlusCircle size={14} /> Adicionar Ganho
                      </button>
                    </td>
                  </tr>
                )}
                <tr className="bg-slate-200 text-slate-600 print:hidden text-[10px] font-bold border-y-4 border-white">
                  <th className="p-1 text-left sticky left-0 z-10 bg-slate-200 border-r border-slate-300">HORÁRIO</th>
                  {BH_HOURS.map((h) => <th key={h} className="p-1 min-w-[25px] border-r border-slate-300">{h.split(":")[0]}</th>)}
                  <th className="p-1 min-w-[40px] bg-slate-300">TOTAL</th>
                </tr>

                <tr className="bg-red-50 print:bg-white">
                  <td colSpan={26} className="text-left p-1 font-bold text-red-700 sticky left-0 bg-red-50 print:bg-white print:text-black border border-black">
                    PERDAS (-)
                  </td>
                </tr>
                {currentLosses.map((item, rowIndex) => {
                  let rowTotal = 0;
                  BH_HOURS.forEach((h) => (rowTotal += safeNumber(displayedBH.losses[h]?.[item])));
                  let displayTotal = rowTotal;
                  if (item === "Diurese") {
                    let totalIrrigation = 0;
                    if (displayedBH.irrigation) Object.values(displayedBH.irrigation).forEach((val) => (totalIrrigation += safeNumber(val)));
                    displayTotal = rowTotal - totalIrrigation;
                  }
                  return (
                    <tr key={item} className="hover:bg-slate-200 transition-colors group border-b print:border-black">
                      <td className="p-1 text-left font-medium text-slate-600 sticky left-0 bg-white group-hover:bg-slate-200 transition-colors border-r print:border-black print:text-black">
                        <div className="flex justify-between items-center">
                          <span>{item}</span>
                          {displayedBH.customLosses?.includes(item) && isEditable && !viewingPreviousBH && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                if (window.confirm(`Excluir a linha de perda "${item}"?`)) {
                                  const up = [...patients];
                                  up[activeTab].bh.customLosses = up[activeTab].bh.customLosses.filter((g) => g !== item);
                                  if (up[activeTab].bh.losses) {
                                    Object.keys(up[activeTab].bh.losses).forEach((hour) => {
                                      if (up[activeTab].bh.losses[hour]) delete up[activeTab].bh.losses[hour][item];
                                    });
                                  }
                                  setPatients(up);
                                  save(up[activeTab], `BH: Excluiu linha customizada de Perda (${item})`);
                                }
                              }}
                              className="text-slate-400 hover:text-red-500 print:hidden" title="Excluir Perda"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                      {BH_HOURS.map((h, colIndex) => (
                        <td key={h} className="p-0 border-r border-slate-100 print:border-black print:overflow-visible">
                          <input 
                            type="text" 
                            data-grid="losses" data-row={rowIndex} data-col={colIndex}
                            className="w-full h-full text-center outline-none bg-transparent focus:bg-blue-50 p-0.5 print:hidden" 
                            value={displayedBH.losses[h]?.[item] || ""} 
                            onKeyDown={(e) => handleGridKeyDown(e, "losses", rowIndex, colIndex, currentLosses.length - 1, numCols)}
                            onChange={(e) => handleValidatedChange(h, "losses", item, e)} 
                            onBlur={(e) => checkMinLimitOnBlur(h, "losses", item, e)} 
                          />
                          <span className="hidden print:block text-center text-[8px] w-full align-middle">{displayedBH.losses[h]?.[item] || ""}</span>
                        </td>
                      ))}
                      <td className="font-bold text-slate-700 bg-slate-50 print:bg-white print:text-black print:border-black text-[9px]">{displayTotal || ""}</td>
                    </tr>
                  );
                })}
                {isEditable && !viewingPreviousBH && (
                  <tr className="print:hidden">
                    <td colSpan={26} className="text-left sticky left-0 bg-white border-r print:border-black border-b p-1">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const n = prompt("Nome da nova perda:");
                          if (n && n.trim()) {
                            const up = [...patients];
                            if (!up[activeTab].bh.customLosses) up[activeTab].bh.customLosses = [];
                            if (!up[activeTab].bh.customLosses.includes(n.trim()) && !BH_LOSSES.includes(n.trim())) {
                              up[activeTab].bh.customLosses.push(n.trim());
                              setPatients(up);
                              save(up[activeTab], `BH: Adicionou nova linha customizada de Perda (${n.trim()})`);
                            }
                          }
                        }}
                        className="text-red-600 hover:text-red-800 font-bold text-[10px] flex items-center gap-1 w-full p-1" title="Adicionar Linha de Perda"
                      >
                        <PlusCircle size={14} /> Adicionar Perda
                      </button>
                    </td>
                  </tr>
                )}
                <tr className="bg-yellow-50/50 hover:bg-slate-200 transition-colors group border-t-2 border-slate-200 print:bg-white print:border-black">
                  <td className="p-1 text-left font-bold text-slate-500 sticky left-0 bg-white group-hover:bg-slate-200 transition-colors border-r print:border-black print:text-black">
                    Irrigação Vesical
                  </td>
                  {BH_HOURS.map((h, colIndex) => (
                    <td key={h} className="p-0 border-r border-slate-100 print:border-black print:overflow-visible">
                      <input 
                        type="text" 
                        data-grid="irrig" data-row={0} data-col={colIndex}
                        className="w-full h-full text-center outline-none bg-transparent focus:bg-yellow-50 p-0.5 text-slate-400 print:hidden" 
                        placeholder="Vol" 
                        value={displayedBH.irrigation?.[h] || ""} 
                        onKeyDown={(e) => handleGridKeyDown(e, "irrig", 0, colIndex, 0, numCols)}
                        onChange={(e) => updateBH(h, "irrigation", null, e.target.value)} 
                        onBlur={() => handleBlurSave(`BH: Editou Irrigação Vesical às ${h}h`)}
                      />
                      <span className="hidden print:block text-center text-[8px] w-full text-black align-middle">{displayedBH.irrigation?.[h] || ""}</span>
                    </td>
                  ))}
                  <td className="font-bold text-slate-700 bg-slate-50 print:bg-white print:text-black print:border-black text-[9px]">
                    {Object.values(displayedBH.irrigation || {}).reduce((a, b) => a + safeNumber(b), 0) || ""}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 print:flex print:justify-between gap-4 p-4 print:p-0 print:pt-2 bg-slate-100 print:bg-white rounded-xl border border-slate-200 print:border-none mt-4 print:mt-1">
            <div className="print:text-center">
              <p className="text-[10px] text-slate-500 print:text-black font-bold uppercase">Total Ganhos</p>
              <p className="text-xl font-bold text-green-600 print:text-black">+{Math.round(bhTotals.totalGains || 0)}</p>
            </div>
            <div className="print:text-center">
              <p className="text-[10px] text-slate-500 print:text-black font-bold uppercase">Total Perdas (+PI)</p>
              <p className="text-xl font-bold text-red-600 print:text-black">-{Math.round((bhTotals.totalLosses || 0) + safeNumber(displayedBH.insensibleLoss))}</p>
            </div>
            <div className="bg-white p-2 print:p-0 rounded-lg border border-slate-300 print:border-none print:text-center">
              <p className="text-[10px] text-slate-500 print:text-black font-bold uppercase">Balanço 24h</p>
              <p className={`text-xl font-bold ${Math.round(bhTotals.dailyBalance || 0) >= 0 ? "text-blue-600 print:text-black" : "text-orange-600 print:text-black"}`}>
                {Math.round(bhTotals.dailyBalance || 0) > 0 ? "+" : ""}
                {Math.round(bhTotals.dailyBalance || 0)}
              </p>
            </div>
            <div className="bg-slate-800 p-2 rounded-lg text-white print:text-black print:bg-white flex flex-col justify-between print:text-center">
              <div className="flex justify-between print:justify-center items-center mb-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase print:text-black">BH Ant.</p>
                <input 
                  type="text" 
                  value={displayedBH.accumulated || ""} 
                  onChange={(e) => updateNested("bh", "accumulated", e.target.value)} 
                  onBlur={() => handleBlurSave("BH: Editou o Saldo do Balanço Anterior (BH Ant.)")}
                  className="w-12 bg-slate-700 text-white text-xs text-center rounded outline-none border border-slate-600 print:hidden focus:ring-1 focus:ring-blue-400 ml-1" 
                />
                <span className="hidden print:inline text-[10px] font-bold ml-1">: {displayedBH.accumulated || 0}</span>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase print:text-black">Total Atual</p>
                <p className="text-xl font-bold">
                  {Math.round(bhTotals.accumulated || 0) > 0 ? "+" : ""}
                  {Math.round(bhTotals.accumulated || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </fieldset>

      <div className="mt-8 print:mt-0 print:pt-0">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2 print:hidden">
          <Activity className="text-red-500" /> Sinais Vitais
        </h3>
        
        <fieldset disabled={isBHReadOnly} className="overflow-x-auto border rounded-xl print:border-none print:overflow-visible min-w-0 border-0 p-0 m-0 print:w-full print:block">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-slate-200 print:bg-gray-300 print:text-black">
                <th className="p-2 text-left min-w-[100px] sticky left-0 z-10 bg-slate-200 print:bg-gray-300 print:p-1">PARÂMETRO</th>
                {BH_HOURS.map((h) => <th key={h} className="p-1 min-w-[25px] border-l border-slate-300 print:border-black">{h.split(":")[0]}</th>)}
              </tr>
            </thead>
            <tbody>
              {currentVitals.map((param, rowIndex) => (
                <tr key={param} className="border-b last:border-0 hover:bg-slate-200 transition-colors group print:border-black">
                  <td className="p-2 text-left font-medium sticky left-0 bg-white group-hover:bg-slate-200 transition-colors border-r print:border-black print:text-black">{param}</td>
                  {BH_HOURS.map((h, colIndex) => {
                    const val = displayedBH.vitals[h]?.[param] || "";
                    const numVal = safeNumber(val);
                    let isRed = false;
                    if (val !== "") {
                      if (param === "Temp (ºC)" && numVal >= 38) isRed = true;
                      if (param === "FC (bpm)" && (numVal > 100 || numVal < 60)) isRed = true;
                      if (param === "PAM" && numVal < 65) isRed = true;
                      if (param === "SpO2 (%)" && numVal < 90) isRed = true;
                      if (param === "HGT (mg/dL)" && (numVal > 180 || numVal < 70)) isRed = true;
                    }
                    return (
                      <td key={h} className="p-0 border-r border-slate-100 print:border-black print:overflow-visible">
                        <input 
                          type="text" 
                          data-grid="vitals" data-row={rowIndex} data-col={colIndex}
                          className={`w-full h-full text-center outline-none bg-transparent focus:bg-blue-50 p-0.5 print:hidden ${isRed ? "text-red-600 font-bold" : ""}`} 
                          value={val} 
                          onKeyDown={(e) => handleGridKeyDown(e, "vitals", rowIndex, colIndex, currentVitals.length - 1, numCols)}
                          onChange={(e) => handleValidatedChange(h, "vitals", param, e)} 
                          onBlur={(e) => checkMinLimitOnBlur(h, "vitals", param, e)} 
                        />
                        <span className={`hidden print:block text-center text-[8px] w-full align-middle print:text-black ${isRed ? "font-bold" : ""}`}>
                          {val}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </fieldset>
      </div>

      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg shadow-sm print:hidden print:m-0 print:p-0 mt-6">
        <h4 className="text-sm font-black text-amber-800 flex items-center gap-2 mb-2 uppercase tracking-wide">
          <ShieldAlert size={18} className="text-amber-600" />
          Segurança de Deglutição
        </h4>
        
        <div className="flex flex-col md:flex-row gap-6 mt-3 bg-white p-3 rounded border border-amber-200">
          <div className="flex-1 flex flex-col justify-center">
            <span className="text-[10px] text-amber-600 font-bold uppercase block mb-1">Consistência Alimentar Liberada:</span>
            <span className="text-sm font-black text-slate-800 uppercase">
              {currentPatient.fono?.consistencia || "Aguardando avaliação / Dieta Zero"}
            </span>
          </div>
          
          <div className="flex-1 border-t md:border-t-0 md:border-l border-amber-100 md:pl-6 pt-3 md:pt-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-amber-600 font-bold uppercase block mb-2 w-full">Água Via Oral (VO):</span>
            
            {currentPatient.fono?.toleraAgua === "Sim" || currentPatient.fono?.toleraAgua === true ? (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded border border-emerald-300">
                  <CheckCircle size={14} /> LIBERADA
                </span>
                {currentPatient.fono?.utensilioAgua && (
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                    Via: {currentPatient.fono.utensilioAgua}
                  </span>
                )}
              </div>
            ) : currentPatient.fono?.toleraAgua === "Não" || currentPatient.fono?.toleraAgua === false ? (
              <span className="inline-flex items-center justify-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-black rounded border border-red-300">
                <X size={14} /> SUSPENSA
              </span>
            ) : (
              <span className="inline-flex items-center justify-center gap-1 px-2 py-1 bg-slate-100 text-slate-500 text-xs font-black rounded border border-slate-300">
                <Clock size={14} /> AGUARDANDO AVALIAÇÃO
              </span>
            )}
          </div>
        </div>
      </div>

      <fieldset disabled={!isEditable} className="mt-6 print:hidden print:m-0 print:p-0 min-w-0 border-0 p-0 m-0">
        <div className="p-4 bg-white border rounded-xl shadow-sm">
          <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Edit3 size={16} className="text-slate-400" /> Anotações da Equipe Técnica</h4>
          <textarea 
            className="w-full p-3 border rounded-lg h-32 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50 focus:bg-white transition-colors" 
            placeholder="Registros do plantão, intercorrências, observações gerais..." 
            value={currentPatient.enfermagem?.anotacoes_tech || ""} 
            onChange={(e) => updateNested("enfermagem", "anotacoes_tech", e.target.value)} 
            onBlur={() => handleBlurSave("Equipe Técnica: Editou as Anotações Gerais")}
          />
        </div>

        {/* 🔥 NOVO BOTÃO DE GERAR RELATÓRIO */}
        <div className="mt-4 flex justify-end">
          <button 
            onClick={(e) => { e.preventDefault(); gerarRelatorioEnfermagem(); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-black uppercase tracking-wide transition-all shadow-md hover:shadow-lg"
          >
            <FileText size={20} />
            Gerar Anotação de Enfermagem
          </button>
        </div>

      {/* ========================================================================= */}
      {/* MODAL: REGISTRO DE DIETA VO (2 ETAPAS)                                    */}
      {/* ========================================================================= */}
      {modalDieta.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-indigo-500/20">
            
            {/* CABEÇALHO */}
            <div className="bg-indigo-600 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Utensils size={20} /></div>
                <div>
                  <h2 className="text-lg font-black tracking-wide leading-tight">Registro de Dieta VO</h2>
                  <p className="text-indigo-200 text-xs font-medium">Passo {modalDieta.step} de 2</p>
                </div>
              </div>
              <button onClick={() => setModalDieta({ ...modalDieta, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 bg-slate-50">
              
              {/* ETAPA 1: DETALHES E O QUE FOI OFERECIDO? */}
              {modalDieta.step === 1 && (
                <div className="animate-fadeIn">
                  
                  {/* NOVOS CAMPOS: HORÁRIO E TIPO */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1 block">Horário da Oferta</label>
                      <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  
                  {/* SELECT DE HORAS (00 a 23) */}
                  <select 
                    className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer"
                    value={modalDieta.horario ? modalDieta.horario.split(':')[0] : "00"}
                    onChange={(e) => setModalDieta({ ...modalDieta, horario: `${e.target.value}:${modalDieta.horario ? modalDieta.horario.split(':')[1] : '00'}` })}
                  >
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => (
                      <option key={h} value={h}>{h}h</option>
                    ))}
                  </select>
                  
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  
                  {/* SELECT DE MINUTOS (Restrito a 4 opções) */}
                  <select 
                    className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer"
                    value={modalDieta.horario ? modalDieta.horario.split(':')[1] : "00"}
                    onChange={(e) => setModalDieta({ ...modalDieta, horario: `${modalDieta.horario ? modalDieta.horario.split(':')[0] : '00'}:${e.target.value}` })}
                  >
                    <option value="00">00</option>
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="45">45</option>
                  </select>

                </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1 block">Tipo de Refeição</label>
                      <select 
                        className="w-full p-3 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-bold"
                        value={modalDieta.refeicao}
                        onChange={(e) => setModalDieta({ ...modalDieta, refeicao: e.target.value })}
                      >
                        <option value="">Selecione...</option>
                        <option value="Café da Manhã">Café da Manhã</option>
                        <option value="Almoço">Almoço</option>
                        <option value="Lanche">Lanche</option>
                        <option value="Janta">Janta</option>
                        <option value="Ceia">Ceia</option>
                        <option value="Suplemento">Suplemento</option>
                      </select>
                    </div>
                  </div>

                  <h3 className="text-center text-slate-700 font-bold mb-4 border-t border-slate-100 pt-4">O que foi oferecido?</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <button 
                      onClick={() => setModalDieta({ ...modalDieta, tipos: { ...modalDieta.tipos, solida: !modalDieta.tipos.solida } })}
                      className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all ${modalDieta.tipos.solida ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md' : 'border-slate-200 bg-white text-slate-400 hover:border-indigo-200'}`}
                    >
                      <Utensils size={32} />
                      <span className="font-black uppercase text-sm">Dieta Sólida</span>
                    </button>

                    <button 
                      onClick={() => setModalDieta({ ...modalDieta, tipos: { ...modalDieta.tipos, liquida: !modalDieta.tipos.liquida } })}
                      className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all ${modalDieta.tipos.liquida ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md' : 'border-slate-200 bg-white text-slate-400 hover:border-indigo-200'}`}
                    >
                      <Coffee size={32} />
                      <span className="font-black uppercase text-sm">Dieta Líquida</span>
                    </button>
                  </div>

                  <button 
                    // O botão só libera se preencher o horário, a refeição E escolher pelo menos um tipo de dieta
                    disabled={!modalDieta.refeicao || !modalDieta.horario || (!modalDieta.tipos.solida && !modalDieta.tipos.liquida)}
                    onClick={() => setModalDieta({ ...modalDieta, step: 2 })}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"
                  >
                    Avançar para Consumo <ArrowRight size={18} />
                  </button>
                </div>
              )}

              {/* ETAPA 2: QUANTO SOBROU? */}
              {modalDieta.step === 2 && (
                <div className="animate-fadeIn space-y-6">
                  <h3 className="text-center text-slate-700 font-black mb-2 text-lg">Quanto sobrou no prato/copo?</h3>

                  {/* SELETOR SÓLIDA (PRATO VISUAL) */}
                  {modalDieta.tipos.solida && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2 text-orange-700 font-black mb-4 border-b border-slate-100 pb-2">
                        <Utensils size={16} /> DIETA SÓLIDA (Prato)
                      </div>
                      <div className="flex justify-between gap-2">
                        {[
                          // val = % consumida (salva no banco) | fill = % que sobrou (desenho na tela)
                          { val: 0, label: '100%', desc: 'Tudo (Recusou)', fill: 100 },
                          { val: 25, label: '75%', desc: 'Sobrou 3/4', fill: 75 },
                          { val: 50, label: '50%', desc: 'Metade', fill: 50 },
                          { val: 75, label: '25%', desc: 'Sobrou 1/4', fill: 25 },
                          { val: 100, label: '0%', desc: 'Nada (Comeu tudo)', fill: 0 }
                        ].map(opt => {
                          const isSelected = modalDieta.consumo.solida === opt.val;
                          return (
                            <button key={`solida-${opt.val}`} onClick={() => setModalDieta({ ...modalDieta, consumo: { ...modalDieta.consumo, solida: opt.val } })}
                              className={`flex-1 flex flex-col items-center p-2 rounded-xl border-2 transition-all ${isSelected ? 'border-orange-500 bg-orange-50 scale-105 shadow-md' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-orange-200'}`}
                            >
                              {/* DESENHO DO PRATO (Fatias de Pizza - Lógica Invertida) */}
                              <div className={`relative w-10 h-10 rounded-full border-2 overflow-hidden shadow-inner mb-2 flex-shrink-0 ${isSelected ? 'border-orange-500 bg-white' : 'border-slate-300 bg-slate-100'}`}>
                                <div 
                                  className="absolute inset-0 transition-all duration-500"
                                  style={{ background: `conic-gradient(${isSelected ? '#f97316' : '#fdba74'} ${opt.fill}%, transparent 0)` }}
                                />
                                <div className="absolute inset-1 rounded-full border border-black/5" />
                              </div>
                              
                              <div className={`text-sm font-black ${isSelected ? 'text-orange-700' : 'text-slate-500'}`}>{opt.label}</div>
                              <div className={`text-[9px] font-bold uppercase mt-1 text-center leading-tight ${isSelected ? 'text-orange-600' : 'text-slate-400'}`}>{opt.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SELETOR LÍQUIDA (COPO VISUAL) */}
                  {modalDieta.tipos.liquida && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2 text-blue-700 font-black mb-4 border-b border-slate-100 pb-2">
                        <Coffee size={16} /> DIETA LÍQUIDA (Copo)
                      </div>
                      <div className="flex justify-between gap-2">
                        {[
                          // val = % consumida (salva no banco) | fill = % que sobrou (desenho na tela)
                          { val: 0, label: '100%', desc: 'Tudo (Recusou)', fill: 100 },
                          { val: 25, label: '75%', desc: 'Sobrou 3/4', fill: 75 },
                          { val: 50, label: '50%', desc: 'Metade', fill: 50 },
                          { val: 75, label: '25%', desc: 'Sobrou 1/4', fill: 25 },
                          { val: 100, label: '0%', desc: 'Nada (Tomou tudo)', fill: 0 }
                        ].map(opt => {
                          const isSelected = modalDieta.consumo.liquida === opt.val;
                          return (
                            <button key={`liquida-${opt.val}`} onClick={() => setModalDieta({ ...modalDieta, consumo: { ...modalDieta.consumo, liquida: opt.val } })}
                              className={`flex-1 flex flex-col items-center p-2 rounded-xl border-2 transition-all ${isSelected ? 'border-blue-500 bg-blue-50 scale-105 shadow-md' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-blue-200'}`}
                            >
                              {/* DESENHO DO COPO (Nível de Líquido - Lógica Invertida) */}
                              <div className={`relative w-8 h-10 border-2 rounded-b-xl overflow-hidden shadow-inner mb-2 flex-shrink-0 ${isSelected ? 'border-blue-500 bg-white' : 'border-slate-300 bg-slate-100'}`}>
                                <div 
                                  className="absolute bottom-0 left-0 right-0 transition-all duration-500"
                                  style={{ 
                                    height: `${opt.fill}%`, 
                                    backgroundColor: isSelected ? '#3b82f6' : '#93c5fd' 
                                  }}
                                />
                              </div>

                              <div className={`text-sm font-black ${isSelected ? 'text-blue-700' : 'text-slate-500'}`}>{opt.label}</div>
                              <div className={`text-[9px] font-bold uppercase mt-1 text-center leading-tight ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>{opt.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setModalDieta({ ...modalDieta, step: 1 })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">
                      Voltar
                    </button>
                    <button 
                      disabled={(modalDieta.tipos.solida && modalDieta.consumo.solida === null) || (modalDieta.tipos.liquida && modalDieta.consumo.liquida === null)}
                      onClick={salvarDietaVO}
                      className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"
                    >
                      <CheckCircle2 size={18} /> Salvar Registro
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRO DE BANHO                                                  */}
      {/* ========================================================================= */}
      {modalBanho.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-indigo-500/20">
            
            {/* CABEÇALHO */}
            <div className="bg-indigo-600 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><ShowerHead size={20} /></div>
                <div>
                  <h2 className="text-lg font-black tracking-wide leading-tight">Registro de Banho</h2>
                </div>
              </div>
              <button onClick={() => setModalBanho({ ...modalBanho, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 bg-slate-50 space-y-6">
              
              {/* HORÁRIO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário do Banho/Higiene</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  
                  {/* SELECT DE HORAS (00 a 23) */}
                  <select 
                    className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer"
                    value={modalBanho.horario ? modalBanho.horario.split(':')[0] : "00"}
                    onChange={(e) => setModalBanho({ ...modalBanho, horario: `${e.target.value}:${modalBanho.horario ? modalBanho.horario.split(':')[1] : '00'}` })}
                  >
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => (
                      <option key={h} value={h}>{h}h</option>
                    ))}
                  </select>
                  
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  
                  {/* SELECT DE MINUTOS (Restrito a 4 opções) */}
                  <select 
                    className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer"
                    value={modalBanho.horario ? modalBanho.horario.split(':')[1] : "00"}
                    onChange={(e) => setModalBanho({ ...modalBanho, horario: `${modalBanho.horario ? modalBanho.horario.split(':')[0] : '00'}:${e.target.value}` })}
                  >
                    <option value="00">00</option>
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="45">45</option>
                  </select>

                </div>
              </div>

              {/* TIPO DE BANHO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Selecione o Tipo</label>
                <div className="grid grid-cols-1 gap-3">
                  {['No Leito', 'Aspersão', 'Higienização'].map(tipo => (
                    <button 
                      key={tipo}
                      onClick={() => setModalBanho({ ...modalBanho, tipo })}
                      className={`p-4 rounded-2xl border-2 font-black uppercase tracking-wide transition-all ${modalBanho.tipo === tipo ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-200'}`}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button onClick={() => setModalBanho({ ...modalBanho, isOpen: false })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">
                  Cancelar
                </button>
                <button 
                  disabled={!modalBanho.horario || !modalBanho.tipo}
                  onClick={salvarBanho}
                  className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"
                >
                  <CheckCircle2 size={18} /> Salvar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRO DE MUDANÇA DE DECÚBITO                                    */}
      {/* ========================================================================= */}
      {modalDecubito.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-indigo-500/20">
            
            {/* CABEÇALHO */}
            <div className="bg-indigo-600 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><RefreshCw size={20} /></div>
                <div>
                  <h2 className="text-lg font-black tracking-wide leading-tight">Mudança de Decúbito</h2>
                </div>
              </div>
              <button onClick={() => setModalDecubito({ ...modalDecubito, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 bg-slate-50 space-y-6">
              
              {/* HORÁRIO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário da Mudança</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  
                  {/* SELECT DE HORAS (00 a 23) */}
                  <select 
                    className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer"
                    value={modalDecubito.horario ? modalDecubito.horario.split(':')[0] : "00"}
                    onChange={(e) => setModalDecubito({ ...modalDecubito, horario: `${e.target.value}:${modalDecubito.horario ? modalDecubito.horario.split(':')[1] : '00'}` })}
                  >
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => (
                      <option key={h} value={h}>{h}h</option>
                    ))}
                  </select>
                  
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  
                  {/* SELECT DE MINUTOS (Restrito a 4 opções) */}
                  <select 
                    className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer"
                    value={modalDecubito.horario ? modalDecubito.horario.split(':')[1] : "00"}
                    onChange={(e) => setModalDecubito({ ...modalDecubito, horario: `${modalDecubito.horario ? modalDecubito.horario.split(':')[0] : '00'}:${e.target.value}` })}
                  >
                    <option value="00">00</option>
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="45">45</option>
                  </select>

                </div>
              </div>

              {/* POSIÇÃO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Selecione a Posição</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Dorso', 'Prona', 'DLE', 'DLD'].map(posicao => (
                    <button 
                      key={posicao}
                      onClick={() => setModalDecubito({ ...modalDecubito, posicao })}
                      className={`p-4 rounded-2xl border-2 font-black uppercase tracking-wide transition-all ${modalDecubito.posicao === posicao ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-200'}`}
                    >
                      {posicao}
                    </button>
                  ))}
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button onClick={() => setModalDecubito({ ...modalDecubito, isOpen: false })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">
                  Cancelar
                </button>
                <button 
                  disabled={!modalDecubito.horario || !modalDecubito.posicao}
                  onClick={salvarDecubito}
                  className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"
                >
                  <CheckCircle2 size={18} /> Salvar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRO DE HIGIENE ORAL                                           */}
      {/* ========================================================================= */}
      {modalHigieneOral.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-indigo-500/20">
            <div className="bg-indigo-600 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Smile size={20} /></div>
                <h2 className="text-lg font-black tracking-wide leading-tight">Higiene Oral</h2>
              </div>
              <button onClick={() => setModalHigieneOral({ ...modalHigieneOral, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6 bg-slate-50 space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário da Higiene Oral</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  
                  {/* SELECT DE HORAS (00 a 23) */}
                  <select 
                    className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer"
                    value={modalHigieneOral.horario ? modalHigieneOral.horario.split(':')[0] : "00"}
                    onChange={(e) => setModalHigieneOral({ ...modalHigieneOral, horario: `${e.target.value}:${modalHigieneOral.horario ? modalHigieneOral.horario.split(':')[1] : '00'}` })}
                  >
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => (
                      <option key={h} value={h}>{h}h</option>
                    ))}
                  </select>
                  
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  
                  {/* SELECT DE MINUTOS (Restrito a 4 opções) */}
                  <select 
                    className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer"
                    value={modalHigieneOral.horario ? modalHigieneOral.horario.split(':')[1] : "00"}
                    onChange={(e) => setModalHigieneOral({ ...modalHigieneOral, horario: `${modalHigieneOral.horario ? modalHigieneOral.horario.split(':')[0] : '00'}:${e.target.value}` })}
                  >
                    <option value="00">00</option>
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="45">45</option>
                  </select>

                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalHigieneOral({ ...modalHigieneOral, isOpen: false })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">Cancelar</button>
                <button disabled={!modalHigieneOral.horario} onClick={salvarHigieneOral} className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"><CheckCircle2 size={18} /> Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRO DE HIGIENE ÍNTIMA                                         */}
      {/* ========================================================================= */}
      {modalHigieneIntima.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-indigo-500/20">
            <div className="bg-indigo-600 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><ShieldPlus size={20} /></div>
                <h2 className="text-lg font-black tracking-wide leading-tight">Higiene Íntima</h2>
              </div>
              <button onClick={() => setModalHigieneIntima({ ...modalHigieneIntima, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6 bg-slate-50 space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário da Higiene Íntima</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  
                  {/* SELECT DE HORAS (00 a 23) */}
                  <select 
                    className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer"
                    value={modalHigieneIntima.horario ? modalHigieneIntima.horario.split(':')[0] : "00"}
                    onChange={(e) => setModalHigieneIntima({ ...modalHigieneIntima, horario: `${e.target.value}:${modalHigieneIntima.horario ? modalHigieneIntima.horario.split(':')[1] : '00'}` })}
                  >
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => (
                      <option key={h} value={h}>{h}h</option>
                    ))}
                  </select>
                  
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  
                  {/* SELECT DE MINUTOS (Restrito a 4 opções) */}
                  <select 
                    className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer"
                    value={modalHigieneIntima.horario ? modalHigieneIntima.horario.split(':')[1] : "00"}
                    onChange={(e) => setModalHigieneIntima({ ...modalHigieneIntima, horario: `${modalHigieneIntima.horario ? modalHigieneIntima.horario.split(':')[0] : '00'}:${e.target.value}` })}
                  >
                    <option value="00">00</option>
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="45">45</option>
                  </select>

                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalHigieneIntima({ ...modalHigieneIntima, isOpen: false })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">Cancelar</button>
                <button disabled={!modalHigieneIntima.horario} onClick={salvarHigieneIntima} className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"><CheckCircle2 size={18} /> Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRO DE ASPIRAÇÃO VAS                                          */}
      {/* ========================================================================= */}
      {modalAspiracao.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-indigo-500/20">
            
            {/* CABEÇALHO */}
            <div className="bg-indigo-600 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Wind size={20} /></div>
                <div>
                  <h2 className="text-lg font-black tracking-wide leading-tight">Aspiração VAS</h2>
                </div>
              </div>
              <button onClick={() => setModalAspiracao({ ...modalAspiracao, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 bg-slate-50 space-y-6">
              
              {/* HORÁRIO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário da Aspiração</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  
                  {/* SELECT DE HORAS (00 a 23) */}
                  <select 
                    className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer"
                    value={modalAspiracao.horario ? modalAspiracao.horario.split(':')[0] : "00"}
                    onChange={(e) => setModalAspiracao({ ...modalAspiracao, horario: `${e.target.value}:${modalAspiracao.horario ? modalAspiracao.horario.split(':')[1] : '00'}` })}
                  >
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => (
                      <option key={h} value={h}>{h}h</option>
                    ))}
                  </select>
                  
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  
                  {/* SELECT DE MINUTOS (Restrito a 4 opções) */}
                  <select 
                    className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer"
                    value={modalAspiracao.horario ? modalAspiracao.horario.split(':')[1] : "00"}
                    onChange={(e) => setModalAspiracao({ ...modalAspiracao, horario: `${modalAspiracao.horario ? modalAspiracao.horario.split(':')[0] : '00'}:${e.target.value}` })}
                  >
                    <option value="00">00</option>
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="45">45</option>
                  </select>

                </div>
              </div>

              {/* QUANTIDADE */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Quantidade de Secreção</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Pouca', 'Moderada', 'Abundante'].map(qtd => (
                    <button 
                      key={qtd}
                      onClick={() => setModalAspiracao({ ...modalAspiracao, quantidade: qtd })}
                      className={`p-2 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalAspiracao.quantidade === qtd ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-200'}`}
                    >
                      {qtd}
                    </button>
                  ))}
                </div>
              </div>

              {/* CARACTERÍSTICA */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Característica</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Fluida', 'Espessa', 'Sanguinol.'].map(carac => (
                    <button 
                      key={carac}
                      onClick={() => setModalAspiracao({ ...modalAspiracao, caracteristica: carac })}
                      className={`p-2 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalAspiracao.caracteristica === carac ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-200'}`}
                    >
                      {carac}
                    </button>
                  ))}
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button onClick={() => setModalAspiracao({ ...modalAspiracao, isOpen: false })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">
                  Cancelar
                </button>
                <button 
                  disabled={!modalAspiracao.horario || !modalAspiracao.quantidade || !modalAspiracao.caracteristica}
                  onClick={salvarAspiracao}
                  className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"
                >
                  <CheckCircle2 size={18} /> Salvar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    
      {/* ========================================================================= */}
      {/* MODAL: REGISTRO DE TROCA DE FRALDA                                        */}
      {/* ========================================================================= */}
      {modalFralda.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-indigo-500/20">
            
            {/* CABEÇALHO */}
            <div className="bg-indigo-600 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Package size={20} /></div>
                <div>
                  <h2 className="text-lg font-black tracking-wide leading-tight">Troca de Fralda</h2>
                </div>
              </div>
              <button onClick={() => setModalFralda({ ...modalFralda, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 bg-slate-50 space-y-6">
              
              {/* HORÁRIO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário da Troca</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  
                  {/* SELECT DE HORAS (00 a 23) */}
                  <select 
                    className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer"
                    value={modalFralda.horario ? modalFralda.horario.split(':')[0] : "00"}
                    onChange={(e) => setModalFralda({ ...modalFralda, horario: `${e.target.value}:${modalFralda.horario ? modalFralda.horario.split(':')[1] : '00'}` })}
                  >
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => (
                      <option key={h} value={h}>{h}h</option>
                    ))}
                  </select>
                  
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  
                  {/* SELECT DE MINUTOS (Restrito a 4 opções) */}
                  <select 
                    className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer"
                    value={modalFralda.horario ? modalFralda.horario.split(':')[1] : "00"}
                    onChange={(e) => setModalFralda({ ...modalFralda, horario: `${modalFralda.horario ? modalFralda.horario.split(':')[0] : '00'}:${e.target.value}` })}
                  >
                    <option value="00">00</option>
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="45">45</option>
                  </select>

                </div>
              </div>

              {/* EVACUAÇÃO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Houve Evacuação?</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setModalFralda({ ...modalFralda, evacuacao: "Sim" })}
                    className={`p-4 rounded-2xl border-2 font-black uppercase tracking-wide transition-all ${modalFralda.evacuacao === "Sim" ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-orange-200'}`}
                  >
                    Sim
                  </button>
                  <button 
                    onClick={() => setModalFralda({ ...modalFralda, evacuacao: "Não", diarreica: false, quantidade: "" })}
                    className={`p-4 rounded-2xl border-2 font-black uppercase tracking-wide transition-all ${modalFralda.evacuacao === "Não" ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200'}`}
                  >
                    Não
                  </button>
                </div>
              </div>

              {/* QUANTIDADE E DIARREICA (Aparecem apenas se Evacuação = Sim) */}
              {modalFralda.evacuacao === "Sim" && (
                <div className="animate-fadeIn space-y-4 bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                  
                  {/* QUANTIDADE */}
                  <div>
                    <label className="text-[10px] font-bold text-orange-800 mb-2 block text-center uppercase">Volume da Evacuação</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['+', '++', '+++', '++++'].map(qtd => (
                        <button 
                          key={qtd}
                          onClick={() => setModalFralda({ ...modalFralda, quantidade: qtd })}
                          className={`p-2 rounded-xl border-2 font-black text-sm transition-all ${modalFralda.quantidade === qtd ? 'border-orange-500 bg-orange-500 text-white shadow-md scale-105' : 'border-orange-200 bg-white text-orange-600 hover:border-orange-300'}`}
                        >
                          {qtd}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DIARREICA */}
                  <div className="pt-3 border-t border-orange-200/50">
                    <label className="flex items-center justify-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-6 h-6 text-orange-600 rounded-md focus:ring-orange-500 border-orange-300"
                        checked={modalFralda.diarreica}
                        onChange={(e) => setModalFralda({ ...modalFralda, diarreica: e.target.checked })}
                      />
                      <span className="text-sm font-black text-orange-800 uppercase">Fezes Diarreicas?</span>
                    </label>
                  </div>
                </div>
              )}

              {/* BOTÕES DE AÇÃO */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button onClick={() => setModalFralda({ ...modalFralda, isOpen: false })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">
                  Cancelar
                </button>
                <button 
                  // O botão só ativa se: tiver horário E (marcou Não OR (marcou Sim E escolheu a quantidade))
                  disabled={!modalFralda.horario || modalFralda.evacuacao === null || (modalFralda.evacuacao === "Sim" && !modalFralda.quantidade)}
                  onClick={salvarFralda}
                  className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"
                >
                  <CheckCircle2 size={18} /> Salvar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRO DE CURATIVO                                               */}
      {/* ========================================================================= */}
      {modalCurativo.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-indigo-500/20 my-auto">
            
            {/* CABEÇALHO */}
            <div className="bg-indigo-600 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Bandage size={20} /></div>
                <div>
                  <h2 className="text-lg font-black tracking-wide leading-tight">Registro de Curativo</h2>
                </div>
              </div>
              <button onClick={() => setModalCurativo({ ...modalCurativo, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 bg-slate-50 space-y-6 overflow-y-auto max-h-[70vh]">
              
              {/* HORÁRIO (RELÓGIO RESTRITO 00/15/30/45) */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário da Troca/Avaliação</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  <select 
                    className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer appearance-none"
                    value={modalCurativo.horario ? modalCurativo.horario.split(':')[0] : "00"}
                    onChange={(e) => setModalCurativo({ ...modalCurativo, horario: `${e.target.value}:${modalCurativo.horario ? modalCurativo.horario.split(':')[1] : '00'}` })}
                  >
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => (
                      <option key={h} value={h}>{h}h</option>
                    ))}
                  </select>
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  <select 
                    className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer appearance-none"
                    value={modalCurativo.horario ? modalCurativo.horario.split(':')[1] : "00"}
                    onChange={(e) => setModalCurativo({ ...modalCurativo, horario: `${modalCurativo.horario ? modalCurativo.horario.split(':')[0] : '00'}:${e.target.value}` })}
                  >
                    <option value="00">00</option>
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="45">45</option>
                  </select>
                </div>
              </div>

              {/* TIPO DE CURATIVO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Tipo de Curativo</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(OPCOES_CURATIVO).map(tipo => (
                    <button 
                      key={tipo}
                      onClick={() => setModalCurativo({ ...modalCurativo, tipo, localizacao: "" })}
                      className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalCurativo.tipo === tipo ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-200'}`}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>

              {/* LOCALIZAÇÃO (Aparece apenas após escolher o Tipo) */}
              {modalCurativo.tipo && (
                <div className="animate-fadeIn bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                  <label className="text-xs font-bold text-indigo-800 mb-3 block text-center uppercase">Localização ({modalCurativo.tipo})</label>
                  <div className="grid grid-cols-2 gap-2">
                    {OPCOES_CURATIVO[modalCurativo.tipo].map(local => (
                      <button 
                        key={local}
                        onClick={() => setModalCurativo({ ...modalCurativo, localizacao: local })}
                        className={`p-2 rounded-xl border-2 font-bold text-[11px] uppercase transition-all ${modalCurativo.localizacao === local ? 'border-indigo-500 bg-indigo-500 text-white shadow-md scale-105' : 'border-indigo-200 bg-white text-indigo-700 hover:border-indigo-300'}`}
                      >
                        {local}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* BOTÕES DE AÇÃO */}
              <div className="flex gap-3 pt-4 border-t border-slate-200 shrink-0">
                <button onClick={() => setModalCurativo({ ...modalCurativo, isOpen: false })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">
                  Cancelar
                </button>
                <button 
                  disabled={!modalCurativo.horario || !modalCurativo.tipo || !modalCurativo.localizacao}
                  onClick={salvarCurativo}
                  className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"
                >
                  <CheckCircle2 size={18} /> Salvar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RELATÓRIO DE ENFERMAGEM GERADO                                     */}
      {/* ========================================================================= */}
      {modalRelatorio.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-indigo-500/20 my-auto">
            
            <div className="bg-indigo-600 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><FileText size={20} /></div>
                <h2 className="text-lg font-black tracking-wide leading-tight">Anotação de Enfermagem</h2>
              </div>
              <button onClick={() => setModalRelatorio({ isOpen: false, texto: "" })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 bg-slate-50 flex flex-col gap-4">
              <p className="text-sm text-slate-500 font-medium">
                O texto abaixo foi gerado automaticamente e ordenado por horário. Você pode editá-lo livremente antes de copiar.
              </p>
              
              <textarea 
                className="w-full h-80 p-4 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-mono bg-white shadow-inner resize-none"
                value={modalRelatorio.texto}
                onChange={(e) => setModalRelatorio({ ...modalRelatorio, texto: e.target.value })}
              />
              
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalRelatorio({ isOpen: false, texto: "" })} className="px-6 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">
                  Fechar
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(modalRelatorio.texto);
                    alert("Anotação copiada com sucesso para a área de transferência!");
                  }}
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"
                >
                  <Copy size={20} /> Copiar Texto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*  */}
      {/* MODAL: ACESSO PERIFÉRICO                                                  */}
      {/*  */}
      {modalAcesso.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-indigo-500/20 my-auto">
            <div className="bg-indigo-600 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Syringe size={20} /></div>
                <h2 className="text-lg font-black tracking-wide leading-tight">Acesso Periférico</h2>
              </div>
              <button onClick={() => setModalAcesso({ ...modalAcesso, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 bg-slate-50 space-y-6 overflow-y-auto max-h-[70vh]">
              {/* HORÁRIO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário da Punção</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalAcesso.horario ? modalAcesso.horario.split(':')[0] : "00"} onChange={(e) => setModalAcesso({ ...modalAcesso, horario: `${e.target.value}:${modalAcesso.horario ? modalAcesso.horario.split(':')[1] : '00'}` })}>
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalAcesso.horario ? modalAcesso.horario.split(':')[1] : "00"} onChange={(e) => setModalAcesso({ ...modalAcesso, horario: `${modalAcesso.horario ? modalAcesso.horario.split(':')[0] : '00'}:${e.target.value}` })}>
                    {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* LOCAL */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Local da Punção</label>
                <div className="grid grid-cols-2 gap-2">
                  {['MSD', 'MSE', 'MID', 'MIE', 'Jugular Externa D', 'Jugular Externa E'].map(local => (
                    <button key={local} onClick={() => setModalAcesso({ ...modalAcesso, local })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalAcesso.local === local ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-200'}`}>{local}</button>
                  ))}
                </div>
              </div>

              {/* CALIBRE */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Calibre do Jelco</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: '14G', cor: 'bg-orange-500' }, { val: '16G', cor: 'bg-gray-400' }, 
                    { val: '18G', cor: 'bg-green-500' }, { val: '20G', cor: 'bg-pink-400' }, 
                    { val: '22G', cor: 'bg-blue-500' }, { val: '24G', cor: 'bg-yellow-400' }
                  ].map(cal => (
                    <button key={cal.val} onClick={() => setModalAcesso({ ...modalAcesso, calibre: cal.val })} className={`relative p-3 rounded-xl border-2 font-black text-sm transition-all overflow-hidden ${modalAcesso.calibre === cal.val ? 'border-indigo-500 text-indigo-800 shadow-md scale-105' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200'}`}>
                      <div className={`absolute top-0 left-0 w-full h-1 ${cal.cor}`}></div>
                      {cal.val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 shrink-0">
                <button onClick={() => setModalAcesso({ ...modalAcesso, isOpen: false })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">Cancelar</button>
                <button disabled={!modalAcesso.horario || !modalAcesso.local || !modalAcesso.calibre} onClick={salvarAcesso} className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"><CheckCircle2 size={18} /> Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*  */}
      {/* MODAL: TRICOTOMIA                                                         */}
      {/*  */}
      {modalTricotomia.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-indigo-500/20">
            <div className="bg-indigo-600 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Scissors size={20} /></div>
                <h2 className="text-lg font-black tracking-wide leading-tight">Tricotomia</h2>
              </div>
              <button onClick={() => setModalTricotomia({ ...modalTricotomia, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6 bg-slate-50 space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalTricotomia.horario ? modalTricotomia.horario.split(':')[0] : "00"} onChange={(e) => setModalTricotomia({ ...modalTricotomia, horario: `${e.target.value}:${modalTricotomia.horario ? modalTricotomia.horario.split(':')[1] : '00'}` })}>
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalTricotomia.horario ? modalTricotomia.horario.split(':')[1] : "00"} onChange={(e) => setModalTricotomia({ ...modalTricotomia, horario: `${modalTricotomia.horario ? modalTricotomia.horario.split(':')[0] : '00'}:${e.target.value}` })}>
                    {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Local</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Cabeça', 'Tórax', 'Abdome', 'MMSS', 'MMII', 'Região Púbica'].map(local => (
                    <button key={local} onClick={() => setModalTricotomia({ ...modalTricotomia, local })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalTricotomia.local === local ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-200'}`}>{local}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button onClick={() => setModalTricotomia({ ...modalTricotomia, isOpen: false })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">Cancelar</button>
                <button disabled={!modalTricotomia.horario || !modalTricotomia.local} onClick={salvarTricotomia} className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"><CheckCircle2 size={18} /> Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*  */}
      {/* MODAL: CRIOTERAPIA                                                        */}
      {/*  */}
      {modalCrioterapia.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-indigo-500/20">
            <div className="bg-indigo-600 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Snowflake size={20} /></div>
                <h2 className="text-lg font-black tracking-wide leading-tight">Crioterapia</h2>
              </div>
              <button onClick={() => setModalCrioterapia({ ...modalCrioterapia, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6 bg-slate-50 space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário da Crioterapia</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalCrioterapia.horario ? modalCrioterapia.horario.split(':')[0] : "00"} onChange={(e) => setModalCrioterapia({ ...modalCrioterapia, horario: `${e.target.value}:${modalCrioterapia.horario ? modalCrioterapia.horario.split(':')[1] : '00'}` })}>
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalCrioterapia.horario ? modalCrioterapia.horario.split(':')[1] : "00"} onChange={(e) => setModalCrioterapia({ ...modalCrioterapia, horario: `${modalCrioterapia.horario ? modalCrioterapia.horario.split(':')[0] : '00'}:${e.target.value}` })}>
                    {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button onClick={() => setModalCrioterapia({ ...modalCrioterapia, isOpen: false })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">Cancelar</button>
                <button disabled={!modalCrioterapia.horario} onClick={salvarCrioterapia} className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"><CheckCircle2 size={18} /> Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*  */}
      {/* MODAL: INSULINA                                                           */}
      {/*  */}
      {modalInsulina.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-indigo-500/20">
            <div className="bg-indigo-600 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Activity size={20} /></div>
                <h2 className="text-lg font-black tracking-wide leading-tight">Insulina</h2>
              </div>
              <button onClick={() => setModalInsulina({ ...modalInsulina, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6 bg-slate-50 space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalInsulina.horario ? modalInsulina.horario.split(':')[0] : "00"} onChange={(e) => setModalInsulina({ ...modalInsulina, horario: `${e.target.value}:${modalInsulina.horario ? modalInsulina.horario.split(':')[1] : '00'}` })}>
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalInsulina.horario ? modalInsulina.horario.split(':')[1] : "00"} onChange={(e) => setModalInsulina({ ...modalInsulina, horario: `${modalInsulina.horario ? modalInsulina.horario.split(':')[0] : '00'}:${e.target.value}` })}>
                    {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Tipo de Insulina</label>
                <div className="grid grid-cols-2 gap-3">
                  {['NPH', 'Regular'].map(tipo => (
                    <button key={tipo} onClick={() => setModalInsulina({ ...modalInsulina, tipo })} className={`p-4 rounded-2xl border-2 font-black uppercase tracking-wide transition-all ${modalInsulina.tipo === tipo ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-200'}`}>{tipo}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Dose (UI)</label>
                <div className="flex items-center justify-center gap-3">
                  <input 
                    type="number" 
                    min="1"
                    className="w-32 p-4 border border-slate-200 rounded-2xl text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-3xl shadow-inner bg-white"
                    value={modalInsulina.dose}
                    onChange={(e) => setModalInsulina({ ...modalInsulina, dose: e.target.value })}
                  />
                  <span className="text-xl font-bold text-slate-400">UI</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button onClick={() => setModalInsulina({ ...modalInsulina, isOpen: false })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">Cancelar</button>
                <button disabled={!modalInsulina.horario || !modalInsulina.tipo || !modalInsulina.dose} onClick={salvarInsulina} className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"><CheckCircle2 size={18} /> Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CVCInsercaoModal
        isOpen={showCVCModal}
        onClose={() => setShowCVCModal(false)}
        currentPatient={currentPatient}
        updateNested={updateNested}
        handleBlurSave={handleBlurSave}
        listaProfissionais={listaProfissionais}
      />
  
      <SVDInsercaoModal
        isOpen={showSVDModal}
        onClose={() => setShowSVDModal(false)}
        currentPatient={currentPatient}
        updateNested={updateNested}
        handleBlurSave={handleBlurSave}
        listaProfissionais={listaProfissionais}
      />

      </fieldset>
    </div>
  );
};

export default TechDashboard;