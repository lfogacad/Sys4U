import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from "jspdf-autotable";
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart2, ShieldAlert, FileCheck, Users, AlertTriangle, CheckCircle, Settings, CalendarDays, Microscope,
  ArrowLeft, Activity, Calendar, TrendingUp, AlertCircle, Clock, Plus, PlusCircle, Shield, FileDown, X, Bug,
  Bed, Save, Bell, Calculator, Loader2, ArrowRight, Search, XCircle, Filter, ClipboardCopy, ClipboardList, Wind,
  FileText, Edit3, MapPin, Printer, Download, History, HistoryIcon, Syringe, ShieldCheck, Ambulance
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ReferenceLine, Label  
} from 'recharts';
import { collection, onSnapshot, getDocs, doc, setDoc, orderBy, limit, updateDoc, query, where } from "firebase/firestore";
import { db } from "../config/firebase";

import ModuloAdmin from './ModuloAdmin';
import ImportadorEscala from './ImportadorEscala';
import RelatorioANVISA from './relatorios/RelatorioANVISA';
import PainelAuditoriaTab from './tabs/PainelAuditoriaTab';

const GestorDashboard = ({ userProfile }) => {
  const navigate = useNavigate();
  // Controle de navegação principal (hub, indicadores, tendencias, qualidade, auditoria, equipe)
  const [activeView, setActiveView] = useState('hub');
  // Controle de navegação da aba Equipe (menu, acessos, escalas, config)
  const [subViewEquipe, setSubViewEquipe] = useState('menu');
  
  // Controles de Visão e Escala
  const [categoriaAtiva, setCategoriaAtiva] = useState('Médico');
  const [modoVisao, setModoVisao] = useState('dia');
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split('T')[0]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [plantaoEditado, setPlantaoEditado] = useState(null);
  const [novoPlantonista, setNovoPlantonista] = useState("");
  const [tipoTrocaPlantao, setTipoTrocaPlantao] = useState('Total'); // Pode ser 'Total', 'Dia' ou 'Noite'
  const [indicadorTendencia, setIndicadorTendencia] = useState('mortalidade');
  
  // Controles de Dados do Firebase
  const [plantoesDoDia, setPlantoesDoDia] = useState([]);
  const [isLoadingPlantoes, setIsLoadingPlantoes] = useState(false);
  const [plantoesDoMes, setPlantoesDoMes] = useState({});
  const [isLoadingMes, setIsLoadingMes] = useState(false);
  const [consolidadoDia, setConsolidadoDia] = useState({});

  const [statusPlantonista, setStatusPlantonista] = useState('Normal'); // 'Normal', 'Falta', 'Atestado'
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [extraTurno, setExtraTurno] = useState('DN');
  const [extraNome, setExtraNome] = useState('');

  const [listaCarrinhoEMG, setListaCarrinhoEMG] = useState([]);
  const [mesFiltroCarrinhoEMG, setMesFiltroCarrinhoEMG] = useState(new Date().toISOString().slice(0, 7));
  const [loadingCarrinhoEMG, setLoadingCarrinhoEMG] = useState(false);
  const [modalDetalheCarrinho, setModalDetalheCarrinho] = useState({ isOpen: false, dia: '', registros: [] });

  // Variáveis para o Módulo de IRAS (CCIH)
  const [formDDD, setFormDDD] = useState({ mes: new Date().toISOString().slice(0,7), atb: '', gramas: '' });
  const [formAlcool, setFormAlcool] = useState({ mes: new Date().toISOString().slice(0,7), ml: '' });
  const [atbGrafico, setAtbGrafico] = useState('Meropenem');
  const [culturasGlobais, setCulturasGlobais] = useState([]);
  const [mesFiltroCultura, setMesFiltroCultura] = useState(new Date().toISOString().slice(0,7));
  const [historicoCCIH, setHistoricoCCIH] = useState([]);

  // ==========================================
  // ÂNCORA DE TEMPO COMPARTILHADA PARA IRAS
  // ==========================================
  const [mesFiltroIrasCompartilhado, setMesFiltroIrasCompartilhado] = useState(new Date().toISOString().slice(0, 7)); // Padrão: Mês Atual (YYYY-MM)

  // ==========================================
  // CONTROLES DA AUDITORIA AUTOMATIZADA (PAV)
  // ==========================================
  const [auditoriasPAV, setAuditoriasPAV] = useState([]);
  const [filtroStatusPAV, setFiltroStatusPAV] = useState('Suspeito'); // 'Suspeito', 'Confirmado' ou 'Descartado'
  const [modalAuditoriaPAV, setModalAuditoriaPAV] = useState(null);

  // ==========================================
  // CONTROLES DE INSERÇÃO MANUAL (PAV)
  // ==========================================
  const [isModalManualPAVOpen, setIsModalManualPAVOpen] = useState(false);
  const [formManualPAV, setFormManualPAV] = useState({
    pacienteId: '', nome: '', leito: '',
    dataRadiologia: '',
    sysFebre: false, dataFebre: '',
    sysLeuco: false, dataLeuco: '',
    sysSensorio: false, dataSensorio: '',
    respSecrecao: false, detSecrecao: '', dataSecrecao: '',
    respTosse: false, dataTosse: '',
    respAusculta: false, dataAusculta: '',
    respTroca: false, detTroca: '', dataTroca: '',
    microCultura: false, germeCultura: '', dataCultura: ''
  });

  // CONTROLES DA AUDITORIA AUTOMATIZADA (IPCS-C)
  const [auditoriasIPCSC, setAuditoriasIPCSC] = useState([]);
  const [filtroStatusIPCSC, setFiltroStatusIPCSC] = useState('Suspeito');
  const [modalAuditoriaIPCSC, setModalAuditoriaIPCSC] = useState(null);

  // ==========================================
  // CONTROLES DE INSERÇÃO MANUAL (IPCS-C)
  // ==========================================
  const [isModalManualIPCSCOpen, setIsModalManualIPCSCOpen] = useState(false);
  const [formManualIPCSC, setFormManualIPCSC] = useState({
    pacienteId: '', nome: '', leito: '',
    dataColeta: '', germe: '',
    tipoGerme: 'patogeno', // 'patogeno' ou 'comensal'
    multiplasAmostras: false,
    sysFebre: false, dataFebre: '',
    sysCalafrios: false, dataCalafrios: '',
    sysHipotensao: false, dataHipotensao: ''
  });

  // CONTROLES DA AUDITORIA AUTOMATIZADA (ITU-AC)
  const [auditoriasITU, setAuditoriasITU] = useState([]);
  const [filtroStatusITU, setFiltroStatusITU] = useState('Suspeito');
  const [modalAuditoriaITU, setModalAuditoriaITU] = useState(null);

  // ==========================================
  // CONTROLES DE INSERÇÃO MANUAL (ITU-AC)
  // ==========================================
  const [isModalManualITUOpen, setIsModalManualITUOpen] = useState(false);
  const [formManualITU, setFormManualITU] = useState({
    pacienteId: '', nome: '', leito: '',
    dataColeta: '', germe: '', ufc: '', qtdEspecies: 1,
    sysFebre: false, dataFebre: '',
    sysDisuria: false, dataDisuria: '',
    sysDorSupra: false, dataDorSupra: '', // <--- ADICIONADO AQUI
    sysGiordano: false, dataGiordano: ''
  });

  const [mesRelatorioSelecao, setMesRelatorioSelecao] = useState(mesFiltroIrasCompartilhado || new Date().toISOString().slice(0, 7));

  const [modalRelatorioAberto, setModalRelatorioAberto] = useState(false);
  
  // Tabela Oficial OMS (DDD em Gramas para via Parenteral)
  const DDD_OMS = {
    "Ceftriaxona": 2, "Amoxicilina/Clavulanato": 3, "Cefepime": 4, "Oxacilina": 4, 
    "Ampicilina": 2, "Tazocin": 14, "Meropenem": 3, "Clindamicina": 1.8, 
    "Vancomicina": 2, "Fluconazol": 0.2, "Anfotericina B": 0.035, "Amicacina": 1, 
    "Gentamicina": 0.24, "Ciprofloxacino": 0.8, "Levofloxacino": 0.5, 
    "Metronidazol": 1.5, "SMT/TMP": 1.6
  };

  const dataAtual = new Date();
  const mesAtualString = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}`;
  const [mesFiltroOrigem, setMesFiltroOrigem] = useState(mesAtualString);
  const [mesRelatorio, setMesRelatorio] = useState(new Date().toISOString().substring(0, 7));

  // ==========================================
  // ESTADOS DO DOSSIÊ DE AUDITORIA
  // ==========================================
  const [isModalRelatorioOpen, setIsModalRelatorioOpen] = useState(false);
  const [relatorioMudancas, setRelatorioMudancas] = useState([]);
  const [isLoadingRelatorio, setIsLoadingRelatorio] = useState(false);
  
  // NOVOS ESTADOS PARA OS FILTROS
  const [filtroMesRelatorio, setFiltroMesRelatorio] = useState("");
  const [filtroCategoriaRelatorio, setFiltroCategoriaRelatorio] = useState("Todas");

  const [listaMedicos, setListaMedicos] = useState([]);
  const [listaProfissionais, setListaProfissionais] = useState([]);

  const [loadingGraficos, setLoadingGraficos] = useState(true);

  const [dadosDispositivos, setDadosDispositivos] = useState([]);
  const [dadosDesfechos, setDadosDesfechos] = useState([]);

  const [listaCenso, setListaCenso] = useState([]);

  const [abaIrasAtiva, setAbaIrasAtiva] = useState('geral');

  const [modalHistorico, setModalHistorico] = useState({ isOpen: false, tipo: '', paciente: null });
    // Estados para armazenar os dados vindos do Firebase
  const [historicoData, setHistoricoData] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  // Efeito que dispara a busca no Firebase toda vez que o modal é aberto
  useEffect(() => {
    if (modalHistorico.isOpen && modalHistorico.paciente) {
      const fetchHistorico = async () => {
        setLoadingHistorico(true);
        try {
          // Pega o ID correto do paciente para buscar na coleção
          const idBusca = modalHistorico.paciente.idInternacao || modalHistorico.paciente.id;
          
          // Monta a pesquisa: Busca na coleção "indicadores_performance" onde o ID bate e o tipo é BRADEN ou MORSE
          const q = query(
            collection(db, "indicadores_performance"),
            where("idInternacao", "==", idBusca),
            where("tipo", "==", modalHistorico.tipo.toUpperCase())
          );
          
          const querySnapshot = await getDocs(q);
          const docs = [];
          querySnapshot.forEach((doc) => {
            docs.push({ id: doc.id, ...doc.data() });
          });
          
          // Ordena os resultados da data mais recente para a mais antiga
          docs.sort((a, b) => b.dataRegistro.toDate() - a.dataRegistro.toDate());
          
          setHistoricoData(docs);
        } catch (error) {
          console.error("Erro ao buscar histórico:", error);
        } finally {
          setLoadingHistorico(false);
        }
      };
      
      fetchHistorico();
    }
  }, [modalHistorico]);

  const [dataInicio, setDataInicio] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [dataFim, setDataFim] = useState(
    new Date().toISOString().split('T')[0]
  );

// =========================================================
  // 1. ESTADOS (useState) - O ALMOXARIFADO
  // =========================================================
  const [leitosConfig, setLeitosConfig] = useState([]);
  const [capacidadeInput, setCapacidadeInput] = useState(10);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [listaEventosAdversos, setListaEventosAdversos] = useState([]);
  const [listaHistorico, setListaHistorico] = useState([]);
  const [metricasEquipe, setMetricasEquipe] = useState({
    total: 0, ativos: 0, pendentes: 0, carregando: true
  });

  // ESTADOS DA GESTÃO DE RISCO (NSP) - Exclusivo do Dashboard
  const [abaRiscoAtiva, setAbaRiscoAtiva] = useState('eventos');
  const [listaEventos, setListaEventos] = useState([]);
  const [eventoEmInvestigacao, setEventoEmInvestigacao] = useState(null);
  const [formInvestigacao, setFormInvestigacao] = useState({
    prontuario: '',
    faseCuidado: '',
    fatoresContribuintes: '',
    medidasPreventivas: '',
    statusAnalise: 'Em Análise'
  });

  // ESTADOS DO FILTRO DE DATAS (Padrão: Últimos 30 dias)
  const hoje = new Date();
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(hoje.getDate() - 30);

  const [filtroDataInicio, setFiltroDataInicio] = useState(trintaDiasAtras.toISOString().split('T')[0]);
  const [filtroDataFim, setFiltroDataFim] = useState(hoje.toISOString().split('T')[0]);

  // ESTADOS DAS ESCALAS ASSISTENCIAIS (AUDITORIA)
  const [listaEscalas, setListaEscalas] = useState([]);
  const [modalEscala, setModalEscala] = useState(null);

  const [mesFiltroCVC, setMesFiltroCVC] = useState(new Date().toISOString().slice(0, 7));
  const [acessosMesCVC, setAcessosMesCVC] = useState(null);

  // =========================================================
  // 2. EFEITOS (useEffect) - OS SINCRONIZADORES (DADOS BRUTOS)
  // =========================================================

  // Sincroniza Leitos (ESSENCIAL: Agora carrega assim que abre o painel)
  useEffect(() => {
    if (!db) return;
    const q = collection(db, "leitos_uti");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLeitosConfig(dados);
    });
    return () => unsubscribe();
  }, [db]);

  // Sincroniza Histórico de Internações
  useEffect(() => {
    if (!db) return;
    const q = collection(db, "internacoes_historico"); 
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setListaHistorico(dados);
    });
    return () => unsubscribe();
  }, [db]);

  // BUSCA A EQUIPE DE MÉDICOS NO FIREBASE
  useEffect(() => {
    const carregarEquipeMedica = async () => {
      try {
        // Aponta para a coleção 'profissionais' filtrando apenas por 'Médico'
        // (Ajuste o nome do campo se no seu banco estiver diferente de "categoria" ou "cargo")
        const profRef = collection(db, "profissionais");
        const q = query(profRef, where("categoria", "==", "Médico")); 
        
        const querySnapshot = await getDocs(q);
        const medicosTemp = [];
        
        querySnapshot.forEach((doc) => {
          medicosTemp.push({ id: doc.id, ...doc.data() });
        });

        // Coloca em ordem alfabética para facilitar a busca
        medicosTemp.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        
        setListaMedicos(medicosTemp);
      } catch (error) {
        console.error("Erro ao carregar a lista de médicos:", error);
      }
    };

    carregarEquipeMedica();
  }, []);

 // BUSCA OS EVENTOS ADVERSOS EM TEMPO REAL (Câmera ao Vivo)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "eventos_adversos"), (snapshot) => {
      const eventosTemp = [];
      
      snapshot.forEach((doc) => {
        // Empacota o documento com o ID para a lista
        eventosTemp.push({ id: doc.id, ...doc.data() });
      });

      // Ordena dos mais recentes para os mais antigos (opcional, mas recomendado)
      eventosTemp.sort((a, b) => new Date(b.dataHoraOcorrencia) - new Date(a.dataHoraOcorrencia));
      
      // A atualização da tela fica FORA do forEach
      setListaEventos(eventosTemp);
      
    }, (error) => {
      console.error("Erro ao sincronizar eventos adversos ao vivo:", error);
    });

    // Quando o senhor trocar de tela, ele desliga o radar para economizar memória e internet
    return () => unsubscribe();
  }, []);

  // Sincroniza Carrinho de EMG (por mês selecionado)
  useEffect(() => {
    if (!db || !mesFiltroCarrinhoEMG) return;
    
    const fetchCarrinhoEMG = async () => {
      setLoadingCarrinhoEMG(true);
      try {
        const [ano, mes] = mesFiltroCarrinhoEMG.split('-');
        const primeiroDia = `${mesFiltroCarrinhoEMG}-01`;
        const ultimoDia = new Date(Number(ano), Number(mes), 0);
        const ultimoDiaStr = `${mesFiltroCarrinhoEMG}-${String(ultimoDia.getDate()).padStart(2, '0')}`;
        
        const q = query(
          collection(db, "carrinho_emg"),
          where("data", ">=", primeiroDia),
          where("data", "<=", ultimoDiaStr)
        );
        
        const snapshot = await getDocs(q);
        const dados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setListaCarrinhoEMG(dados);
      } catch (error) {
        console.error("Erro ao buscar carrinho_emg:", error);
      } finally {
        setLoadingCarrinhoEMG(false);
      }
    };
    
    fetchCarrinhoEMG();
  }, [mesFiltroCarrinhoEMG, db]);

  // BUSCA DADOS DE ESCALAS (ATIVOS E HISTÓRICO COM FILTRO DE DATA)
  useEffect(() => {
    if (abaRiscoAtiva === 'escalas') {
      const buscarAuditoriaEscalas = async () => {
        try {
          // Função ultra-blindada para ler datas do Firebase (Timestamps ou Strings)
          const parseData = (dataStr) => {
            if (!dataStr) return new Date(0);
            if (typeof dataStr.toDate === 'function') return dataStr.toDate();
            if (dataStr.seconds) return new Date(dataStr.seconds * 1000);
            if (typeof dataStr === 'string' && dataStr.includes('/')) {
              const parts = dataStr.split(' ')[0].split('/');
              if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
            }
            return new Date(dataStr);
          };

          // 1. Busca Histórico (ADICIONAMOS A DATA DE SAÍDA)
          const snapHist = await getDocs(collection(db, "internacoes_historico"));
          const historico = snapHist.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              idInternacao: data.idInternacao,
              nome: data.nomePaciente || data.nome,
              dataInternacao: data.dataEntrada || data.dataInternacao,
              dataSaida: data.dataSaida || data.dataDesfecho, // <-- CRUCIAL PARA A JANELA
              status: 'Alta/Óbito'
            };
          });

          // 2. Busca Ativos
          const snapAtivos = await getDocs(collection(db, "leitos_uti"));
          const ativos = snapAtivos.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(p => p.nome)
            .map(p => ({
              id: p.id,
              idInternacao: p.idInternacao,
              nome: p.nome,
              dataInternacao: p.dataInternacao,
              dataSaida: new Date(), // Paciente ativo, a "saída" é hoje
              status: 'Internado'
            }));

          let todos = [...ativos, ...historico];
          
          const inicio = new Date(`${filtroDataInicio}T00:00:00`);
          const fim = new Date(`${filtroDataFim}T23:59:59`);

          // 4. Filtro principal de exibição na tabela
          todos = todos.filter(pac => {
            const dataPac = parseData(pac.dataInternacao);
            return dataPac >= inicio && dataPac <= fim;
          });

          // =========================================================================
          // 🔥 BUSCA E CRUZAMENTO COM JANELA DE TEMPO
          // =========================================================================
          const snapIndicadores = await getDocs(collection(db, "indicadores_performance"));
          const indicadores = snapIndicadores.docs.map(doc => doc.data());

          const pacientesComEscalas = todos.map(pac => {
            const pacDataInt = parseData(pac.dataInternacao);
            // Se for alta mas não tiver data de saída registrada, usa a data atual como segurança máxima
            const pacDataSai = pac.status === 'Internado' || !pac.dataSaida ? new Date() : parseData(pac.dataSaida);

            // Função interna para achar a escala correta
            const obterEscala = (tipo) => {
              // 1. Filtra as escalas que pertencem a este paciente (por ID ou Nome + Data)
              const escalasDoPaciente = indicadores.filter(ind => {
                if (ind.tipo !== tipo) return false;
                
                // Match Perfeito por ID (Bala de Prata)
                if (ind.idInternacao && pac.idInternacao && String(ind.idInternacao) === String(pac.idInternacao)) {
                  return true;
                }
                
                // Match por Nome + JANELA DE TEMPO (O Segredo!)
                if (ind.nomePaciente === pac.nome) {
                  const dataInd = parseData(ind.dataRegistro || ind.data);
                  
                  // Margem: Considera escalas feitas 1 dia antes da admissão até 1 dia após a saída
                  const inicioJanela = new Date(pacDataInt);
                  inicioJanela.setDate(inicioJanela.getDate() - 1);
                  
                  const fimJanela = new Date(pacDataSai);
                  fimJanela.setDate(fimJanela.getDate() + 1);
                  
                  if (dataInd >= inicioJanela && dataInd <= fimJanela) {
                    return true;
                  }
                }
                return false;
              });

              if (escalasDoPaciente.length === 0) return null;

              // 2. Se achou mais de uma (ex: refez a escala), pega a mais recente!
              escalasDoPaciente.sort((a, b) => parseData(b.dataRegistro || b.data) - parseData(a.dataRegistro || a.data));
              
              return { score: escalasDoPaciente[0].valor, respostas: escalasDoPaciente[0].respostas };
            };

            return {
              ...pac,
              saps3: obterEscala("SAPS 3"),
              braden: obterEscala("BRADEN"),
              morse: obterEscala("MORSE")
            };
          });

          // 5. Ordena do mais recente para o mais antigo na tabela
          pacientesComEscalas.sort((a, b) => parseData(b.dataInternacao) - parseData(a.dataInternacao));
          
          setListaEscalas(pacientesComEscalas);
        } catch (error) {
          console.error("Erro ao buscar auditoria de escalas:", error);
        }
      };
      buscarAuditoriaEscalas();
    }
  }, [abaRiscoAtiva, filtroDataInicio, filtroDataFim]);

  // =========================================================
  // BUSCA A EQUIPE MULTIPROFISSIONAL NO FIREBASE (GATILHO AUTOMÁTICO)
  // =========================================================
  useEffect(() => {
    const buscarEquipeMultiprofissional = async () => {
      try {
        const profRef = collection(db, "profissionais");
        const snapshot = await getDocs(profRef);
        const equipe = [];

        snapshot.forEach(doc => {
          const dados = doc.data();
          equipe.push({ id: doc.id, ...dados });
        });

        // Ordena por ordem alfabética para deixar o Select organizado
        equipe.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        setListaProfissionais(equipe);
        
      } catch (error) {
        console.error("Erro ao carregar a equipe multiprofissional:", error);
      }
    };

    // 🚨 AQUI ESTÁ O PASSO 3: O GATILHO QUE DISPARA A FUNÇÃO AO ABRIR O SISTEMA
    buscarEquipeMultiprofissional();
  }, []);

  // Função para organizar os dados e abrir o modal da escala específica
  const abrirAuditoriaEscala = (nomeEscala, nomePaciente, dadosEscala) => {
    if (!dadosEscala) return;
    setModalEscala({
      titulo: nomeEscala,
      paciente: nomePaciente,
      score: dadosEscala.score || dadosEscala.pontuacao || dadosEscala.total || 'N/D',
      respostas: dadosEscala.respostas || dadosEscala.detalhes || dadosEscala // Flexível para o formato que o senhor salvou
    });
  };

   const abrirHistoricoEscalas = (tipo, paciente) => {
    setModalHistorico({ isOpen: true, tipo, paciente });
  };

  // Calcula a epidemiologia real baseada no que veio do Firebase + NursingDashboard
    const ocorrenciasPorTipo = listaEventos.reduce((acc, evento) => {
      
      // 1. O sistema tenta ler o nome padrão do evento
      let nomeCategoria = evento.tipoEvento || evento.tipo;

      // 2. O PULO DO GATO (Integração com a Enfermagem): 
      // Se não tem nome, mas tem a marcação de 'incidência' do painel de curativos, nós o batizamos corretamente.
      if (!nomeCategoria) {
        if (evento.origem === 'incidencia' || evento.lesao) {
          nomeCategoria = "LPP (Adquirida na UTI)";
        } else {
          nomeCategoria = "Registro Incompleto"; 
        }
      }

      // 3. Soma na contagem
      acc[nomeCategoria] = (acc[nomeCategoria] || 0) + 1;
      return acc;
    }, {});
    
    const dadosCategorias = Object.keys(ocorrenciasPorTipo).map(tipo => ({
      categoria: tipo,
      ocorrencias: ocorrenciasPorTipo[tipo]
    })).sort((a, b) => b.ocorrencias - a.ocorrencias); // Ordena do maior para o menor

    const totalEventos = listaEventos.length;
    const eventosGraves = listaEventos.filter(e => e.grauDano === 'Grave' || e.grauDano === 'Óbito').length;
    const investigacoesPendentes = listaEventos.filter(e => e.statusAnalise === 'Pendente NSP' || e.statusAnalise === 'Em Análise').length;
    const maiorIncidencia = dadosCategorias.length > 0 ? dadosCategorias[0].categoria : 'Nenhum';

// =========================================================
  // 3. CÁLCULOS (useMemo) - A INTELIGÊNCIA (DADOS PROCESSADOS)
  // =========================================================
  
  // =========================================================
  // ALERTAS DO CABEÇALHO (FILTRO DIÁRIO)
  // =========================================================
  const alertasHeader = useMemo(() => {
    // 1. Pega a data de hoje no fuso local para comparação exata
    const hoje = new Date();
    const diaHoje = hoje.getDate();
    const mesHoje = hoje.getMonth();
    const anoHoje = hoje.getFullYear();

    // 2. Filtramos quem bate exatamente com o dia de hoje
    const eventosDeHoje = listaEventosAdversos.filter(evento => {
      // Busca a data de onde quer que ela tenha vindo (Notificação ou Enfermagem)
      const dataBruta = evento.dataHoraOcorrencia || evento.dataEvento || evento.dataRegistro;
      
      if (!dataBruta) return false;
      
      let dataObj;
      
      // Se for um Timestamp nativo do Firebase
      if (dataBruta.toDate) {
        dataObj = dataBruta.toDate();
      } else {
        // Se for uma String (ex: 2026-05-03)
        dataObj = new Date(dataBruta);
      }

      // Se por algum motivo for uma data inválida, ignoramos
      if (isNaN(dataObj.getTime())) return false;

      // 3. Compara cirurgicamente Dia, Mês e Ano (ignora as horas e os problemas de String)
      return (
        dataObj.getDate() === diaHoje &&
        dataObj.getMonth() === mesHoje &&
        dataObj.getFullYear() === anoHoje
      );
    }).length;

    return {
      eventosHoje: eventosDeHoje,
      pendenciasRH: metricasEquipe.pendentes || 0 
    };
  }, [listaEventosAdversos, metricasEquipe.pendentes]);

  // =========================================================================
  // 🛡️ MOTOR DE AUDITORIA E RASTREABILIDADE (GOVERNANÇA CLÍNICA)
  // =========================================================================
  const registarLogAuditoria = async (acao, detalhes, leitoAlvo = "Sistema", pacienteAlvo = "N/A") => {
    try {
      // 1. Identifica quem está a executar a ação (Ajuste para a sua variável de utilizador)
      const nomeUtilizador = userProfile?.nome || "Utilizador Desconhecido";
      const perfilUtilizador = userProfile?.perfil || userProfile?.role || "Sem Perfil";

      // 2. Aponta para a coleção isolada (leve e barata)
      const logsRef = collection(db, "logs_auditoria");

      // 3. Guarda o evento sem atrapalhar o fluxo da aplicação
      await addDoc(logsRef, {
        timestampServidor: serverTimestamp(), // Carimbo de tempo inviolável da Google
        dataLocalFormata: new Date().toLocaleString('pt-PT'), // Para leitura fácil no ecrã
        utilizador: nomeUtilizador,
        perfil: perfilUtilizador,
        leito: leitoAlvo,
        paciente: pacienteAlvo,
        acao: acao,
        detalhes: detalhes
      });
      
      console.log(`[AUDITORIA] Registado com sucesso: ${acao}`);

    } catch (error) {
      // Se a auditoria falhar (ex: falha rápida de rede), não quebra a app
      console.error("Erro ao gravar log de auditoria:", error);
    }
  };

  // ================================================================
  // 🔥 MOTOR OPERACIONAL E FLUXO (ÚLTIMOS 30 DIAS + FILTRO DE MORADOR)
  // ================================================================
  const metricasOperacionais = useMemo(() => {
    // 1. Descobrir a verdadeira capacidade instalada (Ignorando Bloqueados e Moradores)
    const leitosValidos = leitosConfig && leitosConfig.length > 0
      ? leitosConfig.filter(l => !l.bloqueado && !l.ignorarEstatistica).length
      : 10; // Fallback seguro para 10 leitos

    // Trava de segurança: se a UTI inteira for bloqueada, evita divisão por zero na matemática
    const leitosEstatisticos = leitosValidos > 0 ? leitosValidos : 1;

    if (!listaCenso.length && !listaHistorico.length) {
      return { ocupacao: "0.0", giro: "0.0", los: "0.0", saidasTotais: 0 };
    }

    const hoje = new Date();
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(hoje.getDate() - 30);

    const parseData = (dataStr) => {
      if (!dataStr) return new Date(0);
      if (dataStr.includes && dataStr.includes('/')) {
        const parts = dataStr.split(' ')[0].split('/');
        if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
      }
      return new Date(dataStr);
    };

    // 2. TAXA DE OCUPAÇÃO (Baseado no Censo Diário)
    let totalPacientesDia30d = 0;

    listaCenso.forEach(dia => {
      const dataCenso = parseData(dia.data || dia.idRegistro || dia.id);
      if (dataCenso >= trintaDiasAtras && dataCenso <= hoje) {
        totalPacientesDia30d += (Number(dia.totalLeitosOcupados) || 0);
      }
    });

    // Capacidade da janela de 30 dias usando apenas os leitos QUE PRODUZEM
    const capacidadeInstalada30d = leitosEstatisticos * 30; 
    let ocupacaoCalc = totalPacientesDia30d > 0 ? ((totalPacientesDia30d / capacidadeInstalada30d) * 100).toFixed(1) : "0.0";
    if (parseFloat(ocupacaoCalc) > 100) ocupacaoCalc = "100.0"; // Trava para não ultrapassar 100%

    // 3. GIRO, LOS (Tempo Médio) E SAÍDAS
    let totalSaidas30d = 0;
    let somaDiasInternacao30d = 0;

    listaHistorico.forEach(pac => {
      const dataEntrada = parseData(pac.dataEntrada || pac.dataAdmissao);
      const dataSaida = parseData(pac.dataSaida || pac.dataDesfecho);

      // Avalia apenas quem SAIU nos últimos 30 dias
      if (dataSaida >= trintaDiasAtras && dataSaida <= hoje) {
        totalSaidas30d++;

        let dias = (dataSaida - dataEntrada) / (1000 * 60 * 60 * 24);
        if (dias < 1) dias = 1; // SUS: internou e saiu no mesmo dia = 1 diária
        somaDiasInternacao30d += dias;
      }
    });

    // Giro = Total de Saídas / Leitos Válidos (Mostra a verdadeira rotatividade da equipe)
    const giroCalc = (totalSaidas30d / leitosEstatisticos).toFixed(1);

    // LOS = Soma de dias / Total de Saídas
    const losCalc = totalSaidas30d > 0 ? (somaDiasInternacao30d / totalSaidas30d).toFixed(1) : "0.0";

    return {
      ocupacao: ocupacaoCalc,
      giro: giroCalc,
      los: losCalc,
      saidasTotais: totalSaidas30d,
      pacientesDia: totalPacientesDia30d 
    };
  }, [listaCenso, listaHistorico, leitosConfig]);

  // =========================================================
  // 3. MOTOR DE TENDÊNCIAS (BLINDADO - COM SMR E MORTALIDADE)
  // =========================================================
  const dadosTendencia = useMemo(() => {
    if (!listaCenso || listaCenso.length === 0) return [];

    const readmissoesPorDia = {};
    const admissoesPorDia = {};
    const obitosPorDia = {};
    const saidasPorDia = {};
    const mortPrevistaPorDia = {}; // 💡 NOVO: Guarda o risco do SAPS 3
    
    const safeGetDateMs = (dateVal) => {
      if (!dateVal) return 0;
      const str = String(dateVal).trim();
      if (str.includes('T')) return new Date(str).getTime();
      if (str.includes('/')) {
        const p = str.split('/');
        return new Date(`${p[2]}-${p[1]}-${p[0]}T12:00:00Z`).getTime();
      }
      return new Date(`${str}T12:00:00Z`).getTime();
    };

    const getPadraoDate = (dateVal) => {
      if (!dateVal) return null;
      const str = String(dateVal).trim();
      if (str.includes('T')) return str.substring(0, 10);
      if (str.includes('/')) {
        const p = str.split('/');
        return `${p[2]}-${p[1]}-${p[0]}`;
      }
      return str.substring(0, 10);
    };

    // =========================================================
    // 🔍 1. A CAÇADA AOS ÓBITOS E AO RISCO (Cópia fiel do Card)
    // =========================================================
    if (typeof listaHistorico !== 'undefined') {
      listaHistorico.forEach(doc => {
        const dataSaidaStr = getPadraoDate(doc.dataSaidaISO || doc.dataSaida);
        
        if (dataSaidaStr) {
          saidasPorDia[dataSaidaStr] = (saidasPorDia[dataSaidaStr] || 0) + 1;
          
          // O mesmo leitor de óbitos do Card original
          const statusReal = doc.indicadores?.resultado || doc.desfecho || doc.status || "";
          const desfecho = String(statusReal).toLowerCase();
          const isObito = desfecho.includes('óbito') || desfecho.includes('obito');
          
          if (isObito) {
            obitosPorDia[dataSaidaStr] = (obitosPorDia[dataSaidaStr] || 0) + 1;
          }

          // O mesmo leitor de SAPS do Card original
          const saps3Prob = doc.saps3?.lockedProb || doc.backupProntuario?.saps3?.lockedProb || doc.indicadores?.saps3?.lockedProb;
          
          if (saps3Prob) {
            const probDecimal = parseFloat(saps3Prob) / 100;
            mortPrevistaPorDia[dataSaidaStr] = (mortPrevistaPorDia[dataSaidaStr] || 0) + probDecimal;
          }
        }
      });
    }

    if (typeof listaCenso !== 'undefined') {
      listaCenso.forEach(dia => {
        const dStr = getPadraoDate(dia.data);
        const df = String(dia.desfecho || "").toLowerCase();
        if (dStr && (df.includes('óbito') || df.includes('obito') || Number(dia.obitos) > 0)) {
          obitosPorDia[dStr] = (obitosPorDia[dStr] || 0) + (Number(dia.obitos) > 0 ? Number(dia.obitos) : 1);
        }
      });
    }

    // =========================================================
    // 🔍 2. A CAÇADA ÀS READMISSÕES (Marcando no dia do Retorno)
    // =========================================================
    const porPaciente = {};
    if (typeof listaHistorico !== 'undefined') {
      
      // 🛡️ Função blindada para converter qualquer data do Firebase
      const safeDate = (val) => {
        if (!val) return new Date(0);
        if (typeof val.toDate === 'function') return val.toDate();
        if (val.seconds) return new Date(val.seconds * 1000);
        if (typeof val === 'string' && val.includes('/')) {
          const p = val.split(' ')[0].split('/');
          if (p.length === 3) return new Date(`${p[2]}-${p[1]}-${p[0]}T12:00:00`);
        }
        return new Date(val);
      };

      listaHistorico.forEach(doc => {
        const id = doc.nome || doc.nomePaciente;
        // Agrupa pelo nome, ignorando leitos vazios
        if (id && id !== "Não Informado" && id !== "Paciente Internado") {
          if (!porPaciente[id]) porPaciente[id] = [];
          porPaciente[id].push(doc);
        }
      });

      Object.values(porPaciente).forEach(estadias => {
        if (estadias.length > 1) {
          
          // 1. Ordena cronologicamente caçando a entrada em todas as gavetas possíveis
          estadias.sort((a, b) => {
            const entradaA = a.dataInternacaoISO || a.dataEntrada || a.dataInternacao || a.admissaoMedica?.dataRegistroAdmissao;
            const entradaB = b.dataInternacaoISO || b.dataEntrada || b.dataInternacao || b.admissaoMedica?.dataRegistroAdmissao;
            return safeDate(entradaA).getTime() - safeDate(entradaB).getTime();
          });
          
          for (let i = 1; i < estadias.length; i++) {
            // 2. Pega a saída da internação ANTERIOR
            const saidaAnterior = estadias[i-1].dataSaidaISO || estadias[i-1].dataSaida || estadias[i-1].backupProntuario?.dataSaida;
            if (!saidaAnterior) continue; 
            
            // 3. Pega a entrada da internação ATUAL (A readmissão na UTI)
            const entradaAtual = estadias[i].dataInternacaoISO || estadias[i].dataEntrada || estadias[i].dataInternacao || estadias[i].admissaoMedica?.dataRegistroAdmissao;
            
            const dataAlta = safeDate(saidaAnterior);
            const dataReadmissao = safeDate(entradaAtual);
            
            // Proteção extra: se a data for inválida, pula
            if (dataAlta.getTime() === 0 || dataReadmissao.getTime() === 0) continue;

            // 4. Calcula a diferença em horas absolutas
            const diffHoras = Math.abs((dataReadmissao - dataAlta) / (1000 * 60 * 60));

            // 5. Se voltou em menos de 48h, pinta o ponto no gráfico no DIA DO RETORNO
            if (diffHoras <= 48) {
              const diaRetornoStr = typeof getPadraoDate === 'function' ? getPadraoDate(entradaAtual) : null;
              if (diaRetornoStr) {
                readmissoesPorDia[diaRetornoStr] = (readmissoesPorDia[diaRetornoStr] || 0) + 1;
              }
            }
          }
        }
      });
    }

    // =========================================================
    // 📊 3. DESENHANDO A LINHA DO TEMPO (Restaurando Original)
    // =========================================================
    
    // 💡 INTERCEPTADOR MENSAL: Se for Giro ou LOS, muda o eixo X para meses!
    if (['giroLeito', 'los'].includes(indicadorTendencia)) {
      const dadosMensais = {};
      
      if (typeof listaHistorico !== 'undefined') {
        listaHistorico.forEach(doc => {
          const saidaMs = safeGetDateMs(doc.dataSaidaISO || doc.dataSaida);
          if (!saidaMs) return;
          
          const d = new Date(saidaMs);
          const mesAno = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
          
          if (!dadosMensais[mesAno]) dadosMensais[mesAno] = { altas: 0, somaDias: 0 };
          dadosMensais[mesAno].altas += 1;
          
          const entMs = safeGetDateMs(doc.dataInternacaoISO || doc.dataInternacao || doc.dataEntrada);
          if (entMs) {
            const diasInternado = Math.max(1, (saidaMs - entMs) / (1000 * 60 * 60 * 24));
            dadosMensais[mesAno].somaDias += diasInternado;
          }
        });
      }
      
      // Converte para o formato do gráfico e ordena cronologicamente
      return Object.keys(dadosMensais).sort((a, b) => {
        const [ma, ya] = a.split('/');
        const [mb, yb] = b.split('/');
        return new Date(`${ya}-${ma}-01`).getTime() - new Date(`${yb}-${mb}-01`).getTime();
      }).map(mesAno => {
        const dados = dadosMensais[mesAno];
        let valor = 0;
        if (indicadorTendencia === 'los') {
          valor = dados.altas > 0 ? dados.somaDias / dados.altas : 0;
        } else if (indicadorTendencia === 'giroLeito') {
          valor = dados.altas / (capacidadeInput || 10);
        }
        return {
          name: mesAno, // O Eixo X agora mostrará ex: "05/2026"
          valor: Number(valor.toFixed(1))
        };
      });
    }

    // 1. Recolhe os dias corretos para desenhar o gráfico
    const diasComDados = new Set();
    
    if (typeof listaCenso !== 'undefined') {
      listaCenso.forEach(dia => {
        const dp = getPadraoDate(dia.data);
        if (dp) diasComDados.add(dp);
      });
    }

    // 2. Se for um indicador clínico, "puxa" também os dias que tiveram eventos mas esqueceram do Censo
    if (['mortalidade', 'readmissao', 'smr'].includes(indicadorTendencia)) {
      Object.keys(obitosPorDia).forEach(d => diasComDados.add(d));
      Object.keys(readmissoesPorDia).forEach(d => diasComDados.add(d));
    }

    // 3. Filtra pelo calendário selecionado e ordena cronologicamente
    const diasParaRenderizar = Array.from(diasComDados)
      .filter(d => d >= dataInicio && d <= dataFim)
      .sort((a, b) => a.localeCompare(b));

    return diasParaRenderizar.map(dataPadrao => {
      const diaCenso = listaCenso.find(dia => getPadraoDate(dia.data) === dataPadrao) || {};

      let valorCalculado = 0;
      const pacientesOcupando = Number(diaCenso.totalLeitosOcupados) || 0;

      if (indicadorTendencia === 'mortalidade') {
        const obitosNesteDia = obitosPorDia[dataPadrao] || 0;
        const saidasNesteDia = saidasPorDia[dataPadrao] || 1; 
        valorCalculado = obitosNesteDia > 0 ? (obitosNesteDia / saidasNesteDia) * 100 : 0;
        
      } else if (indicadorTendencia === 'readmissao') {
        valorCalculado = readmissoesPorDia[dataPadrao] || 0;
        
      } else if (indicadorTendencia === 'smr') {
        const obitosNesteDia = obitosPorDia[dataPadrao] || 0;
        const mortPrevNesteDia = mortPrevistaPorDia[dataPadrao] || 0;
        valorCalculado = mortPrevNesteDia > 0 ? (obitosNesteDia / mortPrevNesteDia) : 0;

      } else if (indicadorTendencia === 'ocupacao') {
        valorCalculado = ((pacientesOcupando) / (capacidadeInput || 10)) * 100;
        
      } else if (indicadorTendencia === 'identificacao') {
        valorCalculado = pacientesOcupando > 0 ? ((Number(diaCenso.pacientesIdentificados) || 0) / pacientesOcupando) * 100 : 0;
        
      } else if (indicadorTendencia === 'utilizacaoVM') {
        valorCalculado = pacientesOcupando > 0 ? ((Number(diaCenso.pacientesEmVM) || 0) / pacientesOcupando) * 100 : 0;
        
      } else if (indicadorTendencia === 'utilizacaoAcessoCentral') {
        const cvc = Number(diaCenso.pacientesComCVC) || 0;
        const shiley = Number(diaCenso.pacientesComShiley) || 0;
        valorCalculado = pacientesOcupando > 0 ? (Math.min(cvc + shiley, pacientesOcupando) / pacientesOcupando) * 100 : 0;
        
      } else if (indicadorTendencia === 'utilizacaoSVD') {
        valorCalculado = pacientesOcupando > 0 ? ((Number(diaCenso.pacientesComSVD) || 0) / pacientesOcupando) * 100 : 0;
        
      } else {
        valorCalculado = Number(diaCenso[indicadorTendencia]) || 0;
      }

      return {
        name: new Date(dataPadrao + "T12:00:00Z").toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        valor: indicadorTendencia === 'smr' ? Number(Number(valorCalculado).toFixed(2)) : Number(Number(valorCalculado).toFixed(1))
      };
    });
  }, [listaCenso, dataInicio, dataFim, indicadorTendencia, capacidadeInput, typeof listaHistorico !== 'undefined' ? listaHistorico : [], typeof patients !== 'undefined' ? patients : []]);

  // ================================================================
  // 🔥 MOTOR DO MAPA EPIDEMIOLÓGICO CORRIGIDO (RASTREAMENTO MÁXIMO)
  // ================================================================
  const dadosEpidemiologicos = useMemo(() => {
    const todasInternacoes = [...listaHistorico]; 

    const parseData = (dataStr) => {
      if (!dataStr) return new Date();
      if (typeof dataStr.toDate === 'function') return dataStr.toDate();
      if (dataStr.seconds) return new Date(dataStr.seconds * 1000);
      
      if (typeof dataStr === 'string') {
        if (dataStr.includes('/')) {
          const parts = dataStr.split(' ')[0].split('/');
          return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 12, 0, 0);
        }
        if (dataStr.length >= 10 && dataStr.includes('-')) {
          const parts = dataStr.split('T')[0].split('-');
          return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
        }
      }
      return new Date(dataStr);
    };

    // -------------------------------------------------------------
    // 1. DADOS PARA O GRÁFICO DE PIZZA E TABELA (MÊS SELECIONADO)
    // -------------------------------------------------------------
    const [anoFiltro, mesFiltro] = mesFiltroOrigem.split('-');
    
    let totaisPizza = {};
    let listaTabela = [];

    todasInternacoes.forEach(pac => {
      const dataEntrada = parseData(pac.dataEntrada || pac.dataInternacao);
      if (dataEntrada.getFullYear() === parseInt(anoFiltro) && (dataEntrada.getMonth() + 1) === parseInt(mesFiltro)) {

        // 🔍 DETECTIVE DE PROCEDÊNCIA: Vasculha todas as estruturas possíveis do objeto
        let rawProcedencia = 
          pac.procedencia || 
          pac.origem || 
          pac.admissionData?.origem || 
          pac.admissionData?.procedencia || 
          "";

        // Limpa espaços vazios (como o " " que usamos de gatilho) ou textos inválidos
        let procedencia = String(rawProcedencia).trim();
        if (!procedencia || procedencia.toLowerCase() === "undefined" || procedencia === "null") {
          procedencia = "Não Informada";
        }
        
        if (!totaisPizza[procedencia]) totaisPizza[procedencia] = 0;
        totaisPizza[procedencia]++;

        listaTabela.push({
          nome: pac.nomePaciente || pac.nome,
          data: dataEntrada.toLocaleDateString('pt-BR'),
          procedencia: procedencia,
          status: pac.status || (pac.dataSaida ? "Alta/Óbito" : "Internado")
        });
      }
    });

    const dadosPizza = Object.keys(totaisPizza).map(key => ({
      name: key,
      value: totaisPizza[key]
    })).sort((a, b) => b.value - a.value);

    // -------------------------------------------------------------
    // 2. DADOS PARA O GRÁFICO DE LINHA (TENDÊNCIA 12 MESES)
    // -------------------------------------------------------------
    const mesesArray = [];
    const agrupamento12m = {};
    const hoje = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      let mesStr = d.toLocaleString('pt-BR', { month: 'short' });
      mesStr = mesStr.charAt(0).toUpperCase() + mesStr.slice(1, 3);
      const anoStr = d.getFullYear().toString().slice(-2);
      
      const label = `${mesStr}/${anoStr}`;
      mesesArray.push({ label, ano: d.getFullYear(), mes: d.getMonth() + 1 });
      agrupamento12m[label] = { ariquemes: 0, regional: 0, total: 0 };
    }

    todasInternacoes.forEach(pac => {
      const dataEntrada = parseData(pac.dataEntrada || pac.dataInternacao);
      if (dataEntrada.getFullYear() < 2000) return;

      let mesStr = dataEntrada.toLocaleString('pt-BR', { month: 'short' });
      mesStr = mesStr.charAt(0).toUpperCase() + mesStr.slice(1, 3);
      const anoStr = dataEntrada.getFullYear().toString().slice(-2);
      const label = `${mesStr}/${anoStr}`;

      if (agrupamento12m[label]) {
        let rawProcedencia = pac.procedencia || pac.origem || pac.admissionData?.origem || pac.admissionData?.procedencia || "";
        let procedencia = String(rawProcedencia).trim().toLowerCase();
        
        agrupamento12m[label].total++;
        
        if (procedencia.includes("ariquemes")) {
          agrupamento12m[label].ariquemes++;
        } else if (procedencia && procedencia !== "não informada" && procedencia !== "null" && procedencia !== "undefined") {
          agrupamento12m[label].regional++;
        }
      }
    });

    const dadosLinha = mesesArray.map(item => {
      const dados = agrupamento12m[item.label];
      const pctAriquemes = dados.total > 0 ? ((dados.ariquemes / dados.total) * 100).toFixed(1) : 0;
      const pctRegional = dados.total > 0 ? ((dados.regional / dados.total) * 100).toFixed(1) : 0;
      
      return {
        name: item.label,
        "Ariquemes (%)": Number(pctAriquemes),
        "Outros Municípios (%)": Number(pctRegional),
        totalAdmissoes: dados.total
      };
    });

    return { dadosPizza, listaTabela, dadosLinha };
  }, [listaHistorico, mesFiltroOrigem]);

  // Cores dinâmicas para o gráfico de pizza
  const CORES_PIZZA = ['#00205B', '#11CAA0', '#D97706', '#64748B', '#3B82F6', '#8B5CF6', '#EC4899', '#F43F5E'];

  // ================================================================
  // 🔥 MOTOR DO GRÁFICO: SMR DOS ÚLTIMOS 12 MESES (ALINHADO AO FIREBASE)
  // ================================================================
  const dadosSMRAnual = useMemo(() => {
    if (!listaHistorico || listaHistorico.length === 0) return [];

    // Função auxiliar ultra-blindada (Suporta String e Timestamp do Firebase)
    const parseData = (dataStr) => {
      if (!dataStr) return new Date(0);
      if (typeof dataStr.toDate === 'function') return dataStr.toDate(); // Se for Timestamp Firebase
      if (dataStr.seconds) return new Date(dataStr.seconds * 1000);       // Se for objeto de segundos
      if (typeof dataStr === 'string' && dataStr.includes('/')) {
        const parts = dataStr.split(' ')[0].split('/');
        if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
      }
      return new Date(dataStr);
    };

    // 1. Cria o esqueleto dos últimos 12 meses
    const mesesArray = [];
    const agrupamento = {};
    const hoje = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      let mesStr = d.toLocaleString('pt-BR', { month: 'short' });
      mesStr = mesStr.charAt(0).toUpperCase() + mesStr.slice(1, 3);
      const anoStr = d.getFullYear().toString().slice(-2);
      
      const label = `${mesStr}/${anoStr}`;
      mesesArray.push(label);
      agrupamento[label] = { esperados: 0, observados: 0 };
    }

    // 2. Distribui os pacientes do Firebase nos meses corretos
    listaHistorico.forEach(pac => {
      // Puxa a data do root ou de dentro do mapa de indicadores
      const dataFinalStr = pac.dataSaida || pac.dataDesfecho || pac.dataEntrada || pac.indicadores?.dataSaida;
      const dataSaida = parseData(dataFinalStr);
      if (dataSaida.getFullYear() < 2000) return;

      let mesStr = dataSaida.toLocaleString('pt-BR', { month: 'short' });
      mesStr = mesStr.charAt(0).toUpperCase() + mesStr.slice(1, 3);
      const anoStr = dataSaida.getFullYear().toString().slice(-2);
      const label = `${mesStr}/${anoStr}`;

      if (agrupamento[label]) {
        // Captura o saps3 direto do root (conforme o print do seu banco)
        const saps3Prob = pac.saps3?.lockedProb || pac.backupProntuario?.saps3?.lockedProb || pac.indicadores?.saps3?.lockedProb;
        if (saps3Prob) {
          // Troca vírgula por ponto para evitar o NaN
          const probDecimal = parseFloat(String(saps3Prob).replace(',', '.'));
          
          if (!isNaN(probDecimal) && probDecimal > 0) {
            agrupamento[label].esperados += (probDecimal / 100);
          }

          // Alinhamento com pac.indicadores.resultado do seu Firebase
          const statusReal = pac.indicadores?.resultado || pac.desfecho || pac.status || "";
          const desfecho = String(statusReal).toLowerCase();
          if (desfecho.includes('óbito') || desfecho.includes('obito')) {
            agrupamento[label].observados += 1;
          }
        }
      }
    });

    // 3. Executa a divisão (SMR)
    return mesesArray.map(mes => {
      const dadosMes = agrupamento[mes];
      let smrCalculado = 0;
      if (dadosMes.esperados > 0) {
        smrCalculado = Number((dadosMes.observados / dadosMes.esperados).toFixed(2));
      }
      return { mes: mes, smr: smrCalculado };
    });

  }, [listaHistorico]);

    const metricasQualidade = useMemo(() => {
    if (!listaCenso.length && !listaHistorico.length) {
      return { taxaReadmissao: "0.0", taxaIdentificacao: "0.0", mortalidadeBruta: "0.0", mortalidadeEsperada: "0.0", smr: "0.00" };
    }

    const hoje = new Date();
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(hoje.getDate() - 30);

    const parseData = (dataStr) => {
      if (!dataStr) return new Date(0);
      if (typeof dataStr.toDate === 'function') return dataStr.toDate();
      if (dataStr.seconds) return new Date(dataStr.seconds * 1000);
      if (typeof dataStr === 'string' && dataStr.includes('/')) {
        const parts = dataStr.split(' ')[0].split('/');
        if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
      }
      return new Date(dataStr);
    };

    // ================================================================
    // 1. MOTOR DE DESFECHOS E SMR (Blindado contra Pacientes Ativos)
    // ================================================================
    let totalDesfechos30d = 0;
    let obitosTotais30d = 0;
    let pacientesComSaps30d = 0;
    let obitosEsperadosSaps30d = 0;
    let obitosObservadosSaps30d = 0;

    listaHistorico.forEach(pac => {
      // 🚨 TRAVA DA AMIB: Se o paciente ainda está na cama, ele NÃO entra nas métricas de desfecho!
      if (pac.status === 'Internado' || (!pac.dataSaidaISO && !pac.dataSaida && !pac.indicadores?.dataSaida)) {
        return; 
      }

      const dataFinalStr = pac.dataSaidaISO || pac.dataSaida || pac.indicadores?.dataSaida;
      const dataPac = parseData(dataFinalStr);
      
      if (dataPac >= trintaDiasAtras && dataPac <= hoje) {
        totalDesfechos30d++; // Agora, só conta as saídas reais (Altas/Óbitos)
        
        const statusReal = pac.indicadores?.resultado || pac.desfecho || pac.status || "";
        const desfecho = String(statusReal).toLowerCase();
        const isObito = desfecho.includes('óbito') || desfecho.includes('obito');
        
        if (isObito) obitosTotais30d++;

        // Extrai o SAPS do Histórico (agora garantido pelo seu botão de alta novo)
        const sapsRaw = pac.indicadores?.mortalidadePrevista || pac.backupProntuario?.saps3?.lockedProb || pac.saps3?.lockedProb;
        
        if (sapsRaw) {
          const probDecimal = parseFloat(String(sapsRaw).replace(',', '.'));
          if (!isNaN(probDecimal) && probDecimal > 0) {
            pacientesComSaps30d++;
            obitosEsperadosSaps30d += (probDecimal / 100);
            if (isObito) obitosObservadosSaps30d++;
          }
        }
      }
    });

    // ================================================================
    // 2. MOTOR DE READMISSÃO E 3. MOTOR DE IDENTIFICAÇÃO (Original)
    // ================================================================
    let contagemReadmissao30d = 0;
    
    const porPaciente = listaHistorico.reduce((acc, doc) => {
      const id = doc.nome;
      if (id && id !== "Não Informado" && id !== "Paciente Internado") {
        if (!acc[id]) acc[id] = [];
        acc[id].push(doc);
      }
      return acc;
    }, {});

    Object.values(porPaciente).forEach(estadias => {
      if (estadias.length > 1) {
        estadias.sort((a, b) => {
           const timeA = parseData(a.dataInternacaoISO || a.dataEntrada).getTime();
           const timeB = parseData(b.dataInternacaoISO || b.dataEntrada).getTime();
           return timeA - timeB;
        });
        
        for (let i = 1; i < estadias.length; i++) {
          const saidaBrutaAnterior = estadias[i-1].dataSaida;
          if (!saidaBrutaAnterior) continue; 
          
          const altaAnterior = parseData(saidaBrutaAnterior);
          const entradaNova = parseData(estadias[i].dataInternacaoISO || estadias[i].dataEntrada);
          const diffHoras = Math.abs((entradaNova - altaAnterior) / (1000 * 60 * 60));

          if (entradaNova >= trintaDiasAtras && entradaNova <= hoje) {
            if (diffHoras <= 48) {
              contagemReadmissao30d++;
            }
          }
        }
      }
    });

    let totalOcupados30d = 0;
    let totalIdentificados30d = 0;
    
    listaCenso.forEach(dia => {
      const dataCenso = parseData(dia.data || dia.idRegistro || dia.id);
      if (dataCenso >= trintaDiasAtras && dataCenso <= hoje) {
        totalOcupados30d += (Number(dia.totalLeitosOcupados) || 0);
        totalIdentificados30d += (Number(dia.pacientesIdentificados) || 0);
      }
    });

    // ================================================================
    // 4. MATEMÁTICA FINAL
    // ================================================================
    const mortalidadeBrutaCalc = totalDesfechos30d > 0 ? ((obitosTotais30d / totalDesfechos30d) * 100).toFixed(1) : "0.0";
    const mortalidadeEsperadaCalc = pacientesComSaps30d > 0 ? ((obitosEsperadosSaps30d / pacientesComSaps30d) * 100).toFixed(1) : "0.0";
    const smrCalculado = obitosEsperadosSaps30d > 0 ? (obitosObservadosSaps30d / obitosEsperadosSaps30d).toFixed(2) : "0.00";
    const taxaReadmReal = totalDesfechos30d > 0 ? ((contagemReadmissao30d / totalDesfechos30d) * 100).toFixed(1) : "0.0";
    const taxaID30d = totalOcupados30d > 0 ? ((totalIdentificados30d / totalOcupados30d) * 100).toFixed(1) : "0.0";

    return {
      mortalidadeBruta: mortalidadeBrutaCalc,
      mortalidadeEsperada: mortalidadeEsperadaCalc,
      smr: smrCalculado,
      taxaReadmissao: taxaReadmReal,
      taxaIdentificacao: taxaID30d
    };
  }, [listaCenso, listaHistorico]);

  // 2. MOTOR DE BUSCA E CÁLCULO (Versão Consolidada e Unificada)
  useEffect(() => {
    const carregarIndicadores = async () => {
      try {
        setLoadingGraficos(true);
        const mesAtual = new Date().toISOString().substring(0, 7);
        
        // 🛡️ FUNÇÃO AUXILIAR DE DATA
        const parseDataFuso = (dataStr) => {
          if (!dataStr) return new Date();
          if (typeof dataStr.toDate === 'function') return dataStr.toDate();
          if (dataStr.seconds) return new Date(dataStr.seconds * 1000);
          if (typeof dataStr === 'string') {
            if (dataStr.includes('/')) {
              const parts = dataStr.split(' ')[0].split('/');
              return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 12, 0, 0);
            }
            if (dataStr.length >= 10 && dataStr.includes('-')) {
              const parts = dataStr.split('T')[0].split('-');
              return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
            }
          }
          return new Date(dataStr);
        };

        let arrayHistoricoCompleto = [];
        const consolidadoMensal = {};
        let altasMes = 0, obitosMes = 0, somaProbMes = 0, sapsCalculadosMes = 0;
        let somaDiasInternacaoMes = 0, somaLeitosCensoMes = 0, somaIdentificadosCensoMes = 0;
        let diasVMMes = 0, diasCVCMes = 0, diasSVDMes = 0, diasShileyMes = 0;
        let countAlta = 0, countObito = 0, countTransf = 0;
        const historicoPacientes = {}; 
        let readmissoes = 0;

        // --- BUSCAS NO FIREBASE ---
        const leitosSnap = await getDocs(collection(db, "leitos_uti"));
        const historicoSnap = await getDocs(collection(db, "internacoes_historico"));
        const censoSnap = await getDocs(collection(db, "censo_diario"));

        setListaCenso(censoSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // 1. Processar Leitos Ativos
        leitosSnap.forEach(l => {
          const dadosLeito = l.data();
          const temPacienteReal = dadosLeito.nomePaciente || dadosLeito.nome;
          
          if (dadosLeito.status !== 'Livre' && temPacienteReal) {
            arrayHistoricoCompleto.push({
              id: l.id,
              nome: temPacienteReal,
              dataEntrada: dadosLeito.dataEntrada || dadosLeito.dataInternacao || dadosLeito.admitidoEm,
              dataInternacaoISO: dadosLeito.dataInternacaoISO || null, // 👈 AGORA ELE PUXA O CARIMBO NOVO!
              dataSaida: null,
              procedencia: String(dadosLeito.procedencia || dadosLeito.origem || "Não Informada").trim(),
              status: "Internado"
            });
          }
        });

        // 2. Processar Histórico
        historicoSnap.forEach((doc) => {
          const h = doc.data();
          let origem = h.procedencia || h.origem || h.backupProntuario?.procedencia || h.backupProntuario?.origem || "Não Informada";

          arrayHistoricoCompleto.push({
            ...h, // 👈 A MÁGICA: Isso puxa TUDO do Firebase (incluindo o backupProntuario e saps3)
            id: doc.id,
            nome: h.nomePaciente || h.nome || h.backupProntuario?.nome || "Não Informado",
            dataEntrada: h.dataEntrada || h.dataInternacao,
            dataInternacaoISO: h.dataInternacaoISO || h.backupProntuario?.dataInternacaoISO || null,
            dataSaida: h.dataSaida,
            procedencia: String(origem).trim(),
            status: h.desfecho || "Alta/Óbito"
          });
          
          if (h.dataSaida) {
            const mesAno = h.dataSaida.substring(0, 7);
            if (!consolidadoMensal[mesAno]) consolidadoMensal[mesAno] = { mes: mesAno, somaLeitos: 0, somaVM: 0, somaID: 0, totalAltas: 0, totalObitos: 0, somaSapsProb: 0, sapsCount: 0 };
            
            consolidadoMensal[mesAno].totalAltas++;
            const foiObito = h.indicadores?.foiObito === 1 || h.indicators?.foiObito === 1;
            if (foiObito) consolidadoMensal[mesAno].totalObitos++;
            const prob = parseFloat(h.indicadores?.mortalidadePrevista || h.indicators?.mortalidadePrevista);
            if (!isNaN(prob) && prob > 0) { consolidadoMensal[mesAno].somaSapsProb += prob; consolidadoMensal[mesAno].sapsCount++; }

            if (mesAno === mesAtual) {
              altasMes++;
              if (foiObito) obitosMes++;
              if (h.dataEntrada && h.dataSaida) {
                let dias = Math.ceil(Math.abs(parseDataFuso(h.dataSaida) - parseDataFuso(h.dataEntrada)) / (1000 * 60 * 60 * 24));
                somaDiasInternacaoMes += (dias === 0 ? 1 : dias);
              }
              if (!isNaN(prob) && prob > 0) { somaProbMes += prob; sapsCalculadosMes++; }
              const desfecho = (h.destino || h.desfecho || '').toLowerCase();
              if (foiObito || desfecho.includes('óbito') || desfecho.includes('obito')) countObito++;
              else if (desfecho.includes('transfer') || desfecho.includes('hosp')) countTransf++;
              else countAlta++;
            }
          }

          if (h.cpf && h.cpf !== "000.000.000-00") {
            if (!historicoPacientes[h.cpf]) historicoPacientes[h.cpf] = [];
            historicoPacientes[h.cpf].push({ entrada: parseDataFuso(h.dataEntrada).getTime(), saida: parseDataFuso(h.dataSaida).getTime() });
          }
        });

        if (typeof setListaHistorico === 'function') setListaHistorico(arrayHistoricoCompleto);

        // 3. Processar Censo e Finalizar
        censoSnap.forEach(doc => {
            const c = doc.data();
            if (c.data) {
                const mesAno = c.data.substring(0, 7);
                if (consolidadoMensal[mesAno]) {
                    consolidadoMensal[mesAno].somaLeitos += (c.totalLeitosOcupados || 0);
                    consolidadoMensal[mesAno].somaVM += (c.pacientesEmVM || 0);
                    consolidadoMensal[mesAno].somaID += (c.pacientesIdentificados || 0);
                }
                if (mesAno === mesAtual) {
                    somaLeitosCensoMes += (c.totalLeitosOcupados || 0);
                    somaIdentificadosCensoMes += (c.pacientesIdentificados || 0);
                    diasVMMes += (c.pacientesEmVM || 0);
                    diasCVCMes += (c.pacientesComCVC || 0);
                    diasSVDMes += (c.pacientesComSVD || 0);
                    diasShileyMes += (c.pacientesComShiley || 0);
                }
            }
        });

        // Atualizações finais de estado... (O restante do seu código original pode ser mantido aqui)
        setDadosDispositivos([{ name: 'VMI', dias: diasVMMes, fill: '#3b82f6' }, { name: 'CVC', dias: diasCVCMes, fill: '#8b5cf6' }, { name: 'SVD', dias: diasSVDMes, fill: '#0ea5e9' }, { name: 'Shiley', dias: diasShileyMes, fill: '#f97316' }]);
        setDadosDesfechos([{ name: 'Alta Hospitalar', value: countAlta, color: '#10b981' }, { name: 'Óbito', value: countObito, color: '#ef4444' }, { name: 'Transferência', value: countTransf, color: '#f59e0b' }].filter(d => d.value > 0));
        setLoadingGraficos(false);
      } catch (error) {
        console.error("Erro:", error);
        setLoadingGraficos(false);
      }
    };
    carregarIndicadores();
  }, []);

  useEffect(() => {
    if (!db) return;
    
    // Busca todos os eventos adversos na nuvem
    const q = collection(db, "eventos_adversos");
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setListaEventosAdversos(eventos);
    });

    return () => unsubscribe();
  }, [db]);

  useEffect(() => {
  if (!db) return;
  const q = collection(db, "censo_diario");
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const dados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setListaCenso(dados);
  });
  return () => unsubscribe();
}, [db]);

  // Efeito para buscar Alertas do Header (Pendências RH + Eventos Adversos Reais)
  useEffect(() => {
    const buscarAlertasSincronizados = async () => {
      try {
        // --- PARTE 1: PENDÊNCIAS DE RH (PROFISSIONAIS) ---
        const profSnap = await getDocs(collection(db, "profissionais"));
        let countRH = 0;
        profSnap.forEach(doc => {
          const p = doc.data();
          const semVinculo = !p.vinculos || p.vinculos.length === 0;
          const naoAdmin = p.categoria !== "Administrador";
          if ((naoAdmin && semVinculo) || p.status === 'pendente' || p.aprovado === false) {
            countRH++;
          }
        });

        // --- PARTE 2: EVENTOS ADVERSOS (BASEADO NA SUA CONST) ---
        // Pegamos apenas o YYYY-MM-DD de hoje
        const hojeISO = new Date().toISOString().split('T')[0]; 
        
        const eventosSnap = await getDocs(collection(db, "eventos_adversos"));
        let countEventosHoje = 0;

        eventosSnap.forEach(doc => {
          const ev = doc.data();
          // Verificamos se a string dataEvento começa com a data de hoje
          if (ev.dataEvento && ev.dataEvento.startsWith(hojeISO)) {
            countEventosHoje++;
          }
        });

      } catch (error) {
        console.error("Erro na sincronização do Header:", error);
      }
    };

    buscarAlertasSincronizados();
    // Dica: Poderia colocar um setInterval aqui se quisesse que o número 
    // mudasse sem precisar dar refresh na página.
  }, []);

  // Carrega os leitos quando o gestor entra na tela de Configuração
  useEffect(() => {
    if (subViewEquipe === 'config') {
      const carregarLeitosConfig = async () => {
        const snap = await getDocs(collection(db, 'leitos_uti'));
        const leitos = [];
        snap.forEach(d => leitos.push({ id: d.id, ...d.data() }));
        
        // Ordena para Leito 1, Leito 2, etc.
        leitos.sort((a, b) => {
          const numA = parseInt(a.nome?.replace(/\D/g, '')) || 0;
          const numB = parseInt(b.nome?.replace(/\D/g, '')) || 0;
          return numA - numB;
        });
        
        setLeitosConfig(leitos);
        setCapacidadeInput(leitos.length > 0 ? leitos.length : 10);
      };
      carregarLeitosConfig();
    }
  }, [subViewEquipe]);

  // Efeito 3: Busca de Métricas da Equipe (Coleção Profissionais)
  useEffect(() => {
    // Só dispara a busca se o gestor estiver na aba 'equipe'
    if (activeView !== 'equipe') return;

    const buscarDadosEquipe = async () => {
      try {
        const profissionaisRef = collection(db, "profissionais");
        const snap = await getDocs(profissionaisRef);

        let total = 0;
        let ativos = 0;
        let pendentes = 0;

        snap.forEach(doc => {
          const p = doc.data();
          total++;
          
          // Verifica se o profissional tem alguma unidade atribuída
          const hasVinculo = p.vinculos && p.vinculos.length > 0;
          // Administradores Globais não precisam de vínculo para estarem ativos
          const isSuperAdmin = p.categoria === "Administrador";
          
          // Lógica de contagem corrigida:
          if (!isSuperAdmin && !hasVinculo) {
            // Se não é admin e não tem UTI atribuída -> Fica retido no RH (Pendente)
            pendentes++;
          } else if (p.status === 'pendente' || p.aprovado === false) {
            // Se a conta em si ainda não foi aprovada
            pendentes++;
          } else if (p.ativo !== false) {
            // Se passou por tudo e NÃO está desativado/excluído -> Está Ativo!
            ativos++;
          }
        });

        setMetricasEquipe({
          total,
          ativos,
          pendentes,
          carregando: false
        });
      } catch (error) {
        console.error("Erro ao buscar profissionais:", error);
        setMetricasEquipe(prev => ({ ...prev, carregando: false }));
      }
    };

    buscarDadosEquipe();
  }, [activeView]);

  // Função para Gerar os Leitos no Firebase
  const salvarConfiguracaoLeitos = async () => {
    setIsSavingConfig(true);
    try {
      const novosLeitos = [...leitosConfig];
      // Vai de 1 até o número que o senhor digitou
      for (let i = 1; i <= capacidadeInput; i++) {
        const bedId = `bed_${i}`;
        const exists = novosLeitos.find(l => l.id === bedId);
        
        // Se o leito não existir, ele cria no banco
        if (!exists) {
          const novoLeito = { 
            nome: "", // <--- CORRIGIDO: NOME DO PACIENTE VAZIO!
            numeroLeito: i, // Campo auxiliar de segurança para sabermos o número
            status: 'Livre', 
            statusInternacao: 'Livre', // Evita conflitos com as métricas de ocupação
            ignorarEstatistica: false, 
            bloqueado: false,
            isIsolamento: false 
          };
          await setDoc(doc(db, 'leitos_uti', bedId), novoLeito);
          novosLeitos.push({ id: bedId, ...novoLeito });
        }
      }
      
      // CORRIGIDO: Reordena e atualiza a tela usando o ID (bed_1, bed_2) e não mais o nome
      novosLeitos.sort((a, b) => {
        const numeroA = parseInt(a.id?.replace('bed_', '')) || 0;
        const numeroB = parseInt(b.id?.replace('bed_', '')) || 0;
        return numeroA - numeroB;
      });

      setLeitosConfig(novosLeitos);
      alert("✅ UTI reconfigurada com sucesso! Leitos sincronizados.");
    } catch (error) {
      console.error("Erro ao criar leitos:", error);
      alert("Erro ao sincronizar com o servidor.");
    }
    setIsSavingConfig(false);
  };

  // Função para ligar/desligar "Morador" ou "Bloqueado" direto no banco
  const toggleLeitoConfig = async (bedId, campo, valorAtual) => {
    try {
      const leitoRef = doc(db, 'leitos_uti', bedId);
      await updateDoc(leitoRef, { [campo]: !valorAtual });
      // Atualiza a tela instantaneamente
      setLeitosConfig(prev => prev.map(l => l.id === bedId ? { ...l, [campo]: !valorAtual } : l));
    } catch (error) {
      console.error("Erro ao atualizar status do leito:", error);
    }
  };

  // Motor de Busca isolado (permite buscar novamente quando trocar o mês)
  const buscarDadosRelatorio = async (mesAlvo) => {
    setIsLoadingRelatorio(true);
    try {
      const escalasRef = collection(db, "escalas");
      const snapshot = await getDocs(escalasRef); 
      const mudancas = [];
      
      snapshot.forEach(doc => {
        const plantao = doc.data();
        
        // Filtra pelo MÊS diretamente no motor de busca
        if (plantao.data && plantao.data.startsWith(mesAlvo)) {
          const nomeFinal = plantao.nome || "";
          const alteracao = plantao.statusAlteracao || "";
          const tipoPlantao = plantao.tipo || "";

          const isFalta = nomeFinal.includes('[FALTOU]') || alteracao === 'Falta';
          const isAtestado = nomeFinal.includes('[ATESTADO]') || alteracao === 'Atestado';
          const isExtra = tipoPlantao === 'plantao_extra' || nomeFinal.includes('[EXTRA]') || alteracao === 'Extra';
          const isTroca = alteracao === 'Normal'; 

          if (isFalta || isExtra || isAtestado || isTroca) {
             mudancas.push({ id: doc.id, ...plantao });
          }
        }
      });

      mudancas.sort((a, b) => a.data.localeCompare(b.data));
      setRelatorioMudancas(mudancas);
      
    } catch (error) {
      console.error("Erro ao buscar relatório de mudanças:", error);
      alert("Erro ao compilar o relatório.");
    } finally {
      setIsLoadingRelatorio(false);
    }
  };

  // Função apenas para abrir a interface e disparar a primeira busca
  const abrirRelatorioMudancas = () => {
    const mesAtual = dataSelecionada.substring(0, 7);
    setFiltroMesRelatorio(mesAtual);
    setFiltroCategoriaRelatorio("Todas"); // Reseta a categoria
    setIsModalRelatorioOpen(true);
    
    buscarDadosRelatorio(mesAtual);
  };

  const salvarPAVManual = async () => {
    if (!formManualPAV.pacienteId) return alert("Selecione um paciente.");
    if (!formManualPAV.dataRadiologia) return alert("O critério radiológico (data) é obrigatório.");

    // Busca o paciente no estado atual
    const p = leitosConfig.find(l => l.id === formManualPAV.pacienteId);
    if (!p) return alert("Erro: Dados do paciente não encontrados.");

    // 💡 A MÁGICA ESTÁ AQUI: Extrai o leito limpíssimo (apenas o número/texto)
    const leitoLimpo = p.id.replace('bed_', '');

    // --- 🚨 BLOQUEIO DE SEGURANÇA: DATA DE INTUBAÇÃO ---
    if (!p.dataIntubacao || p.dataIntubacao.trim() === '') {
      return alert("❌ Bloqueado: Este paciente não possui data de intubação registrada. Não é possível calcular o tempo de VM.");
    }

    // Contagem de Sinais
    let sysCount = 0; let respCount = 0;
    let evidenciasSys = []; let evidenciasResp = []; let datas = [formManualPAV.dataRadiologia];

    if (formManualPAV.sysFebre && formManualPAV.dataFebre) { sysCount++; evidenciasSys.push(`Febre em ${formManualPAV.dataFebre.split('-').reverse().join('/')}`); datas.push(formManualPAV.dataFebre); }
    if (formManualPAV.sysLeuco && formManualPAV.dataLeuco) { sysCount++; evidenciasSys.push(`Alt. Leucócitos em ${formManualPAV.dataLeuco.split('-').reverse().join('/')}`); datas.push(formManualPAV.dataLeuco); }
    if (formManualPAV.sysSensorio && formManualPAV.dataSensorio) { sysCount++; evidenciasSys.push(`Alt. Sensório (≥70 anos) em ${formManualPAV.dataSensorio.split('-').reverse().join('/')}`); datas.push(formManualPAV.dataSensorio); }

    if (formManualPAV.respSecrecao && formManualPAV.detSecrecao && formManualPAV.dataSecrecao) { respCount++; evidenciasResp.push(`Alt. Secreção (${formManualPAV.detSecrecao}) em ${formManualPAV.dataSecrecao.split('-').reverse().join('/')}`); datas.push(formManualPAV.dataSecrecao); }
    if (formManualPAV.respTosse && formManualPAV.dataTosse) { respCount++; evidenciasResp.push(`Tosse/Dispneia/Taquipneia em ${formManualPAV.dataTosse.split('-').reverse().join('/')}`); datas.push(formManualPAV.dataTosse); }
    if (formManualPAV.respAusculta && formManualPAV.dataAusculta) { respCount++; evidenciasResp.push(`Novos Estertores em ${formManualPAV.dataAusculta.split('-').reverse().join('/')}`); datas.push(formManualPAV.dataAusculta); }
    if (formManualPAV.respTroca && formManualPAV.detTroca && formManualPAV.dataTroca) { respCount++; evidenciasResp.push(`Piora Troca Gasosa (${formManualPAV.detTroca}) em ${formManualPAV.dataTroca.split('-').reverse().join('/')}`); datas.push(formManualPAV.dataTroca); }

    const isMicro = formManualPAV.microCultura && formManualPAV.germeCultura && formManualPAV.dataCultura;
    if (isMicro) datas.push(formManualPAV.dataCultura);

    // Validação de Regra (Microbiológica vs Clínica)
    let aprovado = false;
    let justificativa = "";

    if (isMicro) {
      if (sysCount >= 1 || respCount >= 1) {
        aprovado = true;
        justificativa = "Critério Microbiológico Atendido: Cultura Positiva + 1 Sinal Clínico.";
      } else {
        return alert("Mesmo com cultura positiva, é exigido pelo menos 1 sinal clínico (sistêmico ou respiratório).");
      }
    } else {
      if (sysCount >= 1 && respCount >= 2) {
        aprovado = true;
        justificativa = "Critério Clínico Atendido: 1 Sinal Sistêmico + 2 Sinais Respiratórios.";
      } else {
        return alert("Para PAV Clínica (sem cultura), são exigidos: 1 Sinal Sistêmico E 2 Sinais Respiratórios.");
      }
    }

    // Calcula DOE (Data mais antiga preenchida)
    const timestamps = datas.filter(d => d).map(d => new Date(`${d}T12:00:00`).getTime());
    const dataEventoDOE = new Date(Math.min(...timestamps)).toISOString().split('T')[0];

    // Lógica de Bloqueio VM
    let dataIntStr = p.dataIntubacao.includes('/') ? p.dataIntubacao.split('/').reverse().join('-') : p.dataIntubacao;
    const dataInt = new Date(`${dataIntStr}T12:00:00`);
    const dataEvento = new Date(`${dataEventoDOE}T12:00:00`);
    const diffVM = Math.floor((dataEvento - dataInt) / (1000 * 60 * 60 * 24));
    
    // Verifica se a data de intubação é válida
    if (isNaN(dataInt.getTime())) return alert("❌ Erro: A data de intubação do paciente está em formato inválido.");

    if (diffVM < 2) {
      return alert(`❌ Bloqueado: O paciente foi intubado há apenas ${diffVM} dia(s). A definição de PAV exige que o paciente esteja em VM há pelo menos 2 dias (D3).`);
    }

    if (aprovado) {
      try {
        const mesRef = dataEventoDOE.slice(0, 7);
        const idAuditoria = `manual_pav_${Date.now()}`;
        
        await setDoc(doc(db, "auditorias_pav", idAuditoria), {
          id: idAuditoria, pacienteId: formManualPAV.pacienteId,
          nome: p.nome, leito: leitoLimpo, // Puxando nome do estado e o leito limpo
          mesReferencia: mesRef, dataSuspeita: dataEventoDOE, dataEventoDOE: dataEventoDOE,
          status: "Confirmado", 
          evidencias: {
            radiologia: `Sim (Manual) em ${formManualPAV.dataRadiologia.split('-').reverse().join('/')}`,
            sistemicos: evidenciasSys,
            respiratorios: evidenciasResp,
            microbiologia: isMicro ? `${formManualPAV.germeCultura} (Aspirado Traqueal > 10^6)` : "Não aplicado",
            justificativa: `INSERÇÃO MANUAL: ${justificativa}`
          },
          timestampCriacao: new Date().toISOString(),
          inseridoManualmente: true
        });

        alert("PAV registrada com sucesso!");
        setIsModalManualPAVOpen(false);
        carregarAuditoriasPAV();
      } catch (err) { console.error("Erro ao salvar:", err); alert("Erro ao salvar no banco."); }
    }
  };

  const salvarIPCSCManual = async () => {
    if (!formManualIPCSC.pacienteId) return alert("Selecione um paciente.");
    if (!formManualIPCSC.dataColeta) return alert("A data da coleta (D.O.E) é obrigatória.");
    if (!formManualIPCSC.germe) return alert("Preencha o microrganismo isolado.");

    // 1. Recupera o objeto do paciente completo
    const p = leitosConfig.find(l => l.id === formManualIPCSC.pacienteId);
    if (!p) return alert("Erro: Dados do paciente não encontrados.");

    // 💡 Extrai o leito limpíssimo
    const leitoLimpo = p.id.replace('bed_', '');

    let sysCount = 0;
    let evidenciasSys = [];

    if (formManualIPCSC.sysFebre && formManualIPCSC.dataFebre) { sysCount++; evidenciasSys.push(`Febre em ${formManualIPCSC.dataFebre.split('-').reverse().join('/')}`); }
    if (formManualIPCSC.sysCalafrios && formManualIPCSC.dataCalafrios) { sysCount++; evidenciasSys.push(`Calafrios em ${formManualIPCSC.dataCalafrios.split('-').reverse().join('/')}`); }
    if (formManualIPCSC.sysHipotensao && formManualIPCSC.dataHipotensao) { sysCount++; evidenciasSys.push(`Hipotensão / DVA em ${formManualIPCSC.dataHipotensao.split('-').reverse().join('/')}`); }

    // VALIDAÇÃO DA REGRA ANVISA
    let aprovado = false;
    let justificativa = "";

    if (formManualIPCSC.tipoGerme === 'patogeno') {
      aprovado = true;
      justificativa = "Critério 1: Patógeno reconhecido isolado em hemocultura.";
    } else {
      if (!formManualIPCSC.multiplasAmostras) return alert("Para comensais de pele, são exigidas múltiplas amostras positivas na mesma ocasião.");
      if (sysCount === 0) return alert("Para comensais de pele, é obrigatório preencher pelo menos 1 sinal clínico sistêmico (Febre, Calafrios ou Hipotensão).");
      aprovado = true;
      justificativa = "Critério 2/3: Comensal em múltiplas amostras + Sinal Clínico Sistêmico associado.";
    }

    if (aprovado) {
      // 2. Lógica de Bloqueio de Dispositivo (CVC ou Shiley) - ANVISA D-2
      const dataColeta = new Date(`${formManualIPCSC.dataColeta}T12:00:00`);
      
      const calcularDias = (dataStr, dataRetiradaStr) => {
        if (!dataStr) return -99;
        const d = new Date(`${dataStr.split('/').reverse().join('-')}T12:00:00`);
        const diff = Math.floor((dataColeta - d) / (1000 * 60 * 60 * 24));
        
        if (dataRetiradaStr) {
          const dRet = new Date(`${dataRetiradaStr.split('/').reverse().join('-')}T12:00:00`);
          const diffRet = Math.floor((dataColeta - dRet) / (1000 * 60 * 60 * 24));
          if (diffRet > 1) return -99; // Retirado antes de ontem, bloqueia
        }
        return diff;
      };

      const diffCVC = calcularDias(p.enfermagem?.cvcData, p.enfermagem?.cvcRetiradaData);
      const diffShiley = calcularDias(p.enfermagem?.shileyData, p.enfermagem?.shileyRetiradaData);

      const associadoDispositivo = (diffCVC >= 2) || (diffShiley >= 2);

      if (!associadoDispositivo) {
        return alert("❌ Bloqueado: O paciente não possui CVC ou Shiley implantado há pelo menos 2 dias antes da coleta (ou foi retirado precocemente).");
      }

      try {
        const dataEventoDOE = formManualIPCSC.dataColeta;
        const mesRef = dataEventoDOE.slice(0, 7);
        const idAuditoria = `manual_ipcsc_${Date.now()}`;
        
        await setDoc(doc(db, "auditorias_ipcsc", idAuditoria), {
          id: idAuditoria, pacienteId: formManualIPCSC.pacienteId,
          nome: p.nome, leito: leitoLimpo, // Puxando nome do estado e o leito limpo
          mesReferencia: mesRef, dataSuspeita: dataEventoDOE, dataEventoDOE: dataEventoDOE,
          status: "Confirmado", 
          evidencias: {
            microbiologia: `${formManualIPCSC.germe} (${formManualIPCSC.tipoGerme === 'patogeno' ? 'Patógeno Reconhecido' : 'Comensal em amostras múltiplas'})`,
            sistemicos: evidenciasSys.length > 0 ? evidenciasSys : ['Critério Clínico dispensado (Patógeno Reconhecido)'],
            dispositivo: `CVC/Shiley: Associação confirmada (D${Math.max(diffCVC, diffShiley) + 1} no momento da coleta)`,
            justificativa: `INSERÇÃO MANUAL: ${justificativa}`
          },
          timestampCriacao: new Date().toISOString(),
          inseridoManualmente: true
        });

        alert("IPCS-C registrada com sucesso!");
        setIsModalManualIPCSCOpen(false);
        carregarAuditoriasIPCSC();
      } catch (err) { console.error("Erro ao salvar:", err); alert("Erro ao salvar no banco."); }
    }
  };

  const salvarITUManual = async () => {
    if (!formManualITU.pacienteId) return alert("Selecione um paciente.");
    if (!formManualITU.dataColeta) return alert("A data da coleta é obrigatória.");
    if (!formManualITU.germe) return alert("Preencha o microrganismo.");
    
    if (Number(formManualITU.ufc) < 100000) return alert("ITU exige Contagem ≥ 10⁵ UFC/mL.");
    if (Number(formManualITU.qtdEspecies) > 2) return alert("ITU não admite mais de 2 espécies (contaminação).");
    
    let sysCount = 0;
    let evidenciasSys = [];

    if (formManualITU.sysFebre && formManualITU.dataFebre) { sysCount++; evidenciasSys.push(`Febre/Calafrios em ${formManualITU.dataFebre.split('-').reverse().join('/')}`); }
    if (formManualITU.sysDisuria && formManualITU.dataDisuria) { sysCount++; evidenciasSys.push(`Disúria ou Urgência em ${formManualITU.dataDisuria.split('-').reverse().join('/')}`); }
    if (formManualITU.sysDorSupra && formManualITU.dataDorSupra) { sysCount++; evidenciasSys.push(`Dor Suprapúbica em ${formManualITU.dataDorSupra.split('-').reverse().join('/')}`); }
    if (formManualITU.sysGiordano && formManualITU.dataGiordano) { sysCount++; evidenciasSys.push(`Giordano Positivo (Dor Lombar) em ${formManualITU.dataGiordano.split('-').reverse().join('/')}`); }

    if (sysCount === 0) return alert("É obrigatório preencher pelo menos 1 sinal clínico sistêmico (Febre, Disúria, Dor Suprapúbica ou Giordano).");

    const p = leitosConfig.find(l => l.id === formManualITU.pacienteId);
    if (!p) return alert("Erro: Dados do paciente não encontrados.");

    // 💡 Extrai o leito limpíssimo
    const leitoLimpo = p.id.replace('bed_', '');

    if (!p.enfermagem?.svdData) return alert("❌ Bloqueado: Não há registro de SVD para este paciente.");
    
    const dataColeta = new Date(`${formManualITU.dataColeta}T12:00:00`);
    let dSvdStr = p.enfermagem.svdData.includes('/') ? p.enfermagem.svdData.split('/').reverse().join('-') : p.enfermagem.svdData;
    const dSvd = new Date(`${dSvdStr}T12:00:00`);
    const diffSVD = Math.floor((dataColeta - dSvd) / (1000 * 60 * 60 * 24));
    
    if (diffSVD < 2) return alert(`❌ Bloqueado: SVD inserida há apenas ${diffSVD} dia(s). ITU-AC exige > 2 dias.`);

    try {
      const mesRef = formManualITU.dataColeta.slice(0, 7);
      const idAuditoria = `manual_itu_${Date.now()}`;
      
      await setDoc(doc(db, "auditorias_itu", idAuditoria), {
        id: idAuditoria, pacienteId: formManualITU.pacienteId,
        nome: p.nome, leito: leitoLimpo, // Puxando nome do estado e o leito limpo
        mesReferencia: mesRef, dataSuspeita: formManualITU.dataColeta, dataEventoDOE: formManualITU.dataColeta,
        status: "Confirmado",
        evidencias: {
          microbiologia: `${formManualITU.germe} (${formManualITU.ufc} UFC/mL)`,
          sistemicos: evidenciasSys,
          dispositivo: `SVD inserida em ${p.enfermagem.svdData} (D${diffSVD + 1} no dia da coleta)`,
          justificativa: "INSERÇÃO MANUAL: Critério ANVISA atendido."
        },
        timestampCriacao: new Date().toISOString(),
        inseridoManualmente: true
      });

      alert("ITU-AC registrada com sucesso!");
      setIsModalManualITUOpen(false);
      carregarAuditoriasITU();
    } catch (err) { console.error("Erro:", err); alert("Erro ao salvar no banco."); }
  };

  const gerarDadosRelatorioMensal = async (mesAno) => {
  // Ex: mesAno = "2026-05"
  try {
    const [ano, mes] = mesAno.split('-');
    
    // 1. Pega os Denominadores (Censo)
    const censoRef = collection(db, "censo_diario");
    const qCenso = query(censoRef, where("data", ">=", `${mesAno}-01`), where("data", "<=", `${mesAno}-31`));
    const snapCenso = await getDocs(qCenso);
    
    let totais = { vm: 0, cvc: 0, svd: 0, pacientesDia: 0 };
    snapCenso.forEach(d => {
        const c = d.data();
        totais.vm += (c.pacientesEmVM || 0);
        totais.cvc += (c.pacientesComCVC || 0);
        totais.svd += (c.pacientesComSVD || 0);
        totais.pacientesDia += (c.totalLeitosOcupados || 0);
    });

    // 2. Pega as Infecções Confirmadas
    const auditorias = ["auditorias_pav", "auditorias_ipcsc", "auditorias_itu"];
    let casos = { pav: 0, ipcsc: 0, itu: 0 };
    let perfilMicrobiologico = []; // Aqui guardaremos a resistência

    for (const colecao of auditorias) {
        const qAud = query(collection(db, colecao), where("mesReferencia", "==", mesAno), where("status", "==", "Confirmado"));
        const snap = await getDocs(qAud);
        
        snap.forEach(d => {
            const docData = d.data();
            if (colecao === "auditorias_pav") casos.pav++;
            if (colecao === "auditorias_ipcsc") casos.ipcsc++;
            if (colecao === "auditorias_itu") casos.itu++;
            
            // Extrai dados para o perfil microbiológico (Perfil de Resistência)
            if (docData.evidencias?.microbiologia) {
                perfilMicrobiologico.push({
                    origem: colecao,
                    detalhe: docData.evidencias.microbiologia
                });
            }
        });
    }

    return {
        totais,
        taxas: {
            pav: totais.vm > 0 ? (casos.pav / totais.vm) * 1000 : 0,
            ipcsc: totais.cvc > 0 ? (casos.ipcsc / totais.cvc) * 1000 : 0,
            itu: totais.svd > 0 ? (casos.itu / totais.svd) * 1000 : 0
        },
        perfilMicrobiologico
    };
  } catch (err) {
    console.error("Erro ao processar relatório:", err);
  }
};

  // 1. Função para carregar a coleção imortal
  const carregarAuditoriasPAV = async () => {
    if (!db) return;
    try {
      const querySnapshot = await getDocs(collection(db, "auditorias_pav"));
      const lista = [];
      querySnapshot.forEach((doc) => {
        lista.push({ firebaseId: doc.id, ...doc.data() });
      });
      // Ordena do mais recente para o mais antigo
      lista.sort((a, b) => new Date(b.dataSuspeita) - new Date(a.dataSuspeita));
      setAuditoriasPAV(lista);
    } catch (err) {
      console.error("Erro ao carregar auditorias PAV:", err);
    }
  };

  // 2. Função para o Gestor bater o martelo (Confirmar ou Descartar)
  const atualizarStatusPAV = async (idDocumento, novoStatus) => {
    if (!db) return;
    try {
      // Atualiza o documento no Firebase (Apenas o campo status)
      await setDoc(doc(db, "auditorias_pav", idDocumento), { 
        status: novoStatus,
        dataAuditoria: new Date().toISOString()
      }, { merge: true });
      
      // Atualiza a tela instantaneamente
      setAuditoriasPAV(prev => prev.map(a => a.firebaseId === idDocumento ? { ...a, status: novoStatus } : a));
      setModalAuditoriaPAV(null);
      alert(`✅ Caso classificado como: ${novoStatus}`);
    } catch (err) {
      console.error("Erro ao atualizar PAV:", err);
      alert("Falha ao salvar a decisão.");
    }
  };

  // 3. Função para o Gestor rodar o robô manualmente com Regra ANVISA (DOE e Janela de Infecção)
  const forcarVarreduraManualPAV = async () => {
    if (!db) return alert("Banco de dados não conectado.");
    
    try {
      console.log("🕵️ FORÇANDO VARREDURA MANUAL DE PAV COM JANELA DE INFECÇÃO E D.O.E...");
      const snapshot = await getDocs(collection(db, "leitos_uti"));
      const pacientesAtivos = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.nome && data.nome.trim() !== '') {
          pacientesAtivos.push({ id: doc.id, leito: doc.id.replace('bed_', ''), ...data });
        }
      });

      // ========================================================
      // MOTOR DE TEMPO: JANELA DE INFECÇÃO (D0 a D-3)
      // ========================================================
      const hoje = new Date();
      const tzOffset = hoje.getTimezoneOffset() * 60000;
      const dataLocal = new Date(hoje.getTime() - tzOffset);

      const datasJanela = [];
      for (let i = 0; i <= 3; i++) {
        const d = new Date(dataLocal.getTime() - i * 86400000);
        datasJanela.push(d.toISOString().split('T')[0]); // Ex: 2026-05-14
      }
      
      const d0 = datasJanela[0];
      const mesCorrente = d0.slice(0, 7);
      
      const datasBR = datasJanela.map(d => d.split('-').reverse().join('/'));
      const datasBRCurtas = datasBR.map(d => d.substring(0, 5));

      let novosCasos = 0;

      for (const p of pacientesAtivos) {
        // Agora aceita tanto a data da Intubação quanto de uma TQT direta
        let dataIntStr = p.dataIntubacao || p.dataTraqueostomia; 
        if (!dataIntStr) continue;
        
        if (dataIntStr.includes('/')) dataIntStr = dataIntStr.split('/').reverse().join('-');
        const dataInt = new Date(`${dataIntStr}T12:00:00`);

        // GATILHO RADIOLÓGICO: Infiltrado Novo no D0
        const radPositivo = p.medical?.novoInfiltrado === 'sim' || p.novoInfiltrado === 'sim';
        if (!radPositivo) continue; 

        let sisPositivo = false;
        let sisEvidencias = [];
        let respCount = 0;
        let respEvidencias = [];
        
        let datasEventosEncontrados = [d0]; 

        // ==================================
        // 1. SINAIS SISTÊMICOS NA JANELA (Leucócitos e Febre)
        // ==================================
        if (p.examHistory) {
          Object.keys(p.examHistory).forEach(dt => {
            if (datasJanela.includes(dt) || datasBR.includes(dt) || datasBRCurtas.includes(dt)) {
              const leucoStr = p.examHistory[dt]?.["Leucócitos"];
              if (leucoStr) {
                const leuco = parseFloat(leucoStr.toString().replace(/\./g, '').replace(',', '.'));
                if (leuco < 4000 || leuco > 12000) {
                  sisPositivo = true;
                  sisEvidencias.push(`Leucócitos (${leuco}) aferidos em ${dt}`);
                  
                  let dtNorm = dt;
                  if (dt.includes('/')) dtNorm = dt.split('/').reverse().join('-');
                  if (dtNorm.length === 5) dtNorm = `${d0.split('-')[0]}-${dtNorm}`;
                  datasEventosEncontrados.push(dtNorm);
                }
              }
            }
          });
        }

        // --- NOVA VARREDURA DE FEBRE ESTRUTURADA E COM DATA ---
        const varrerFebreBH = (blocoBh) => {
            if (!blocoBh || !blocoBh.date || !blocoBh.vitals) return;
            const dataRefUS = blocoBh.date;
            const dataRefBR = dataRefUS.split('-').reverse().join('/');
            
            // Só computa se a febre ocorreu dentro da Janela de 4 dias
            if (datasJanela.includes(dataRefUS)) {
                Object.keys(blocoBh.vitals).forEach(hora => {
                    const tempValue = blocoBh.vitals[hora]["Temp (ºC)"];
                    if (tempValue) {
                        const tempNum = Number(String(tempValue).replace(',', '.'));
                        if (tempNum >= 38.0 || tempNum <= 36.0) { // Febre ou Hipotermia
                            sisPositivo = true;
                            const msg = `Temperatura (${tempNum} ºC) registrada em ${dataRefBR} às ${hora}`;
                            if (!sisEvidencias.includes(msg)) {
                                sisEvidencias.push(msg);
                                datasEventosEncontrados.push(dataRefUS);
                            }
                        }
                    }
                });
            }
        };

        if (p.bh) varrerFebreBH(p.bh);
        if (p.historico_bh && Array.isArray(p.historico_bh)) p.historico_bh.forEach(varrerFebreBH);
        // ------------------------------------------------------

        // ==================================
        // 2. SINAIS RESPIRATÓRIOS NA JANELA
        // ==================================
        const asp = p.physio?.secrecaoAspecto?.toLowerCase() || "";
        const col = p.physio?.secrecaoColoracao?.toLowerCase() || "";
        const qtd = p.physio?.secrecaoQtd?.toLowerCase() || "";
        
        if (asp.includes('espessa') || col.includes('purulenta') || col.includes('esverdeada') || qtd.includes('moderada') || qtd.includes('abundante')) {
          respCount++;
          respEvidencias.push(`Secreção anormal (${asp}/${col}/${qtd}) avaliada em ${datasBR[0]}`);
          datasEventosEncontrados.push(d0);
        }

        if (p.gasometriaHistory) {
          let menorPF = 999;
          let dataMenorPF = "";
          
          Object.keys(p.gasometriaHistory).forEach(colGaso => {
            const isRecente = datasJanela.some(d => colGaso.includes(d)) || datasBR.some(d => colGaso.includes(d)) || datasBRCurtas.some(d => colGaso.includes(d));
            
            if (isRecente) {
              const pf = parseFloat(p.gasometriaHistory[colGaso]?.["P/F"]);
              if (pf && pf <= 240 && pf < menorPF) {
                menorPF = pf;
                dataMenorPF = colGaso;
              }
            }
          });
          
          if (menorPF <= 240) {
            respCount++;
            respEvidencias.push(`Relação P/F baixa (${menorPF}) colhida em ${dataMenorPF}`);
            let dataGasoNorm = d0;
            datasJanela.forEach(dj => { if (dataMenorPF.includes(dj)) dataGasoNorm = dj; });
            datasBR.forEach(dbr => { if (dataMenorPF.includes(dbr)) dataGasoNorm = dbr.split('/').reverse().join('-'); });
            datasEventosEncontrados.push(dataGasoNorm);
          }
        }

        // ==================================
        // 3. DETERMINAÇÃO DA D.O.E. E CRUZAMENTO COM TEMPO DE VM
        // ==================================
        if (sisPositivo && respCount >= 2) {
          
          const timestamps = datasEventosEncontrados.map(d => new Date(`${d}T12:00:00`).getTime()).filter(n => !isNaN(n));
          const dataEventoDOE = new Date(Math.min(...timestamps));
          const dataEventoFormatada = dataEventoDOE.toISOString().split('T')[0];

          // Subtração de datas (Dia do Evento - Dia da Intubação)
          const diffVMnaDOE = Math.floor((dataEventoDOE - dataInt) / (1000 * 60 * 60 * 24));
          let atendeCriterioVM = diffVMnaDOE >= 2;

          if (atendeCriterioVM && p.dataExtubacao) {
            let dataExtStr = p.dataExtubacao;
            if (dataExtStr.includes('/')) dataExtStr = dataExtStr.split('/').reverse().join('-');
            const diffExtDOE = Math.floor((dataEventoDOE - new Date(`${dataExtStr}T12:00:00`)) / (1000 * 60 * 60 * 24));
            if (diffExtDOE > 1) atendeCriterioVM = false; 
          }

          if (atendeCriterioVM) {
            const idAuditoria = `${p.cpf || p.id}_pav_${mesCorrente}`;
            const docAuditoriaRef = doc(db, "auditorias_pav", idAuditoria);
            const audDoc = await getDocs(query(collection(db, "auditorias_pav"), where("id", "==", idAuditoria)));
            
            if (audDoc.empty) {
              await setDoc(docAuditoriaRef, {
                id: idAuditoria,
                pacienteId: p.id,
                cpf: p.cpf || "000.000.000-00",
                nome: p.nome,
                leito: p.leito,
                mesReferencia: mesCorrente,
                dataSuspeita: d0,
                dataEventoDOE: dataEventoFormatada,
                status: "Suspeito",
                evidencias: {
                  radiologia: `Sim (Novo infiltrado / Progressão) avaliado em ${datasBR[0]}`,
                  sistemicos: sisEvidencias,
                  respiratorios: respEvidencias,
                  justificativa: `D.O.E da Infecção: ${dataEventoFormatada.split('-').reverse().join('/')} (Paciente já estava no D${diffVMnaDOE >= 0 ? diffVMnaDOE + 1 : '?'} de VM).`
                },
                timestampCriacao: new Date().toISOString()
              });
              novosCasos++;
            }
          }
        }
      }

      if (novosCasos > 0) {
        alert(`🚨 Varredura concluída! ${novosCasos} novos casos suspeitos de PAV capturados com sucesso.`);
      } else {
        alert("Varredura concluída. Nenhum novo caso preencheu todos os critérios simultâneos (Rx + Sis + Resp) na janela de 4 dias.");
      }
      
      carregarAuditoriasPAV();

    } catch (err) {
      console.error("Erro ao forçar varredura:", err);
      alert("Falha ao varrer os prontuários da UTI.");
    }
  };

  // ========================================================
  // MOTOR DE GRAVAÇÃO: INDICADORES GLOBAIS DA CCIH
  // ========================================================
  const salvarIndicadorGlobal = async (mesReferencia, tipoDado, payload) => {
    // Verifica se o db do Firebase está conectado nesta tela
    if (!db) {
       console.error("Firebase 'db' não encontrado no GestorDashboard.");
       return;
    }

    try {
      const docId = `mes_${mesReferencia}`;
      
      const updateData = {};
      updateData[tipoDado] = payload;

      await setDoc(doc(db, "indicadores_ccih", docId), updateData, { merge: true });
      
      console.log(`[CCIH AUDITORIA]: Indicador ${tipoDado} salvo no mês ${mesReferencia}`);
    } catch (err) { 
      console.error("Erro fatal ao salvar indicador CCIH:", err);
      alert("Aviso: Ocorreu um erro ao gravar o indicador global na nuvem.");
    }
  };

  // ========================================================
  // MOTOR DE GRAVAÇÃO: CLASSIFICAÇÃO IRAS NO PRONTUÁRIO
  // ========================================================
  const classificarCulturaIRAS = async (pacienteId, leito, culturaId, novaClassificacao) => {
    if (!db) return;
    try {
      // 1. Atualiza na coleção IMORTAL da CCIH (Para nunca sumir após a alta)
      await setDoc(doc(db, "culturas_globais", culturaId), { irasAssociada: novaClassificacao }, { merge: true });

      // 2. Tenta atualizar no Prontuário da UTI (Se o paciente ainda estiver internado no momento)
      const paciente = listaCenso.find(p => p.id === pacienteId || p.leito === leito);
      if (paciente && paciente.culturas && paciente.culturas.lista) {
        const culturasAtualizadas = paciente.culturas.lista.map(c => 
          c.id === culturaId ? { ...c, irasAssociada: novaClassificacao } : c
        );

        const pacienteAtualizado = JSON.parse(JSON.stringify(paciente));
        pacienteAtualizado.culturas.lista = culturasAtualizadas;

        let idBruto = pacienteAtualizado.id !== undefined ? pacienteAtualizado.id : pacienteAtualizado.leito;
        const apenasNumero = String(idBruto).replace(/bed_/g, "");
        let numeroFinal = apenasNumero === "0" ? "1" : apenasNumero;
        const docId = `bed_${numeroFinal}`;

        // Salva a etiqueta no prontuário do médico ver na beira do leito
        await setDoc(doc(db, "leitos_uti", docId), pacienteAtualizado, { merge: true });
      }
      
      console.log(`[CCIH]: Cultura classificada como ${novaClassificacao} com sucesso.`);
      carregarCulturasGlobais();
    } catch (err) {
      console.error("Erro ao salvar classificação IRAS:", err);
      alert("Falha ao sincronizar com o banco de dados.");
    }
  };

  const carregarDadosCCIH = async () => {
    if (!db) return;
    try {
      // Puxa os dados simples, sem pedir para o Firebase organizar (burlar a exigência de índice)
      const querySnapshot = await getDocs(collection(db, "indicadores_ccih"));
      let dados = [];
      
      querySnapshot.forEach((doc) => {
        const mesAno = doc.id.replace('mes_', '');
        const [ano, mes] = mesAno.split('-');
        const mesesNomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const labelFormatado = `${mesesNomes[parseInt(mes) - 1]}/${ano.slice(2)}`;
        
        dados.push({
          id: doc.id,
          mesLabel: labelFormatado,
          ...doc.data()
        });
      });
      
      // Organiza do mês mais novo para o mais velho via Javascript
      dados.sort((a, b) => b.id.localeCompare(a.id));
      
      // Pega apenas os últimos 6 meses e inverte para o gráfico desenhar da esquerda (passado) pra direita (presente)
      setHistoricoCCIH(dados.slice(0, 6).reverse());
      
    } catch (err) {
      console.error("Erro ao carregar indicadores:", err);
    }
  };

  const carregarAuditoriasIPCSC = async () => {
    if (!db) return;
    try {
      const querySnapshot = await getDocs(collection(db, "auditorias_ipcsc"));
      const lista = [];
      querySnapshot.forEach((doc) => lista.push({ firebaseId: doc.id, ...doc.data() }));
      lista.sort((a, b) => new Date(b.dataSuspeita) - new Date(a.dataSuspeita));
      setAuditoriasIPCSC(lista);
    } catch (err) { console.error("Erro ao carregar IPCS-C:", err); }
  };

  const atualizarStatusIPCSC = async (idDocumento, novoStatus) => {
    if (!db) return;
    try {
      await setDoc(doc(db, "auditorias_ipcsc", idDocumento), { status: novoStatus, dataAuditoria: new Date().toISOString() }, { merge: true });
      setAuditoriasIPCSC(prev => prev.map(a => a.firebaseId === idDocumento ? { ...a, status: novoStatus } : a));
      setModalAuditoriaIPCSC(null);
      alert(`✅ Caso IPCS-C classificado como: ${novoStatus}`);
    } catch (err) { alert("Falha ao salvar a decisão."); }
  };

  // Busca as culturas imortais no banco de dados
  const carregarCulturasGlobais = async () => {
    if (!db) return;
    try {
      const querySnapshot = await getDocs(collection(db, "culturas_globais"));
      const lista = [];
      querySnapshot.forEach((doc) => {
        lista.push({ ...doc.data(), id: doc.id });
      });
      // Ordena da mais recente para a mais antiga
      lista.sort((a, b) => new Date(b.dataColeta || b.dataResultado) - new Date(a.dataColeta || a.dataResultado));
      setCulturasGlobais(lista);
    } catch (err) {
      console.error("Erro ao carregar culturas globais:", err);
    }
  };

  const carregarAuditoriasITU = async () => {
    if (!db) return;
    try {
      const querySnapshot = await getDocs(collection(db, "auditorias_itu"));
      const lista = [];
      querySnapshot.forEach((doc) => lista.push({ firebaseId: doc.id, ...doc.data() }));
      lista.sort((a, b) => new Date(b.dataSuspeita) - new Date(a.dataSuspeita));
      setAuditoriasITU(lista);
    } catch (err) { console.error("Erro ao carregar ITU:", err); }
  };

  const atualizarStatusITU = async (idDocumento, novoStatus) => {
    if (!db) return;
    try {
      await setDoc(doc(db, "auditorias_itu", idDocumento), { status: novoStatus, dataAuditoria: new Date().toISOString() }, { merge: true });
      setAuditoriasITU(prev => prev.map(a => a.firebaseId === idDocumento ? { ...a, status: novoStatus } : a));
      setModalAuditoriaITU(null);
      alert(`✅ Caso ITU-AC classificado como: ${novoStatus}`);
    } catch (err) { alert("Falha ao salvar a decisão."); }
  };

  useEffect(() => {
    if (activeView === 'qualidade') {
      if (abaIrasAtiva === 'geral') {
        carregarDadosCCIH();
        carregarCulturasGlobais();
      } else if (abaIrasAtiva === 'pav') {
        carregarAuditoriasPAV();
      } else if (abaIrasAtiva === 'ipcsc') {
        carregarAuditoriasIPCSC();
      } else if (abaIrasAtiva === 'itu') {
        carregarAuditoriasITU();
      }
    }
  }, [activeView, abaIrasAtiva, mesFiltroIrasCompartilhado]);

  const salvarNotaCCIH = async (firebaseId, colecao, textoNota) => {
    if (!db || !firebaseId) return;
    try {
      const docRef = doc(db, colecao, firebaseId);
      await updateDoc(docRef, { notaCCIH: textoNota });
      console.log(`Nota salva com sucesso na coleção ${colecao}`);
    } catch (error) {
      console.error("Erro ao salvar nota da CCIH:", error);
    }
  };

  useEffect(() => {
  const processarDadosParaGraficos = async () => {
    try {
      setLoadingGraficos(true);

      // 1. PUXAR DADOS DO CENSO (VM, CVC, SVD, Identificação)
      const censoRef = collection(db, "censo_diario");
      const censoSnap = await getDocs(censoRef);
      
      // 2. PUXAR DADOS DO HISTÓRICO (Mortalidade, SMR)
      const historicoRef = collection(db, "internacoes_historico");
      const historicoSnap = await getDocs(historicoRef);

      const consolidadoMensal = {};

      // --- PROCESSANDO CENSO (Densidades e Identificação) ---
      censoSnap.forEach((doc) => {
        const d = doc.data();
        const mesAno = d.data.substring(0, 7); // Pega "2026-04"

        if (!consolidadoMensal[mesAno]) {
          consolidadoMensal[mesAno] = { 
            mes: mesAno, somaLeitos: 0, somaVM: 0, somaID: 0, 
            totalAltas: 0, totalObitos: 0, somaSapsProb: 0, sapsCount: 0 
          };
        }

        consolidadoMensal[mesAno].somaLeitos += (d.totalLeitosOcupados || 0);
        consolidadoMensal[mesAno].somaVM += (d.pacientesEmVM || 0);
        consolidadoMensal[mesAno].somaID += (d.pacientesIdentificados || 0);
      });

      // --- PROCESSANDO HISTÓRICO (Desfechos e SMR) ---
      historicoSnap.forEach((doc) => {
        const h = doc.data();
        if (h.dataSaida) {
          const mesAno = h.dataSaida.substring(0, 7);
          
          if (!consolidadoMensal[mesAno]) {
            consolidadoMensal[mesAno] = { 
              mes: mesAno, somaLeitos: 0, somaVM: 0, somaID: 0, 
              totalAltas: 0, totalObitos: 0, somaSapsProb: 0, sapsCount: 0 
            };
          }

          consolidadoMensal[mesAno].totalAltas += 1;
          if (h.indicadores?.foiObito === 1) {
            consolidadoMensal[mesAno].totalObitos += 1;
          }

          const prob = parseFloat(h.indicadores?.mortalidadePrevista);
          if (!isNaN(prob) && prob > 0) {
            consolidadoMensal[mesAno].somaSapsProb += prob;
            consolidadoMensal[mesAno].sapsCount += 1;
          }
        }
      });

      // --- CONVERTENDO EM MÉTRICAS FINAIS PARA O GRÁFICO ---
      const listaFinal = Object.values(consolidadoMensal).map(m => {
        const mortalidadeReal = m.totalAltas > 0 ? (m.totalObitos / m.totalAltas) * 100 : 0;
        const mortalidadeEsperada = m.sapsCount > 0 ? (m.somaSapsProb / m.sapsCount) : 0;
        
        return {
          // Formata "2026-04" para "Abr/26" para o gráfico ficar bonito
          name: new Date(m.mes + "-02").toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          // Densidade de Incidência de VM (padrão ANVISA: por 1000 pacientes-dia)
          vm: m.somaLeitos > 0 ? parseFloat(((m.somaVM / m.somaLeitos) * 1000).toFixed(1)) : 0,
          // SMR
          smr: mortalidadeEsperada > 0 ? parseFloat((mortalidadeReal / mortalidadeEsperada).toFixed(2)) : 0,
          // Taxa de Identificação (%)
          id: m.somaLeitos > 0 ? parseFloat(((m.somaID / m.somaLeitos) * 100).toFixed(0)) : 0,
          // Mortalidade Bruta (%)
          morte: parseFloat(mortalidadeReal.toFixed(1)),
          // Campo técnico para ordenação
          rawDate: m.mes
        };
      });

      // Ordena por data (mais antigo para o mais recente)
      listaFinal.sort((a, b) => a.rawDate.localeCompare(b.rawDate));

      setLoadingGraficos(false);

    } catch (error) {
      console.error("Erro ao processar tendências:", error);
      setLoadingGraficos(false);
    }
  };

  processarDadosParaGraficos();
}, []);

  // Efeito: Buscar Plantões do Dia
  useEffect(() => {
    if (subViewEquipe !== 'escalas' || modoVisao !== 'dia') return;

    const buscarDados = async () => {
      setIsLoadingPlantoes(true);
      try {
        let q;
        if (categoriaAtiva === 'Visão Geral') {
          q = query(collection(db, "escalas"), where("data", "==", dataSelecionada));
        } else {
          q = query(
            collection(db, "escalas"),
            where("data", "==", dataSelecionada),
            where("categoria", "==", categoriaAtiva)
          );
        }
        
        const querySnapshot = await getDocs(q);
        const resultados = [];
        const agrupadoGeral = {};

        querySnapshot.forEach((doc) => {
          const dados = { id: doc.id, ...doc.data() };
          resultados.push(dados);
          
          if (!agrupadoGeral[dados.categoria]) agrupadoGeral[dados.categoria] = [];
          agrupadoGeral[dados.categoria].push(dados);
        });
        
        setPlantoesDoDia(resultados);
        setConsolidadoDia(agrupadoGeral);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setIsLoadingPlantoes(false);
      }
    };

    buscarDados();
  }, [dataSelecionada, categoriaAtiva, subViewEquipe, modoVisao]);

  // Efeito: Buscar Grade Mensal
  useEffect(() => {
    if (subViewEquipe !== 'escalas' || modoVisao !== 'mes') return;

    const buscarPlantoesMes = async () => {
      setIsLoadingMes(true);
      try {
        const anoMesAlvo = dataSelecionada.substring(0, 7); 

        const q = query(
          collection(db, "escalas"),
          where("categoria", "==", categoriaAtiva)
        );

        const querySnapshot = await getDocs(q);
        const dadosAgrupados = {};

        querySnapshot.forEach((doc) => {
          const p = doc.data();
          
          if (p.data && p.data.startsWith(anoMesAlvo)) {
            let atribuicoes = [];
            let strNome = p.nome || "";
            let siglaOriginal = p.sigla;

            // ======================================================
            // DECODIFICADOR DE SUBSTITUIÇÕES E OCORRÊNCIAS
            // ======================================================
            
            // 1. É um EXTRA?
            if (strNome.includes('[EXTRA]')) {
              atribuicoes.push({ nome: strNome.replace('[EXTRA]', '').trim(), sigla: siglaOriginal });
            } 
            // 2. É uma Troca Fatiada (Dia / Noite)?
            else if (strNome.includes(' / ')) {
              let partes = strNome.split(' / ');
              partes.forEach(parte => {
                // Tenta achar o nome e o turno, ex: "Dra. Julia (D)"
                let match = parte.match(/(.+?)\s*\((D|N)\)/);
                if (match) {
                  let nomeExt = match[1].trim();
                  let siglaExt = match[2];
                  // Só atribui se o médico daquele turno NÃO faltou
                  if (!nomeExt.includes('[FALTOU]') && !nomeExt.includes('[ATESTADO]')) {
                    atribuicoes.push({ nome: nomeExt, sigla: siglaExt });
                  }
                }
              });
            } 
            // 3. É uma Cobertura Total?
            else if (strNome.includes('(Cobrindo:')) {
              // Pega apenas quem está cobrindo, ignorando quem faltou
              let match = strNome.match(/(.+?)\s*\(Cobrindo:/);
              if (match) {
                atribuicoes.push({ nome: match[1].trim(), sigla: siglaOriginal });
              }
            } 
            // 4. O médico faltou ou deu atestado e NINGUÉM cobriu?
            else if (strNome.includes('[FALTOU]') || strNome.includes('[ATESTADO]')) {
               // Ninguém recebe o plantão, o buraco fica vazio na escala do mês!
            } 
            // 5. Plantão Normal
            else {
              atribuicoes.push({ nome: strNome.trim(), sigla: siglaOriginal });
            }

            // ======================================================
            // INJETAR OS RESULTADOS NA GRADE MENSAL
            // ======================================================
            const dia = p.data.split('-')[2]; 
            
            atribuicoes.forEach(attr => {
              const nomeFinal = attr.nome.toUpperCase(); // Normaliza o nome para evitar linhas duplicadas
              const siglaFinal = attr.sigla;

              if (!dadosAgrupados[nomeFinal]) dadosAgrupados[nomeFinal] = {};
              if (!dadosAgrupados[nomeFinal][dia]) dadosAgrupados[nomeFinal][dia] = [];
              
              if (!dadosAgrupados[nomeFinal][dia].includes(siglaFinal)) {
                dadosAgrupados[nomeFinal][dia].push(siglaFinal);
              }
            });
          }
        });

        // Ordenar os turnos bonitinho dentro do mesmo dia (se fizer M e depois N)
        const ordemTurnos = { 'M': 1, 'T': 2, 'N': 3, 'D': 4, 'DN': 5, 'V': 6 };
        Object.keys(dadosAgrupados).forEach(nome => {
          Object.keys(dadosAgrupados[nome]).forEach(dia => {
             dadosAgrupados[nome][dia] = dadosAgrupados[nome][dia]
               .sort((a, b) => (ordemTurnos[a] || 99) - (ordemTurnos[b] || 99))
               .join('');
          });
        });

        // Ordena os nomes em ordem alfabética para a tabela
        const dadosOrdenados = Object.keys(dadosAgrupados)
          .sort()
          .reduce((acc, key) => {
            acc[key] = dadosAgrupados[key];
            return acc;
          }, {});

        setPlantoesDoMes(dadosOrdenados);
      } catch (error) {
        console.error("Erro ao buscar a escala do mês:", error);
      } finally {
        setIsLoadingMes(false);
      }
    };

    buscarPlantoesMes();
  }, [dataSelecionada, categoriaAtiva, subViewEquipe, modoVisao]);

  const abrirModalTroca = (plantaoId, turnoEHorario, nomeAtual) => {
    setPlantaoEditado({ 
      id: plantaoId, 
      turno: turnoEHorario, 
      nomeAtual: nomeAtual 
    });
    
    setNovoPlantonista("");
    setTipoTrocaPlantao('Total'); 
    setStatusPlantonista('Normal'); // Reseta para Normal ao abrir
    setIsEditModalOpen(true);
  };

  const salvarTrocaPlantao = async () => {
    // Validação da Troca Normal
    console.log("RAIO-X DO PLANTAO:", plantaoEditado);
    if (statusPlantonista === 'Normal' && !novoPlantonista.trim()) {
      alert("Por favor, selecione o nome do novo plantonista.");
      return;
    }

    // ======================================================
    // 1. LAVA JATO DE TAGS (Evita o acúmulo de [FALTOU] [ATESTADO])
    // Pega o nome atual e arranca qualquer tag ou barra anterior
    // ======================================================
    let nomeLimpo = plantaoEditado.nomeAtual
      .replace(/\[FALTOU\]/g, '')
      .replace(/\[ATESTADO\]/g, '')
      .replace(/\(D\)/g, '')
      .replace(/\(N\)/g, '')
      .split('/')[0] // Se for uma troca antiga fatiada (Ex: João / Maria), pega só o primeiro para resetar
      .trim();

    let nomeFinal = "";

    // ======================================================
    // 2. APLICA A NOVA REGRA SIMPLIFICADA
    // ======================================================
    if (statusPlantonista === 'Falta') {
      // Falta é irreversível para o plantão todo na visão desse bloco
      nomeFinal = `${nomeLimpo} [FALTOU]`; 
    } 
    else if (statusPlantonista === 'Atestado') {
      // Atestado pode ser parcial
      if (tipoTrocaPlantao === 'Dia') nomeFinal = `${nomeLimpo} [ATESTADO] (D) / ${nomeLimpo} (N)`;
      else if (tipoTrocaPlantao === 'Noite') nomeFinal = `${nomeLimpo} (D) / ${nomeLimpo} [ATESTADO] (N)`;
      else nomeFinal = `${nomeLimpo} [ATESTADO]`; // Total
    } 
    else if (statusPlantonista === 'Normal') {
      // Troca simples de nomes
      const novo = novoPlantonista.trim();
      if (tipoTrocaPlantao === 'Dia') nomeFinal = `${novo} (D) / ${nomeLimpo} (N)`;
      else if (tipoTrocaPlantao === 'Noite') nomeFinal = `${nomeLimpo} (D) / ${novo} (N)`;
      else nomeFinal = novo; // Total
    }

    // ======================================================
    // 3. ATUALIZA A TELA E O BANCO
    // ======================================================
    setPlantoesDoDia(listaAnterior => 
      listaAnterior.map(plantao => {
        if (plantao.id === plantaoEditado.id) return { ...plantao, nome: nomeFinal };
        return plantao;
      })
    );

    try {
      const escalaRef = doc(db, "escalas", plantaoEditado.id); 
      await updateDoc(escalaRef, {
        nome: nomeFinal,
        // 🚨 CORREÇÃO: Usando a chave exata que o Raio-X revelou
        nomeOriginal: plantaoEditado.nomeAtual, 
        statusAlteracao: statusPlantonista, 
        modificadoEm: new Date().toISOString()
      });
      console.log("✅ Atualização salva no Firebase com sucesso!");
    } catch (error) {
      console.error("❌ Erro ao salvar troca no Firebase:", error);
    }

    setIsEditModalOpen(false);
  };

  const adicionarPlantonistaExtra = async () => {
    if (!extraNome.trim()) {
      alert("Por favor, digite o nome do plantonista extra.");
      return;
    }

    let horario = extraTurno === 'DN' ? '07:00 às 07:00' : extraTurno === 'D' ? '07:00 às 19:00' : '19:00 às 07:00';
    let turnoFormatado = extraTurno === 'DN' ? 'Plantão 24h' : extraTurno === 'D' ? 'Plantão Dia' : 'Plantão Noite';
    
    // Montamos o objeto exatamente como o seu Firebase exige
    const novoPlantaoDB = {
      cadastradoEm: new Date().toISOString(),
      categoria: categoriaAtiva, // Deve ser "Médico" baseado no seu painel
      data: dataSelecionada, // A data que o senhor está visualizando na tela
      horario: horario,
      nome: `${extraNome.trim().toUpperCase()} [EXTRA]`,
      sigla: extraTurno,
      status: "Confirmado",
      tipo: "plantao_extra",
      turno: turnoFormatado
    };

    // Criamos um ID no mesmo padrão do seu sistema para manter a organização
    const novoDocId = `${dataSelecionada}_${categoriaAtiva}_EXTRA_${Date.now()}`;

    // 1. ATUALIZA A TELA INSTANTANEAMENTE
    setPlantoesDoDia([...plantoesDoDia, { id: novoDocId, ...novoPlantaoDB }]);
    
    // 2. CRIA O NOVO DOCUMENTO NO FIREBASE
    try {
      // Usamos setDoc para criar um documento com ID específico na coleção "escalas"
      await setDoc(doc(db, "escalas", novoDocId), novoPlantaoDB);
      console.log("✅ Plantonista Extra criado no Firebase!");
    } catch (error) {
      console.error("❌ Erro ao criar Extra no Firebase:", error);
    }

    setIsExtraModalOpen(false);
    setExtraNome("");
    setExtraTurno("DN");
  };

  const salvarInvestigacaoEvento = async () => {
    if (!eventoEmInvestigacao) return;

    try {
      const eventoRef = doc(db, "eventos_adversos", eventoEmInvestigacao.id);
      
      // 1. Atualiza os campos da Gestão/CCIH (incluindo os novos campos de Dano e Impacto)
      await updateDoc(eventoRef, {
        prontuario: formInvestigacao.prontuario || "",
        faseCuidado: formInvestigacao.faseCuidado || "",
        fatoresContribuintes: formInvestigacao.fatoresContribuintes || "",
        medidasPreventivas: formInvestigacao.medidasPreventivas || "",
        statusAnalise: formInvestigacao.statusAnalise || "Em Análise",
        grauDano: formInvestigacao.grauDano || eventoEmInvestigacao.grauDano || "",
        impactoGerado: formInvestigacao.impactoGerado || "",
        dataFechamentoAnalise: formInvestigacao.statusAnalise === 'Concluído' ? new Date().toISOString() : null
      });

      // 2. Atualiza a tela imediatamente (Memória Curta) sem precisar recarregar o banco
      setListaEventos(listaAnterior => 
        listaAnterior.map(ev => 
          ev.id === eventoEmInvestigacao.id 
            ? { 
                ...ev, 
                ...formInvestigacao, 
                // Garante que o grau de dano atualizado reflita imediatamente na cor da barra lateral
                grauDano: formInvestigacao.grauDano || ev.grauDano,
                dataFechamentoAnalise: formInvestigacao.statusAnalise === 'Concluído' ? new Date().toISOString() : null 
              } 
            : ev
        )
      );

      alert("Análise salva com sucesso no Núcleo de Segurança do Paciente.");
      
      // 3. O PULO DO GATO: Esvazia o rascunho e fecha o modal
      setFormInvestigacao({}); 
      setEventoEmInvestigacao(null); 

    } catch (error) {
      console.error("Erro ao salvar investigação:", error);
      alert("Erro ao atualizar o evento no banco de dados.");
    }
  };

  // CRIADOR DE ESCALA FINAL //
  const exportarEscalaExecutada = async (mesRelatorio, anoRelatorio) => {
  try {
    alert("Iniciando auditoria da Escala Executada. Isso pode levar alguns segundos...");
    
    // 1. Busca TODOS os plantões confirmados do banco de dados
    const escalasRef = collection(db, "escalas");
    const querySnapshot = await getDocs(escalasRef); // Idealmente usar where() para filtrar o mês
    
    // 2. Objeto para organizar os dados: Categoria -> Nome do Profissional -> Dias
    const gradeFechada = {};
    
    querySnapshot.forEach((doc) => {
      const plantao = doc.data();
      
      // Filtra apenas o mês e ano que queremos exportar (ex: "2026-05")
      const prefixoData = `${anoRelatorio}-${String(mesRelatorio).padStart(2, '0')}`;
      
      if (plantao.data && plantao.data.startsWith(prefixoData) && !plantao.nome.includes('[FALTOU]')) {
        const categoria = plantao.categoria || "Geral";
        const nome = plantao.nome.replace('[EXTRA]', '').trim();
        const diaDoMes = parseInt(plantao.data.split('-')[2], 10);
        
        if (!gradeFechada[categoria]) gradeFechada[categoria] = {};
        if (!gradeFechada[categoria][nome]) gradeFechada[categoria][nome] = {};
        
        // Salva a sigla no dia correto
        gradeFechada[categoria][nome][diaDoMes] = plantao.sigla;
      }
    });

    // 3. Criação do arquivo Excel (Workbook)
    const wb = XLSX.utils.book_new();
    
    // Pega quantos dias tem o mês selecionado para montar o cabeçalho certinho
    const diasNoMes = new Date(anoRelatorio, mesRelatorio, 0).getDate();
    const cabecalhoDias = Array.from({ length: diasNoMes }, (_, i) => String(i + 1).padStart(2, '0'));
    const cabecalhoCompleto = ["NOME DO SERVIDOR", ...cabecalhoDias];

    // 4. Criação das Abas (Sheets) para cada Categoria
    Object.keys(gradeFechada).forEach((categoria) => {
      const dadosAba = [];
      dadosAba.push(cabecalhoCompleto); // Linha 1: Cabeçalhos
      
      // Preenche os profissionais e seus plantões
      Object.keys(gradeFechada[categoria]).forEach((nome) => {
        const linhaProfissional = [nome];
        
        for (let dia = 1; dia <= diasNoMes; dia++) {
          const sigla = gradeFechada[categoria][nome][dia] || "";
          linhaProfissional.push(sigla);
        }
        
        dadosAba.push(linhaProfissional);
      });
      
      // Converte o array da aba para o formato do SheetJS
      const ws = XLSX.utils.aoa_to_sheet(dadosAba);
      
      // Ajusta a largura das colunas (Nome mais largo, dias mais estreitos)
      const wscols = [{ wch: 35 }, ...cabecalhoDias.map(() => ({ wch: 4 }))];
      ws['!cols'] = wscols;
      
      // Adiciona a aba ao arquivo final
      XLSX.utils.book_append_sheet(wb, ws, categoria.substring(0, 31)); // O Excel limita nomes de abas a 31 caracteres
    });

    // 5. Download automático do arquivo
    XLSX.writeFile(wb, `Escala_Executada_UTI_${mesRelatorio}_${anoRelatorio}.xlsx`);
    
  } catch (error) {
    console.error("Erro ao gerar Excel:", error);
    alert("Erro ao exportar a escala fechada.");
  }
};

  // Função para gerar e copiar o Checklist de Profissionais
  const gerarTextoChecklist = () => {
    let texto = `UTI MUNICIPAL\n${formatarDataBR(dataSelecionada)}\n\n`;

    // Mapeamento das categorias para o título impresso e a chave no banco de dados
    const mapaCategorias = [
      { titulo: "MÉDICO VISITADOR", chave: "Médico Visitador" },
      { titulo: "MÉDICO", chave: "Médico" },
      { titulo: "ENFERMEIRO", chave: "Enfermeiro" },
      { titulo: "TÉCNICO DE ENFERMAGEM", chave: "Téc. Enfermagem" },
      { titulo: "TÉCNICO HEMODIÁLISE", chave: "Téc. Hemodiálise" },
      { titulo: "FISIOTERAPEUTA", chave: "Fisioterapeuta" },
      { titulo: "MOTORISTA", chave: "Motorista" },
      { titulo: "NUTRICIONISTA", chave: "Nutricionista" },
      { titulo: "PSICÓLOGO", chave: "Psicólogo" }
    ];

    mapaCategorias.forEach(cat => {
      texto += `${cat.titulo}\n`;
      const profissionaisRaw = consolidadoDia[cat.chave] || [];
      let ativos = [];

      // Aplicando o filtro de limpeza
      profissionaisRaw.forEach(p => {
        let strNome = p.nome || "";
        let siglaBase = p.sigla || "";

        if (strNome.includes('[EXTRA]')) {
          ativos.push({ nome: strNome.replace('[EXTRA]', '').trim(), sigla: siglaBase });
        } else if (strNome.includes(' / ')) {
          let partes = strNome.split(' / ');
          partes.forEach(parte => {
            let match = parte.match(/(.+?)\s*\((D|N)\)/);
            if (match) {
              let nomeExt = match[1].trim();
              let siglaExt = match[2];
              if (!nomeExt.includes('[FALTOU]') && !nomeExt.includes('[ATESTADO]')) {
                ativos.push({ nome: nomeExt, sigla: siglaExt });
              }
            }
          });
        } else if (strNome.includes('(Cobrindo:')) {
          let match = strNome.match(/(.+?)\s*\(Cobrindo:/);
          if (match) {
            ativos.push({ nome: match[1].trim(), sigla: siglaBase });
          }
        } else if (!strNome.includes('[FALTOU]') && !strNome.includes('[ATESTADO]')) {
          ativos.push({ nome: strNome.trim(), sigla: siglaBase });
        }
      });

      // Imprime os nomes ou deixa o espaço em branco sob a categoria
      if (ativos.length === 0) {
        texto += "\n";
      } else {
        ativos.forEach(p => {
          let turno = p.sigla ? ` - ${p.sigla}` : "";
          
          // A MÁGICA AQUI: Quebra o nome nos espaços e pega só a primeira palavra
          let primeiroNome = p.nome.split(' ')[0]; 
          
          texto += `•\t${primeiroNome}${turno}\n`;
        });
        texto += "\n";
      }
    });

    // ==========================================
    // CÁLCULO INTELIGENTE DE LEITOS VAGOS
    // ==========================================
    let numeroLeitosVagos = 0;
    
    if (typeof leitosConfig !== 'undefined') {
      numeroLeitosVagos = leitosConfig.filter(l => l.status === 'Livre' && !l.bloqueado).length;
    } else if (typeof patients !== 'undefined') {
      numeroLeitosVagos = patients.filter(p => !p.nome && (p.leito !== 11 || currentRolePerms?.canSeeLeito11)).length;
    }

    texto += `Leitos vagos - ${numeroLeitosVagos} LEITOS\n`;

    // Copia para a área de transferência
    navigator.clipboard.writeText(texto)
      .then(() => alert("Checklist de profissionais copiado com sucesso!"))
      .catch(err => console.error("Erro ao copiar: ", err));
  };

  const formatarDataBR = (strData) => {
    if (!strData) return "";
    const [ano, mes, dia] = strData.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  // ==========================================
  // VISÃO 1: HUB PRINCIPAL
  // ==========================================
  const renderHub = () => (
    <div className="animate-fadeIn">
      {/* HEADER DE SINAIS VITAIS - SINCRONIZADO */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        
        {/* TÍTULO COM BOTÃO DE VOLTAR */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/hub')} 
            title="Voltar para Seleção de Setores"
            className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors flex items-center justify-center"
          >
            <ArrowLeft size={24} className="text-slate-700" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Painel do Gestor</h2>
            <p className="text-slate-500 text-sm mt-1">Visão estratégica e monitoramento da UTI</p>
          </div>
        </div>

        {/* CARDS RÁPIDOS */}
        <div className="flex flex-wrap gap-4">

          {/* CARD: OCUPAÇÃO EM TEMPO REAL */}
          {(() => {
            // 1. Filtra a sua capacidade real (ignora moradores e leitos em manutenção)
            const leitosValidos = leitosConfig?.filter(l => !l.bloqueado && !l.ignorarEstatistica) || [];
            const totalValidos = leitosValidos.length > 0 ? leitosValidos.length : 10;
            
            // 2. DIAGNÓSTICO APLICADO: O banco omite a tag "status" quando o leito enche.
            // Agora verificamos o "nome" do paciente e o "statusInternacao".
            const ocupadosAgora = leitosValidos.filter(l => {
              const temNome = l.nome && String(l.nome).trim() !== '';
              const statusInternacaoOcupado = l.statusInternacao && String(l.statusInternacao).toLowerCase() !== 'livre';
              const statusOcupado = l.status && String(l.status).toLowerCase() !== 'livre';
              
              // Se qualquer uma dessas for verdade, há um paciente no leito
              return temNome || statusInternacaoOcupado || statusOcupado;
            }).length;
            
            // 3. Matemática exata do momento
            const ocupacaoHoje = Math.round((ocupadosAgora / totalValidos) * 100);

            // 4. Alerta Visual (Design focado em segurança)
            const isLotado = ocupacaoHoje >= 100;
            const isAlerta = ocupacaoHoje >= 80 && ocupacaoHoje < 100;

            const bgClass = isLotado ? "bg-red-50 border-red-200" : isAlerta ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-100";
            const textClass = isLotado ? "text-red-800" : isAlerta ? "text-amber-800" : "text-emerald-800";
            const labelClass = isLotado ? "text-red-600" : isAlerta ? "text-amber-600" : "text-emerald-600";

            return (
              <div className={`${bgClass} px-4 py-2.5 rounded-xl border flex flex-col items-center justify-center min-w-[110px] transition-all hover:shadow-md animate-fadeIn`}>
                <span className={`text-[10px] font-bold ${labelClass} uppercase tracking-wider mb-1`}>Ocupação Atual</span>
                <span className={`text-xl font-black ${textClass}`}>
                  {isNaN(ocupacaoHoje) ? '0' : ocupacaoHoje}%
                </span>
                <span className={`text-[8px] font-bold ${labelClass} opacity-75 uppercase tracking-wider mt-0.5`}>
                  Tempo Real
                </span>
              </div>
            );
          })()}
          
          <div className="bg-red-50 px-4 py-2.5 rounded-xl border border-red-100 flex flex-col items-center justify-center min-w-[110px]">
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">Eventos Hoje</span>
            <span className="text-xl font-black text-red-800">
              {alertasHeader.eventosHoje}
            </span>
          </div>
          
          <div className="bg-amber-50 px-4 py-2.5 rounded-xl border border-amber-100 flex flex-col items-center justify-center min-w-[110px] transition-all hover:shadow-md">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Pendências RH</span>
            <span className="text-xl font-black text-amber-800">
              {alertasHeader.pendenciasRH}
            </span>
          </div>

        </div>
      </div>

      {/* GRADE DE NAVEGAÇÃO */}
      <div className="grid md:grid-cols-2 gap-6">
        <button onClick={() => setActiveView('indicadores')} className="bg-white p-8 rounded-3xl shadow-sm border-2 border-transparent hover:border-blue-500 hover:shadow-xl transition-all group text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all"><BarChart2 size={100} /></div>
          <div className="bg-blue-100 w-14 h-14 rounded-2xl flex items-center justify-center text-blue-600 mb-6"><BarChart2 size={28} /></div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Inteligência Clínica</h3>
          <p className="text-slate-500 text-sm pr-8">Taxa de mortalidade, SMR, tempo de permanência, densidade de dispositivos e desfechos.</p>
        </button>

        <button onClick={() => { setActiveView('qualidade'); setAbaIrasAtiva('geral'); }} className="bg-white p-8 rounded-3xl shadow-sm border-2 border-transparent hover:border-purple-500 hover:shadow-xl transition-all group text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all"><Microscope size={100} /></div>
          <div className="bg-purple-100 w-14 h-14 rounded-2xl flex items-center justify-center text-purple-600 mb-6"><Microscope size={28} /></div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Controle Microbiológico (IRAS)</h3>
          <p className="text-slate-500 text-sm pr-8">Monitoramento de PAV, IPCSL, ITU-AC, culturas e perfil de resistência.</p>
        </button>

        <button onClick={() => setActiveView('auditoria')} className="bg-white p-8 rounded-3xl shadow-sm border-2 border-transparent hover:border-amber-500 hover:shadow-xl transition-all group text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all"><FileCheck size={100} /></div>
          <div className="bg-amber-100 w-14 h-14 rounded-2xl flex items-center justify-center text-amber-600 mb-6"><FileCheck size={28} /></div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">NSP e Auditoria</h3>
          <p className="text-slate-500 text-sm pr-8">Auditoria de Eventos Adversos, Escalas de risco, Adesão a protocolos.</p>
        </button>

        <button onClick={() => setActiveView('equipe')} className="bg-white p-8 rounded-3xl shadow-sm border-2 border-transparent hover:border-emerald-500 hover:shadow-xl transition-all group text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all"><Users size={100} /></div>
          <div className="bg-emerald-100 w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-600 mb-6"><Users size={28} /></div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Gestão de Equipe</h3>
          <p className="text-slate-500 text-sm pr-8">Controle de acessos, aprovação de usuários, perfis de permissão e layout de leitos.</p>
        </button>
      </div>
    </div>
  );

  // ==========================================
  // VISÃO 2: INTELIGÊNCIA CLÍNICA (FOTO)
  // ==========================================
  const renderIndicadores = () => {
    
    return (
      <div className="animate-fadeIn">
        
        {/* Cabeçalho */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setActiveView('hub')} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <BarChart2 className="text-blue-600" /> Inteligência Clínica e Indicadores
            </h2>
            <p className="text-slate-500 text-sm mt-1">Análise de fluxo, ocupação e desfechos clínicos da unidade.</p>
          </div>
        </div>

        {/* =========================================
            GRUPO 1: INDICADORES OPERACIONAIS E FLUXO 
            ========================================= */}
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2 m-0">
            <Bed size={16} className="text-blue-500" /> Operacional e Fluxo
          </h3>
          <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Últimos 30 dias
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* CARD 1: TAXA DE OCUPAÇÃO */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 relative overflow-hidden shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Taxa de Ocupação</span>
            <div className="text-3xl font-black text-slate-800 mt-1">{metricasOperacionais.ocupacao}%</div>
            {/* A barra azul cresce dinamicamente conforme a ocupação */}
            <div className="absolute bottom-0 left-0 h-1.5 transition-all duration-1000 ease-out bg-blue-500" style={{ width: `${metricasOperacionais.ocupacao}%` }}></div>
          </div>
          
          {/* CARD 2: GIRO DE LEITO */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Giro de Leito</span>
            <div className="text-3xl font-black text-slate-800 mt-1">{metricasOperacionais.giro}</div>
            <div className="text-[10px] text-slate-400 font-bold mt-1">Saídas / Leito Válido</div>
          </div>

          {/* CARD 3: TEMPO MÉDIO (LOS) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Tempo Médio (LOS)</span>
            <div className="text-3xl font-black text-slate-800 mt-1">{metricasOperacionais.los} <span className="text-sm font-normal text-slate-500">dias</span></div>
          </div>

          {/* CARD 4: PACIENTES-DIA */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Pacientes-Dia</span>
            <div className="text-3xl font-black text-slate-800 mt-1">{metricasOperacionais.pacientesDia}</div>
          </div>
        
        </div>

        {/* =========================================
            GRUPO 2: DESFECHOS CLÍNICOS E SEGURANÇA
            ========================================= */}
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2 m-0">
            <ShieldAlert size={16} className="text-emerald-500" /> Desfechos Clínicos e Qualidade
          </h3>
          <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Últimos 30 dias
          </span>
        </div>
        
        {metricasQualidade.carregando ? (
           <div className="text-sm text-slate-400 p-4 animate-pulse">Carregando indicadores...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            
            {/* CARD 1: MORTALIDADE BRUTA */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Mortalidade Bruta</span>
              <div className="text-3xl font-black text-slate-800 mt-1">{metricasQualidade.mortalidadeBruta}%</div>
              <div className="text-[10px] text-slate-400 font-bold mt-1">Esperada (SAPS 3): {metricasQualidade.mortalidadeEsperada}%</div>
            </div>

            {/* CARD 2: SMR (COR DINÂMICA) */}
            {(() => {
              const smrVal = parseFloat(metricasQualidade.smr);
              
              // 1. Tratamento da falta de dados corrigido!
              // Só é "Sem Dados" se não houver Mortalidade Esperada calculada
              const semDados = isNaN(smrVal) || metricasQualidade.mortalidadeEsperada === "0.0"; 
              
              if (semDados) {
                return (
                  <div className="p-5 rounded-xl shadow-sm border relative overflow-hidden bg-slate-50/50 border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-500">SMR (SAPS 3)</span>
                    <div className="text-3xl font-black mt-1 text-slate-400">-</div>
                    <div className="absolute bottom-2 right-4 text-[10px] font-bold px-2 py-1 rounded bg-slate-200 text-slate-500">
                      Aguardando Saídas
                    </div>
                  </div>
                );
              }

              // 2. Lógica de cores baseada em performance
              const isExcelente = smrVal < 1.0;
              const isAlerta = smrVal >= 1.0 && smrVal <= 1.2;
              
              const bgClass = isExcelente ? "bg-emerald-50/30 border-emerald-200" : isAlerta ? "bg-amber-50/30 border-amber-200" : "bg-red-50/30 border-red-200";
              const textClass = isExcelente ? "text-emerald-700" : isAlerta ? "text-amber-700" : "text-red-700";
              const badgeBg = isExcelente ? "bg-emerald-100" : isAlerta ? "bg-amber-100" : "bg-red-100";
              const label = isExcelente ? "Salvando Mais!" : isAlerta ? "Dentro do Esperado" : "Acima da Meta";

              return (
                <div className={`p-5 rounded-xl shadow-sm border relative overflow-hidden ${bgClass} animate-fadeIn`}>
                  <span className={`text-[10px] font-bold uppercase ${textClass}`}>SMR (SAPS 3)</span>
                  <div className={`text-3xl font-black mt-1 relative z-10 ${textClass}`}>{smrVal.toFixed(2)}</div>
                  <div className={`absolute bottom-2 right-4 text-[10px] font-bold px-2 py-1 rounded ${badgeBg} ${textClass}`}>
                    {label}
                  </div>
                </div>
              );
            })()}

            {/* CARD 3: READMISSÃO */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 relative">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Readmissão em 48h</span>
              <div className={`text-3xl font-black mt-1 ${parseFloat(metricasQualidade.taxaReadmissao) > 5 ? "text-red-600" : "text-amber-600"}`}>
                {metricasQualidade.taxaReadmissao}%
              </div>
              <div className="text-[10px] text-slate-400 font-bold mt-1">Alerta se &gt; 5%</div>
            </div>

            {/* CARD 4: IDENTIFICAÇÃO CORRETA */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Identificação Correta</span>
              <div className={`text-3xl font-black mt-1 relative z-10 ${parseFloat(metricasQualidade.taxaIdentificacao) >= 95 ? "text-emerald-600" : "text-blue-600"}`}>
                {metricasQualidade.taxaIdentificacao}%
              </div>
              <div className="text-[10px] text-slate-400 font-bold mt-1 relative z-10">Meta Interna: 100%</div>
              <div 
                className={`absolute bottom-0 left-0 h-1.5 transition-all duration-1000 ease-out ${parseFloat(metricasQualidade.taxaIdentificacao) >= 95 ? "bg-emerald-400" : "bg-amber-400"}`} 
                style={{ width: `${metricasQualidade.taxaIdentificacao}%` }}
              ></div>
            </div>

          </div>
        )}

        {/* CHAMADA PARA A NOVA ABA DE EPIDEMIOLOGIA */}
        <div onClick={() => setActiveView('epidemiologia')} className="mb-4 bg-teal-800 p-6 rounded-2xl shadow-lg border border-teal-700 cursor-pointer hover:bg-teal-900 hover:shadow-xl transition-all group flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
              <MapPin className="text-teal-400" size={24} /> Explorar Mapa Epidemiológico
            </h3>
            <p className="text-teal-100/70 text-sm">Analise a procedência, volume regional e histórico de 12 meses em um relatório exclusivo.</p>
          </div>
          <div className="bg-teal-700 p-3 rounded-full group-hover:translate-x-2 transition-transform">
            <ArrowRight className="text-teal-400" size={24} />
          </div>
        </div>

        {/* CHAMADA PARA TENDÊNCIAS TEMPORAIS */}
        <div onClick={() => setActiveView('tendencias')} className="mb-8 bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700 cursor-pointer hover:bg-slate-900 hover:shadow-xl transition-all group flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-1"><TrendingUp className="text-emerald-400" size={24} /> Explorar Gráficos de Tendências Temporais</h3>
            <p className="text-slate-400 text-sm">Analise a evolução histórica da ocupação, mortalidade, dias de VM e outros indicadores ao longo dos meses.</p>
          </div>
          <div className="bg-slate-700 p-3 rounded-full group-hover:translate-x-2 transition-transform"><ArrowRight className="text-emerald-400" size={24} /></div>
        </div>

        {/* SEÇÃO DE GRÁFICOS (RECHARTS) - DADOS REAIS */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          
          {/* GRÁFICO 1: DIAS-DISPOSITIVO */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80 flex flex-col">
            <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase flex items-center gap-2">
              <Activity size={16} className="text-blue-500" /> Total de Dias-Dispositivo (Mês atual)
            </h3>
            <div className="flex-1 w-full">
              {dadosDispositivos.length === 0 || dadosDispositivos.every(d => d.dias === 0) ? (
                <div className="flex items-center justify-center h-full text-slate-400 italic text-xs text-center">
                  Aguardando encerramento do primeiro <br/> censo diário (23:59) para gerar dados.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosDispositivos} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="dias" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* GRÁFICO 2: EVOLUÇÃO DO SMR (LINHA DE TENDÊNCIA) */}
          {(() => {
            // A matemática visual usa os dados reais que vieram do Motor lá de cima
            const dataMax = dadosSMRAnual.length > 0 ? Math.max(...dadosSMRAnual.map(d => d.smr)) : 0;
            const dataMin = dadosSMRAnual.length > 0 ? Math.min(...dadosSMRAnual.map(d => d.smr)) : 0;
            
            const tetoEixoY = Math.max(dataMax, 1.5);

            let gradientOffset = 0;
            if (dataMax <= 1.0) {
              gradientOffset = 0; 
            } else if (dataMin >= 1.0) {
              gradientOffset = 1; 
            } else {
              gradientOffset = (dataMax - 1.0) / (dataMax - dataMin);
            }

            return (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80 flex flex-col">
                <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase flex items-center gap-2">
                  <Activity size={16} className="text-blue-500" /> Evolução do SMR (Últimos 12 Meses)
                </h3>
                <div className="flex-1 w-full">
                  {dadosSMRAnual.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400 italic text-xs text-center">
                      Carregando histórico ou sem dados suficientes...
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dadosSMRAnual} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="corSMR" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                            <stop offset={`${gradientOffset * 100}%`} stopColor="#ef4444" stopOpacity={1} />
                            <stop offset={`${gradientOffset * 100}%`} stopColor="#10b981" stopOpacity={1} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={1} />
                          </linearGradient>
                        </defs>
                        
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis domain={[0, Math.ceil(tetoEixoY * 10) / 10]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value) => [Number(value).toFixed(2), "SMR"]}
                          labelStyle={{ fontWeight: 'bold', color: '#334155' }}
                        />

                        <ReferenceLine y={1} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1}>
                           <Label value="Corte (1.0)" position="insideBottomLeft" fill="#ef4444" fontSize={10} fontWeight="bold" />
                        </ReferenceLine>
                        
                        <Line type="monotone" dataKey="smr" stroke="url(#corSMR)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: "#64748b" }} activeDot={{ r: 6, strokeWidth: 0, fill: "#3b82f6" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            );
          })()}

        </div>
      </div>
    );
  };

  // RELATÓRIO MENSAL INDICADORES DE QUALIDADE - GERAÇÃO E EXPORTAÇÃO //
  const exportarRelatorioMensal = (mesAlvo) => {
    if (!listaCenso || listaCenso.length === 0) {
      return alert("Nenhum dado de censo disponível para gerar o relatório.");
    }

    // 1. Filtragem Atômica do Mês Escolhido (Formato YYYY-MM)
    const censoMes = listaCenso.filter(dia => {
      let dataLimpa = String(dia.data || "").replace(',', '').trim();
      return dataLimpa.includes(mesAlvo);
    });

    const historicoMes = listaHistorico.filter(pac => {
      return pac.dataSaida && pac.dataSaida.substring(0, 7) === mesAlvo;
    });

    // 2. Acumuladores Matemáticos
    let pacienteDias = 0, totalVM = 0, totalCVC = 0, totalSVD = 0, totalShiley = 0, totalID = 0;
    let totalAltas = historicoMes.length;
    let obitosObservados = 0, obitosEsperados = 0, sapsCount = 0;
    let somaLOS = 0, readmissoes48h = 0;

    // A. Processar Censo Diário do Mês
    censoMes.forEach(dia => {
      const ocupados = Number(dia.totalLeitosOcupados) || 0;
      pacienteDias += ocupados;
      totalVM += Number(dia.pacientesEmVM) || 0;
      totalCVC += Number(dia.pacientesComCVC) || 0;
      totalSVD += Number(dia.pacientesComSVD) || 0;
      totalShiley += Number(dia.pacientesComShiley) || 0;
      totalID += Number(dia.pacientesIdentificados) || 0;
    });

    // B. Processar Desfechos do Mês
    historicoMes.forEach(pac => {
      const statusReal = pac.indicadores?.resultado || pac.desfecho || pac.status || "";
      const isObito = String(statusReal).toLowerCase().includes('óbito') || String(statusReal).toLowerCase().includes('obito');
      if (isObito) obitosObservados++;

      const saps3Prob = pac.saps3?.lockedProb || pac.backupProntuario?.saps3?.lockedProb || pac.indicadores?.saps3?.lockedProb;
      if (saps3Prob) {
        obitosEsperados += (parseFloat(saps3Prob) / 100);
        sapsCount++;
      }

      // Cálculo de LOS (Tempo de permanência)
      if (pac.dataEntrada && pac.dataSaida) {
        const inD = new Date(pac.dataEntrada);
        const outD = new Date(pac.dataSaida);
        let dias = Math.ceil(Math.abs(outD - inD) / (1000 * 60 * 60 * 24));
        somaLOS += (dias === 0 ? 1 : dias);
      }
    });

    // C. Cruzamento de Readmissões do Mês
    const porPaciente = listaHistorico.reduce((acc, doc) => {
      if (doc.nome && doc.nome !== "Não Informado") {
        if (!acc[doc.nome]) acc[doc.nome] = [];
        acc[doc.nome].push(doc);
      }
      return acc;
    }, {});

    Object.values(porPaciente).forEach(estadias => {
      if (estadias.length > 1) {
        estadias.sort((a, b) => new Date(a.dataEntrada) - new Date(b.dataEntrada));
        for (let i = 1; i < estadias.length; i++) {
          if (!estadias[i-1].dataSaida) continue;
          const diffHoras = Math.abs((new Date(estadias[i].dataEntrada) - new Date(estadias[i-1].dataSaida)) / (1000 * 60 * 60));
          if (new Date(estadias[i].dataEntrada).toISOString().substring(0, 7) === mesAlvo && diffHoras <= 48) {
            readmissoes48h++;
          }
        }
      }
    });

    // 3. Cálculos Finais Básicos
    const capacidadeUTI = Number(capacidadeInput) || 10;
    const diasNoMes = censoMes.length || 30;
    const leitosDisponiveisPeriodo = capacidadeUTI * diasNoMes;

    const txMortalidade = totalAltas > 0 ? ((obitosObservados / totalAltas) * 100).toFixed(1) : "0.0";
    const smrCalculado = obitosEsperados > 0 ? (obitosObservados / obitosEsperados).toFixed(2) : "0.00";
    const txIdentificacao = pacienteDias > 0 ? ((totalID / pacienteDias) * 100).toFixed(1) : "0.0";
    const txReadmissao = totalAltas > 0 ? ((readmissoes48h / totalAltas) * 100).toFixed(1) : "0.0";

    const usoVM = pacienteDias > 0 ? ((totalVM / pacienteDias) * 100).toFixed(1) : "0.0";
    const usoCVC = pacienteDias > 0 ? ((totalCVC / pacienteDias) * 100).toFixed(1) : "0.0";
    const usoSVD = pacienteDias > 0 ? ((totalSVD / pacienteDias) * 100).toFixed(1) : "0.0";
    const usoShiley = pacienteDias > 0 ? ((totalShiley / pacienteDias) * 100).toFixed(1) : "0.0";

    const txOcupacao = leitosDisponiveisPeriodo > 0 ? ((pacienteDias / leitosDisponiveisPeriodo) * 100).toFixed(1) : "0.0";
    const giroLeito = totalAltas > 0 ? (totalAltas / capacidadeUTI).toFixed(1) : "0.0";
    const losMedio = totalAltas > 0 ? (somaLOS / totalAltas).toFixed(1) : "0.0";

    // 4. Construção Dinâmica do PDF via Instancia Global do jsPDF
    try {
      const doc = new jsPDF();

      // Cabeçalho Clean (Branco com texto escuro e linha de acento verde)
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 210, 35, 'F');
      
      // Linha fina verde esmeralda para dar identidade ao sistema
      doc.setDrawColor(16, 185, 129); // Cor: emerald-500
      doc.setLineWidth(1.2);
      doc.line(15, 32, 195, 32);

      // Textos do Cabeçalho
      doc.setTextColor(30, 41, 59); // Cor: slate-800
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("SYS4U - GESTÃO DE INDICADORES", 15, 20);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139); // Cor: slate-500
      doc.text(`RELATÓRIO DE DESEMPENHO DA UTI - MÊS: ${mesAlvo}`, 15, 28);

      // Função Auxiliar para Criar Tabelas Separadas por Categorias
      const criarTabelaCategoria = (titulo, dados, startY) => {
        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(titulo, 15, startY);
        
        autoTable(doc, {
          startY: startY + 4,
          head: [['Indicador Monitorado', 'Resultado Obtido']],
          body: dados,
          theme: 'striped',
          // 💡 Cabeçalho da tabela: Fundo verde muito claro e texto escuro
          headStyles: { fillColor: [209, 250, 229], textColor: [30, 41, 59], fontStyle: 'bold' },
          // 💡 Corpo: Textos nítidos em cinza escuro com espaçamento confortável
          styles: { fontSize: 10, textColor: [51, 65, 85], cellPadding: 4 },
          alternateRowStyles: { fillColor: [248, 250, 252] }, // Linha zebrada leve
          margin: { left: 15, right: 15 }
        });
        return doc.lastAutoTable.finalY + 12;
      };

      // Seção 1: Desfechos Clínicos e Qualidade
      let proximaY = criarTabelaCategoria("1. DESFECHOS CLÍNICOS E QUALIDADE", [
        ["Taxa de Mortalidade Bruta", `${txMortalidade}%`],
        ["SMR (Standardized Mortality Ratio)", `${smrCalculado}`],
        ["Identificação Correta do Paciente", `${txIdentificacao}%`],
        ["Taxa de Readmissão em 48h", `${txReadmissao}%`]
      ], 45);

      // Seção 2: Dispositivos Invasivos (Mantendo as 4 barras separadas)
      proximaY = criarTabelaCategoria("2. DISPOSITIVOS INVASIVOS (% USO DIÁRIO)", [
        ["Taxa de Utilização de Ventilação Mecânica (VM)", `${usoVM}%`],
        ["Taxa de Utilização de Acesso Central (CVC)", `${usoCVC}%`],
        ["Taxa de Utilização de Cateter de Diálise (Shiley)", `${usoShiley}%`],
        ["Taxa de Utilização de Sonda Vesical (SVD)", `${usoSVD}%`]
      ], proximaY);

      // Seção 3: Gestão Operacional Diária
      criarTabelaCategoria("3. GESTÃO OPERACIONAL DIÁRIA", [
        ["Taxa de Ocupação Média", `${txOcupacao}%`],
        ["Giro de Leito (Pacientes/Leito)", `${giroLeito}`],
        ["Tempo Médio de Permanência (LOS)", `${losMedio} Dias`],
        ["Total de Pacientes-Dia no Período", `${pacienteDias} d-p`]
      ], proximaY);

      // Salva o arquivo gerado
      doc.save(`Relatorio_Mensal_UTI_${mesAlvo}.pdf`);
    } catch (err) {
      console.error("Erro ao rodar jsPDF:", err);
      alert("Erro ao formatar PDF. Certifique-se de que o relatório de censo do mês selecionado não esteja vazio.");
    }
  };

  const exportarRelatorioEventos = (mesAlvo) => {
    if (!listaEventos || listaEventos.length === 0) {
      return alert("Nenhum evento adverso registrado para análise.");
    }

    // 1. Filtragem pelo mês escolhido
    const eventosMes = listaEventos.filter(ev => {
      // Garante que pega a data da ocorrência e compara os primeiros 7 dígitos (YYYY-MM)
      if (!ev.dataHoraOcorrencia) return false;
      return ev.dataHoraOcorrencia.substring(0, 7) === mesAlvo;
    });

    if (eventosMes.length === 0) {
      return alert(`Nenhum evento registrado no mês de ${mesAlvo}.`);
    }

    // 2. Acumuladores Matemáticos
    let totais = eventosMes.length;
    let grauLeve = 0, grauModerado = 0, grauGrave = 0, grauObito = 0, grauNenhum = 0;
    let statusPendentes = 0, statusEmAnalise = 0, statusConcluido = 0;
    const contagemTipos = {};

    eventosMes.forEach(ev => {
      // Graus de Dano
      if (ev.grauDano === 'Leve') grauLeve++;
      else if (ev.grauDano === 'Moderado') grauModerado++;
      else if (ev.grauDano === 'Grave') grauGrave++;
      else if (ev.grauDano === 'Óbito') grauObito++;
      else grauNenhum++;

      // Status
      if (ev.statusAnalise === 'Pendente NSP') statusPendentes++;
      else if (ev.statusAnalise === 'Em Análise') statusEmAnalise++;
      else if (ev.statusAnalise === 'Concluído') statusConcluido++;

      // Tipos (Para achar a maior incidência)
      const tipo = ev.tipoEvento || 'Não Especificado';
      contagemTipos[tipo] = (contagemTipos[tipo] || 0) + 1;
    });

    // Ordena os Tipos de Eventos do maior para o menor
    const tiposOrdenados = Object.entries(contagemTipos)
      .sort((a, b) => b[1] - a[1])
      .map(([tipo, qtd]) => [`${tipo}`, `${qtd} ocorrência(s)`]);

    // 3. Construção do PDF (jsPDF)
    try {
      const doc = new jsPDF();

      // Cabeçalho Clean (Branco com texto escuro e linha de acento verde)
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 210, 35, 'F');
      
      // Linha fina verde esmeralda para dar identidade
      doc.setDrawColor(16, 185, 129); // Cor: emerald-500
      doc.setLineWidth(1.2);
      doc.line(15, 32, 195, 32);

      // Textos do Cabeçalho
      doc.setTextColor(30, 41, 59); // Cor: slate-800
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("NÚCLEO DE SEGURANÇA DO PACIENTE (NSP)", 15, 20);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139); // Cor: slate-500
      doc.text(`RELATÓRIO MENSAL DE INCIDENTES - MÊS: ${mesAlvo}`, 15, 28);

      // Função de Tabelas Limpas (Verde Claro)
      const criarTabelaCategoria = (titulo, dados, startY) => {
        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(titulo, 15, startY);
        
        autoTable(doc, {
          startY: startY + 4,
          head: [['Métrica', 'Resultado']],
          body: dados,
          theme: 'striped',
          // 💡 Cabeçalho da tabela: Fundo verde muito claro e texto escuro
          headStyles: { fillColor: [209, 250, 229], textColor: [30, 41, 59], fontStyle: 'bold' },
          // 💡 Corpo: Cinza suave, não cansa a vista
          styles: { fontSize: 10, textColor: [51, 65, 85], cellPadding: 4 },
          alternateRowStyles: { fillColor: [248, 250, 252] }, // Linha zebrada bem clara
          margin: { left: 15, right: 15 }
        });
        return doc.lastAutoTable.finalY + 12;
      };

      // Tabela 1: Resumo Geral
      let proximaY = criarTabelaCategoria("1. PANORAMA GERAL DO MÊS", [
        ["Total de Notificações Registradas", `${totais}`],
        ["Investigações Pendentes (Aguardando NSP)", `${statusPendentes}`],
        ["Eventos Em Análise (Ishikawa/5 Porquês)", `${statusEmAnalise}`],
        ["Processos Concluídos/Arquivados", `${statusConcluido}`]
      ], 45); // Começa um pouco mais alto por causa do cabeçalho menor

      // Tabela 2: Estratificação de Dano
      proximaY = criarTabelaCategoria("2. ESTRATIFICAÇÃO POR GRAU DE DANO", [
        ["Nenhum Dano (Near Miss / Incidente sem Dano)", `${grauNenhum}`],
        ["Dano Leve (Sintomas leves, sem intervenção maior)", `${grauLeve}`],
        ["Dano Moderado (Exigiu intervenção ou prolongou internação)", `${grauModerado}`],
        ["Dano Grave / Sentinela (Dano permanente ou risco de vida)", `${grauGrave}`],
        ["Óbito (Evento contribuiu diretamente para a morte)", `${grauObito}`]
      ], proximaY);

      // Tabela 3: Tipologia
      criarTabelaCategoria("3. EPIDEMIOLOGIA (MAIOR INCIDÊNCIA)", tiposOrdenados, proximaY);

      // Salvar PDF
      doc.save(`Relatorio_Seguranca_NSP_${mesAlvo}.pdf`);
    } catch (err) {
      console.error("Erro ao rodar jsPDF:", err);
      alert("Erro ao formatar PDF.");
    }
  };

  // ==========================================
  // VISÃO 2.1: TENDÊNCIAS (FILME) - REAL TIME
  // ==========================================
  const renderTendencias = () => {
  // 1. Mapeamento de configurações (Acesso Central unificado)
  const configIndicadores = {
    mortalidade:      { label: 'Taxa de Mortalidade Bruta (%)', color: '#ef4444' }, 
    smr:              { label: 'SMR (SAPS 3)', color: '#10b981' }, 
    identificacao:    { label: 'Identificação Correta do Paciente (%)', color: '#06b6d4' }, 
    utilizacaoVM:     { label: 'Taxa de Utilização de Ventilação Mecânica (%)', color: '#3b82f6' },
    utilizacaoSVD:    { label: 'Taxa de Utilização de SVD (%)', color: '#0ea5e9' },
    utilizacaoAcessoCentral: { label: 'Taxa de Utilização de Acesso Central (%)', color: '#8b5cf6' },
    ocupacao:         { label: 'Taxa de Ocupação (%)', color: '#64748b' },
    readmissao:       { label: 'Readmissão em 48h (Nº Absoluto)', color: '#ef4444' },
    giroLeito:        { label: 'Giro de Leito (Escala Mensal)', color: '#eab308' },
    los:              { label: 'Tempo Médio - LOS (Escala Mensal)', color: '#f59e0b' },
  };

  const configAtual = configIndicadores[indicadorTendencia] || configIndicadores['mortalidade'];

  // Tela de carregamento
  if (loadingGraficos) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
        <p className="text-slate-400 font-medium italic">Sincronizando com a Inteligência da Nuvem...</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn max-w-6xl mx-auto">
      {/* CABEÇALHO */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setActiveView('indicadores')} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="text-emerald-600" /> Gráficos de Tendências Reais
          </h2>
          <p className="text-slate-500 text-sm mt-1">Análise histórica personalizada por período.</p>
        </div>
      </div>

      {/* FILTROS E RELATÓRIOS (Com Espaçamento Ajustado) */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-col xl:flex-row gap-6 items-center justify-between flex-wrap">
        
        {/* BLOCO ESQUERDO: Filtros do Gráfico */}
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto items-center">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <label className="text-sm font-bold text-slate-500 uppercase whitespace-nowrap">Indicador:</label>
            <select 
              value={indicadorTendencia}
              onChange={(e) => setIndicadorTendencia(e.target.value)}
              className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 min-w-[240px] w-full md:w-auto cursor-pointer"
            >
              <optgroup label="Desfechos Clínicos e Qualidade">
                <option value="mortalidade">Taxa de Mortalidade (%)</option>
                <option value="smr">SMR (SAPS 3)</option>
                <option value="identificacao">Identificação Correta (%)</option>
                <option value="readmissao">Readmissão em 48h (Nº Absoluto)</option>
              </optgroup>
              
              <optgroup label="Dispositivos Invasivos (% Uso Diário)">
                <option value="utilizacaoVM">Uso de Ventilação Mecânica (VM)</option>
                <option value="utilizacaoAcessoCentral">Uso de Acesso Central (CVC + Shiley)</option>
                <option value="utilizacaoSVD">Uso de Sonda Vesical (SVD)</option>
              </optgroup>
              
              <optgroup label="Gestão Operacional">
                <option value="ocupacao">Taxa de Ocupação (%)</option>
                <option value="giroLeito">Giro de Leito (Mensal)</option>
                <option value="los">Tempo Médio (LOS Mensal)</option>
              </optgroup>
            </select>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 w-full md:w-auto justify-center">
             <div className="flex items-center gap-2">
               <span className="text-[10px] font-black text-slate-400 uppercase">De:</span>
               <input 
                 type="date" 
                 value={dataInicio} 
                 onChange={(e) => setDataInicio(e.target.value)}
                 className="bg-white border border-slate-200 p-1.5 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-emerald-500"
               />
             </div>
             <div className="w-px h-6 bg-slate-200 mx-1"></div>
             <div className="flex items-center gap-2">
               <span className="text-[10px] font-black text-slate-400 uppercase">Até:</span>
               <input 
                 type="date" 
                 value={dataFim} 
                 onChange={(e) => setDataFim(e.target.value)}
                 className="bg-white border border-slate-200 p-1.5 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-emerald-500"
               />
             </div>
          </div>
        </div>
        
        {/* BLOCO DIREITO: Central de Relatórios */}
        <div className="flex items-center gap-4 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 w-full xl:w-auto justify-between md:justify-end shadow-sm">
          <div className="flex items-center gap-2 pl-2">
            <span className="text-[10px] font-black text-emerald-600 uppercase">Mês do Relatório:</span>
            <input 
              type="month" 
              value={mesRelatorio} 
              onChange={(e) => setMesRelatorio(e.target.value)}
              className="bg-white border border-emerald-200 p-1.5 rounded-lg text-xs font-bold text-emerald-800 outline-none focus:border-emerald-500 cursor-pointer"
            />
          </div>
          <button 
            onClick={() => exportarRelatorioMensal(mesRelatorio)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2 rounded-lg transition-all flex items-center gap-2 shadow-sm active:scale-95"
          >
            <Download size={16} /> Emitir PDF
          </button>
        </div>
      </div>

      {/* ÁREA DO GRÁFICO */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 h-[500px] flex flex-col">
        <h3 className="font-black text-slate-800 mb-6 text-lg flex items-center gap-2 uppercase tracking-tight">
          <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
          {configAtual.label}
        </h3>
        
        <div className="flex-1 w-full">
          {dadosTendencia.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 italic text-center">
              <Activity size={48} className="mb-4 opacity-20" />
              Nenhum dado encontrado para o período selecionado.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dadosTendencia} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} dy={15} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} dx={-10} />
                <RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Line 
                  type="monotone" 
                  dataKey="valor" 
                  stroke={configAtual.color} 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: configAtual.color, stroke: '#fff', strokeWidth: 2 }} 
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

  // ==========================================
  // VISÃO 2.2: MAPA EPIDEMIOLÓGICO E ORIGEM
  // ==========================================
  const renderEpidemiologia = () => {
    return (
      <div className="animate-fadeIn max-w-7xl mx-auto print:m-0 print:p-0">
        
        {/* CABEÇALHO DA TELA (Oculto na Impressão) */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 print:hidden">
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveView('indicadores')} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-slate-700" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="text-teal-600" /> Mapa Epidemiológico e Origem
              </h2>
              <p className="text-slate-500 text-sm mt-1">Análise de fluxo regional e complexidade por procedência.</p>
            </div>
          </div>
          
          {/* CONTROLES DO RELATÓRIO */}
          <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Mês do Relatório:</span>
              <input 
                type="month" 
                value={mesFiltroOrigem}
                onChange={(e) => setMesFiltroOrigem(e.target.value)}
                className="p-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 bg-slate-50 outline-none cursor-pointer focus:ring-2 focus:ring-teal-100"
              />
            </div>
            <div className="w-px h-8 bg-slate-200 hidden md:block"></div>
            <button onClick={() => window.print()} className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors w-full md:w-auto">
              <Printer size={16} /> Gerar PDF / Imprimir
            </button>
          </div>
        </div>

        {/* CABEÇALHO OFICIAL EXCLUSIVO PARA IMPRESSÃO (Oculto na Tela) */}
        <div className="hidden print:block mb-8 border-b-2 border-slate-800 pb-4">
          <h1 className="text-3xl font-black text-slate-800">Relatório Epidemiológico de UTI</h1>
          <h2 className="text-lg font-bold text-slate-600 mt-1">Referência: {mesFiltroOrigem.split('-').reverse().join('/')}</h2>
          <p className="text-sm text-slate-500 mt-2">Documento gerado eletronicamente em {new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        {/* ÁREA DOS GRÁFICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 print:block print:w-full">
          
          {/* GRÁFICO 1: PIZZA */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col print:border-none print:shadow-none print:mb-8">
            <h4 className="text-xs font-bold text-slate-500 uppercase text-center mb-4">Volume por Origem ({mesFiltroOrigem.split('-').reverse().join('/')})</h4>
            {dadosEpidemiologicos.dadosPizza.length === 0 ? (
              <div className="flex-grow flex items-center justify-center text-sm font-bold text-slate-400 italic">Sem admissões no período.</div>
            ) : (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dadosEpidemiologicos.dadosPizza} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                      {dadosEpidemiologicos.dadosPizza.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CORES_PIZZA[index % CORES_PIZZA.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => [`${value} admissões`, 'Volume']} />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* TABELA: LOG DE INTERNAÇÕES */}
          <div className="bg-white p-0 rounded-xl border border-slate-200 shadow-sm col-span-1 lg:col-span-2 flex flex-col overflow-hidden print:border-none print:shadow-none">
            <div className="p-4 bg-slate-50 border-b border-slate-200 print:bg-white">
              <h4 className="text-xs font-bold text-slate-700 uppercase">Log de Admissões do Período</h4>
            </div>
            <div className="overflow-y-auto max-h-[250px] print:max-h-full print:overflow-visible">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-white sticky top-0 z-10 shadow-sm print:shadow-none print:border-b-2 print:border-slate-800">
                  <tr>
                    <th className="p-3 text-slate-500 uppercase tracking-wider border-b border-slate-200">Paciente</th>
                    <th className="p-3 text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center">Data</th>
                    <th className="p-3 text-slate-500 uppercase tracking-wider border-b border-slate-200">Origem</th>
                    <th className="p-3 text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dadosEpidemiologicos.listaTabela.length === 0 ? (
                    <tr><td colSpan="4" className="p-8 text-center text-slate-400 italic font-bold">Nenhum paciente internado neste mês.</td></tr>
                  ) : (
                    dadosEpidemiologicos.listaTabela.map((pac, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors print:border-b print:border-slate-200">
                        <td className="p-3 font-bold text-slate-700">{pac.nome}</td>
                        <td className="p-3 text-slate-600 text-center">{pac.data}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold ${String(pac.procedencia).toLowerCase().includes('ariquemes') ? 'bg-blue-50 text-blue-700' : 'bg-teal-50 text-teal-700'} print:bg-transparent print:p-0 print:text-slate-800`}>
                            {pac.procedencia}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pac.status === 'Internado' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'} print:bg-transparent print:p-0 print:border print:border-slate-300 print:px-2`}>
                            {pac.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* GRÁFICO 2: TENDÊNCIA 12 MESES */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:mt-12 print:break-inside-avoid">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-sm font-bold text-slate-800 uppercase">Tendência de Ocupação (Últimos 12 Meses)</h4>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-full uppercase print:border print:border-blue-200 print:bg-transparent">Distribuição Percentual (%)</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dadosEpidemiologicos.dadosLinha} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748B' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} dx={-10} domain={[0, 100]} />
                <RechartsTooltip />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                <Line type="monotone" dataKey="Ariquemes (%)" stroke="#00205B" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Outros Municípios (%)" stroke="#11CAA0" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    );
  };

  // ==========================================
  // VISÃO 3: CONTROLE MICROBIOLÓGICO E IRAS (CCIH)
  // ==========================================
  const renderQualidade = () => {
    return (
      <div className="animate-fadeIn">
        {/* CABEÇALHO */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setActiveView('hub')} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Microscope className="text-purple-600" /> Controle Microbiológico e IRAS
            </h2>
            <p className="text-slate-500 text-sm mt-1">Vigilância epidemiológica, culturas e prevenção de infecções relacionadas à assistência.</p>
          </div>
        </div>

        {/* NAVEGAÇÃO INTERNA (ABAS) */}
        <div className="flex flex-wrap justify-between items-end border-b border-slate-200 mb-6 gap-4">
          
          {/* Container das Abas (à esquerda) */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button 
              onClick={() => setAbaIrasAtiva('geral')}
              className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${abaIrasAtiva === 'geral' ? 'border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              Visão Geral
            </button>
            <button 
              onClick={() => setAbaIrasAtiva('pav')}
              className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${abaIrasAtiva === 'pav' ? 'border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              PAV (Pneumonia)
            </button>
            <button 
              onClick={() => setAbaIrasAtiva('ipcsc')}
              className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${abaIrasAtiva === 'ipcsc' ? 'border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              IPCS-C (Corrente Sanguínea)
            </button>
            <button 
              onClick={() => setAbaIrasAtiva('itu')}
              className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${abaIrasAtiva === 'itu' ? 'border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              ITU-AC (Trato Urinário)
            </button>
          </div>

          {/* Botão e Seletor de Mês Gerar Relatório (à direita) */}
          <div className="mb-2 flex items-center gap-2 bg-slate-100 border border-slate-200 p-1 rounded-xl shadow-sm">
            <input 
              type="month" 
              value={mesRelatorioSelecao} 
              onChange={(e) => setMesRelatorioSelecao(e.target.value)} 
              className="p-2 border border-slate-300 rounded-lg text-xs font-black outline-none bg-white text-slate-700 cursor-pointer"
              title="Escolha o mês do relatório"
            />
            <button 
              onClick={() => setModalRelatorioAberto(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold shadow-md transition-all whitespace-nowrap h-full"
            >
              <FileText size={14} /> Gerar Relatório ANVISA
            </button>
          </div>
        </div>

        {/* CONTEÚDO DAS ABAS */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 min-h-[400px] flex items-center justify-center">
          
          {/* ========================================= */}
          {/* ABA GERAL */}
          {/* ========================================= */}
          {abaIrasAtiva === 'geral' && (
            <div className="w-full animate-fadeIn space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                
                {/* GRÁFICO DDD */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-80">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-700 text-sm uppercase flex items-center gap-2">
                      <Activity size={16} className="text-purple-600" /> Densidade de Incidência
                    </h3>
                    <select 
                      className="text-xs p-1 border rounded bg-slate-50 outline-none font-bold text-purple-700"
                      value={atbGrafico || ''}
                      onChange={(e) => setAtbGrafico(e.target.value)}
                    >
                      {Object.keys(DDD_OMS).map(atb => (
                        <option key={atb} value={atb}>{atb}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historicoCCIH.map(h => ({
                        mes: h.mesLabel,
                        ddd: h[`ddd_${atbGrafico?.replace(/[^a-zA-Z0-9]/g, '_')}`]?.resultadoDI || 0
                      }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '12px' }} />
                        <Line type="monotone" dataKey="ddd" name={`DDD/1000 (${atbGrafico})`} stroke="#9333ea" strokeWidth={3} dot={{ r: 4, fill: '#9333ea' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* GRÁFICO ÁLCOOL */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-80">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-700 text-sm uppercase flex items-center gap-2">
                      <AlertTriangle size={16} className="text-emerald-500" /> Consumo de Álcool Gel
                    </h3>
                    <span className="text-xs font-bold text-slate-400">g/paciente-dia</span>
                  </div>
                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={historicoCCIH.map(h => ({
                        mes: h.mesLabel,
                        consumo: h.alcool?.resultadoDensidade || 0
                      }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '12px' }} />
                        <Bar dataKey="consumo" name="Consumo (g/pac-dia)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* CALCULADORAS */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-black text-slate-700 uppercase mb-4 flex items-center gap-2">
                  <Activity size={16}/> Lançamento Mensal de Indicadores
                </h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* CALCULADORA DDD */}
                  <div className="bg-white p-4 rounded-lg border border-purple-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 bg-purple-500 h-full"></div>
                    <label className="block text-xs font-bold text-slate-600 mb-3 uppercase">Calcular e Salvar DDD</label>
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2">
                        <input type="month" value={formDDD.mes || ''} onChange={e => setFormDDD({...formDDD, mes: e.target.value})} className="p-2 border rounded text-xs outline-none bg-slate-50" title="Mês de Referência" />
                        <select value={formDDD.atb || ''} onChange={e => setFormDDD({...formDDD, atb: e.target.value})} className="p-2 border rounded text-xs outline-none flex-1 bg-slate-50">
                          <option value="">Selecione o Antimicrobiano...</option>
                          {Object.keys(DDD_OMS).map(atb => (
                            <option key={atb} value={atb}>{atb} (OMS: {DDD_OMS[atb]}g)</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="flex gap-2 items-center">
                        <input type="number" value={formDDD.gramas || ''} onChange={e => setFormDDD({...formDDD, gramas: e.target.value})} placeholder="Total (Gramas)" className="p-2 border rounded text-xs outline-none w-32 bg-slate-50" />
                        
                        <button 
                          onClick={async () => {
                            if(!formDDD.atb || !formDDD.gramas) return alert("Preencha o ATB e as gramas.");
                            const padraoOMS = DDD_OMS[formDDD.atb];
                            const pacientesDiaMes = listaCenso
                              .filter(c => {
                                const dataBruta = c.dataCenso || c.data || c.id || "";
                                const dataLimpa = String(dataBruta).replace(',', ''); 
                                return dataLimpa.startsWith(formDDD.mes);
                              })
                              .reduce((acc, c) => acc + (Number(c.totalLeitosOcupados) || 0), 0);
                            
                            if(pacientesDiaMes === 0) return alert(`Atenção: Não há registros de Censo Diário para o mês ${formDDD.mes}. O cálculo exige o denominador de pacientes-dia.`);

                            const dddCalculada = ((Number(formDDD.gramas) / padraoOMS) / pacientesDiaMes) * 1000;
                            await salvarIndicadorGlobal(formDDD.mes, `ddd_${formDDD.atb.replace(/[^a-zA-Z0-9]/g, '_')}`, {
                              gramas: Number(formDDD.gramas),
                              pacientesDia: pacientesDiaMes,
                              resultadoDI: dddCalculada,
                              dataRegistro: new Date().toISOString()
                            });

                            alert(`Salvo com sucesso!\n\nResultado: ${dddCalculada.toFixed(2)} DDD / 1000 pacientes-dia.`);
                            carregarDadosCCIH();
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-xs font-bold transition-colors flex-1"
                        >
                          Calcular e Salvar
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CALCULADORA DE ÁLCOOL GEL */}
                  <div className="bg-white p-4 rounded-lg border border-emerald-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 bg-emerald-500 h-full"></div>
                    <label className="block text-xs font-bold text-slate-600 mb-3 uppercase">Consumo de Álcool Gel</label>
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2">
                        <input type="month" value={formAlcool.mes || ''} onChange={e => setFormAlcool({...formAlcool, mes: e.target.value})} className="p-2 border rounded text-xs outline-none bg-slate-50" />
                        <input type="number" value={formAlcool.gramas || ''} onChange={e => setFormAlcool({...formAlcool, gramas: e.target.value})} placeholder="Total Ponderado (Gramas)" className="p-2 border rounded text-xs outline-none flex-1 bg-slate-50" />
                      </div>
                      <button 
                        onClick={async () => {
                          if(!formAlcool.gramas) return alert("Preencha o consumo em gramas.");
                          const pacientesDiaMes = listaCenso
                              .filter(c => {
                                const dataBruta = c.dataCenso || c.data || c.id || "";
                                const dataLimpa = String(dataBruta).replace(',', '');
                                return dataLimpa.startsWith(formAlcool.mes);
                              })
                              .reduce((acc, c) => acc + (Number(c.totalLeitosOcupados) || 0), 0);
                              
                          if(pacientesDiaMes === 0) return alert(`Atenção: Não há Censo para o mês ${formAlcool.mes}.`);
                          const consumoDensidade = Number(formAlcool.gramas) / pacientesDiaMes;
                          await salvarIndicadorGlobal(formAlcool.mes, "alcool", {
                            gramas: Number(formAlcool.gramas),
                            pacientesDia: pacientesDiaMes,
                            resultadoDensidade: consumoDensidade,
                            dataRegistro: new Date().toISOString()
                          });

                          alert(`Consumo de álcool salvo!\n\nResultado: ${consumoDensidade.toFixed(1)} g/paciente-dia.`);
                          carregarDadosCCIH();
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-xs font-bold transition-colors"
                      >
                        Calcular e Salvar
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* TABELA DE CULTURAS */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
                  <h3 className="font-bold flex items-center gap-2">
                    <Microscope size={18} className="text-purple-400" />
                    Painel de Culturas e Classificação Epidemiológica
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300">Filtrar Mês:</span>
                    <input 
                      type="month" 
                      value={mesFiltroCultura || ''} 
                      onChange={(e) => setMesFiltroCultura(e.target.value)} 
                      className="p-1.5 text-xs text-slate-800 rounded outline-none" 
                    />
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 text-[10px] uppercase font-black tracking-wider">
                        <th className="p-3 border-b">Paciente / Leito</th>
                        <th className="p-3 border-b">Material / Data</th>
                        <th className="p-3 border-b">Status / Germe</th>
                        <th className="p-3 border-b">Perfil de Resistência</th>
                        <th className="p-3 border-b text-center">Classificação (ANVISA)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const culturasFiltradas = culturasGlobais.filter(c => {
                          const dataRef = c.dataColeta || c.dataResultado || "";
                          return dataRef.startsWith(mesFiltroCultura);
                        });

                        if (culturasFiltradas.length === 0) {
                          return <tr><td colSpan="5" className="p-6 text-center text-slate-400 text-sm italic">Nenhuma cultura registrada neste mês.</td></tr>;
                        }

                        return culturasFiltradas.map((cultura) => (
                          <tr key={cultura.id} className="border-b hover:bg-slate-50 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-sm text-slate-800 truncate max-w-[150px] uppercase">{cultura.pacienteNome}</div>
                              <div className="text-xs text-slate-500">Leito {cultura.leito}</div>
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-xs text-slate-700 uppercase">{cultura.tipo}</div>
                              <div className="text-[10px] text-slate-500">Coleta: {cultura.dataColeta ? cultura.dataColeta.split('-').reverse().join('/') : 'N/D'}</div>
                            </td>
                            <td className="p-3">
                              {cultura.status === "Positivo" ? (
                                <div>
                                  <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded">POSITIVO</span>
                                  <div className="text-xs font-bold text-slate-800 mt-1">{cultura.germe}</div>
                                </div>
                              ) : cultura.status === "Negativo" ? (
                                <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">NEGATIVO</span>
                              ) : (
                                <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded">PENDENTE</span>
                              )}
                            </td>
                            <td className="p-3">
                              {cultura.status === "Positivo" && cultura.resistentes && cultura.resistentes.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-[150px]">
                                  {cultura.resistentes.map((atb, idx) => (
                                    <span key={idx} className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shadow-sm">{atb}</span>
                                  ))}
                                </div>
                              ) : cultura.status === "Positivo" ? (
                                <span className="text-xs text-slate-400 italic">Sem resistências.</span>
                              ) : (
                                <span className="text-xs text-slate-300">-</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {cultura.status === "Positivo" ? (
                                <select 
                                  className={`p-1.5 text-xs font-bold border rounded outline-none transition-colors w-full cursor-pointer ${cultura.irasAssociada ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-white border-slate-300 text-slate-600'}`}
                                  value={cultura.irasAssociada || ""}
                                  onChange={(e) => {
                                    classificarCulturaIRAS(cultura.pacienteId, cultura.leito, cultura.id, e.target.value);
                                  }}
                                >
                                  <option value="">Não classificado</option>
                                  <option value="Colonizacao">Apenas Colonização</option>
                                  <option value="PAV">PAV (Pneumonia)</option>
                                  <option value="IPCS-C">IPCS-C (Corrente Sanguínea)</option>
                                  <option value="ITU-AC">ITU-AC (Trato Urinário)</option>
                                  <option value="Outra">Outra</option>
                                </select>
                              ) : (
                                <span className="text-[10px] text-slate-300">Não aplicável</span>
                              )}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================= */}
          {/* ABA PAV */}
          {/* ========================================= */}
          {abaIrasAtiva === 'pav' && (
            <div className="w-full animate-fadeIn space-y-6">
              
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <ShieldAlert size={24} className="text-red-400" />
                    Central de Vigilância: PAV
                  </h3>
                  <p className="text-slate-300 text-sm mt-1 max-w-xl">
                    Os prontuários são auditados automaticamente na nuvem todos os dias às 23:59h. 
                    Aqui você gerencia os alertas gerados pelo sistema.
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-700/50 p-2 rounded-lg border border-slate-600">
                    <span className="text-xs font-bold text-slate-300">Mês de Análise:</span>
                    <input 
                      type="month" 
                      value={mesFiltroIrasCompartilhado || ''} 
                      onChange={(e) => {
                        setMesFiltroIrasCompartilhado(e.target.value);
                        setTimeout(() => carregarAuditoriasPAV(), 50);
                      }} 
                      className="p-1.5 text-xs text-slate-800 rounded font-bold outline-none bg-white cursor-pointer" 
                    />
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={forcarVarreduraManualPAV}
                      className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg text-sm font-bold shadow transition-all flex items-center gap-2"
                    >
                      <Search size={16} /> Forçar Varredura
                    </button>
                  </div>
                </div>
              </div>

              {/* NAVEGAÇÃO INTERNA PAV + BOTAO MANUAL */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-2 gap-4">
                <div className="flex gap-2">
                  {[
                    { id: 'Suspeito', label: 'Alerta de Suspeita', color: 'bg-amber-100 text-amber-700' },
                    { id: 'Confirmado', label: 'PAV Confirmada', color: 'bg-red-100 text-red-700' },
                    { id: 'Descartado', label: 'Descartados', color: 'bg-emerald-100 text-emerald-700' }
                  ].map(tab => {
                    const count = auditoriasPAV.filter(a => a.status === tab.id && a.mesReferencia === mesFiltroIrasCompartilhado).length;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setFiltroStatusPAV(tab.id)}
                        className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-colors flex items-center gap-2 ${filtroStatusPAV === tab.id ? 'bg-white border-t-2 border-l border-r border-slate-200 text-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative translate-y-[1px]' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-b border-transparent'}`}
                      >
                        {tab.label}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab.color}`}>{count}</span>
                      </button>
                    );
                  })}
                </div>
                <button 
                  onClick={() => setIsModalManualPAVOpen(true)}
                  className="bg-white border-2 border-red-500 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2"
                >
                  <PlusCircle size={16} /> Lançar PAV Manual
                </button>
              </div>

              {/* LISTA DE CASOS PAV */}
              <div className="grid md:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-b-xl border border-t-0 border-slate-200 min-h-[300px]">
                {auditoriasPAV.filter(a => a.status === filtroStatusPAV && a.mesReferencia === mesFiltroIrasCompartilhado).length === 0 ? (
                  <div className="col-span-3 flex flex-col items-center justify-center text-slate-400 py-10">
                    <CheckCircle size={48} className="text-slate-300 mb-3 opacity-50"/>
                    <p className="font-bold">Nenhum caso {filtroStatusPAV.toLowerCase()} neste mês.</p>
                  </div>
                ) : (
                  auditoriasPAV.filter(a => a.status === filtroStatusPAV && a.mesReferencia === mesFiltroIrasCompartilhado).map((caso) => (
                    <div key={caso.firebaseId} className={`bg-white border-2 rounded-xl p-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md ${filtroStatusPAV === 'Suspeito' ? 'border-amber-200' : filtroStatusPAV === 'Confirmado' ? 'border-red-200' : 'border-emerald-200'}`}>
                      <div className={`absolute top-0 left-0 w-2 h-full ${filtroStatusPAV === 'Suspeito' ? 'bg-amber-500' : filtroStatusPAV === 'Confirmado' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                      <div className="pl-3 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Data: {caso.dataSuspeita ? caso.dataSuspeita.split('-').reverse().join('/') : 'N/D'}</span>
                          <span className="text-xs font-bold text-slate-800">Leito {caso.leito}</span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm truncate uppercase">{caso.nome}</h4>
                        <p className="text-[10px] text-slate-500 mt-2 mb-4 italic line-clamp-2">{caso.evidencias?.justificativa}</p>
                        
                        <div className="mt-auto pt-4 border-t border-slate-50">
                          <button 
                            onClick={() => setModalAuditoriaPAV(caso)}
                            className={`w-full text-white text-xs font-bold py-2 rounded transition-colors flex items-center justify-center gap-2 ${filtroStatusPAV === 'Suspeito' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                          >
                            <Search size={14} /> {filtroStatusPAV === 'Suspeito' ? 'Auditar Caso' : 'Ver Detalhes'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* MODAL DE AUDITORIA PAV (VISUALIZAÇÃO COM ANOTAÇÕES) */}
              {modalAuditoriaPAV && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                  <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-slideUp">
                    <div className={`p-4 text-white flex justify-between items-center ${modalAuditoriaPAV.status === 'Suspeito' ? 'bg-slate-800' : modalAuditoriaPAV.status === 'Confirmado' ? 'bg-red-700' : 'bg-emerald-700'}`}>
                      <h2 className="font-black flex items-center gap-2">
                        <ShieldAlert size={20} className="opacity-80" />
                        Prontuário de Auditoria - Leito {modalAuditoriaPAV.leito}
                      </h2>
                      <button onClick={() => setModalAuditoriaPAV(null)} className="text-white/70 hover:text-white transition-colors"><X size={24} /></button>
                    </div>

                    <div className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="font-black text-xl text-slate-800 uppercase">{modalAuditoriaPAV.nome}</h3>
                          <span className="text-xs text-slate-500 font-bold">Data do Alarme: {modalAuditoriaPAV.dataSuspeita?.split('-').reverse().join('/')}</span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${modalAuditoriaPAV.status === 'Suspeito' ? 'bg-amber-100 text-amber-700' : modalAuditoriaPAV.status === 'Confirmado' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {modalAuditoriaPAV.status}
                        </span>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                          <h4 className="text-xs font-black text-blue-800 uppercase mb-2">Evidência Radiológica</h4>
                          <p className="text-sm text-blue-900 font-medium">✓ {modalAuditoriaPAV.evidencias?.radiologia || 'N/D'}</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg">
                            <h4 className="text-xs font-black text-rose-800 uppercase mb-2 flex items-center gap-1"><Activity size={12}/> Sinais Sistêmicos</h4>
                            {modalAuditoriaPAV.evidencias?.sistemicos?.length > 0 ? (
                              <ul className="text-xs text-rose-900 font-medium space-y-1 list-disc pl-4">
                                {modalAuditoriaPAV.evidencias.sistemicos.map((e, i) => <li key={i}>{e}</li>)}
                              </ul>
                            ) : <span className="text-xs text-slate-400 italic">Nenhum sinal sistêmico mapeado.</span>}
                          </div>

                          <div className="p-3 bg-cyan-50 border border-cyan-100 rounded-lg">
                            <h4 className="text-xs font-black text-cyan-800 uppercase mb-2 flex items-center gap-1"><Wind size={12}/> Sinais Respiratórios</h4>
                            {modalAuditoriaPAV.evidencias?.respiratorios?.length > 0 ? (
                              <ul className="text-xs text-cyan-900 font-medium space-y-1 list-disc pl-4">
                                {modalAuditoriaPAV.evidencias.respiratorios.map((e, i) => <li key={i}>{e}</li>)}
                              </ul>
                            ) : <span className="text-xs text-slate-400 italic">Nenhum sinal respiratório extra mapeado.</span>}
                          </div>
                        </div>

                        {/* EXIBIÇÃO DA CULTURA SE HOUVER */}
                        {modalAuditoriaPAV.evidencias?.microbiologia && modalAuditoriaPAV.evidencias.microbiologia !== "Não aplicado" && (
                          <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg mt-4">
                            <h4 className="text-xs font-black text-purple-800 uppercase mb-2">Evidência Microbiológica</h4>
                            <p className="text-sm text-purple-900 font-medium">✓ {modalAuditoriaPAV.evidencias.microbiologia}</p>
                          </div>
                        )}
                      </div>

                      {/* NOVO CAMPO DE ANOTAÇÕES DA CCIH */}
                      <div className="mt-6 bg-slate-50 border border-slate-200 p-3 rounded-lg shadow-sm">
                        <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-1 mb-2">
                          <Edit3 size={14} /> Parecer / Justificativa da CCIH:
                        </label>
                        <textarea
                          className="w-full p-2.5 border border-slate-300 rounded-lg text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white transition-all resize-none"
                          rows="3"
                          placeholder="Descreva os motivos clínicos para confirmar ou descartar este caso (Ex: Paciente já apresentava infiltrado prévio à intubação)..."
                          defaultValue={modalAuditoriaPAV.notaCCIH || ""}
                          onBlur={(e) => salvarNotaCCIH(modalAuditoriaPAV.firebaseId, "auditorias_pav", e.target.value)}
                        ></textarea>
                        <p className="text-[10px] text-slate-400 mt-1 italic text-right">* A nota é salva automaticamente ao sair do campo.</p>
                      </div>

                      {modalAuditoriaPAV.status === 'Suspeito' && (
                        <div className="mt-6 flex gap-4 pt-4 border-t border-slate-100">
                          <button 
                            onClick={() => {
                              atualizarStatusPAV(modalAuditoriaPAV.firebaseId, 'Confirmado');
                              setModalAuditoriaPAV(null);
                            }} 
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                          >
                            <CheckCircle size={18} /> Confirmar PAV
                          </button>
                          <button 
                            onClick={() => {
                              atualizarStatusPAV(modalAuditoriaPAV.firebaseId, 'Descartado');
                              setModalAuditoriaPAV(null);
                            }} 
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-colors shadow-sm"
                          >
                            Descartar Suspeita
                          </button>
                        </div>
                      )}
                      {modalAuditoriaPAV.status !== 'Suspeito' && (
                        <div className="mt-6 text-center">
                          <button 
                            onClick={() => {
                              atualizarStatusPAV(modalAuditoriaPAV.firebaseId, 'Suspeito');
                              setModalAuditoriaPAV(null);
                            }}
                            className="text-xs font-bold text-slate-400 hover:text-slate-600 underline transition-colors"
                          >
                            Desfazer auditoria e retornar para Suspeitos
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL GIGANTE DE INSERÇÃO MANUAL DE PAV */}
              {isModalManualPAVOpen && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                  <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-slideUp">
                    
                    <div className="bg-red-600 p-5 flex justify-between items-center text-white shrink-0">
                      <div>
                        <h2 className="font-black text-xl flex items-center gap-2"><PlusCircle size={24} /> Lançamento Manual de PAV</h2>
                        <p className="text-red-100 text-xs mt-1">Preencha os critérios da ANVISA. O sistema fará a validação final (D.O.E).</p>
                      </div>
                      <button onClick={() => setIsModalManualPAVOpen(false)} className="text-red-200 hover:text-white"><X size={28} /></button>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
                      
                      {/* PACIENTE */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <label className="block text-xs font-black text-slate-500 uppercase mb-2">1. Selecione o Paciente</label>
                        <select 
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 uppercase"
                          value={formManualPAV.pacienteId}
                          onChange={(e) => {
                            const p = leitosConfig.find(l => l.id === e.target.value);
                            if (p) {
                              const leitoCorreto = p.leito || p.id.replace('bed_', '');
                              setFormManualPAV({...formManualPAV, pacienteId: p.id, nome: p.nome, leito: leitoCorreto});
                            }
                          }}
                        >
                          <option value="">-- Selecione o Paciente Internado --</option>
                          {leitosConfig.filter(l => l.nome).map(l => {
                            const leitoCorreto = l.leito || l.id.replace('bed_', '');
                            return (
                              <option key={l.id} value={l.id}>{l.nome} (LEITO {leitoCorreto})</option>
                            );
                          })}
                        </select>
                      </div>

                      {/* RADIOLOGIA */}
                      <div className="bg-white p-4 rounded-xl border-l-4 border-l-blue-500 border-y border-r border-slate-200 shadow-sm">
                        <label className="block text-xs font-black text-blue-600 uppercase mb-2">2. Critério Radiológico (Obrigatório)</label>
                        <div className="flex gap-4 items-center">
                          <span className="text-sm font-bold text-slate-700">Novo Infiltrado ou Progressão de infiltrado existente</span>
                          <input type="date" value={formManualPAV.dataRadiologia} onChange={e => setFormManualPAV({...formManualPAV, dataRadiologia: e.target.value})} className="p-2 border border-slate-200 rounded text-sm outline-none focus:border-blue-500 ml-auto" />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        {/* SINAIS SISTÊMICOS */}
                        <div className="bg-white p-4 rounded-xl border-t-4 border-t-rose-500 border-x border-b border-slate-200 shadow-sm space-y-4">
                          <label className="block text-xs font-black text-rose-600 uppercase">3. Sinais Sistêmicos</label>
                          <div className="flex flex-col gap-3">
                            <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer border border-transparent hover:border-slate-200">
                              <div className="flex items-center gap-2"><input type="checkbox" checked={formManualPAV.sysFebre} onChange={e => setFormManualPAV({...formManualPAV, sysFebre: e.target.checked})} className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500" /><span className="text-sm font-bold text-slate-700">Febre (&gt; 38ºC)</span></div>
                              {formManualPAV.sysFebre && <input type="date" value={formManualPAV.dataFebre} onChange={e => setFormManualPAV({...formManualPAV, dataFebre: e.target.value})} className="p-1 border rounded text-xs ml-2" />}
                            </label>
                            <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer border border-transparent hover:border-slate-200">
                              <div className="flex items-center gap-2"><input type="checkbox" checked={formManualPAV.sysLeuco} onChange={e => setFormManualPAV({...formManualPAV, sysLeuco: e.target.checked})} className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500" /><span className="text-sm font-bold text-slate-700">Leucopenia (&lt;4k) ou Leucocitose (&gt;12k)</span></div>
                              {formManualPAV.sysLeuco && <input type="date" value={formManualPAV.dataLeuco} onChange={e => setFormManualPAV({...formManualPAV, dataLeuco: e.target.value})} className="p-1 border rounded text-xs ml-2" />}
                            </label>
                            <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer border border-transparent hover:border-slate-200">
                              <div className="flex items-center gap-2"><input type="checkbox" checked={formManualPAV.sysSensorio} onChange={e => setFormManualPAV({...formManualPAV, sysSensorio: e.target.checked})} className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500" /><span className="text-sm font-bold text-slate-700">Alt. Sensório (Pacientes &ge; 70 anos)</span></div>
                              {formManualPAV.sysSensorio && <input type="date" value={formManualPAV.dataSensorio} onChange={e => setFormManualPAV({...formManualPAV, dataSensorio: e.target.value})} className="p-1 border rounded text-xs ml-2" />}
                            </label>
                          </div>
                        </div>

                        {/* SINAIS RESPIRATÓRIOS */}
                        <div className="bg-white p-4 rounded-xl border-t-4 border-t-cyan-500 border-x border-b border-slate-200 shadow-sm space-y-4">
                          <label className="block text-xs font-black text-cyan-600 uppercase">4. Sinais Respiratórios</label>
                          <div className="flex flex-col gap-3">
                            <div className="p-2 border border-slate-100 rounded bg-slate-50/50">
                              <label className="flex items-center justify-between cursor-pointer mb-2">
                                <div className="flex items-center gap-2"><input type="checkbox" checked={formManualPAV.respSecrecao} onChange={e => setFormManualPAV({...formManualPAV, respSecrecao: e.target.checked})} className="w-4 h-4 text-cyan-600 rounded" /><span className="text-sm font-bold text-slate-700">Alt. na Secreção Traqueal</span></div>
                                {formManualPAV.respSecrecao && <input type="date" value={formManualPAV.dataSecrecao} onChange={e => setFormManualPAV({...formManualPAV, dataSecrecao: e.target.value})} className="p-1 border rounded text-xs" />}
                              </label>
                              {formManualPAV.respSecrecao && <input type="text" placeholder="Especifique: Purulenta, aumento de volume..." value={formManualPAV.detSecrecao} onChange={e => setFormManualPAV({...formManualPAV, detSecrecao: e.target.value})} className="w-full p-2 text-xs border rounded outline-none" />}
                            </div>
                            
                            <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer border border-transparent hover:border-slate-200">
                              <div className="flex items-center gap-2"><input type="checkbox" checked={formManualPAV.respTosse} onChange={e => setFormManualPAV({...formManualPAV, respTosse: e.target.checked})} className="w-4 h-4 text-cyan-600 rounded" /><span className="text-sm font-bold text-slate-700">Tosse, Dispneia ou Taquipneia</span></div>
                              {formManualPAV.respTosse && <input type="date" value={formManualPAV.dataTosse} onChange={e => setFormManualPAV({...formManualPAV, dataTosse: e.target.value})} className="p-1 border rounded text-xs ml-2" />}
                            </label>

                            <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer border border-transparent hover:border-slate-200">
                              <div className="flex items-center gap-2"><input type="checkbox" checked={formManualPAV.respAusculta} onChange={e => setFormManualPAV({...formManualPAV, respAusculta: e.target.checked})} className="w-4 h-4 text-cyan-600 rounded" /><span className="text-sm font-bold text-slate-700">Novos estertores na ausculta</span></div>
                              {formManualPAV.respAusculta && <input type="date" value={formManualPAV.dataAusculta} onChange={e => setFormManualPAV({...formManualPAV, dataAusculta: e.target.value})} className="p-1 border rounded text-xs ml-2" />}
                            </label>

                            <div className="p-2 border border-slate-100 rounded bg-slate-50/50">
                              <label className="flex items-center justify-between cursor-pointer mb-2">
                                <div className="flex items-center gap-2"><input type="checkbox" checked={formManualPAV.respTroca} onChange={e => setFormManualPAV({...formManualPAV, respTroca: e.target.checked})} className="w-4 h-4 text-cyan-600 rounded" /><span className="text-sm font-bold text-slate-700">Piora da Troca Gasosa</span></div>
                                {formManualPAV.respTroca && <input type="date" value={formManualPAV.dataTroca} onChange={e => setFormManualPAV({...formManualPAV, dataTroca: e.target.value})} className="p-1 border rounded text-xs" />}
                              </label>
                              {formManualPAV.respTroca && <input type="text" placeholder="Especifique: Queda na P/F, aumento de FiO2, PEEP..." value={formManualPAV.detTroca} onChange={e => setFormManualPAV({...formManualPAV, detTroca: e.target.value})} className="w-full p-2 text-xs border rounded outline-none" />}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* MICROBIOLÓGICO */}
                      <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 shadow-sm">
                        <label className="flex items-center justify-between cursor-pointer mb-2">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={formManualPAV.microCultura} onChange={e => setFormManualPAV({...formManualPAV, microCultura: e.target.checked})} className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500" />
                            <span className="text-sm font-black text-purple-800 uppercase">5. Critério Microbiológico (Opcional)</span>
                          </div>
                          {formManualPAV.microCultura && <input type="date" value={formManualPAV.dataCultura} onChange={e => setFormManualPAV({...formManualPAV, dataCultura: e.target.value})} className="p-2 border border-purple-300 rounded text-xs font-bold text-purple-900 bg-white outline-none" />}
                        </label>
                        {formManualPAV.microCultura && (
                          <div className="mt-3 flex flex-col gap-2 pl-7 animate-fadeIn">
                            <span className="text-xs font-bold text-purple-700">Cultura de Aspirado Traqueal &ge; 10⁶ UFC/mL</span>
                            <input type="text" placeholder="Especifique o microrganismo isolado..." value={formManualPAV.germeCultura} onChange={e => setFormManualPAV({...formManualPAV, germeCultura: e.target.value})} className="w-full p-3 bg-white border border-purple-200 rounded-lg outline-none focus:border-purple-500 text-sm font-bold text-slate-700" />
                            <p className="text-[10px] text-purple-600 font-bold mt-1 italic">* Ao preencher este campo, o sistema exigirá apenas 1 sinal clínico (sistêmico ou respiratório) para fechar a PAV.</p>
                          </div>
                        )}
                      </div>

                    </div>

                    <div className="bg-slate-100 border-t border-slate-200 p-5 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setIsModalManualPAVOpen(false)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancelar</button>
                      <button onClick={salvarPAVManual} className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-md transition-colors flex items-center gap-2">
                        <CheckCircle size={18} /> Processar e Salvar PAV
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================= */}
          {/* ABA IPCS-C */}
          {/* ========================================= */}
          {abaIrasAtiva === 'ipcsc' && (
            <div className="w-full animate-fadeIn space-y-6">
              
              {/* CABEÇALHO IPCS-C */}
              <div className="bg-gradient-to-r from-indigo-800 to-indigo-900 rounded-xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <ShieldAlert size={24} className="text-indigo-400" />
                    Central de Vigilância: IPCS-C
                  </h3>
                  <p className="text-indigo-200 text-sm mt-1 max-w-xl">
                    Rastreio inteligente baseado na data da Hemocultura Positiva (D0). 
                    Cruza comensais vs. patógenos, janela de sinais sistêmicos de 7 dias e uso prévio de CVC (&gt; 2 dias).
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-indigo-700/50 p-2 rounded-lg border border-indigo-600">
                    <span className="text-xs font-bold text-indigo-200">Mês de Análise:</span>
                    <input 
                      type="month" 
                      value={mesFiltroIrasCompartilhado || ''} 
                      onChange={(e) => {
                        setMesFiltroIrasCompartilhado(e.target.value);
                        setTimeout(() => carregarAuditoriasIPCSC(), 50);
                      }} 
                      className="p-1.5 text-xs text-indigo-900 rounded font-bold outline-none bg-white cursor-pointer" 
                    />
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={async () => {
                        if (!db) return alert("Banco não conectado.");
                        try {
                          console.log("🕵️ INICIANDO VARREDURA DE IPCS-C...");
                          const snapshot = await getDocs(collection(db, "leitos_uti"));
                          const pacientesAtivos = [];
                          snapshot.forEach(doc => { if (doc.data().nome) pacientesAtivos.push({ id: doc.id, leito: doc.id.replace('bed_',''), ...doc.data() }); });

                          const listaComensais = ['staphylococcus coagulase negativo', 'epidermidis', 'hominis', 'haemolyticus', 'saprophyticus', 'corynebacterium', 'bacillus', 'micrococcus', 'propionibacterium', 'cutibacterium'];
                          let novosCasos = 0;

                          for (const p of pacientesAtivos) {
                            if (!p.culturas || !p.culturas.lista) continue;
                            
                            const hemoculturasPositivas = p.culturas.lista.filter(c => c.tipo?.toLowerCase().includes('hemocultura') && c.status === 'Positivo');
                            
                            for (const hemo of hemoculturasPositivas) {
                              if (!hemo.dataColeta) continue;
                              
                              // 1. DATA DA COLETA (O NOVO D0) com trava de fuso horário T12
                              let dColetaStr = hemo.dataColeta.includes('/') ? hemo.dataColeta.split('/').reverse().join('-') : hemo.dataColeta;
                              const dataColetaObj = new Date(`${dColetaStr}T12:00:00`);
                              const mesCorrenteHemo = dColetaStr.slice(0,7);
                              
                              // 2. É COMENSAL OU PATÓGENO RECONHECIDO?
                              const nomeGerme = hemo.germe?.toLowerCase() || "";
                              const isComensal = listaComensais.some(c => nomeGerme.includes(c));
                              
                              let criterioMicrobiologicoAprovado = false;
                              let evidenciasSistemicas = [];

                              if (!isComensal) {
                                criterioMicrobiologicoAprovado = true; // Patógeno verdadeiro (Ex: S. aureus, Klebsiella) -> Notifica direto
                              } else {
                                // Se for comensal, exige estritamente amostras múltiplas
                                if (hemo.amostrasPositivas !== 'multiplas') continue; 
                                
                                let temSinalSistemico = false;

                                // FUNÇÃO DE VARREDURA ESTRUTURADA NO BH (Evita repetições e captura a Data)
                                const varrerSinaisSistemicosBH = (blocoBh) => {
                                  if (!blocoBh || !blocoBh.date) return;
                                  
                                  const dataRefUS = blocoBh.date;
                                  
                                  // A TRAVA DA JANELA: Só executa se a data do balanço estiver na janela de 7 dias
                                  if (datasJanela.includes(dataRefUS)) {
                                    const dataRef = dataRefUS.split('-').reverse().join('/');
                                    const strBloco = JSON.stringify(blocoBh);

                                    // A) Captura de Febre (>= 38ºC)
                                    const regexTemp = /"Temp\s*\(ºC\)":\s*"?((?:3[8-9]|4\d)(?:[.,]\d+)?)"?/g;
                                    let matchTemp;
                                    while ((matchTemp = regexTemp.exec(strBloco)) !== null) {
                                      temSinalSistemico = true;
                                      const msg = `Febre (${matchTemp[1]} ºC) detectada no registro de ${dataRef}`;
                                      if (!evidenciasSistemicas.includes(msg)) evidenciasSistemicas.push(msg);
                                    }

                                    // B) Captura de PAS Baixa (10 a 89 mmHg)
                                    const regexPAS = /"PAS":\s*"?([1-8]\d)"?/g;
                                    let matchPAS;
                                    while ((matchPAS = regexPAS.exec(strBloco)) !== null) {
                                      temSinalSistemico = true;
                                      const msg = `PAS Baixa (${matchPAS[1]} mmHg) detectada no registro de ${dataRef}`;
                                      if (!evidenciasSistemicas.includes(msg)) evidenciasSistemicas.push(msg);
                                    }

                                    // C) Captura de Uso de DVA (Noradrenalina)
                                    const regexNora = /"Noradrenalina":\s*"?([1-9]\d*(?:[.,]\d+)?|0[.,][1-9]\d*)"?/g;
                                    let matchNora;
                                    while ((matchNora = regexNora.exec(strBloco)) !== null) {
                                      temSinalSistemico = true;
                                      const msg = `Uso de DVA (Nora: ${matchNora[1]}) detectado no registro de ${dataRef}`;
                                      if (!evidenciasSistemicas.includes(msg)) evidenciasSistemicas.push(msg);
                                    }
                                  }
                                };

                                // Executa a varredura focada no BH atual e no histórico
                                if (p.bh) varrerSinaisSistemicosBH(p.bh);
                                if (p.historico_bh && Array.isArray(p.historico_bh)) p.historico_bh.forEach(varrerSinaisSistemicosBH);

                                if (temSinalSistemico) {
                                  criterioMicrobiologicoAprovado = true;
                                }
                              }

                              if (!criterioMicrobiologicoAprovado) continue;

                              // 3. ASSOCIAÇÃO AO DISPOSITIVO (CVC) - TRAVA OBRIGATÓRIA
                              if (!p.enfermagem?.cvcData) continue;
                              
                              let dCvcStr = p.enfermagem.cvcData.includes('/') ? p.enfermagem.cvcData.split('/').reverse().join('-') : p.enfermagem.cvcData;
                              const dataCvcObj = new Date(`${dCvcStr}T12:00:00`);
                              
                              const diffCvcColeta = Math.floor((dataColetaObj - dataCvcObj) / (1000 * 60 * 60 * 24));
                              let associadoCVC = diffCvcColeta >= 2;

                              if (associadoCVC && p.enfermagem.cvcRetiradaData) {
                                let dCvcRetStr = p.enfermagem.cvcRetiradaData.includes('/') ? p.enfermagem.cvcRetiradaData.split('/').reverse().join('-') : p.enfermagem.cvcRetiradaData;
                                const diffRetColeta = Math.floor((dataColetaObj - new Date(`${dCvcRetStr}T12:00:00`)) / (1000 * 60 * 60 * 24));
                                if (diffRetColeta > 1) associadoCVC = false;
                              }

                              if (associadoCVC) {
                                const idAuditoria = `${p.cpf || p.id}_ipcsc_${hemo.id || dColetaStr}`;
                                const docRef = doc(db, "auditorias_ipcsc", idAuditoria);
                                const audDoc = await getDocs(query(collection(db, "auditorias_ipcsc"), where("id", "==", idAuditoria)));
                                
                                if (audDoc.empty) {
                                  await setDoc(docRef, {
                                    id: idAuditoria, pacienteId: p.id, nome: p.nome, leito: p.leito, mesReferencia: mesCorrenteHemo,
                                    dataSuspeita: dColetaStr, dataEventoDOE: dColetaStr, status: "Suspeito",
                                    evidencias: {
                                      microbiologia: `Coleta em: ${dColetaStr.split('-').reverse().join('/')} | ${hemo.germe} (${isComensal ? 'Comensal em amostras múltiplas' : 'Patógeno Reconhecido'})`,
                                      sistemicos: evidenciasSistemicas.length > 0 ? evidenciasSistemicas : ['Critério Clínico dispensado (Patógeno Reconhecido para ANVISA)'],
                                      dispositivo: `CVC inserido em ${dCvcStr.split('-').reverse().join('/')} (D${diffCvcColeta + 1} no dia da coleta)`,
                                      justificativa: "Cruzamento automatizado: Hemocultura Positiva + Critérios ANVISA + Linha de Tempo de CVC."
                                    },
                                    timestampCriacao: new Date().toISOString()
                                  });
                                  novosCasos++;
                                }
                              }
                            }
                          }
                          if (novosCasos > 0) alert(`🚨 ${novosCasos} novos casos suspeitos de IPCS-C capturados!`);
                          else alert("Nenhum novo caso de IPCS-C preencheu os critérios de elegibilidade.");
                          carregarAuditoriasIPCSC();
                        } catch (err) { alert("Falha na varredura."); console.error(err); }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-bold shadow transition-all flex items-center gap-2"
                    >
                      <Search size={16} /> Forçar Varredura
                    </button>
                  </div>
                </div>
              </div>

              {/* NAVEGAÇÃO INTERNA IPCS-C + BOTAO MANUAL */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-2 gap-4">
                <div className="flex gap-2">
                  {[
                    { id: 'Suspeito', label: 'Alerta de Suspeita', color: 'bg-amber-100 text-amber-700' },
                    { id: 'Confirmado', label: 'IPCS-C Confirmada', color: 'bg-red-100 text-red-700' },
                    { id: 'Descartado', label: 'Descartados', color: 'bg-emerald-100 text-emerald-700' }
                  ].map(tab => {
                    const count = auditoriasIPCSC.filter(a => a.status === tab.id && a.mesReferencia === mesFiltroIrasCompartilhado).length;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setFiltroStatusIPCSC(tab.id)}
                        className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-colors flex items-center gap-2 ${filtroStatusIPCSC === tab.id ? 'bg-white border-t-2 border-l border-r border-slate-200 text-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative translate-y-[1px]' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-b border-transparent'}`}
                      >
                        {tab.label}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab.color}`}>{count}</span>
                      </button>
                    );
                  })}
                </div>

                {/* BOTÃO DE LANÇAMENTO MANUAL IPCS-C */}
                <button 
                  onClick={() => setIsModalManualIPCSCOpen(true)}
                  className="bg-white border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2"
                >
                  <PlusCircle size={16} /> Lançar IPCS-C Manual
                </button>
              </div>

              {/* LISTA DE CASOS IPCS-C */}
              <div className="grid md:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-b-xl border border-t-0 border-slate-200 min-h-[300px]">
                {auditoriasIPCSC.filter(a => a.status === filtroStatusIPCSC && a.mesReferencia === mesFiltroIrasCompartilhado).length === 0 ? (
                  <div className="col-span-3 flex flex-col items-center justify-center text-slate-400 py-10">
                    <CheckCircle size={48} className="text-slate-300 mb-3 opacity-50"/>
                    <p className="font-bold">Nenhum caso {filtroStatusIPCSC.toLowerCase()} neste mês.</p>
                  </div>
                ) : (
                  auditoriasIPCSC.filter(a => a.status === filtroStatusIPCSC && a.mesReferencia === mesFiltroIrasCompartilhado).map((caso) => (
                    <div key={caso.firebaseId} className={`bg-white border-2 rounded-xl p-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md ${filtroStatusIPCSC === 'Suspeito' ? 'border-amber-200' : filtroStatusIPCSC === 'Confirmado' ? 'border-red-200' : 'border-emerald-200'}`}>
                      <div className={`absolute top-0 left-0 w-2 h-full ${filtroStatusIPCSC === 'Suspeito' ? 'bg-amber-500' : filtroStatusIPCSC === 'Confirmado' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                      <div className="pl-3 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-black text-indigo-500 uppercase">Coleta: {caso.dataSuspeita?.split('-').reverse().join('/')}</span>
                          <span className="text-xs font-bold text-slate-800">Leito {caso.leito}</span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm truncate uppercase">{caso.nome}</h4>
                        <p className="text-[10px] text-slate-500 mt-2 mb-4 italic line-clamp-2">{caso.evidencias?.microbiologia}</p>
                        
                        <div className="mt-auto pt-4 border-t border-slate-50">
                          <button 
                            onClick={() => setModalAuditoriaIPCSC(caso)}
                            className={`w-full text-white text-xs font-bold py-2 rounded transition-colors flex items-center justify-center gap-2 ${filtroStatusIPCSC === 'Suspeito' ? 'bg-indigo-800 hover:bg-indigo-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                          >
                            <Search size={14} /> {filtroStatusIPCSC === 'Suspeito' ? 'Auditar Caso' : 'Ver Detalhes'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* MODAL DE AUDITORIA IPCS-C */}
              {modalAuditoriaIPCSC && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                  <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-slideUp">
                    <div className={`p-4 text-white flex justify-between items-center ${modalAuditoriaIPCSC.status === 'Suspeito' ? 'bg-indigo-800' : modalAuditoriaIPCSC.status === 'Confirmado' ? 'bg-red-700' : 'bg-emerald-700'}`}>
                      <h2 className="font-black flex items-center gap-2">
                        <ShieldAlert size={20} className="opacity-80" />
                        Auditoria Corrente Sanguínea - Leito {modalAuditoriaIPCSC.leito}
                      </h2>
                      <button onClick={() => setModalAuditoriaIPCSC(null)} className="text-white/70 hover:text-white transition-colors"><X size={24} /></button>
                    </div>

                    <div className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="font-black text-xl text-slate-800 uppercase">{modalAuditoriaIPCSC.nome}</h3>
                          <span className="text-xs text-slate-500 font-bold">Data da Coleta (D.O.E): {modalAuditoriaIPCSC.dataSuspeita?.split('-').reverse().join('/')}</span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${modalAuditoriaIPCSC.status === 'Suspeito' ? 'bg-amber-100 text-amber-700' : modalAuditoriaIPCSC.status === 'Confirmado' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {modalAuditoriaIPCSC.status}
                        </span>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <h4 className="text-xs font-black text-purple-800 uppercase mb-2">Microbiologia (Hemocultura)</h4>
                          <p className="text-sm text-purple-900 font-bold">✓ {modalAuditoriaIPCSC.evidencias?.microbiologia}</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg">
                            <h4 className="text-xs font-black text-rose-800 uppercase mb-2 flex items-center gap-1"><Activity size={12}/> Sinais Sistêmicos (Janela 7D)</h4>
                            <ul className="text-xs text-rose-900 font-medium space-y-1 list-disc pl-4">
                              {modalAuditoriaIPCSC.evidencias?.sistemicos.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                          </div>

                          <div className="p-3 bg-cyan-50 border border-cyan-100 rounded-lg">
                            <h4 className="text-xs font-black text-cyan-800 uppercase mb-2 flex items-center gap-1"><Wind size={12}/> Associação ao Dispositivo</h4>
                            <p className="text-xs text-cyan-900 font-medium">{modalAuditoriaIPCSC.evidencias?.dispositivo}</p>
                          </div>
                        </div>
                      </div>

                      {/* NOVO CAMPO DE ANOTAÇÕES DA CCIH (IPCS-C) */}
                      <div className="mt-6 bg-slate-50 border border-slate-200 p-3 rounded-lg shadow-sm">
                        <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-1 mb-2">
                          <Edit3 size={14} /> Parecer / Justificativa da CCIH:
                        </label>
                        <textarea
                          className="w-full p-2.5 border border-slate-300 rounded-lg text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white transition-all resize-none"
                          rows="3"
                          placeholder="Ex: Confirmo infecção por patógeno verdadeiro. / Descarto pois é apenas uma amostra de comensal..."
                          defaultValue={modalAuditoriaIPCSC.notaCCIH || ""}
                          onBlur={(e) => salvarNotaCCIH(modalAuditoriaIPCSC.firebaseId, "auditorias_ipcsc", e.target.value)}
                        ></textarea>
                        <p className="text-[10px] text-slate-400 mt-1 italic text-right">* A nota é salva automaticamente ao sair do campo.</p>
                      </div>

                      {modalAuditoriaIPCSC.status === 'Suspeito' && (
                        <div className="mt-6 flex gap-4 pt-4 border-t border-slate-100">
                          <button 
                            onClick={() => {
                              atualizarStatusIPCSC(modalAuditoriaIPCSC.firebaseId, 'Confirmado');
                              setModalAuditoriaIPCSC(null);
                            }} 
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                          >
                            <CheckCircle size={18} /> Confirmar IPCS-C
                          </button>
                          <button 
                            onClick={() => {
                              atualizarStatusIPCSC(modalAuditoriaIPCSC.firebaseId, 'Descartado');
                              setModalAuditoriaIPCSC(null);
                            }} 
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-colors shadow-sm"
                          >
                            Descartar Suspeita
                          </button>
                        </div>
                      )}
                      {modalAuditoriaIPCSC.status !== 'Suspeito' && (
                        <div className="mt-6 text-center">
                          <button 
                            onClick={() => {
                              atualizarStatusIPCSC(modalAuditoriaIPCSC.firebaseId, 'Suspeito');
                              setModalAuditoriaIPCSC(null);
                            }}
                            className="text-xs font-bold text-slate-400 hover:text-slate-600 underline transition-colors"
                          >
                            Desfazer auditoria e retornar para Suspeitos
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL GIGANTE DE INSERÇÃO MANUAL DE IPCS-C */}
              {isModalManualIPCSCOpen && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                  <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-slideUp">
                    
                    <div className="bg-indigo-700 p-5 flex justify-between items-center text-white shrink-0">
                      <div>
                        <h2 className="font-black text-xl flex items-center gap-2"><PlusCircle size={24} /> Lançamento Manual de IPCS-C</h2>
                        <p className="text-indigo-200 text-xs mt-1">Preencha os dados da Hemocultura Positiva e sintomas. O sistema valida os Critérios da ANVISA.</p>
                      </div>
                      <button onClick={() => setIsModalManualIPCSCOpen(false)} className="text-indigo-200 hover:text-white"><X size={28} /></button>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
                      
                      {/* PACIENTE */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <label className="block text-xs font-black text-slate-500 uppercase mb-2">1. Selecione o Paciente</label>
                        <select 
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 uppercase"
                          value={formManualIPCSC.pacienteId}
                          onChange={(e) => {
                            const p = leitosConfig.find(l => l.id === e.target.value);
                            if (p) {
                              const leitoCorreto = p.leito || p.id.replace('bed_', '');
                              setFormManualIPCSC({...formManualIPCSC, pacienteId: p.id, nome: p.nome, leito: leitoCorreto});
                            }
                          }}
                        >
                          <option value="">-- Selecione o Paciente Internado --</option>
                          {leitosConfig.filter(l => l.nome).map(l => {
                            const leitoCorreto = l.leito || l.id.replace('bed_', '');
                            return (
                              <option key={l.id} value={l.id}>{l.nome} (LEITO {leitoCorreto})</option>
                            );
                          })}
                        </select>
                      </div>

                      {/* DADOS DA HEMOCULTURA */}
                      <div className="bg-white p-4 rounded-xl border-l-4 border-l-purple-500 border-y border-r border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-purple-600 uppercase">2. Dados Microbiológicos (Hemocultura)</h3>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Microrganismo Isolado</label>
                            <input type="text" placeholder="Ex: Klebsiella pneumoniae" value={formManualIPCSC.germe} onChange={e => setFormManualIPCSC({...formManualIPCSC, germe: e.target.value})} className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:border-purple-500 font-bold" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data da Coleta (D.O.E)</label>
                            <input type="date" value={formManualIPCSC.dataColeta} onChange={e => setFormManualIPCSC({...formManualIPCSC, dataColeta: e.target.value})} className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:border-purple-500 font-bold text-slate-700" />
                          </div>
                        </div>

                        <div className="pt-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Classificação do Patógeno (Regra ANVISA)</label>
                          <div className="flex flex-col gap-3">
                            <label className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-3 ${formManualIPCSC.tipoGerme === 'patogeno' ? 'border-purple-500 bg-purple-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                              <input type="radio" value="patogeno" checked={formManualIPCSC.tipoGerme === 'patogeno'} onChange={e => setFormManualIPCSC({...formManualIPCSC, tipoGerme: e.target.value})} className="w-4 h-4 text-purple-600 focus:ring-purple-500" />
                              <div>
                                <div className="font-bold text-sm text-slate-800">Patógeno Reconhecido</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">S. aureus, Enterococcus, Gram-negativos, Candida... (Não exige sinais clínicos).</div>
                              </div>
                            </label>
                            
                            <label className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex flex-col gap-3 ${formManualIPCSC.tipoGerme === 'comensal' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                              <div className="flex items-center gap-3">
                                <input type="radio" value="comensal" checked={formManualIPCSC.tipoGerme === 'comensal'} onChange={e => setFormManualIPCSC({...formManualIPCSC, tipoGerme: e.target.value})} className="w-4 h-4 text-amber-600 focus:ring-amber-500" />
                                <div>
                                  <div className="font-bold text-sm text-slate-800">Comensal de Pele</div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">Coagulase-negativo, Corynebacterium, Bacillus... (Exige múltiplas amostras + Sinais).</div>
                                </div>
                              </div>
                              {formManualIPCSC.tipoGerme === 'comensal' && (
                                <div className="pl-7 animate-fadeIn">
                                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-white rounded border border-amber-200">
                                    <input type="checkbox" checked={formManualIPCSC.multiplasAmostras} onChange={e => setFormManualIPCSC({...formManualIPCSC, multiplasAmostras: e.target.checked})} className="w-4 h-4 text-amber-600 rounded" />
                                    <span className="text-sm font-bold text-amber-900">Confirmo que isolou em DUAS ou mais amostras de sangue na mesma ocasião.</span>
                                  </label>
                                </div>
                              )}
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* SINAIS SISTÊMICOS */}
                      <div className={`bg-white p-4 rounded-xl border-t-4 border-x border-b border-slate-200 shadow-sm space-y-4 transition-all ${formManualIPCSC.tipoGerme === 'patogeno' ? 'opacity-50 border-t-slate-300' : 'border-t-rose-500'}`}>
                        <div className="flex justify-between items-center">
                          <label className={`text-xs font-black uppercase ${formManualIPCSC.tipoGerme === 'patogeno' ? 'text-slate-400' : 'text-rose-600'}`}>3. Sinais Sistêmicos (Janela de 7 Dias)</label>
                          {formManualIPCSC.tipoGerme === 'patogeno' && <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded font-bold">Dispensado para Patógenos</span>}
                          {formManualIPCSC.tipoGerme === 'comensal' && <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold">Obrigatório preencher ao menos 1</span>}
                        </div>
                        
                        <div className="flex flex-col gap-3">
                          <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer border border-transparent hover:border-slate-200">
                            <div className="flex items-center gap-2"><input type="checkbox" checked={formManualIPCSC.sysFebre} onChange={e => setFormManualIPCSC({...formManualIPCSC, sysFebre: e.target.checked})} className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500" /><span className="text-sm font-bold text-slate-700">Febre (&gt; 38ºC)</span></div>
                            {formManualIPCSC.sysFebre && <input type="date" value={formManualIPCSC.dataFebre} onChange={e => setFormManualIPCSC({...formManualIPCSC, dataFebre: e.target.value})} className="p-1 border rounded text-xs ml-2" />}
                          </label>
                          <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer border border-transparent hover:border-slate-200">
                            <div className="flex items-center gap-2"><input type="checkbox" checked={formManualIPCSC.sysCalafrios} onChange={e => setFormManualIPCSC({...formManualIPCSC, sysCalafrios: e.target.checked})} className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500" /><span className="text-sm font-bold text-slate-700">Calafrios</span></div>
                            {formManualIPCSC.sysCalafrios && <input type="date" value={formManualIPCSC.dataCalafrios} onChange={e => setFormManualIPCSC({...formManualIPCSC, dataCalafrios: e.target.value})} className="p-1 border rounded text-xs ml-2" />}
                          </label>
                          <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer border border-transparent hover:border-slate-200">
                            <div className="flex items-center gap-2"><input type="checkbox" checked={formManualIPCSC.sysHipotensao} onChange={e => setFormManualIPCSC({...formManualIPCSC, sysHipotensao: e.target.checked})} className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500" /><span className="text-sm font-bold text-slate-700">Hipotensão (PAS &lt; 90) ou Uso de DVA</span></div>
                            {formManualIPCSC.sysHipotensao && <input type="date" value={formManualIPCSC.dataHipotensao} onChange={e => setFormManualIPCSC({...formManualIPCSC, dataHipotensao: e.target.value})} className="p-1 border rounded text-xs ml-2" />}
                          </label>
                        </div>
                      </div>

                    </div>

                    <div className="bg-slate-100 border-t border-slate-200 p-5 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setIsModalManualIPCSCOpen(false)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancelar</button>
                      <button onClick={salvarIPCSCManual} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md transition-colors flex items-center gap-2">
                        <CheckCircle size={18} /> Processar e Salvar IPCS-C
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================= */}
          {/* ABA ITU-AC */}
          {/* ========================================= */}
          {abaIrasAtiva === 'itu' && (
            <div className="w-full animate-fadeIn space-y-6">
              
              {/* CABEÇALHO ITU-AC */}
              <div className="bg-gradient-to-r from-sky-800 to-sky-900 rounded-xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <Bug size={24} className="text-sky-400" />
                    Central de Vigilância: ITU-AC
                  </h3>
                  <p className="text-sky-200 text-sm mt-1 max-w-xl">
                    Rastreio baseado na Urocultura Positiva (D0). Cruza UFC &ge; 10⁵ (Máx 2 espécies), 
                    sinais sistêmicos (Janela 7D) e uso de Sonda Vesical de Demora (&gt; 2 dias).
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-sky-700/50 p-2 rounded-lg border border-sky-600">
                    <span className="text-xs font-bold text-sky-200">Mês de Análise:</span>
                    <input 
                      type="month" 
                      value={mesFiltroIrasCompartilhado || ''} 
                      onChange={(e) => {
                        setMesFiltroIrasCompartilhado(e.target.value);
                        setTimeout(() => carregarAuditoriasITU(), 50);
                      }} 
                      className="p-1.5 text-xs text-sky-900 rounded font-bold outline-none bg-white cursor-pointer" 
                    />
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={async () => {
                        if (!db) return alert("Banco não conectado.");
                        try {
                          console.log("🕵️ INICIANDO VARREDURA AMPLA DE ITU-AC...");
                          const snapshot = await getDocs(collection(db, "leitos_uti"));
                          const pacientesAtivos = [];
                          snapshot.forEach(doc => { if (doc.data().nome) pacientesAtivos.push({ id: doc.id, leito: doc.id.replace('bed_',''), ...doc.data() }); });

                          let novosCasos = 0;

                          for (const p of pacientesAtivos) {
                            if (!p.culturas || !p.culturas.lista) continue;
                            
                            const uroculturasPositivas = p.culturas.lista.filter(c => (c.tipo?.toLowerCase().includes('urocultura') || c.tipo?.toLowerCase().includes('urina')) && c.status === 'Positivo');
                            
                            for (const uro of uroculturasPositivas) {
                              if (!uro.dataColeta) continue;

                              let dColetaStr = uro.dataColeta.includes('/') ? uro.dataColeta.split('/').reverse().join('-') : uro.dataColeta;
                              const dataColetaObj = new Date(`${dColetaStr}T12:00:00`);
                              const mesCorrenteUro = dColetaStr.slice(0,7);
                              
                              const ufc = Number(uro.contagemUFC) || 0;
                              const qtdEsp = Number(uro.qtdEspecies) || 1;

                              // --- CRIAÇÃO DA JANELA DE 7 DIAS (D-3 a D+3) ---
                              const datasJanela = [];
                              for (let i = -3; i <= 3; i++) {
                                const d = new Date(dataColetaObj.getTime() + i * 86400000);
                                datasJanela.push(d.toISOString().split('T')[0]);
                              }

                              // --- 1. TRAVA: VERIFICAÇÃO DE SVD (Obrigatório) ---
                              let associadoSVD = false;
                              let infoSVD = "SVD não registrada ou sem data de inserção clara.";
                              let diffSvdColeta = 0;

                              if (p.enfermagem?.svdData) {
                                let dSvdStr = p.enfermagem.svdData.includes('/') ? p.enfermagem.svdData.split('/').reverse().join('-') : p.enfermagem.svdData;
                                const dataSvdObj = new Date(`${dSvdStr}T12:00:00`);
                                diffSvdColeta = Math.floor((dataColetaObj - dataSvdObj) / (1000 * 60 * 60 * 24));
                                
                                associadoSVD = diffSvdColeta >= 2;

                                if (associadoSVD && p.enfermagem.svdRetiradaData) {
                                  let dSvdRetStr = p.enfermagem.svdRetiradaData.includes('/') ? p.enfermagem.svdRetiradaData.split('/').reverse().join('-') : p.enfermagem.svdRetiradaData;
                                  const diffRetColeta = Math.floor((dataColetaObj - new Date(`${dSvdRetStr}T12:00:00`)) / (1000 * 60 * 60 * 24));
                                  if (diffRetColeta > 1) associadoSVD = false;
                                }
                                infoSVD = `SVD inserida em ${dSvdStr.split('-').reverse().join('/')} (D${diffSvdColeta >= 0 ? diffSvdColeta + 1 : '?' } no dia da coleta)`;
                              }

                              if (!associadoSVD) continue; 

                              // --- 2. EXTRAÇÃO DE FEBRE (TRAVADA NA JANELA DE 7 DIAS) ---
                              let evidenciasSistemicas = [];
                              
                              const varrerFebreBH = (blocoBh) => {
                                if (!blocoBh || !blocoBh.date || !blocoBh.vitals) return;
                                const dataRefUS = blocoBh.date;
                                
                                // A MÁGICA ACONTECE AQUI: Só lê a febre se o dia estiver na janela de infecção!
                                if (datasJanela.includes(dataRefUS)) {
                                  const dataRefBR = dataRefUS.split('-').reverse().join('/');
                                  Object.keys(blocoBh.vitals).forEach(hora => {
                                    const tempValue = blocoBh.vitals[hora]["Temp (ºC)"];
                                    if (tempValue) {
                                      const tempNum = Number(String(tempValue).replace(',', '.'));
                                      if (tempNum >= 38.0) {
                                        const msgFebre = `Febre (${tempNum} ºC) registrada em ${dataRefBR} às ${hora}`;
                                        if (!evidenciasSistemicas.includes(msgFebre)) evidenciasSistemicas.push(msgFebre);
                                      }
                                    }
                                  });
                                }
                              };

                              if (p.bh) varrerFebreBH(p.bh);
                              if (p.historico_bh && Array.isArray(p.historico_bh)) p.historico_bh.forEach(varrerFebreBH);

                              // --- 3. CRIAÇÃO DO CASO SUSPEITO ---
                              const idAuditoria = `${p.cpf || p.id}_itu_${uro.id || dColetaStr}`;
                              const docRef = doc(db, "auditorias_itu", idAuditoria);
                              const audDoc = await getDocs(query(collection(db, "auditorias_itu"), where("id", "==", idAuditoria)));
                              
                              if (audDoc.empty) {
                                await setDoc(docRef, {
                                  id: idAuditoria, pacienteId: p.id, nome: p.nome, leito: p.leito, mesReferencia: mesCorrenteUro,
                                  dataSuspeita: dColetaStr, dataEventoDOE: dColetaStr, status: "Suspeito",
                                  evidencias: {
                                    microbiologia: `Coleta em: ${dColetaStr.split('-').reverse().join('/')} | ${uro.germe} (UFC: ${ufc || 'Não inf'} | Espécies: ${qtdEsp})`,
                                    sistemicos: evidenciasSistemicas.length > 0 ? evidenciasSistemicas : ["Nenhuma febre >38ºC detectada na janela de 7 dias"],
                                    dispositivo: infoSVD,
                                    justificativa: "Cruzamento automatizado: Urocultura POSITIVA associada a tempo de SVD compatível com ITU-AC."
                                  },
                                  timestampCriacao: new Date().toISOString()
                                });
                                novosCasos++;
                              }
                            }
                          }
                          if (novosCasos > 0) alert(`🚨 ${novosCasos} novos casos suspeitos de ITU-AC capturados!`);
                          else alert("Nenhuma nova suspeita que cumpra os critérios de SVD foi encontrada.");
                          carregarAuditoriasITU();
                        } catch (err) { alert("Falha na varredura."); console.error(err); }
                      }}
                      className="bg-sky-600 hover:bg-sky-500 px-4 py-2 rounded-lg text-sm font-bold shadow transition-all flex items-center gap-2"
                    >
                      <Search size={16} /> Forçar Varredura
                    </button>
                  </div>
                </div>
              </div>

              {/* NAVEGAÇÃO INTERNA ITU-AC + BOTÃO MANUAL */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-2 gap-4">
                <div className="flex gap-2">
                  {[
                    { id: 'Suspeito', label: 'Alerta de Suspeita', color: 'bg-amber-100 text-amber-700' },
                    { id: 'Confirmado', label: 'ITU-AC Confirmada', color: 'bg-red-100 text-red-700' },
                    { id: 'Descartado', label: 'Descartados', color: 'bg-emerald-100 text-emerald-700' }
                  ].map(tab => {
                    const count = auditoriasITU.filter(a => a.status === tab.id && a.mesReferencia === mesFiltroIrasCompartilhado).length;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setFiltroStatusITU(tab.id)}
                        className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-colors flex items-center gap-2 ${filtroStatusITU === tab.id ? 'bg-white border-t-2 border-l border-r border-slate-200 text-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative translate-y-[1px]' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-b border-transparent'}`}
                      >
                        {tab.label}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab.color}`}>{count}</span>
                      </button>
                    );
                  })}
                </div>

                {/* BOTÃO DE LANÇAMENTO MANUAL ITU-AC */}
                <button 
                  onClick={() => setIsModalManualITUOpen(true)}
                  className="bg-white border-2 border-sky-500 text-sky-600 hover:bg-sky-50 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2"
                >
                  <PlusCircle size={16} /> Lançar ITU Manual
                </button>
              </div>

              {/* LISTA DE CASOS ITU-AC */}
              <div className="grid md:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-b-xl border border-t-0 border-slate-200 min-h-[300px]">
                {auditoriasITU.filter(a => a.status === filtroStatusITU && a.mesReferencia === mesFiltroIrasCompartilhado).length === 0 ? (
                  <div className="col-span-3 flex flex-col items-center justify-center text-slate-400 py-10">
                    <CheckCircle size={48} className="text-slate-300 mb-3 opacity-50"/>
                    <p className="font-bold">Nenhum caso {filtroStatusITU.toLowerCase()} neste mês.</p>
                  </div>
                ) : (
                  auditoriasITU.filter(a => a.status === filtroStatusITU && a.mesReferencia === mesFiltroIrasCompartilhado).map((caso) => (
                    <div key={caso.firebaseId} className={`bg-white border-2 rounded-xl p-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md ${filtroStatusITU === 'Suspeito' ? 'border-amber-200' : filtroStatusITU === 'Confirmado' ? 'border-red-200' : 'border-emerald-200'}`}>
                      <div className={`absolute top-0 left-0 w-2 h-full ${filtroStatusITU === 'Suspeito' ? 'bg-amber-500' : filtroStatusITU === 'Confirmado' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                      <div className="pl-3 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-black text-sky-500 uppercase">Coleta: {caso.dataSuspeita?.split('-').reverse().join('/')}</span>
                          <span className="text-xs font-bold text-slate-800">Leito {caso.leito}</span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm truncate uppercase">{caso.nome}</h4>
                        <p className="text-[10px] text-slate-500 mt-2 mb-4 italic line-clamp-2">{caso.evidencias?.microbiologia}</p>
                        
                        <div className="mt-auto pt-4 border-t border-slate-50">
                          <button 
                            onClick={() => setModalAuditoriaITU(caso)}
                            className={`w-full text-white text-xs font-bold py-2 rounded transition-colors flex items-center justify-center gap-2 ${filtroStatusITU === 'Suspeito' ? 'bg-sky-800 hover:bg-sky-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                          >
                            <Search size={14} /> {filtroStatusITU === 'Suspeito' ? 'Auditar Caso' : 'Ver Detalhes'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* MODAL DE AUDITORIA ITU-AC */}
              {modalAuditoriaITU && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                  <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-slideUp">
                    <div className={`p-4 text-white flex justify-between items-center ${modalAuditoriaITU.status === 'Suspeito' ? 'bg-sky-800' : modalAuditoriaITU.status === 'Confirmado' ? 'bg-red-700' : 'bg-emerald-700'}`}>
                      <h2 className="font-black flex items-center gap-2">
                        <Bug size={20} className="opacity-80" />
                        Auditoria do Trato Urinário - Leito {modalAuditoriaITU.leito}
                      </h2>
                      <button onClick={() => setModalAuditoriaITU(null)} className="text-white/70 hover:text-white transition-colors"><X size={24} /></button>
                    </div>

                    <div className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="font-black text-xl text-slate-800 uppercase">{modalAuditoriaITU.nome}</h3>
                          <span className="text-xs text-slate-500 font-bold">Data da Coleta (D.O.E): {modalAuditoriaITU.dataSuspeita?.split('-').reverse().join('/')}</span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${modalAuditoriaITU.status === 'Suspeito' ? 'bg-amber-100 text-amber-700' : modalAuditoriaITU.status === 'Confirmado' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {modalAuditoriaITU.status}
                        </span>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg">
                          <h4 className="text-xs font-black text-sky-800 uppercase mb-2">Microbiologia (Urocultura)</h4>
                          <p className="text-sm text-sky-900 font-bold">✓ {modalAuditoriaITU.evidencias?.microbiologia}</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg">
                            <h4 className="text-xs font-black text-rose-800 uppercase mb-2 flex items-center gap-1"><Activity size={12}/> Sinais Clínicos (Janela 7D)</h4>
                            <ul className="text-xs text-rose-900 font-medium space-y-1 list-disc pl-4">
                              {modalAuditoriaITU.evidencias?.sistemicos.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                          </div>

                          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                            <h4 className="text-xs font-black text-indigo-800 uppercase mb-2 flex items-center gap-1"><Bug size={12}/> Associação ao Dispositivo</h4>
                            <p className="text-xs text-indigo-900 font-medium">{modalAuditoriaITU.evidencias?.dispositivo}</p>
                          </div>
                        </div>
                      </div>

                      {/* NOVO CAMPO DE ANOTAÇÕES DA CCIH (ITU-AC) */}
                      <div className="mt-6 bg-slate-50 border border-slate-200 p-3 rounded-lg shadow-sm">
                        <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-1 mb-2">
                          <Edit3 size={14} /> Parecer / Justificativa da CCIH:
                        </label>
                        <textarea
                          className="w-full p-2.5 border border-slate-300 rounded-lg text-sm text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 bg-white transition-all resize-none"
                          rows="3"
                          placeholder="Ex: Confirmo infecção por presença de febre associada. / Descarto pois paciente está assintomático (apenas colonização)..."
                          defaultValue={modalAuditoriaITU.notaCCIH || ""}
                          onBlur={(e) => salvarNotaCCIH(modalAuditoriaITU.firebaseId, "auditorias_itu", e.target.value)}
                        ></textarea>
                        <p className="text-[10px] text-slate-400 mt-1 italic text-right">* A nota é salva automaticamente ao sair do campo.</p>
                      </div>

                      {modalAuditoriaITU.status === 'Suspeito' && (
                        <div className="mt-6 flex gap-4 pt-4 border-t border-slate-100">
                          <button 
                            onClick={() => {
                              atualizarStatusITU(modalAuditoriaITU.firebaseId, 'Confirmado');
                              setModalAuditoriaITU(null);
                            }} 
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                          >
                            <CheckCircle size={18} /> Confirmar ITU-AC
                          </button>
                          <button 
                            onClick={() => {
                              atualizarStatusITU(modalAuditoriaITU.firebaseId, 'Descartado');
                              setModalAuditoriaITU(null);
                            }} 
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-colors shadow-sm"
                          >
                            Descartar Suspeita
                          </button>
                        </div>
                      )}
                      {modalAuditoriaITU.status !== 'Suspeito' && (
                        <div className="mt-6 text-center">
                          <button 
                            onClick={() => {
                              atualizarStatusITU(modalAuditoriaITU.firebaseId, 'Suspeito');
                              setModalAuditoriaITU(null);
                            }}
                            className="text-xs font-bold text-slate-400 hover:text-slate-600 underline transition-colors"
                          >
                            Desfazer auditoria e retornar para Suspeitos
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL GIGANTE DE INSERÇÃO MANUAL DE ITU-AC */}
              {isModalManualITUOpen && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                  <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-slideUp">
                    
                    <div className="bg-sky-600 p-5 flex justify-between items-center text-white shrink-0">
                      <div>
                        <h2 className="font-black text-xl flex items-center gap-2"><PlusCircle size={24} /> Lançamento Manual de ITU-AC</h2>
                        <p className="text-sky-100 text-xs mt-1">Insira os dados da Urocultura. O sistema exige a presença de SVD (&gt;2 dias) e Sinais Sistêmicos.</p>
                      </div>
                      <button onClick={() => setIsModalManualITUOpen(false)} className="text-sky-200 hover:text-white"><X size={28} /></button>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
                      
                      {/* PACIENTE */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <label className="block text-xs font-black text-slate-500 uppercase mb-2">1. Selecione o Paciente</label>
                        <select 
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 uppercase"
                          value={formManualITU.pacienteId}
                          onChange={(e) => {
                            const p = leitosConfig.find(l => l.id === e.target.value);
                            if (p) {
                              const leitoCorreto = p.leito || p.id.replace('bed_', '');
                              setFormManualITU({...formManualITU, pacienteId: p.id, nome: p.nome, leito: leitoCorreto});
                            }
                          }}
                        >
                          <option value="">-- Selecione o Paciente Internado --</option>
                          {leitosConfig.filter(l => l.nome).map(l => {
                            const leitoCorreto = l.leito || l.id.replace('bed_', '');
                            return (
                              <option key={l.id} value={l.id}>{l.nome} (LEITO {leitoCorreto})</option>
                            );
                          })}
                        </select>
                      </div>

                      {/* DADOS MICROBIOLÓGICOS */}
                      <div className="bg-white p-4 rounded-xl border-l-4 border-l-sky-500 border-y border-r border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-sky-600 uppercase">2. Dados Microbiológicos (Urocultura)</h3>
                        
                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Microrganismo Isolado</label>
                            <input type="text" placeholder="Ex: E. coli" value={formManualITU.germe} onChange={e => setFormManualITU({...formManualITU, germe: e.target.value})} className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:border-sky-500 font-bold" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Contagem (UFC/mL)</label>
                            <input type="number" placeholder="Ex: 100000" value={formManualITU.ufc} onChange={e => setFormManualITU({...formManualITU, ufc: e.target.value})} className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:border-sky-500 font-bold text-slate-700" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nº de Espécies</label>
                            <select value={formManualITU.qtdEspecies} onChange={e => setFormManualITU({...formManualITU, qtdEspecies: Number(e.target.value)})} className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:border-sky-500 font-bold text-slate-700">
                              <option value={1}>1 espécie isolada</option>
                              <option value={2}>2 espécies isoladas</option>
                              <option value={3}>3 ou mais (Flora Mista)</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data da Coleta (D.O.E)</label>
                          <input type="date" value={formManualITU.dataColeta} onChange={e => setFormManualITU({...formManualITU, dataColeta: e.target.value})} className="w-full md:w-1/3 p-2 border border-slate-200 rounded text-sm outline-none focus:border-sky-500 font-bold text-slate-700" />
                        </div>
                      </div>

                      {/* SINAIS SISTÊMICOS */}
                      <div className="bg-white p-4 rounded-xl border-t-4 border-t-rose-500 border-x border-b border-slate-200 shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-black uppercase text-rose-600">3. Sinais Clínicos (Janela de 7 Dias)</label>
                          <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold">Obrigatório preencher ao menos 1</span>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                          <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={formManualITU.sysFebre} onChange={e => setFormManualITU({...formManualITU, sysFebre: e.target.checked})} className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500" />
                              <span className="text-sm font-bold text-slate-700">Febre (&gt; 38ºC) ou Calafrios</span>
                            </div>
                            {formManualITU.sysFebre && <input type="date" value={formManualITU.dataFebre} onChange={e => setFormManualITU({...formManualITU, dataFebre: e.target.value})} className="p-1 border border-slate-300 rounded text-xs ml-2 outline-none" />}
                          </label>

                          <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={formManualITU.sysDisuria} onChange={e => setFormManualITU({...formManualITU, sysDisuria: e.target.checked})} className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500" />
                              <span className="text-sm font-bold text-slate-700">Disúria ou Urgência Miccional</span>
                            </div>
                            {formManualITU.sysDisuria && <input type="date" value={formManualITU.dataDisuria} onChange={e => setFormManualITU({...formManualITU, dataDisuria: e.target.value})} className="p-1 border border-slate-300 rounded text-xs ml-2 outline-none" />}
                          </label>

                          <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={formManualITU.sysDorSupra} onChange={e => setFormManualITU({...formManualITU, sysDorSupra: e.target.checked})} className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500" />
                              <span className="text-sm font-bold text-slate-700">Dor Suprapúbica</span>
                            </div>
                            {formManualITU.sysDorSupra && <input type="date" value={formManualITU.dataDorSupra} onChange={e => setFormManualITU({...formManualITU, dataDorSupra: e.target.value})} className="p-1 border border-slate-300 rounded text-xs ml-2 outline-none" />}
                          </label>

                          <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={formManualITU.sysGiordano} onChange={e => setFormManualITU({...formManualITU, sysGiordano: e.target.checked})} className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500" />
                              <span className="text-sm font-bold text-slate-700">Sinal de Giordano Positivo (Dor lombar)</span>
                            </div>
                            {formManualITU.sysGiordano && <input type="date" value={formManualITU.dataGiordano} onChange={e => setFormManualITU({...formManualITU, dataGiordano: e.target.value})} className="p-1 border border-slate-300 rounded text-xs ml-2 outline-none" />}
                          </label>
                        </div>
                        <p className="text-[10px] text-slate-400 italic">* Para pacientes sedados ou intubados na UTI, a avaliação da dor costuma ser limitada, tornando a Febre o gatilho principal.</p>
                      </div>

                    </div>

                    <div className="bg-slate-100 border-t border-slate-200 p-5 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setIsModalManualITUOpen(false)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancelar</button>
                      <button onClick={salvarITUManual} className="px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold rounded-xl shadow-md transition-colors flex items-center gap-2">
                        <CheckCircle size={18} /> Processar e Salvar ITU-AC
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    );
  };

  // ==========================================
  // VISÃO DA GESTÃO DE RISCO E QUALIDADE (NSP)
  // ==========================================
  const renderGestaoRisco = () => {
    // 1. CÁLCULOS QUE ALIMENTAM OS GRÁFICOS (Trazidos da Tela 1)
    
    // Calcula a epidemiologia real (dadosCategorias)
    const ocorrenciasPorTipo = listaEventos.reduce((acc, evento) => {
      let nomeCategoria = evento.tipoEvento || evento.tipo;
      if (!nomeCategoria) {
        if (evento.origem === 'incidencia' || evento.lesao) {
          nomeCategoria = "LPP (Adquirida na UTI)";
        } else {
          nomeCategoria = "Registro Incompleto"; 
        }
      }
      acc[nomeCategoria] = (acc[nomeCategoria] || 0) + 1;
      return acc;
    }, {});
    
    const dadosCategorias = Object.keys(ocorrenciasPorTipo).map(tipo => ({
      categoria: tipo,
      ocorrencias: ocorrenciasPorTipo[tipo]
    })).sort((a, b) => b.ocorrencias - a.ocorrencias);

    // Calcula a linha do tempo (dataTimeline)
    const eventosPorDia = listaEventos.reduce((acc, evento) => {
      if (evento.dataHoraOcorrencia) {
        const dia = new Date(evento.dataHoraOcorrencia).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        acc[dia] = (acc[dia] || 0) + 1;
      }
      return acc;
    }, {});

    const dataTimeline = Object.keys(eventosPorDia).map(dia => ({
      dia,
      eventos: eventosPorDia[dia]
    })).sort((a, b) => {
      // Tenta ordenar pelas datas (mesmo convertidas para string de exibição)
      return a.dia.localeCompare(b.dia);
    });

    // ==========================================
    // CÁLCULOS DA ABA CHECKLIST CVC
    // ==========================================
    const calcularMetricasCVC = (mesReferencia) => {
      // Junta pacientes ativos + histórico
      const todosPacientes = [...leitosConfig, ...listaHistorico];
      let totalChecklists = 0;
      let total100Porcento = 0;

      todosPacientes.forEach(pac => {
        const historico = pac.enfermagem?.historicoCVC || [];
        historico.forEach(registro => {
          if (registro.data && registro.data.startsWith(mesReferencia)) {
            totalChecklists++;
            if (registro.barreiras?.todasCumpridas) {
              total100Porcento++;
            }
          }
        });
      });

      return { totalChecklists, total100Porcento };
    };

    const metricasCVC = calcularMetricasCVC(mesFiltroCVC);

    return (
      <div className="animate-fadeIn">
        {/* CABEÇALHO */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setActiveView('hub')} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="text-red-600" /> Núcleo de Segurança e Gestão de Risco
            </h2>
            <p className="text-slate-500 text-sm mt-1">Análise de incidentes, causas raiz e monitoramento de escalas preditivas.</p>
          </div>
        </div>

        {/* NAVEGAÇÃO INTERNA (ABAS) */}
        <div className="flex gap-2 border-b border-slate-200 mb-6 overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setAbaRiscoAtiva('eventos')}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${abaRiscoAtiva === 'eventos' ? 'border-red-600 text-red-700 bg-red-50/50 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            Notificações de Eventos Adversos
          </button>
          
          <button 
            onClick={() => setAbaRiscoAtiva('escalas')}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${abaRiscoAtiva === 'escalas' ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            Escalas Assistenciais
          </button>

          {/* 💡 NOVA ABA: CHECKLIST CVC */}
          <button 
            onClick={() => setAbaRiscoAtiva('checklistCVC')}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${abaRiscoAtiva === 'checklistCVC' ? 'border-sky-600 text-sky-700 bg-sky-50/50 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            <Syringe size={18} />
            Checklist CVC
          </button>

          {/* 💡 NOVA ABA: CARRINHO EMG */}
          <button 
            onClick={() => setAbaRiscoAtiva('carrinhoEMG')}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${abaRiscoAtiva === 'carrinhoEMG' ? 'border-amber-600 text-amber-700 bg-amber-50/50 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            <Ambulance size={18} />
            Carrinho EMG
          </button>

          {/* 💡 A NOVA ABA: CAIXA PRETA / AUDITORIA */}
          <button 
            onClick={() => setAbaRiscoAtiva('auditoria')}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${abaRiscoAtiva === 'auditoria' ? 'border-slate-800 text-slate-800 bg-slate-100/80 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            <ShieldAlert size={18} />
            Caixa Preta (Auditoria)
          </button>

        </div>

        {/* ============================================================== */}
        {/* CONTEÚDO: EVENTOS ADVERSOS                                     */}
        {/* ============================================================== */}
        {abaRiscoAtiva === 'eventos' && (
          <div className="space-y-4">
            
            {/* 💡 BARRA DE EXPORTAÇÃO (NSP) */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between animate-fadeIn mb-4">
              <div className="flex items-center gap-3">
                <ShieldAlert size={20} className="text-slate-400 hidden sm:block" />
                <div>
                  <h3 className="text-sm font-bold text-slate-700">Relatório Consolidado do NSP</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Exportação epidemiológica padronizada para Diretoria/CCIH.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 bg-red-50/50 p-2 rounded-xl border border-red-100 shadow-sm">
                <div className="flex items-center gap-2 pl-2">
                  <span className="text-[10px] font-black text-red-700 uppercase">Mês/Ano:</span>
                  <input 
                    type="month" 
                    value={mesRelatorio} 
                    onChange={(e) => setMesRelatorio(e.target.value)}
                    className="bg-white border border-red-200 p-1.5 rounded-lg text-xs font-bold text-red-800 outline-none focus:border-red-500 cursor-pointer"
                  />
                </div>
                <button 
                  onClick={() => exportarRelatorioEventos(mesRelatorio)}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-4 py-1.5 rounded-lg transition-all flex items-center gap-2 active:scale-95 shadow-sm"
                >
                  <Download size={14} /> Gerar PDF
                </button>
              </div>
            </div>

            {/* KPIs SUPERIORES */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total de Notificações</span>
                <div className="text-3xl font-black text-slate-800 mt-1">{totalEventos}</div>
                <div className="text-[10px] text-emerald-500 font-bold mt-1">Notificar é um ato de segurança</div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Eventos Graves / Sentinela</span>
                <div className="text-3xl font-black text-red-600 mt-1">{eventosGraves}</div>
                <div className="text-[10px] text-slate-400 font-bold mt-1">Requer análise raiz imediata</div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Investigações Pendentes</span>
                <div className="text-3xl font-black text-amber-500 mt-1">{investigacoesPendentes}</div>
                <div className="text-[10px] text-slate-400 font-bold mt-1">Aguardando parecer da RT/CCIH</div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Maior Incidência</span>
                <div className="text-xl font-black text-blue-600 mt-1 truncate" title={maiorIncidencia}>{maiorIncidencia}</div>
                <div className="text-[10px] text-slate-400 font-bold mt-1">Foco prioritário para treinamento</div>
              </div>
            </div>

            {/* 🚨 NOVA SESSÃO DOS GRÁFICOS (MOVIDOS PARA CÁ) */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {/* GRÁFICO 1: EPIDEMIOLOGIA DOS EVENTOS */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80 flex flex-col">
                <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase flex items-center gap-2">
                  <BarChart2 size={16} className="text-blue-500" /> Epidemiologia dos Eventos
                </h3>
                <div className="flex-1 w-full">
                  {dadosCategorias && dadosCategorias.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dadosCategorias.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 20, left: 30, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="categoria" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569', fontWeight: 'bold' }} width={110} />
                        <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                        <Bar dataKey="ocorrencias" name="Nº de Ocorrências" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-slate-400 italic">Sem dados suficientes para o gráfico.</div>
                  )}
                </div>
              </div>

              {/* GRÁFICO 2: CURVA DE OCORRÊNCIAS */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80 flex flex-col">
                <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase flex items-center gap-2">
                  <Activity size={16} className="text-red-500" /> Curva de Ocorrências
                </h3>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dataTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                      <Line type="monotone" dataKey="eventos" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* LISTA DE NOTIFICAÇÕES (FEED REAL DO FIREBASE) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[400px] flex flex-col overflow-hidden w-full">
              <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" /> Feed de Notificações
              </h3>
              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {listaEventos.length === 0 ? (
                  <div className="text-center text-sm text-slate-400 italic py-10">Nenhuma notificação encontrada no sistema.</div>
                ) : (
                  listaEventos.map((evento) => {
                    let corStatus = "bg-slate-100 text-slate-600";
                    if (evento.statusAnalise === 'Pendente NSP') corStatus = "bg-red-100 text-red-700";
                    else if (evento.statusAnalise === 'Em Análise') corStatus = "bg-amber-100 text-amber-700";
                    else if (evento.statusAnalise === 'Concluído') corStatus = "bg-emerald-100 text-emerald-700";

                    let corBarra = "bg-slate-300";
                    if (evento.grauDano === 'Óbito') corBarra = "bg-black";
                    else if (evento.grauDano === 'Grave') corBarra = "bg-red-600";
                    else if (evento.grauDano === 'Moderado') corBarra = "bg-amber-500";
                    else if (evento.grauDano === 'Leve') corBarra = "bg-blue-400";
                    else if (evento.grauDano === 'Nenhum') corBarra = "bg-emerald-400";

                    return (
                      <div key={evento.id} onClick={() => setEventoEmInvestigacao(evento)} className="flex p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                        <div className={`w-2 rounded-full mr-3 shrink-0 ${corBarra}`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-black text-slate-800 uppercase truncate pr-2">{evento.tipoEvento}</span>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                              {new Date(evento.dataHoraOcorrencia).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-slate-500">Leito {evento.leitoOcorrencia} ({evento.pacienteIniciais || 'SN'})</p>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${corStatus}`}>
                              {evento.statusAnalise}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            
          </div>
        )}

        {/* ============================================================== */}
        {/* ESTRUTURA PARA AS ESCALAS ASSISTENCIAIS (AUDITORIA)            */}
        {/* ============================================================== */}
        {abaRiscoAtiva === 'escalas' && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-fadeIn">
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Activity className="text-blue-600" /> Auditoria de Escalas Clínicas Admissão
                </h3>
                <p className="text-xs text-slate-500 mt-1">Verificação de conformidade do SAPS 3, Braden e Morse de todas as internações.</p>
              </div>

              {/* O CONTROLE DO FILTRO DE TEMPO */}
              <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                <Filter size={16} className="text-slate-400 ml-2" />
                <span className="text-xs font-bold text-slate-600 uppercase">Período:</span>
                <input 
                  type="date" 
                  value={filtroDataInicio} 
                  onChange={(e) => setFiltroDataInicio(e.target.value)}
                  className="p-1.5 border border-slate-200 rounded text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
                />
                <span className="text-slate-400 text-xs">até</span>
                <input 
                  type="date" 
                  value={filtroDataFim} 
                  onChange={(e) => setFiltroDataFim(e.target.value)}
                  className="p-1.5 border border-slate-200 rounded text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
                    <th className="p-4 w-1/4">Paciente / Admissão</th>
                    <th className="p-4 text-center border-l border-slate-200">SAPS 3 (Gravidade)</th>
                    <th className="p-4 text-center border-l border-slate-200">Braden (Lesão)</th>
                    <th className="p-4 text-center border-l border-slate-200">Morse (Queda)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {listaEscalas.length === 0 ? (
                    <tr><td colSpan="4" className="p-8 text-center text-slate-400 italic">Carregando histórico de internações...</td></tr>
                  ) : (
                    listaEscalas.map((pac, index) => (
                      <tr key={`${pac.id}-${index}`} className="hover:bg-slate-50 transition-colors">
                        
                        {/* COLUNA 1: IDENTIFICAÇÃO */}
                        <td className="p-4">
                          <div className="font-bold text-slate-800 text-sm">{pac.nome}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500">{new Date(pac.dataInternacao).toLocaleDateString('pt-BR')}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${pac.status === 'Internado' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                              {pac.status}
                            </span>
                          </div>
                        </td>

                        {/* COLUNA 2: SAPS 3 */}
                        <td className="p-4 text-center border-l border-slate-100">
                          {pac.saps3 ? (
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-black text-slate-700 text-lg">{pac.saps3.score ?? pac.saps3.pontuacao ?? '-'}</span>
                              <button onClick={() => abrirAuditoriaEscala('SAPS 3', pac.nome, pac.saps3)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors" title="Auditar preenchimento">
                                <Search size={16} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded">Pendente</span>
                          )}
                        </td>

                        {/* COLUNA 3: BRADEN */}
                        <td className="p-4 text-center border-l border-slate-100">
                          {pac.braden || (pac.enfermagem && pac.enfermagem.escalas_diarias) ? (
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-black text-slate-700 text-lg">{pac.braden?.score ?? pac.braden?.pontuacao ?? '-'}</span>
                              <button onClick={() => abrirAuditoriaEscala('Braden', pac.nome, pac.braden)} className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded-lg transition-colors" title="Auditar Admissão">
                                <Search size={16} />
                              </button>
                              {/* NOVO BOTÃO DE HISTÓRICO DIÁRIO */}
                              <button onClick={() => abrirHistoricoEscalas('Braden', pac)} className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors" title="Ver Histórico Diário">
                                <History size={16} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded">Pendente</span>
                          )}
                        </td>

                        {/* COLUNA 4: MORSE */}
                        <td className="p-4 text-center border-l border-slate-100">
                          {pac.morse || (pac.enfermagem && pac.enfermagem.escalas_diarias) ? (
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-black text-slate-700 text-lg">{pac.morse?.score ?? pac.morse?.pontuacao ?? '-'}</span>
                              <button onClick={() => abrirAuditoriaEscala('Morse', pac.nome, pac.morse)} className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors" title="Auditar Admissão">
                                <Search size={16} />
                              </button>
                              {/* NOVO BOTÃO DE HISTÓRICO DIÁRIO */}
                              <button onClick={() => abrirHistoricoEscalas('Morse', pac)} className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors" title="Ver Histórico Diário">
                                <History size={16} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded">Pendente</span>
                          )}
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ABA: CHECKLIST CVC                                              */}
        {/* ============================================================== */}
        {abaRiscoAtiva === 'checklistCVC' && (
          <div className="animate-fadeIn">
            {/* CABEÇALHO COM FILTRO DE MÊS */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 mb-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <Syringe className="text-sky-600" /> Checklist de Inserção CVC
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Monitoramento de conformidade dos checklists de inserção de CVC/PICC/Shiley.</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-600 uppercase">Mês:</span>
                  <input 
                    type="month" 
                    value={mesFiltroCVC} 
                    onChange={(e) => setMesFiltroCVC(e.target.value)}
                    className="bg-white border border-slate-200 p-1.5 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-sky-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* CARDS DE MÉTRICAS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              
              {/* Card 1: Acessos Realizados (Editável Manualmente) */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-sky-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-full -mr-10 -mt-10"></div>
                <div className="relative">
                  <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider flex items-center gap-1">
                    <Syringe size={14} /> Acessos Realizados
                  </span>
                  <div className="flex items-center gap-3 mt-3">
                    <input 
                      type="number" 
                      min="0"
                      value={acessosMesCVC !== null ? acessosMesCVC : metricasCVC.totalChecklists}
                      onChange={(e) => setAcessosMesCVC(Number(e.target.value))}
                      className="w-24 p-2 text-2xl font-black text-sky-700 bg-sky-50 border-2 border-sky-200 rounded-xl outline-none focus:border-sky-500 text-center"
                    />
                    <span className="text-xs text-slate-400 font-medium">
                      Total de acessos<br/>no mês
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 italic">* Campo editável — insira o total real de acessos do mês</p>
                </div>
              </div>

              {/* Card 2: Checklists Preenchidos (Automático) */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-10 -mt-10"></div>
                <div className="relative">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                    <ClipboardList size={14} /> Checklists Preenchidos
                  </span>
                  <div className="text-4xl font-black text-blue-700 mt-3">
                    {metricasCVC.totalChecklists}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {metricasCVC.totalChecklists === 1 ? '1 checklist' : `${metricasCVC.totalChecklists} checklists`} registrados no mês
                  </p>
                </div>
              </div>

              {/* Card 3: 100% das Barreiras (Automático) */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-10 -mt-10"></div>
                <div className="relative">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck size={14} /> 100% das Barreiras
                  </span>
                  <div className="flex items-end gap-3 mt-3">
                    <span className="text-4xl font-black text-emerald-700">{metricasCVC.total100Porcento}</span>
                    {metricasCVC.totalChecklists > 0 && (
                      <span className="text-lg font-bold text-emerald-500 mb-1">
                        ({Math.round((metricasCVC.total100Porcento / metricasCVC.totalChecklists) * 100)}%)
                      </span>
                    )}
                  </div>
                  <div className="mt-3 w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${metricasCVC.totalChecklists > 0 ? (metricasCVC.total100Porcento / metricasCVC.totalChecklists) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {metricasCVC.totalChecklists > 0 
                      ? `${metricasCVC.total100Porcento} de ${metricasCVC.totalChecklists} checklists cumpriram todos os critérios`
                      : 'Nenhum checklist registrado no período'}
                  </p>
                </div>
              </div>

            </div>

            {/* TAXA DE COBERTURA */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h4 className="font-bold text-slate-700 text-sm uppercase flex items-center gap-2 mb-4">
                <BarChart2 size={16} className="text-sky-500" /> Taxa de Cobertura (Checklists × Acessos)
              </h4>
              <p className="text-xs text-slate-500 mb-4">Relação entre checklists preenchidos e o total de acessos realizados no mês.</p>
              
              {metricasCVC.totalChecklists > 0 && (acessosMesCVC ?? metricasCVC.totalChecklists) > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-slate-600">Cobertura</span>
                    <span className="text-2xl font-black text-blue-600">
                      {Math.round((metricasCVC.totalChecklists / (acessosMesCVC ?? metricasCVC.totalChecklists)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-5 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-400 to-indigo-500 h-5 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min((metricasCVC.totalChecklists / (acessosMesCVC ?? metricasCVC.totalChecklists)) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{metricasCVC.totalChecklists} checklists preenchidos</span>
                    <span>{(acessosMesCVC ?? metricasCVC.totalChecklists)} acessos realizados</span>
                  </div>
                  {(acessosMesCVC ?? metricasCVC.totalChecklists) > metricasCVC.totalChecklists && (
                    <p className="text-[10px] text-amber-600 font-bold mt-2">
                      ⚠️ {(acessosMesCVC ?? metricasCVC.totalChecklists) - metricasCVC.totalChecklists} acessos sem checklist registrado
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 italic text-xs">
                  Aguardando dados de checklists e acessos do mês.
                </div>
              )}
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* ABA: CARRINHO EMG                                               */}
        {/* ============================================================== */}
        {abaRiscoAtiva === 'carrinhoEMG' && (
          <div className="animate-fadeIn">
            {/* CABEÇALHO */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 mb-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <Ambulance className="text-amber-600" /> Check-list Carrinho de Emergência
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Monitoramento da verificação diária do carrinho de emergência da UTI.</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-600 uppercase">Mês:</span>
                  <input 
                    type="month" 
                    value={mesFiltroCarrinhoEMG} 
                    onChange={(e) => setMesFiltroCarrinhoEMG(e.target.value)}
                    className="bg-white border border-slate-200 p-1.5 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Dias com checklist</span>
                <div className="text-2xl font-black text-emerald-600 mt-1">{listaCarrinhoEMG.filter((v,i,a) => a.findIndex(r => r.data === v.data) === i).length}</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total verificações</span>
                <div className="text-2xl font-black text-amber-600 mt-1">{listaCarrinhoEMG.length}</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Dias no mês</span>
                <div className="text-2xl font-black text-slate-600 mt-1">
                  {new Date(Number(mesFiltroCarrinhoEMG.split('-')[0]), Number(mesFiltroCarrinhoEMG.split('-')[1]), 0).getDate()}
                </div>
              </div>
            </div>

            {/* CALENDÁRIO */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              {loadingCarrinhoEMG ? (
                <div className="text-center py-12 text-slate-400">
                  <span className="animate-spin inline-block">⏳</span> Carregando...
                </div>
              ) : (
                <>
                  {/* Legenda */}
                  <div className="flex items-center gap-4 mb-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300"></div>
                      <span className="text-slate-500 font-medium">Checklist realizado</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-slate-100 border border-slate-200"></div>
                      <span className="text-slate-500 font-medium">Não realizado</span>
                    </div>
                  </div>

                  {/* Grid do Calendário */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {/* Cabeçalho dos dias da semana */}
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                      <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-2">{d}</div>
                    ))}

                    {/* Dias em branco antes do dia 1 */}
                    {(() => {
                      const [ano, mes] = mesFiltroCarrinhoEMG.split('-').map(Number);
                      const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();
                      return Array.from({ length: primeiroDiaSemana }, (_, i) => (
                        <div key={`blank-${i}`} />
                      ));
                    })()}

                    {/* Dias do mês */}
                    {(() => {
                      const [ano, mes] = mesFiltroCarrinhoEMG.split('-').map(Number);
                      const diasNoMes = new Date(ano, mes, 0).getDate();
                      
                      return Array.from({ length: diasNoMes }, (_, i) => {
                        const dia = i + 1;
                        const diaStr = `${mesFiltroCarrinhoEMG}-${String(dia).padStart(2, '0')}`;
                        const registrosHoje = listaCarrinhoEMG.filter(r => r.data === diaStr);
                        const temRegistro = registrosHoje.length > 0;
                        const isFuture = new Date(diaStr) > new Date();

                        return (
                          <button
                            key={dia}
                            onClick={() => {
                              if (temRegistro) {
                                setModalDetalheCarrinho({ isOpen: true, dia: diaStr, registros: registrosHoje });
                              }
                            }}
                            disabled={isFuture || !temRegistro}
                            className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all
                              ${temRegistro 
                                ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100 cursor-pointer' 
                                : isFuture
                                  ? 'bg-white border-slate-100 text-slate-200 cursor-default'
                                  : 'bg-slate-50 border-slate-200 text-slate-400 cursor-default'
                              }`}
                          >
                            <span className={`text-sm font-black ${temRegistro ? 'text-emerald-700' : isFuture ? 'text-slate-200' : 'text-slate-400'}`}>
                              {dia}
                            </span>
                            {temRegistro && (
                              <div className="flex gap-0.5 mt-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                              </div>
                            )}
                          </button>
                        );
                      });
                    })()}
                  </div>

                  {/* Mensagem vazia */}
                  {listaCarrinhoEMG.length === 0 && (
                    <div className="text-center py-6 text-slate-400 italic text-xs mt-4 border-t border-slate-100 pt-4">
                      <Ambulance size={24} className="mx-auto mb-1 text-slate-300" />
                      Nenhuma verificação registrada neste mês.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 💡 AQUI ENTRA A NOSSA NOVA ABA DA CAIXA PRETA / AUDITORIA      */}
        {/* ============================================================== */}
        {abaRiscoAtiva === 'auditoria' && (
          <div className="animate-fadeIn">
             <PainelAuditoriaTab />
          </div>
        )}


        {/* ============================================================== */}
        {/* MODAL DE INVESTIGAÇÃO DE CAUSA RAIZ (CCIH/RT)                  */}
        {/* ============================================================== */}
        {eventoEmInvestigacao && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-fadeIn flex flex-col max-h-[95vh]">
              
              {/* CABEÇALHO DO MODAL */}
              <div className="bg-slate-800 p-5 flex justify-between items-center text-white shrink-0">
                <div>
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <ShieldAlert className="text-red-400" /> Investigação de Evento Adverso
                  </h3>
                  <p className="text-slate-300 text-xs mt-1">Auditoria e Validação Exclusiva da Gestão (RT/NSP)</p>
                </div>
                <button onClick={() => { setFormInvestigacao({}); setEventoEmInvestigacao(null); }} className="text-slate-400 hover:text-white p-1 transition-colors">FECHAR</button>
              </div>

              {/* CORPO DO MODAL (DUAS COLUNAS EM TELAS GRANDES) */}
              <div className="p-6 bg-slate-50 flex-1 overflow-y-auto grid md:grid-cols-2 gap-8">
                
                {/* LADO ESQUERDO: O RELATO DA LINHA DE FRENTE (Somente Leitura) */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                    Dados da Ocorrência (Relato Assistencial)
                  </h4>
                  
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div><span className="block text-[10px] text-slate-400 font-bold uppercase">Tipo de Evento</span><span className="font-bold text-slate-800 text-sm">{eventoEmInvestigacao.tipoEvento}</span></div>
                      <div><span className="block text-[10px] text-slate-400 font-bold uppercase">Leito / Iniciais</span><span className="font-bold text-slate-800 text-sm">{eventoEmInvestigacao.leitoOcorrencia} ({eventoEmInvestigacao.pacienteIniciais || 'SN'})</span></div>
                      <div className="col-span-2"><span className="block text-[10px] text-slate-400 font-bold uppercase">Data/Hora da Ocorrência</span><span className="font-bold text-slate-800 text-sm">{eventoEmInvestigacao.dataHoraOcorrencia ? new Date(eventoEmInvestigacao.dataHoraOcorrencia).toLocaleString('pt-BR') : 'Data Indisponível'}</span></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="block text-xs text-slate-500 font-bold mb-1">Breve Relato do Incidente:</span>
                      <div className="bg-white p-3 rounded-lg border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap">{eventoEmInvestigacao.relatoIncidente || 'Nenhum relato fornecido pela equipe.'}</div>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-500 font-bold mb-1">Ações Imediatas Adotadas:</span>
                      <div className="bg-white p-3 rounded-lg border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap">{eventoEmInvestigacao.acoesImediatas || 'Nenhuma ação descrita pela equipe.'}</div>
                    </div>
                  </div>
                </div>

                {/* LADO DIREITO: FORMULÁRIO DE ANÁLISE DA GESTÃO (Editável) */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                    Classificação e Análise (RT / NSP)
                  </h4>

                  {/* NOVOS CAMPOS EDITÁVEIS: GRAU DO DANO E IMPACTO */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex justify-between">
                        Grau do Dano (Classificação Oficial) <span className="text-blue-500 lowercase font-normal italic">(Auditoria do RT)</span>
                      </label>
                      <select 
                        value={formInvestigacao.grauDano !== undefined ? formInvestigacao.grauDano : (eventoEmInvestigacao.grauDano || '')} 
                        onChange={(e) => setFormInvestigacao({...formInvestigacao, grauDano: e.target.value})}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700"
                      >
                        <option value="">Selecione a Gravidade Real...</option>
                        <option value="Nenhum">Sem Dano (Near Miss / Incidente)</option>
                        <option value="Leve">Leve (Sintomas leves, sem intervenção maior)</option>
                        <option value="Moderado">Moderado (Intervenção médica, aumento do tempo de VM/UTI)</option>
                        <option value="Grave">Grave (Intervenção para salvar vida, dano permanente)</option>
                        <option value="Óbito">Óbito</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Impacto Clínico no Paciente</label>
                      <textarea 
                        rows="2" 
                        value={formInvestigacao.impactoGerado !== undefined ? formInvestigacao.impactoGerado : (eventoEmInvestigacao.impactoGerado || '')} 
                        onChange={(e) => setFormInvestigacao({...formInvestigacao, impactoGerado: e.target.value})}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-sm resize-none text-slate-700"
                        placeholder="Edite ou descreva o impacto real (Ex: Necessitou de reintubação, nova linha venosa, etc)..."
                      ></textarea>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nº do Prontuário</label>
                      <input 
                        type="text" value={formInvestigacao.prontuario || ''} onChange={(e) => setFormInvestigacao({...formInvestigacao, prontuario: e.target.value})}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700" placeholder="Ex: 123456"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fase do Cuidado</label>
                      <select 
                        value={formInvestigacao.faseCuidado || ''} onChange={(e) => setFormInvestigacao({...formInvestigacao, faseCuidado: e.target.value})}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700"
                      >
                        <option value="">Selecione...</option>
                        <option value="Admissão">Admissão</option>
                        <option value="Manutenção/Rotina">Manutenção / Rotina Diária</option>
                        <option value="Realização de Procedimento">Realização de Procedimento</option>
                        <option value="Transporte Intra-hospitalar">Transporte Intra-hospitalar</option>
                        <option value="Alta/Transferência">Alta / Transferência</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex justify-between">
                      Fatores Contribuintes / Causa Raiz <span className="text-amber-500 lowercase font-normal italic">(Falha humana, sistema?)</span>
                    </label>
                    <textarea 
                      rows="2" value={formInvestigacao.fatoresContribuintes || ''} onChange={(e) => setFormInvestigacao({...formInvestigacao, fatoresContribuintes: e.target.value})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-sm resize-none text-slate-700"
                      placeholder="Identifique as falhas no processo que permitiram a ocorrência..."
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex justify-between">
                      Plano de Ação / Medidas Preventivas <span className="text-emerald-500 lowercase font-normal italic">(O que faremos para não repetir?)</span>
                    </label>
                    <textarea 
                      rows="2" value={formInvestigacao.medidasPreventivas || ''} onChange={(e) => setFormInvestigacao({...formInvestigacao, medidasPreventivas: e.target.value})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-sm resize-none text-slate-700"
                      placeholder="Ações de educação, revisão de pops..."
                    ></textarea>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 mt-2">
                    <label className="block text-xs font-bold text-blue-800 uppercase mb-2">Status da Investigação</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setFormInvestigacao({...formInvestigacao, statusAnalise: 'Em Análise'})}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${formInvestigacao.statusAnalise === 'Em Análise' ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                      >
                        Em Análise
                      </button>
                      <button 
                        onClick={() => setFormInvestigacao({...formInvestigacao, statusAnalise: 'Concluído'})}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${formInvestigacao.statusAnalise === 'Concluído' ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                      >
                        <CheckCircle size={14} /> Fechar Análise
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* RODAPÉ DO MODAL (BOTÃO DE SALVAR) */}
              <div className="bg-slate-100 border-t border-slate-200 p-4 flex justify-end gap-3 shrink-0">
                <button onClick={() => { setFormInvestigacao({}); setEventoEmInvestigacao(null); }} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">
                  Cancelar
                </button>
                <button onClick={salvarInvestigacaoEvento} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm">
                  Salvar Investigação
                </button>
              </div>

            </div>
          </div>
        )}

      {/* ======================================================== */}
      {/* MODAL: DETALHES DO CARRINHO EMG POR DIA                  */}
      {/* ======================================================== */}
      {modalDetalheCarrinho.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-amber-500/20 my-auto">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Ambulance size={20} /></div>
                <h2 className="text-lg font-black tracking-wide leading-tight">
                  Verificações de {new Date(modalDetalheCarrinho.dia + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                </h2>
              </div>
              <button onClick={() => setModalDetalheCarrinho({ ...modalDetalheCarrinho, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {modalDetalheCarrinho.registros.length === 0 ? (
                <div className="text-center py-8 text-slate-400 italic">Nenhum registro para esta data.</div>
              ) : (
                modalDetalheCarrinho.registros.map((reg, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    {/* Cabeçalho do registro */}
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        🕐 {reg.horario}
                      </span>
                      <span className="text-xs font-bold text-slate-600">
                        👤 {reg.preenchidoPor || 'Não identificado'}
                      </span>
                    </div>

                    {/* Itens do checklist */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${reg.laringoscopio === 'Funcionante' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        🔦 Laringoscópio: {reg.laringoscopio === 'Funcionante' ? '✅' : '❌'}
                      </div>
                      <div className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${reg.cardioversor === 'Funcionante' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        ⚡ Cardioversor: {reg.cardioversor === 'Funcionante' ? '✅' : '❌'}
                      </div>
                      <div className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${reg.gelCondutor === 'Sim' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        🧴 Gel Condutor: {reg.gelCondutor === 'Sim' ? '✅' : '❌'}
                      </div>
                      <div className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${reg.tabua === 'Sim' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        🪵 Tábua: {reg.tabua === 'Sim' ? '✅' : '❌'}
                      </div>
                    </div>

                    {/* Lacres */}
                    <div className="flex gap-2 text-[10px] text-slate-500 bg-white rounded-lg p-2 border border-slate-100">
                      <span className="font-bold">🔒 Lacre Carrinho:</span> {reg.lacreCarrinho || '—'}
                      <span className="text-slate-200 mx-1">|</span>
                      <span className="font-bold">🔒 Lacre Caixa:</span> {reg.lacreCaixa || '—'}
                    </div>
                  </div>
                ))
              )}

              <div className="pt-3">
                <button onClick={() => setModalDetalheCarrinho({ ...modalDetalheCarrinho, isOpen: false })} className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



        {/* ============================================================== */}
        {/* MODAL DE AUDITORIA DA ESCALA ESPECÍFICA                        */}
        {/* ============================================================== */}
        {modalEscala && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="bg-slate-800 p-5 flex justify-between items-center text-white shrink-0">
                <div>
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <Activity className="text-blue-400" /> Auditoria de Preenchimento: {modalEscala.titulo}
                  </h3>
                  <p className="text-slate-300 text-sm mt-1">Paciente: <span className="font-bold text-white">{modalEscala.paciente}</span></p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-white/10 px-4 py-2 rounded-lg text-center">
                    <span className="block text-[10px] font-bold text-slate-300 uppercase">Score Final</span>
                    <span className="block text-xl font-black text-white leading-none">{modalEscala.score}</span>
                  </div>
                  <button onClick={() => setModalEscala(null)} className="text-slate-400 hover:text-white transition-colors">
                    <XCircle size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6 bg-slate-50 flex-1 overflow-y-auto">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                  Detalhamento dos Fatores Assinalados pela Equipe
                </h4>
                
                <div className="space-y-3">
                  {/* VERIFICA SE AS RESPOSTAS SÃO UM ARRAY (Formato do SAPS 3) */}
                  {Array.isArray(modalEscala.respostas) ? (
                    modalEscala.respostas.length > 0 ? (
                      modalEscala.respostas.map((item, idx) => {
                        // Divide a string "Idade 85 anos: +18" em duas partes para ficar bonito
                        const partes = String(item).split(':');
                        const textoFator = partes[0];
                        const pontuacao = partes[1] ? partes[1].trim() : '';

                        return (
                          <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                              <CheckCircle size={14} className="text-blue-500" /> {textoFator}
                            </span>
                            {pontuacao && (
                              <span className={`text-sm font-black px-3 py-1 rounded-md text-right ${pontuacao.includes('-') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {pontuacao}
                              </span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center text-slate-400 italic p-4">Nenhum fator de gravidade foi pontuado.</div>
                    )
                  ) : (
                    /* CASO SEJA UM OBJETO (Formato do Braden e Morse que fizemos antes) */
                    Object.entries(modalEscala.respostas || {}).map(([chave, valor], idx) => {
                      if (chave === 'score' || chave === 'pontuacao' || chave === 'total' || chave === 'data') return null;
                      return (
                        <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-600 capitalize">
                            {chave.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="text-sm font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-md text-right max-w-[50%]">
                            {typeof valor === 'object' ? JSON.stringify(valor) : String(valor)}
                          </span>
                        </div>
                      );
                    })
                  )}
                  
                  {(!modalEscala.respostas || (Array.isArray(modalEscala.respostas) ? modalEscala.respostas.length === 0 : Object.keys(modalEscala.respostas).length === 0)) && (
                    <div className="text-center text-slate-400 italic p-4">
                      O detalhamento específico desta escala não foi salvo no momento do preenchimento.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  };

  // ==========================================
  // VISÃO 5: GESTÃO DE EQUIPE
  // ==========================================
  const renderEquipe = () => {
    
    if (subViewEquipe === 'menu') {
      return (
        <div className="animate-fadeIn">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setActiveView('hub')} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-slate-700" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Users className="text-emerald-600" /> Gestão de Equipe e Sistema</h2>
              <p className="text-slate-500 text-sm mt-1">Selecione o módulo administrativo que deseja acessar.</p>
            </div>
          </div>

          {/* CARDS DE GESTÃO DE PESSOAL - SINCRONIZADOS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* CARD 1: TOTAL */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Equipe Cadastrada</span>
                  <div className="text-3xl font-black text-slate-800 mt-1">
                    {metricasEquipe.carregando ? <Loader2 className="animate-spin text-slate-300" size={24}/> : metricasEquipe.total}
                  </div>
                </div>
                <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
                  <Users size={20} />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-4 italic">Total de profissionais no banco</p>
            </div>
            
            {/* CARD 2: ATIVOS */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 bg-emerald-50/20">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Usuários Ativos</span>
                  <div className="text-3xl font-black text-emerald-700 mt-1">
                    {metricasEquipe.carregando ? <Loader2 className="animate-spin text-emerald-300" size={24}/> : metricasEquipe.ativos}
                  </div>
                </div>
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                  <CheckCircle size={20} />
                </div>
              </div>
              <p className="text-[10px] text-emerald-600/60 mt-4 font-bold">Com acesso total ao sistema</p>
            </div>
            
            {/* CARD 3: PENDENTES */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-100 bg-amber-50/20">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pendências RH</span>
                  <div className="text-3xl font-black text-amber-700 mt-1">
                    {metricasEquipe.carregando ? <Loader2 className="animate-spin text-amber-300" size={24}/> : metricasEquipe.pendentes}
                  </div>
                </div>
                <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                  <AlertCircle size={20} />
                </div>
              </div>
              <p className="text-[10px] text-amber-600/60 mt-4 font-bold">Aguardando revisão ou aprovação</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <button onClick={() => setSubViewEquipe('acessos')} className="bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-emerald-500 hover:shadow-md transition-all group text-left flex flex-col h-full">
              <div className="bg-emerald-100 w-12 h-12 rounded-xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform"><Shield size={24} /></div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Controle de Perfis</h3>
              <p className="text-slate-500 text-sm flex-grow">Cadastre a equipe, gerencie senhas e defina os acessos e vínculos de cada profissional.</p>
            </button>
            <button onClick={() => setSubViewEquipe('escalas')} className="bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-blue-500 hover:shadow-md transition-all group text-left flex flex-col h-full">
              <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform"><CalendarDays size={24} /></div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Gestão de Escalas</h3>
              <p className="text-slate-500 text-sm flex-grow">Monte o espelho de plantão (Médico, Enf e Fisio) e acompanhe trocas.</p>
            </button>
            <button onClick={() => setSubViewEquipe('config')} className="bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-slate-500 hover:shadow-md transition-all group text-left flex flex-col h-full">
              <div className="bg-slate-200 w-12 h-12 rounded-xl flex items-center justify-center text-slate-700 mb-4 group-hover:scale-110 transition-transform"><Settings size={24} /></div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Configurações da UTI</h3>
              <p className="text-slate-500 text-sm flex-grow">Altere o número de leitos, mapeie áreas e ajuste parâmetros gerais.</p>
            </button>
          </div>
        </div>
      );
    }

    if (subViewEquipe === 'acessos') {
      return (
        <div className="animate-fadeIn">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setSubViewEquipe('menu')} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-slate-700" />
            </button>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Shield className="text-emerald-600" /> Controle de Perfis e Acessos</h2>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 min-h-[500px]">
            <ModuloAdmin userProfile={userProfile} />
          </div>
        </div>
      );
    }

    if (subViewEquipe === 'escalas') {
      const categorias = [
        { id: 'Visão Geral', icon: <Shield size={16} /> },
        { id: 'Médico', icon: <Activity size={16} /> }, 
        { id: 'Enfermeiro', icon: <Users size={16} /> },
        { id: 'Téc. Enfermagem', icon: <Users size={16} /> }, 
        { id: 'Téc. Hemodiálise', icon: <Activity size={16} /> }, 
        { id: 'Fisioterapeuta', icon: <Activity size={16} /> },
        { id: 'Fonoaudiólogo', icon: <Activity size={16} /> }, 
        { id: 'Nutricionista', icon: <Activity size={16} /> },
        { id: 'Psicólogo', icon: <Activity size={16} /> },
        { id: 'Recepção', icon: <Users size={16} /> }, 
      ];

      return (
        <div className="animate-fadeIn pb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSubViewEquipe('menu')} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors">
                <ArrowLeft size={20} className="text-slate-700" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><CalendarDays className="text-blue-600" /> Radar de Plantão</h2>
                <p className="text-slate-500 text-sm">Controle diário e mensal das equipes da UTI.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
              <input type="date" value={dataSelecionada} onChange={(e) => setDataSelecionada(e.target.value)} className="text-sm font-bold text-slate-700 p-2 outline-none border-r border-slate-100" />
              <button onClick={() => setModoVisao('dia')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${modoVisao === 'dia' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>DIA</button>
              <button onClick={() => setModoVisao('mes')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${modoVisao === 'mes' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>MÊS</button>
            </div>
          </div>

          <div className="flex overflow-x-auto gap-2 mb-6 no-scrollbar pb-2">
            {categorias.map(cat => (
              <button key={cat.id} onClick={() => setCategoriaAtiva(cat.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border-2 ${categoriaAtiva === cat.id ? 'bg-white border-blue-500 text-blue-600 shadow-sm' : 'bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200'}`}>
                {cat.icon} {cat.id}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {categoriaAtiva === 'Visão Geral' ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                 {/* CABEÇALHO ATUALIZADO COM O BOTÃO DE COPIAR */}
                 <div className="bg-slate-800 p-4 text-white font-bold text-sm uppercase tracking-wider flex justify-between items-center">
                   <span>Plantão Consolidado</span>
                   <div className="flex items-center gap-4">
                     <span className="text-blue-400">{formatarDataBR(dataSelecionada)}</span>
                     <button 
                       onClick={gerarTextoChecklist} 
                       className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors text-xs shadow-sm cursor-pointer"
                       title="Copiar Checklist de Profissionais para o WhatsApp"
                     >
                       <ClipboardCopy size={16} /> Checklist de Profissionais
                     </button>
                   </div>
                 </div>
                 <div className="p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categorias.filter(c => c.id !== 'Visão Geral').map(cat => {
                      // 1. Pega os profissionais crus
                      const profissionaisRaw = consolidadoDia[cat.id] || [];
                      
                      // 2. O FILTRO DECODIFICADOR (Limpa os dados para a tela principal)
                      let profissionaisAtivos = [];
                      
                      profissionaisRaw.forEach(p => {
                        let strNome = p.nome || "";
                        let siglaBase = p.sigla || "";
                        
                        if (strNome.includes('[EXTRA]')) {
                          profissionaisAtivos.push({ ...p, nome: strNome.replace('[EXTRA]', '').trim() });
                        } else if (strNome.includes(' / ')) {
                          let partes = strNome.split(' / ');
                          partes.forEach((parte, index) => {
                            let match = parte.match(/(.+?)\s*\((D|N)\)/);
                            if (match) {
                              let nomeExt = match[1].trim();
                              let siglaExt = match[2];
                              if (!nomeExt.includes('[FALTOU]') && !nomeExt.includes('[ATESTADO]')) {
                                profissionaisAtivos.push({ ...p, id: `${p.id}_${index}`, nome: nomeExt, sigla: siglaExt });
                              }
                            }
                          });
                        } else if (strNome.includes('(Cobrindo:')) {
                          let match = strNome.match(/(.+?)\s*\(Cobrindo:/);
                          if (match) {
                            profissionaisAtivos.push({ ...p, nome: match[1].trim() });
                          }
                        } else if (strNome.includes('[FALTOU]') || strNome.includes('[ATESTADO]')) {
                          // Oculta do painel consolidado (Escala Descoberta)
                        } else {
                          profissionaisAtivos.push({ ...p, nome: strNome.trim() });
                        }
                      });

                      return (
                        <div key={cat.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex flex-col hover:shadow-md transition-shadow">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 flex justify-between items-center">
                            {cat.id} 
                            {profissionaisAtivos.length > 0 && (
                              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                {profissionaisAtivos.length}
                              </span>
                            )}
                          </h4>
                          <div className="space-y-2 flex-grow">
                            {profissionaisAtivos.length === 0 ? (
                              <div className="text-[10px] text-red-400 font-bold italic py-2 bg-red-50 p-2 rounded border border-red-100">
                                Nenhum profissional ativo / Escala Descoberta
                              </div>
                            ) : (
                              profissionaisAtivos.sort((a,b) => (a.sigla === 'V' ? -1 : 1)).map(p => {
                                let corBarra = "border-blue-500";
                                let corFundoSigla = "bg-slate-100";
                                let corTextoSigla = "text-slate-500";

                                if (p.sigla === 'V') { 
                                  corBarra = "border-emerald-500"; corFundoSigla = "bg-emerald-100"; corTextoSigla = "text-emerald-700";
                                } else if (p.sigla === 'N') { 
                                  corBarra = "border-indigo-500"; corFundoSigla = "bg-indigo-100"; corTextoSigla = "text-indigo-700";
                                }

                                return (
                                  <div key={p.id} className={`bg-white p-2 rounded shadow-sm border-l-4 ${corBarra} flex justify-between items-center`}>
                                    <div className="text-xs font-bold text-slate-700 truncate pr-2" title={p.nome}>{p.nome}</div>
                                    <div className={`text-[9px] font-black px-1.5 py-0.5 rounded ${corFundoSigla} ${corTextoSigla}`}>
                                      {p.sigla}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                 </div>
              </div>
            ) : modoVisao === 'dia' ? (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  
                  {/* CABEÇALHO DA SEÇÃO DE ESCALA COM BOTÃO DE EXTRA */}
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 flex justify-between items-center">
                      Escala de {categoriaAtiva} <span className="ml-2 text-xs text-slate-400 font-normal">Dia {dataSelecionada.split('-')[2]}</span>
                    </h3>
                    <button 
                      onClick={() => setIsExtraModalOpen(true)}
                      className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-200 transition-colors flex items-center gap-1"
                    >
                      + Adicionar Extra
                    </button>
                  </div>

                  <div className="space-y-4">
                    {isLoadingPlantoes && <div className="p-8 text-center text-slate-400 font-bold animate-pulse bg-slate-50 rounded-xl border border-dashed border-slate-200"><Loader2 className="animate-spin inline mr-2" size={20} /> A carregar a escala da base de dados...</div>}
                    {!isLoadingPlantoes && plantoesDoDia.length === 0 && <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">Nenhum profissional escalado para este dia nesta categoria.</div>}
                    {!isLoadingPlantoes && plantoesDoDia.map((plantao) => {
                      let corBg = 'bg-slate-50'; let corBorder = 'border-slate-100'; let corText = 'text-slate-600';
                      
                      // Ajuste de cores baseado na sigla ou se for EXTRA/FALTA/ATESTADO
                      if (plantao.nome.includes('[FALTOU]')) { corBg = 'bg-red-50'; corBorder = 'border-red-200'; corText = 'text-red-600'; }
                      else if (plantao.nome.includes('[ATESTADO]')) { corBg = 'bg-orange-50'; corBorder = 'border-orange-200'; corText = 'text-orange-600'; }
                      else if (plantao.nome.includes('[EXTRA]') || plantao.sigla === 'V') { corBg = 'bg-emerald-50'; corBorder = 'border-emerald-100'; corText = 'text-emerald-600'; }
                      else if (plantao.sigla === 'N') { corBg = 'bg-indigo-50'; corBorder = 'border-indigo-100'; corText = 'text-indigo-600'; }
                      else if (plantao.sigla?.includes('D') || plantao.sigla?.includes('M') || plantao.sigla?.includes('T')) { corBg = 'bg-blue-50'; corBorder = 'border-blue-100'; corText = 'text-blue-600'; }

                      return (
                        <div key={plantao.id} className={`p-4 ${corBg} border ${corBorder} rounded-xl relative group`}>
                          <span className={`text-[10px] font-bold ${corText} uppercase`}>{plantao.turno} ({plantao.horario})</span>
                          <div className="text-lg font-black text-slate-800 mt-1">{plantao.nome}</div>
                          <button onClick={() => abrirModalTroca(plantao.id, `${plantao.turno} (${plantao.horario})`, plantao.nome)} className={`absolute top-4 right-4 z-20 p-2 bg-white/50 hover:bg-white rounded-lg shadow-sm ${corText} transition-all cursor-pointer border ${corBorder}`} title="Gerenciar Plantonista">
                            <Settings size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* COLUNA DIREITA: Importador e Exportador */}
                <div className="flex flex-col gap-6">
                  <ImportadorEscala categoria={categoriaAtiva} />
                  
                  {/* ==========================================
                      BOTÃO DE AUDITORIA: ESCALA EXECUTADA E RELATÓRIO
                      ========================================== */}
                  <div className="bg-slate-800 p-6 rounded-2xl shadow-sm text-white flex flex-col justify-center border border-slate-700 relative overflow-hidden">
                    {/* Elemento visual de fundo */}
                    <div className="absolute -right-4 -top-4 opacity-10">
                      <FileDown size={100} />
                    </div>
                    
                    <h3 className="font-bold text-lg flex items-center gap-2 mb-2 relative z-10">
                      <FileDown className="text-emerald-400" size={20} /> Fechamento de Escala
                    </h3>
                    <p className="text-xs text-slate-300 mb-5 relative z-10">
                      Gere a planilha final de auditoria com os plantões reais executados e veja o dossiê de alterações.
                    </p>
                    
                    <div className="flex flex-col gap-3 relative z-10">
                      <button 
                        onClick={() => exportarEscalaExecutada(
                          dataSelecionada.split('-')[1], 
                          dataSelecionada.split('-')[0]
                        )}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-md flex justify-center items-center gap-2"
                      >
                        Baixar Escala Executada ({dataSelecionada.split('-')[1]}/{dataSelecionada.split('-')[0]})
                      </button>

                      <button 
                        onClick={abrirRelatorioMudancas}
                        className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 font-bold py-2.5 px-4 rounded-xl transition-colors shadow-sm flex justify-center items-center gap-2 text-sm"
                      >
                        <ClipboardList size={16} /> Relatório de Mudanças e Faltas
                      </button>
                    </div>
                  </div>
                </div>
                
              </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="font-bold text-slate-800">Grade Mensal - {categoriaAtiva}</h3>
                   <div className="flex items-center gap-2">
                     <span className="text-xs font-bold text-slate-500 uppercase">Mês de Referência:</span>
                     <input type="month" value={dataSelecionada.substring(0, 7)} onChange={(e) => setDataSelecionada(e.target.value + "-01")} className="p-2 border border-slate-200 bg-slate-50 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-blue-500" />
                   </div>
                 </div>

                 <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="p-2 border border-slate-200 font-bold text-slate-500 text-left">Profissional</th>
                        {[...Array(31)].map((_, i) => <th key={i} className="p-1 border border-slate-200 font-bold text-slate-500 text-center w-8">{(i + 1).toString().padStart(2, '0')}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingMes && <tr><td colSpan="32" className="p-8 text-center text-slate-400 font-bold animate-pulse">A carregar e compilar o mês completo...</td></tr>}
                      {!isLoadingMes && Object.keys(plantoesDoMes).length === 0 && <tr><td colSpan="32" className="p-8 text-center text-slate-400">Nenhum plantão processado para {dataSelecionada.substring(0,7)}.</td></tr>}
                      
                      {!isLoadingMes && Object.entries(plantoesDoMes).map(([nome, dias]) => (
                        <tr key={nome} className="hover:bg-slate-50 border-b border-slate-100 transition-colors">
                          <td className="p-2 border-r border-slate-200 font-bold text-slate-700 whitespace-nowrap text-[10px] uppercase">{nome}</td>
                          {[...Array(31)].map((_, i) => {
                            const diaStr = (i + 1).toString().padStart(2, '0');
                            const sigla = dias[diaStr]; 
                            let corLetra = 'text-slate-300'; let corFundo = '';
                            
                            if (sigla) {
                              if (sigla.includes('V')) { corLetra = 'text-emerald-700'; corFundo = 'bg-emerald-50'; } 
                              else if (sigla.includes('N')) { corLetra = 'text-indigo-700'; corFundo = 'bg-indigo-50'; } 
                              else if (sigla.includes('D') || sigla.includes('M') || sigla.includes('T')) { corLetra = 'text-blue-700'; corFundo = 'bg-blue-50'; } 
                              else { corLetra = 'text-slate-700'; corFundo = 'bg-slate-50'; }
                            }
                            
                            return (
                              <td key={i} className={`p-1 border-r border-slate-200 text-center font-black ${corLetra} ${corFundo}`}>
                                {sigla || '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                 </table>
                 <p className="text-right text-[10px] text-slate-400 mt-4 font-bold uppercase">
                   Total de {Object.keys(plantoesDoMes).length} profissionais com plantões ativos em {dataSelecionada.substring(0,7)}
                 </p>
              </div>
            )}
          </div>

          {/* ============================================== */}
          {/* 1. MODAL DE EDIÇÃO / FALTAS / ATESTADOS          */}
          {/* ============================================== */}
          {isEditModalOpen && plantaoEditado && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
                <div className="bg-slate-800 p-5 flex justify-between items-center text-white">
                  <div><h3 className="font-black text-lg">Gerenciar Plantão</h3><p className="text-slate-300 text-xs">Substituição e Ocorrências</p></div>
                  <button onClick={() => setIsEditModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors text-white font-bold">FECHAR</button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div><div className="text-xs font-bold text-slate-400 uppercase">Turno / Plantonista Atual</div><div className="font-bold text-slate-700">{plantaoEditado.turno} - {plantaoEditado.nomeAtual}</div></div>
                  
                  {/* BOTÕES DE OCORRÊNCIA MÉDICA */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-sm font-bold text-blue-600 mb-2">O que ocorreu?</label>
                    <div className="flex gap-2">
                      <button onClick={() => setStatusPlantonista('Normal')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${statusPlantonista === 'Normal' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-300'}`}>Troca</button>
                      <button onClick={() => setStatusPlantonista('Atestado')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${statusPlantonista === 'Atestado' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-500 border-slate-300'}`}>Atestado</button>
                      <button onClick={() => setStatusPlantonista('Falta')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${statusPlantonista === 'Falta' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-500 border-slate-300'}`}>Falta</button>
                    </div>
                  </div>

                  {/* LÓGICA DE DESMEMBRAMENTO (Só aparece se for DN e se NÃO for falta) */}
                  {(plantaoEditado.turno === 'DN' || plantaoEditado.turno?.toUpperCase().includes('24H')) && statusPlantonista !== 'Falta' && (
                    <div className="pt-2 border-t border-slate-100 animate-fadeIn">
                      <label className="block text-sm font-bold text-blue-600 mb-2">Qual período?</label>
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors"><input type="radio" value="Total" checked={tipoTrocaPlantao === 'Total'} onChange={(e) => setTipoTrocaPlantao(e.target.value)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" /> Plantão Completo</label>
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors"><input type="radio" value="Dia" checked={tipoTrocaPlantao === 'Dia'} onChange={(e) => setTipoTrocaPlantao(e.target.value)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" /> Somente Dia (D)</label>
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors"><input type="radio" value="Noite" checked={tipoTrocaPlantao === 'Noite'} onChange={(e) => setTipoTrocaPlantao(e.target.value)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" /> Somente Noite (N)</label>
                      </div>
                    </div>
                  )}

                  {/* SELETOR DINÂMICO DE PROFISSIONAL (SÓ APARECE NA TROCA NORMAL) */}
                  {statusPlantonista === 'Normal' && (
                    <div className="pt-2 border-t border-slate-100 animate-fadeIn">
                      <label className="block text-sm font-bold text-blue-600 mb-1">
                        Novo Plantonista Assumindo:
                      </label>
                      <select 
                        value={novoPlantonista} 
                        onChange={(e) => setNovoPlantonista(e.target.value)} 
                        className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 font-bold"
                      >
                        <option value="">Selecione o profissional...</option>
                        
                        {listaProfissionais
                          .filter(prof => prof.categoria === categoriaAtiva)
                          .map((prof) => (
                            <option key={prof.id} value={prof.nome}>
                              {prof.nome}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                  <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Cancelar</button>
                  <button onClick={salvarTrocaPlantao} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">Confirmar Alteração</button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================== */}
          {/* 2. NOVO: MODAL DE PLANTONISTA EXTRA              */}
          {/* ============================================== */}
          {isExtraModalOpen && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-fadeIn">
                <div className="bg-emerald-600 p-5 flex justify-between items-center text-white">
                  <div><h3 className="font-black text-lg">Adicionar Extra</h3><p className="text-emerald-100 text-xs">Reforço para a UTI</p></div>
                  <button onClick={() => setIsExtraModalOpen(false)} className="hover:bg-black/20 p-2 rounded-full transition-colors text-white font-bold">FECHAR</button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-emerald-700 mb-2">Turno do Reforço:</label>
                    <select value={extraTurno} onChange={(e) => setExtraTurno(e.target.value)} className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700">
                      <option value="DN">DN (24 Horas)</option>
                      <option value="D">D (Somente Dia)</option>
                      <option value="N">N (Somente Noite)</option>
                    </select>
                  </div>
                  <div>
                    {/* Label dinâmica baseada na categoria ativa */}
                    <label className="block text-sm font-bold text-emerald-700 mb-2">
                      Nome do {categoriaAtiva} Extra:
                    </label>
                    <select 
                      value={extraNome} 
                      onChange={(e) => setExtraNome(e.target.value)} 
                      className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 font-bold"
                    >
                      <option value="">Selecione o reforço...</option>
                      
                      {/* 🔥 Filtra a lista geral pela categoria que o gestor está visualizando */}
                      {listaProfissionais
                        .filter(prof => prof.categoria === categoriaAtiva)
                        .map((med) => (
                          <option key={med.id} value={med.nome}>{med.nome}</option>
                        ))
                      }
                    </select>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                  <button onClick={() => setIsExtraModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Cancelar</button>
                  <button onClick={adicionarPlantonistaExtra} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">Incluir Extra</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (subViewEquipe === 'config') {
      return (
        <div className="animate-fadeIn pb-8">
          {/* CABEÇALHO */}
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setSubViewEquipe('menu')} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-slate-700" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Settings className="text-slate-600" /> Espelho Físico da Unidade
              </h2>
              <p className="text-slate-500 text-sm mt-1">Gere os leitos da UTI e defina regras de bloqueio ou pacientes moradores.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* COLUNA ESQUERDA: GERAÇÃO DE LEITOS */}
            <div className="md:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Bed className="text-emerald-500" size={20} /> Dimensionamento
                </h3>
                <label className="block text-sm font-bold text-slate-700 mb-2">Capacidade Total (Leitos)</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    value={capacidadeInput} 
                    onChange={(e) => setCapacidadeInput(Number(e.target.value))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-black text-lg text-slate-800 text-center" 
                  />
                </div>
                <button 
                  onClick={salvarConfiguracaoLeitos} 
                  disabled={isSavingConfig}
                  className="w-full mt-4 bg-slate-800 hover:bg-slate-900 text-white p-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {isSavingConfig ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {isSavingConfig ? "A Sincronizar..." : "Gerar / Atualizar Leitos"}
                </button>
                <p className="text-[10px] text-slate-500 mt-4 leading-relaxed italic">
                  * O sistema apenas adiciona leitos faltantes. Se reduzir a capacidade, os leitos existentes não são deletados para proteger os prontuários; utilize o botão "Bloqueado" para inativá-los.
                </p>
              </div>
            </div>

            {/* COLUNA DIREITA: GRID DE LEITOS */}
            <div className="md:col-span-2">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[400px]">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 mb-6">
                  <Settings className="text-blue-500" size={20} /> Gestão Individual de Leitos
                </h3>
                
                {/* RESUMO RÁPIDO DO ESPELHO */}
                {leitosConfig.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="bg-white px-3 py-1.5 rounded shadow-sm border border-slate-200 text-xs font-bold text-slate-700">
                      Total Físico: <span className="text-blue-600">{leitosConfig.length}</span>
                    </div>
                    <div className="bg-white px-3 py-1.5 rounded shadow-sm border border-emerald-100 text-xs font-bold text-emerald-700">
                      Operacionais: {leitosConfig.filter(l => !l.bloqueado).length}
                    </div>
                    <div className="bg-white px-3 py-1.5 rounded shadow-sm border border-red-100 text-xs font-bold text-red-700">
                      Bloqueados: {leitosConfig.filter(l => l.bloqueado).length}
                    </div>
                    <div className="bg-white px-3 py-1.5 rounded shadow-sm border border-purple-100 text-xs font-bold text-purple-700">
                      Isolamentos: {leitosConfig.filter(l => l.isIsolamento).length}
                    </div>
                    <div className="bg-white px-3 py-1.5 rounded shadow-sm border border-amber-100 text-xs font-bold text-amber-700">
                      Moradores: {leitosConfig.filter(l => l.ignorarEstatistica).length}
                    </div>
                  </div>
                )}
                {leitosConfig.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400 italic">
                    Nenhum leito gerado. Defina a capacidade ao lado.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {leitosConfig.map(leito => (
                      <div key={leito.id} className={`p-4 rounded-xl border flex flex-col gap-3 transition-colors ${leito.bloqueado ? 'bg-slate-100 border-slate-200 opacity-75' : leito.ignorarEstatistica ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-800 flex items-center gap-2">
                              <Bed size={16} className={leito.bloqueado ? 'text-slate-400' : 'text-blue-500'} /> {leito.nome}
                            </h4>
                            {/* Badge Visual de Isolamento */}
                            {leito.isIsolamento && (
                              <span className="bg-purple-100 text-purple-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Isolamento</span>
                            )}
                          </div>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${leito.status === 'Livre' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {leito.status}
                          </span>
                        </div>

                        <div className="space-y-2 mt-2 pt-2 border-t border-slate-100/50">
                          {/* TOGGLE 1: ISOLAMENTO (NOVO) */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-600">Leito de Isolamento</span>
                            <button 
                              onClick={() => toggleLeitoConfig(leito.id, 'isIsolamento', leito.isIsolamento)}
                              className={`w-10 h-5 rounded-full relative transition-colors ${leito.isIsolamento ? 'bg-purple-600' : 'bg-slate-300'}`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${leito.isIsolamento ? 'translate-x-5' : 'translate-x-1'}`}></div>
                            </button>
                          </div>

                          {/* TOGGLE 2: BLOQUEADO */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-600">Leito Bloqueado (Manutenção)</span>
                            <button 
                              onClick={() => toggleLeitoConfig(leito.id, 'bloqueado', leito.bloqueado)}
                              className={`w-10 h-5 rounded-full relative transition-colors ${leito.bloqueado ? 'bg-red-500' : 'bg-slate-300'}`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${leito.bloqueado ? 'translate-x-5' : 'translate-x-1'}`}></div>
                            </button>
                          </div>

                          {/* TOGGLE 3: MORADOR */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-600">Morador (Ignora Estatísticas)</span>
                            <button 
                              onClick={() => toggleLeitoConfig(leito.id, 'ignorarEstatistica', leito.ignorarEstatistica)}
                              className={`w-10 h-5 rounded-full relative transition-colors ${leito.ignorarEstatistica ? 'bg-amber-500' : 'bg-slate-300'}`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${leito.ignorarEstatistica ? 'translate-x-5' : 'translate-x-1'}`}></div>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      );
    }
  };

  // ==========================================
  // RENDERIZAÇÃO PRINCIPAL DO COMPONENTE
  // ==========================================
  return (
    <div className="p-4 md:p-8 min-h-screen bg-slate-50">
      {activeView === 'hub' && renderHub()}
      {activeView === 'indicadores' && renderIndicadores()}
      {activeView === 'tendencias' && renderTendencias()}
      {activeView === 'epidemiologia' && renderEpidemiologia()}
      {activeView === 'qualidade' && renderQualidade()}
      {activeView === 'auditoria' && renderGestaoRisco()} 
      {activeView === 'equipe' && renderEquipe()}

      {/* ==========================================
          MODAL GLOBAL: RELATÓRIO DE MUDANÇAS DE ESCALA
          ========================================== */}
      {isModalRelatorioOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header do Modal */}
            <div className="bg-slate-800 p-6 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <ClipboardList className="text-emerald-400" />
                  Dossiê de Auditoria de RH
                </h3>
                <p className="text-slate-300 text-sm mt-1">
                  Rastreabilidade de trocas, atestados e faltas da UTI
                </p>
              </div>
              <button 
                onClick={() => setIsModalRelatorioOpen(false)}
                className="text-slate-300 hover:text-white transition-colors p-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* 🚨 NOVA BARRA DE FILTROS */}
            <div className="bg-slate-100 p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex flex-col w-full sm:w-auto">
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">Mês de Referência</label>
                  <input 
                    type="month" 
                    value={filtroMesRelatorio} 
                    onChange={(e) => {
                      const novoMes = e.target.value;
                      setFiltroMesRelatorio(novoMes);
                      buscarDadosRelatorio(novoMes); // Busca no banco novamente ao trocar o mês
                    }} 
                    className="p-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-blue-500 bg-white"
                  />
                </div>

                <div className="flex flex-col w-full sm:w-auto">
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">Classe Profissional</label>
                  <select 
                    value={filtroCategoriaRelatorio} 
                    onChange={(e) => setFiltroCategoriaRelatorio(e.target.value)}
                    className="p-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="Todas">Todas as Classes</option>
                    <option value="Médico">Médicos</option>
                    <option value="Enfermeiro">Enfermeiros</option>
                    <option value="Téc. Enfermagem">Técnicos de Enfermagem</option>
                    <option value="Téc. Hemodiálise">Técnicos de Hemodiálise</option>
                    <option value="Fisioterapeuta">Fisioterapeutas</option>
                    <option value="Fonoaudiólogo">Fonoaudiólogos</option>
                    <option value="Nutricionista">Nutricionistas</option>
                    <option value="Recepção">Recepção</option>
                    <option value="Psicólogo">Psicólogos</option>
                  </select>
                </div>
              </div>
              
              {/* Contador dinâmico */}
              <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm text-sm font-bold text-slate-600">
                Total Registrado: <span className="text-blue-600">{
                  relatorioMudancas.filter(item => filtroCategoriaRelatorio === "Todas" || item.categoria === filtroCategoriaRelatorio).length
                }</span>
              </div>
            </div>

            {/* Corpo do Modal (Lista) */}
            <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
              {isLoadingRelatorio ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-4"></div>
                  <p className="font-bold">A compilar registros de RH...</p>
                </div>
              ) : relatorioMudancas.filter(item => filtroCategoriaRelatorio === "Todas" || item.categoria === filtroCategoriaRelatorio).length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-emerald-100 text-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ClipboardList size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-slate-700">Nenhuma alteração encontrada</h4>
                  <p className="text-slate-500 text-sm mt-1">Nenhum registro bate com os filtros selecionados.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* 🚨 APLICA O FILTRO DE CATEGORIA AQUI NO MAP */}
                  {relatorioMudancas
                    .filter(item => filtroCategoriaRelatorio === "Todas" || item.categoria === filtroCategoriaRelatorio)
                    .map((item, idx) => {
                    let corBorda = "border-slate-200";
                    let corTexto = "text-slate-700";
                    let tag = "Alteração";

                    const nomeFinal = item.nome || "";
                    const alteracao = item.statusAlteracao || "";
                    const tipoPlantao = item.tipo || ""; // 🚨 LÊ O TIPO PARA O VISUAL TAMBÉM

                    if (alteracao === 'Falta' || nomeFinal.includes('[FALTOU]')) {
                      corBorda = "border-red-200 bg-red-50"; corTexto = "text-red-700"; tag = "Falta Não Justificada";
                    } else if (alteracao === 'Atestado' || nomeFinal.includes('[ATESTADO]')) {
                      corBorda = "border-amber-200 bg-amber-50"; corTexto = "text-amber-700"; tag = "Atestado Médico";
                    } else if (tipoPlantao === 'plantao_extra' || alteracao === 'Extra' || nomeFinal.includes('[EXTRA]')) { // 🚨 ATUALIZADO AQUI
                      corBorda = "border-emerald-200 bg-emerald-50"; corTexto = "text-emerald-700"; tag = "Plantão Extra";
                    } else {
                      corBorda = "border-blue-200 bg-blue-50"; corTexto = "text-blue-700"; tag = "Troca de Plantão";
                    }

                    return (
                      <div key={idx} className={`p-4 rounded-xl border ${corBorda} flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white shadow-sm hover:shadow-md transition-shadow`}>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${corBorda} ${corTexto}`}>
                              {tag}
                            </span>
                            <span className="text-xs font-bold text-slate-500">{item.data.split('-').reverse().join('/')} - {item.turno}</span>
                          </div>
                          <p className="font-bold text-slate-800 uppercase">{item.nome.replace('[FALTOU]', '').replace('[EXTRA]', '')}</p>
                          
                          {item.statusAlteracao === 'Normal' && item.nomeOriginal && item.nomeOriginal !== item.nome && (
                            <p className="text-[10px] font-bold text-blue-600/80 mt-0.5 flex items-center gap-1">
                              ⮑ Substituiu: {item.nomeOriginal.replace(/\[FALTOU\]/g, '').replace(/\[ATESTADO\]/g, '')}
                            </p>
                          )}

                          <p className="text-xs font-medium text-slate-500 mt-1">
                            {item.categoria} • {item.horario}
                          </p>
                        </div>
                        {item.observacao && (
                          <div className="md:max-w-[40%] bg-slate-50 p-2.5 rounded border border-slate-100 text-xs text-slate-600 italic">
                            "{item.observacao}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

              {/* Modal de Relatório */}
              {modalRelatorioAberto && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-slideUp">
                    <div className="p-4 bg-slate-800 text-white flex justify-between items-center shrink-0">
                      <h2 className="font-bold flex items-center gap-2"><FileText size={20}/> Pré-visualização do Relatório ANVISA</h2>
                      <div className="flex gap-2">
                        <button onClick={() => window.print()} className="bg-emerald-600 px-4 py-2 rounded text-sm font-bold">Imprimir / Salvar PDF</button>
                        <button onClick={() => setModalRelatorioAberto(false)} className="bg-red-600 px-4 py-2 rounded text-sm font-bold">Fechar</button>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-auto bg-slate-100 p-8">
                      <RelatorioANVISA 
                          db={db} 
                          mesAno={mesRelatorioSelecao} 
                          leitosConfig={leitosConfig} 
                      />
                    </div>
                  </div>
                </div>
              )}

      {/* MODAL DE HISTÓRICO DE ESCALAS DIÁRIAS (BUSCANDO DO FIREBASE) */}
      {modalHistorico.isOpen && modalHistorico.paciente && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-fade-in">
            
            <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <HistoryIcon size={24} />
                <h2 className="text-lg font-black tracking-wide">
                  Histórico Diário - Escala de {modalHistorico.tipo}
                </h2>
              </div>
              <button onClick={() => setModalHistorico({ isOpen: false, tipo: '', paciente: null })} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-50">
              <div className="mb-4">
                <p className="text-sm font-bold text-slate-500 uppercase">Paciente</p>
                <p className="text-lg font-black text-slate-800">{modalHistorico.paciente.nome}</p>
              </div>

              {loadingHistorico ? (
                <div className="text-center p-12 text-slate-500 font-medium flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-indigo-600 mb-4"></div>
                  Buscando histórico no banco de dados...
                </div>
              ) : historicoData.length > 0 ? (
                <div className="space-y-3">
                  {historicoData.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-lg font-bold text-sm">
                          {/* Exibe a data e a hora exata que foi salvo no Firebase */}
                          {item.dataRegistro?.toDate().toLocaleDateString('pt-BR')} às {item.dataRegistro?.toDate().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-bold uppercase">Risco</p>
                          <p className="text-sm font-black text-slate-800">{item.risco}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 font-bold uppercase">Pontuação</p>
                        <p className="text-2xl font-black text-indigo-600">{item.valor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 bg-white rounded-xl border border-slate-200">
                  <p className="text-slate-500 font-medium">Nenhum histórico diário registrado para este paciente ainda.</p>
                  <p className="text-xs text-slate-400 mt-2">As avaliações aparecerão aqui conforme a enfermagem preencher o checklist diário.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GestorDashboard;