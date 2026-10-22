import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

// 🗂️ MAPA DE CATEGORIA → SLUG (evita acento/pontuação no caminho do Firestore)
const CATEGORIA_SLUGS = {
  'Médico': 'medico',
  'Médico Plantonista': 'medico',
  'Enfermeiro': 'enfermeiro',
  'Téc. Enfermagem': 'tec-enfermagem',
  'Téc. Hemodiálise': 'tec-hemodialise',
  'Fisioterapeuta': 'fisioterapeuta',
  'Fonoaudiólogo': 'fonoaudiologo',
  'Nutricionista': 'nutricionista',
  'Psicólogo': 'psicologo',
  'Motorista': 'motorista',
  'Recepção': 'recepcao',
  'Central de Nutrição': 'central-nutricao',
  'Administrativo': 'administrativo',
  'Farmácia': 'farmacia',
};

// Fallback seguro: normaliza qualquer nome desconhecido
const getSlug = (categoria) => {
  if (CATEGORIA_SLUGS[categoria]) return CATEGORIA_SLUGS[categoria];
  return String(categoria || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'outros';
};

// ======================================================
// 🆕 EXTRAÇÃO DE VISITADOR E RESPONSÁVEL TÉCNICO
// Estrutura exclusiva da escala médica: linha-marca mesclada na
// coluna A ("Visitador" / "Responsável Técnico") seguida da linha
// com o nome na coluna A e as marcas V/T nas colunas de dias.
// Não depende de números de linha fixos. Devolve também as linhas
// que o loop principal deve PULAR (para não virarem plantões regulares).
// ======================================================
const extrairVisitadorRT = (data, colunasDias, colMatricula = -1) => {
  const resultado = { visitador: null, responsavelTecnico: null };
  const linhasParaPular = new Set();
  for (let i = 0; i < data.length - 1; i++) {
    // Varre as 3 primeiras colunas (célula mesclada pode guardar o texto em B ou C)
    const celulas = [data[i]?.[0], data[i]?.[1], data[i]?.[2]]
      .map(c => String(c ?? '').trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase());
    let campo = null;
    if (celulas.some(c => c === 'VISITADOR')) campo = 'visitador';
    // 🆕 "RT DA FISIOTERAPIA" (e futuros "RT DA <área>") entram como Responsável Técnico
    else if (celulas.some(c => c === 'RESPONSAVEL TECNICO' || c.includes('RT DA'))) campo = 'responsavelTecnico';
    if (!campo) continue;

    const linhaDados = data[i + 1] || [];
    const nome = String(linhaDados[0] ?? '').trim();
    if (!nome) continue;

    // 🆕 Anexa a matrícula (mesma coluna detectada para os regulares) —
    // assim o nome do Visitador/RT casa com a linha regular do mesmo contrato
    const matricula = colMatricula >= 0 ? String(linhaDados[colMatricula] ?? '').trim() : '';
    const nomeFinal = matricula ? `${nome} ${matricula}` : nome;

    const dias = {};
    Object.entries(colunasDias).forEach(([colIndex, diaStr]) => {
      const val = String(linhaDados[Number(colIndex)] ?? '').trim().toUpperCase();
      if (val) dias[diaStr] = val;
    });

    resultado[campo] = { nome: nomeFinal.toUpperCase(), dias };
    linhasParaPular.add(i);     // linha-marca (célula mesclada — não é servidor)
    linhasParaPular.add(i + 1); // linha de dados — vira tabela própria, não regular
  }
  return { ...resultado, linhasParaPular };
};

// Normaliza o nome para busca (sem acento, sem espaço, maiúsculas)
const normalizarBusca = (nome) => {
  return String(nome || '')
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');
};

const ImportadorEscala = ({ categoria = "Médico Plantonista" }) => {
  const [file, setFile] = useState(null);
  const [mes, setMes] = useState("");
  const [ano, setAno] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [status, setStatus] = useState("idle");
  const [categoriasPorAba, setCategoriasPorAba] = useState({});
  const [especiaisPreview, setEspeciaisPreview] = useState(null); // 🆕 Visitador/RT extraídos da planilha

  // ===== DICIONÁRIO DE TURNOS (base + todas as combinações de 2 siglas) =====
  const siglasBase = {
    'D': { nome: 'Plantão Dia',    inicio: '07:00', fim: '19:00', horas: 12, tipo: 'plantonista' },
    'N': { nome: 'Plantão Noite',  inicio: '19:00', fim: '07:00', horas: 12, tipo: 'plantonista' },
    'M': { nome: 'Plantão Manhã',  inicio: '07:00', fim: '13:00', horas: 6,  tipo: 'plantonista' },
    'T': { nome: 'Plantão Tarde',  inicio: '13:00', fim: '19:00', horas: 6,  tipo: 'plantonista' },
    'V': { nome: 'Visita Médica',  inicio: '07:00', fim: '13:00', horas: 6,  tipo: 'visita' },
  };

  const dicionarioTurnos = {
    ...siglasBase,
    'DN': { nome: 'Plantão 24h', inicio: '07:00', fim: '07:00', horas: 24, tipo: 'plantonista' },
  };

  // Gera automaticamente todas as permutações de pares distintos:
  // DV, DT, DM, DN(mantém manual), ND, NM, NT, NV, MD, MN, MT, MV,
  // TD, TN, TM, TV, VD, VN, VM, VT — 20 combinações no total.
  Object.keys(siglasBase).forEach(a => {
    Object.keys(siglasBase).forEach(b => {
      if (a === b) return;
      const chave = a + b;
      if (dicionarioTurnos[chave]) return; // não sobrescreve manuais (ex.: DN)

      // D+N e N+D = dia completo de 24h (mesma semântica do DN)
      if ((a === 'D' && b === 'N') || (a === 'N' && b === 'D')) {
        dicionarioTurnos[chave] = { nome: 'Plantão 24h', inicio: '07:00', fim: '07:00', horas: 24, tipo: 'plantonista' };
        return;
      }

      // Agregação: ordena componentes por hora de início, soma horas,
      // horário = do início mais cedo ao fim mais tarde
      const partes = [siglasBase[a], siglasBase[b]].sort((x, y) => x.inicio.localeCompare(y.inicio));
      dicionarioTurnos[chave] = {
        nome: partes.map(p => p.nome).join(' + '),
        inicio: partes[0].inicio,
        fim: partes[partes.length - 1].fim,
        horas: siglasBase[a].horas + siglasBase[b].horas,
        tipo: (siglasBase[a].tipo === 'visita' && siglasBase[b].tipo === 'visita') ? 'visita' : 'plantonista'
      };
    });
  });

  // 🆕 Extrator genérico de seção "GERÊNCIA DE <área>" — tarja mesclada (A, B ou C)
  // e TODAS as linhas de dados seguintes, até a próxima tarja (EXTRA/REGULAR/LEGENDA
  // ou outra GERÊNCIA). `palavraTarja` = 'ENFERMAGEM' ou 'FARMACIA'.
  const extrairGerenciaSecao = (data, colunasDias, colMatricula = -1, palavraTarja = 'ENFERMAGEM') => {
    for (let i = 0; i < data.length - 1; i++) {
      const celulas = [data[i]?.[0], data[i]?.[1], data[i]?.[2]]
        .map(c => String(c ?? '').trim()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase());
      const ehTarja = celulas.some(c => c.includes('GERENCIA') && c.includes(palavraTarja));
      if (!ehTarja) continue;

      let resultado = null;
      for (let j = i + 1; j < data.length; j++) {
        const linha = data[j] || [];
        const nomeCel = String(linha[0] ?? '').trim();
        if (!nomeCel) continue;
        const nomeU = nomeCel.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
        if (nomeU.includes('LEGENDA') || nomeU.includes('EXTRA') || nomeU.includes('REGULAR')) break;
        // outra tarja de gerência (ex.: farmácia e enfermagem na mesma aba) encerra a seção
        if (nomeU.includes('GERENCIA')) break;

        const matricula = colMatricula >= 0 ? String(linha[colMatricula] ?? '').trim() : '';
        const nomeFinal = matricula ? `${nomeCel} ${matricula}` : nomeCel;
        const dias = {};
        Object.entries(colunasDias).forEach(([colIndex, diaStr]) => {
          const val = String(linha[Number(colIndex)] ?? '').trim().toUpperCase();
          if (val && dicionarioTurnos[val]) dias[diaStr] = val;
        });
        if (Object.keys(dias).length > 0) {
          resultado = { nome: nomeFinal.toUpperCase(), dias, atualizadoEm: new Date().toISOString() };
        }
      }
      return resultado;
    }
    return null;
  };

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStatus("idle");
      setPreviewData([]);
    }
  };

  const processarPlanilha = async () => {
    if (!file) return;
    setIsProcessing(true);
    setStatus("processing");
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const plantoesExtraidos = [];
        const especiaisPorCategoria = {}; // 🆕 Visitador/RT/Gerência POR CATEGORIA — cada aba grava a sua
        let especiaisAcumulados = null; // 🆕 acumula Visitador/RT/Gerência entre as abas (1ª ocorrência vence)
        // 1. Função inteligente para adivinhar a categoria pelo nome da aba do Excel
        // Adivinha a categoria pelo nome da aba — normaliza acentos para bater sempre
        const getCategoriaBySheetName = (sheetName) => {
          const lowerName = String(sheetName || '')
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[_-]/g, ' '); // 🆕 "nov_26_central_nutri" → "nov 26 central nutri"
          // Ordem importa: checks mais específicos primeiro
          if (lowerName.includes('central nutri') || lowerName.includes('central de nutri')) return 'Central de Nutrição';
          if (lowerName.includes('administrativ') || lowerName.includes('adm')) return 'Administrativo';
          if (lowerName.includes('farm')) return 'Farmácia';
          if (lowerName.includes('fisio')) return 'Fisioterapeuta';
          if (lowerName.includes('hemodialise') || lowerName.includes('hemodiálise') || /\bhd\b/.test(lowerName)) return 'Téc. Hemodiálise';
          if (lowerName.includes('motorista')) return 'Motorista';
          if (lowerName.includes('recep')) return 'Recepção';
          if (lowerName.includes('fono')) return 'Fonoaudiólogo';
          if (lowerName.includes('nutri')) return 'Nutricionista';
          if (lowerName.includes('psico')) return 'Psicólogo';
          if (lowerName.includes('tec')) return 'Téc. Enfermagem';
          if (lowerName.includes('enferm')) return 'Enfermeiro';
          if (lowerName.includes('medic') || lowerName.includes('planton')) return 'Médico Plantonista';
          return categoria;
        };
        // 2. O Loop que varre TODAS as abas do arquivo
        wb.SheetNames.forEach(wsname => {
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
            const catAtual = getCategoriaBySheetName(wsname); // Define se é Enf, Téc, HD, Motorista, etc.
            let indexLinhaDias = -1;
            let colunasDias = {}; 
            let lendoNefrologia = false;
            let modoExtra = false; // 🚩 reinicia a cada aba — o marcador EXTRA é por aba
            let marcadorGerencia = false; // 🚩 seção GERÊNCIA DE ENFERMAGEM ativa (por aba)
            let marcadorGerenciaFarmacia = false; // 🚩 seção GERÊNCIA DE FARMÁCIA ativa (por aba)
            let colMatricula = -1; // 🆕 coluna da MATRÍCULA nesta aba (-1 = não existe)
            // Encontrar onde começam os dias
            for (let i = 0; i < data.length; i++) {
              const row = data[i];
              if (row.length > 0 && typeof row[0] === 'string' && row[0].includes("NOME DO SERVIDOR")) {
                indexLinhaDias = i + 1;
                // 🆕 Localiza a coluna de MATRÍCULA: procura o texto no cabeçalho
                // (linha do "NOME DO SERVIDOR") e na linha dos dias — tolerante a acentos
                [row, data[indexLinhaDias] || []].forEach(linhaCabecalho => {
                  linhaCabecalho.forEach((val, colIndex) => {
                    if (colMatricula === -1 && typeof val === 'string' &&
                        val.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('MATRICULA')) {
                      colMatricula = colIndex;
                    }
                  });
                });
                if (colMatricula >= 0) console.log(`[Importador] Aba "${wsname}": matrícula detectada na coluna ${colMatricula}`);
                const linhaDias = data[indexLinhaDias];
                if (linhaDias) {
                  linhaDias.forEach((val, colIndex) => {
                    if (val && !isNaN(parseInt(val))) {
                      colunasDias[colIndex] = String(val).padStart(2, '0');
                    }
                  });
                }
                break;
              }
            }
            // Se não achar, pula para a próxima aba
            if (indexLinhaDias === -1) {
              console.warn(`Aba ignorada: "${wsname}" (Não possui cabeçalho NOME DO SERVIDOR).`);
              return; 
            }
            // 🆕 Visitador e Responsável Técnico (somente abas com estes marcadores exatos)
            const { visitador: visExtraido, responsavelTecnico: rtExtraido, linhasParaPular } =
              extrairVisitadorRT(data, colunasDias, colMatricula);
            // 🆕 Gerência de Enfermagem (somente aba de enfermeiros) — extrator próprio
            // 🆕 Gerências como TABELAS ESPECIAIS: enfermagem (aba de enfermeiros)
            // e farmácia (aba de farmácia) — cada uma em seu campo do doc do mês
            const gerenciaExtraida = (catAtual === 'Enfermeiro')
              ? extrairGerenciaSecao(data, colunasDias, colMatricula, 'ENFERMAGEM')
              : null;
            const gerenciaFarmExtraida = (catAtual === 'Farmácia')
              ? extrairGerenciaSecao(data, colunasDias, colMatricula, 'FARMACIA')
              : null;
            if (gerenciaExtraida) console.log(`[Importador] Aba "${wsname}": gerência enf. =`, gerenciaExtraida);
            if (gerenciaFarmExtraida) console.log(`[Importador] Aba "${wsname}": gerência farm. =`, gerenciaFarmExtraida);
            if (visExtraido || rtExtraido || gerenciaExtraida || gerenciaFarmExtraida) {
              especiaisPorCategoria[catAtual] = {
                anoMes: `${ano}-${String(mes).padStart(2, '0')}`,
                aba: wsname,
                ...(visExtraido ? { visitador: visExtraido } : {}),
                ...(rtExtraido ? { responsavelTecnico: rtExtraido } : {}),
                ...(gerenciaExtraida ? { gerenciaEnfermagem: gerenciaExtraida } : {}),
                ...(gerenciaFarmExtraida ? { gerenciaFarmacia: gerenciaFarmExtraida } : {})
              };
            }
            // Varrer os nomes e extrair as letrinhas
            for (let i = indexLinhaDias + 1; i < data.length; i++) {
              const row = data[i];
              // 🆕 Linhas do Visitador/RT (marca + dados) não são servidores —
              // pulam ANTES de qualquer verificação, inclusive do marcador de extras
              if (linhasParaPular.has(i)) continue;

              // ===== MARCADORES DE SEÇÃO (ordem importa) =====
              // Analisa as 3 primeiras colunas (células mescladas podem começar em B ou C).
              const celulasLinha = [row?.[0], row?.[1], row?.[2]]
                .map(c => String(c ?? '').trim().toUpperCase()
                  .normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
                .filter(c => c.length > 0);
              // 🚩 EXTRAS liga o modo extra e desliga TODAS as seções de gerência
              if (celulasLinha.some(c => c.includes('EXTRA'))) { modoExtra = true; marcadorGerencia = false; marcadorGerenciaFarmacia = false; continue; }
              if (celulasLinha.some(c => c.includes('REGULAR') || c.includes('NORMAL') || c.includes('FIXO'))) { modoExtra = false; marcadorGerencia = false; marcadorGerenciaFarmacia = false; continue; }
              // 🆕 Tarjas de gerência: ativam o modo e NÃO são servidores
              if (catAtual === 'Enfermeiro' && celulasLinha.some(c => c.includes('GERENCIA DE ENFERMAGEM'))) { marcadorGerencia = true; continue; }
              if (catAtual === 'Farmácia' && celulasLinha.some(c => c.includes('GERENCIA') && c.includes('FARMACIA'))) { marcadorGerenciaFarmacia = true; continue; }
              // 🆕 Dentro de qualquer seção de gerência: pula TODAS as linhas — a
              // extração delas é feita pelo extrator próprio
              if (marcadorGerencia) continue;
              if (marcadorGerenciaFarmacia) continue;

              const nomeServidor = row[0];
              if (!nomeServidor) continue; 
              if (typeof nomeServidor === 'string' && nomeServidor.includes("MÉDICO NEFROLOGISTA")) {
                lendoNefrologia = true;
                continue;
              }
              if (typeof nomeServidor === 'string' && nomeServidor.includes("LEGENDA")) break; 
              if (lendoNefrologia) continue; 

              // 🆕 Anexa a matrícula (coluna separada) ao nome do servidor
              // Ex.: "LUCIANO FOGAÇA DIAS" + "108278" → "LUCIANO FOGAÇA DIAS 108278"
              const matricula = colMatricula >= 0 ? String(row[colMatricula] ?? '').trim() : '';
              const nomeLimpo = matricula
                ? `${String(nomeServidor).trim()} ${matricula}`
                : String(nomeServidor).trim();
              Object.keys(colunasDias).forEach(colIndex => {
                const dia = colunasDias[colIndex];
                const siglaTurno = row[colIndex];
                if (siglaTurno && typeof siglaTurno === 'string') {
                  const siglaLimpa = siglaTurno.trim().toUpperCase();
                  if (dicionarioTurnos[siglaLimpa]) {
                    const turnoObj = dicionarioTurnos[siglaLimpa];
                    const dataFormatada = `${ano}-${mes}-${dia}`; 
                    plantoesExtraidos.push({
                      nome: nomeLimpo,
                      aba: wsname,
                      categoria: catAtual,
                      data: dataFormatada,
                      extra: modoExtra, // 🚩 Flag herdada do marcador EXTRA
                      sigla: siglaLimpa,
                      turno: turnoObj.nome,
                      horario: `${turnoObj.inicio} às ${turnoObj.fim}`,
                      tipo: turnoObj.tipo
                    });
                  }
                }
              });
            }
        });
        setEspeciaisPreview(especiaisPorCategoria); // 🆕 especiais POR CATEGORIA para o salvamento   
        if (plantoesExtraidos.length === 0) {
           throw new Error("Nenhum plantão válido foi encontrado no arquivo.");
        }
        setPreviewData(plantoesExtraidos);
        // Inicializa o seletor de categoria com o palpite automático por aba
        const inicial = {};
        [...new Set(plantoesExtraidos.map(p => p.aba))].forEach(a => {
          inicial[a] = getCategoriaBySheetName(a);
        });
        setCategoriasPorAba(inicial);
        setStatus("success");
      } catch (error) {
        console.error("Erro ao ler planilha:", error);
        setStatus("error");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const salvarNoFirebase = async () => {
    if (previewData.length === 0) return;
    setIsProcessing(true); 
    try {
      // 🆕 Agrupa os plantões por (profissão, mês) — 1 documento por mês em vez de 1 por linha
      const porMes = {};    // chave: `${slug}__${anoMes}`
      const seqPorDia = {}; // contador de ordem de exibição por dia

      previewData.forEach(plantao => {
        const nomeSalvo = plantao.extra ? `${plantao.nome} [EXTRA]` : plantao.nome; // 👈 SEMPRE primeiro
        const categoriaFinal = categoriasPorAba[plantao.aba] || plantao.categoria;
        const partesData = String(plantao.data || '').split('-');
        if (partesData.length !== 3) return; // guard: pula linhas sem ano/mês válidos

        const [isAno, isMes, isDia] = partesData;
        const anoMes = `${isAno}-${String(isMes).padStart(2, '0')}`; // 🛡️ mês sempre 2 dígitos (2026-10, não 2026-9)
        const dia = String(isDia).padStart(2, '0');
        const slug = getSlug(categoriaFinal);
        const chave = `${slug}__${anoMes}`;

        if (!porMes[chave]) {
          porMes[chave] = { slug, anoMes, categoria: categoriaFinal, dias: {} }; // 👈 usa a categoria CORRIGIDA no seletor
        }
        const bloco = porMes[chave];
        if (!bloco.dias[dia]) {
          bloco.dias[dia] = {};
          seqPorDia[`${chave}__${dia}`] = 0;
        }
        seqPorDia[`${chave}__${dia}`] += 1;

        // ID estável por (nome + turno + dia): reimportar sobrescreve o mesmo slot, sem duplicar.
        // Usa nomeSalvo → extra cai em slot DISTINTO do regular (ex.: UALASBARCELOSEXTRA_DN).
        const idTurno = `${normalizarBusca(plantao.nome)}${plantao.extra ? '_EX' : ''}_${plantao.sigla}`;

        bloco.dias[dia][idTurno] = {
          id: idTurno,
          seq: seqPorDia[`${chave}__${dia}`],
          uid: "",                     // preenchido depois pelo perfil do usuário (match do login)
          nome: nomeSalvo,             // com sufixo [EXTRA] — decodificado pelo GestorDashboard
          busca: normalizarBusca(plantao.nome), // sem o sufixo — busca permanece limpa
          sigla: plantao.sigla,
          turno: plantao.turno,
          horario: plantao.horario,
          tipo: plantao.tipo,
          categoria: categoriaFinal,
          extra: !!plantao.extra,
          status: "Confirmado",
          observacao: "",              // nº de atestado / motivo de falta, preenchido depois
          data: plantao.data,          // ISO (ex.: 2026-10-05)
          cadastradoEm: new Date().toISOString()
        };
      });

      const blocos = Object.values(porMes);
      if (blocos.length === 0) {
        alert("❌ Nenhum plantão com mês/ano válidos foi encontrado. Selecione Mês e Ano.");
        setStatus("error");
        return;
      }

      const batch = writeBatch(db);
      blocos.forEach(bloco => {
        // 📁 NOVA ESTRUTURA: escalas/{profissao}/meses/{anoMes}
        const mesRef = doc(db, "escalas", bloco.slug, "meses", bloco.anoMes);
        batch.set(mesRef, {
          categoria: bloco.categoria,
          slug: bloco.slug,
          ano: parseInt(bloco.anoMes.split('-')[0], 10),
          mes: parseInt(bloco.anoMes.split('-')[1], 10),
          ultimaAtualizacao: new Date().toISOString(),
          dias: bloco.dias
        }, { merge: true }); // merge preserva dias/editos manuais que já existem
      });

      // 🆕 Grava especiais POR CATEGORIA: cada categoria tem seus próprios Visitador/RT/Gerência,
      // salvos no documento mensal da própria categoria (medico, enfermeiro, fisioterapeuta...).
      // Usa a CHAVE da categoria da extração (não o seletor) — a gerência vai sempre para
      // enfermeiro e o RT da fisio para fisioterapeuta, mesmo se a aba for corrigida no preview.
      Object.entries(especiaisPreview || {}).forEach(([catChave, esp]) => {
        const slugEspecial = getSlug(catChave);
        if (!slugEspecial || slugEspecial === 'outros') return; // guarda: categoria desconhecida
        const payloadEspecial = { ultimaAtualizacao: new Date().toISOString() };
        if (esp.visitador) {
          payloadEspecial.visitador = {
            nome: esp.visitador.nome,
            dias: esp.visitador.dias || {},
            atualizadoEm: new Date().toISOString()
          };
        }
        if (esp.responsavelTecnico) {
          payloadEspecial.responsavelTecnico = {
            nome: esp.responsavelTecnico.nome,
            dias: esp.responsavelTecnico.dias || {},
            atualizadoEm: new Date().toISOString()
          };
        }
        if (esp.gerenciaEnfermagem) {
          payloadEspecial.gerenciaEnfermagem = {
            nome: esp.gerenciaEnfermagem.nome,
            dias: esp.gerenciaEnfermagem.dias || {},
            atualizadoEm: new Date().toISOString()
          };
        }
        // 🆕 Gerência de Farmácia
        if (esp.gerenciaFarmacia) {
          payloadEspecial.gerenciaFarmacia = {
            nome: esp.gerenciaFarmacia.nome,
            dias: esp.gerenciaFarmacia.dias || {},
            atualizadoEm: new Date().toISOString()
          };
        }
        const mesRefEspecial = doc(db, "escalas", slugEspecial, "meses", esp.anoMes);
        batch.set(mesRefEspecial, payloadEspecial, { merge: true });
      });

      await batch.commit();
      alert(`✅ SUCESSO! ${previewData.length} plantões organizados em ${blocos.length} documento(s) mensal(is).`);
      setStatus("idle");
      setPreviewData([]);
      setFile(null);
    } catch (error) {
      console.error("Erro grave ao gravar na base de dados:", error);
      alert("❌ Ocorreu um erro ao gravar. Verifique o console.");
      setStatus("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatarDataBR = (dataISO) => {
    const [a, m, d] = String(dataISO || '').split('-');
    return (a && m && d) ? `${d}-${m}-${a}` : dataISO;
  };
  return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
          <FileSpreadsheet className="text-emerald-500" />
          Importar Escala Mensal Lote Unificado (.xlsx)
        </h3>
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Mês Ref.</label>
            <select value={mes} onChange={(e) => setMes(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-700 cursor-pointer">
              <option value="">Selecione</option>
              <option value="01">Janeiro</option><option value="02">Fevereiro</option><option value="03">Março</option>
              <option value="04">Abril</option><option value="05">Maio</option><option value="06">Junho</option>
              <option value="07">Julho</option><option value="08">Agosto</option><option value="09">Setembro</option>
              <option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Ano Ref.</label>
            <select value={ano} onChange={(e) => setAno(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-700 cursor-pointer">
              <option value="">Selecione</option>
              <option value="2026">2026</option><option value="2027">2027</option><option value="2028">2028</option>
              <option value="2029">2029</option><option value="2030">2030</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Arquivo</label>
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 cursor-pointer" />
          </div>
        </div>
      {status === "idle" && file && (
        <button onClick={processarPlanilha} disabled={isProcessing} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-colors">
          {isProcessing ? <Loader2 className="animate-spin" /> : <Upload size={18} />}
          Ler Planilha e Gerar Escala Completa
        </button>
      )}
      {status === "error" && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle /> Erro ao ler a planilha. Verifique se o formato está no padrão da UTI.
        </div>
      )}
      {status === "success" && previewData.length > 0 && (
        <div className="mt-6 border-t border-slate-100 pt-6 animate-fadeIn">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="font-bold text-emerald-700 flex items-center gap-2"><CheckCircle size={18} /> Leitura Multi-Aba Concluída!</h4>
              <p className="text-sm text-slate-500">{previewData.length} plantões identificados em várias categorias.</p>
            </div>
            <button onClick={salvarNoFirebase} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-bold transition-colors">
              Confirmar e Salvar no Banco
            </button>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-60 overflow-y-auto">
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-xs font-bold text-blue-800 mb-2">Confirme a profissão de cada aba:</p>
            {[...new Set(previewData.map(p => p.aba))].map(aba => (
              <div key={aba} className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-slate-600 w-56 truncate" title={aba}>Aba: {aba}</span>
                <select
                  value={categoriasPorAba[aba] || ""}
                  onChange={(e) => setCategoriasPorAba(prev => ({ ...prev, [aba]: e.target.value }))}
                  className="p-1.5 border border-blue-300 rounded text-xs font-bold bg-white outline-none focus:border-blue-500"
                >
                  {Object.keys(CATEGORIA_SLUGS).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>            
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-400 font-bold border-b border-slate-200">
                  <th className="pb-2">Data</th>
                  <th className="pb-2">Profissional</th>
                  <th className="pb-2">Categoria</th>
                  <th className="pb-2">Turno</th>
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 10).map((p, idx) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 font-mono text-xs">{formatarDataBR(p.data)}</td>
                    <td className="py-2 font-bold text-slate-700 truncate max-w-[150px]">{p.nome}</td>
                    <td className="py-2 text-xs font-black text-blue-600">{p.categoria}</td>
                    <td className="py-2"><span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-xs font-bold text-slate-600">{p.sigla} - {p.turno}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.length > 10 && <p className="text-center text-xs text-slate-400 mt-4 italic">Mostrando apenas os 10 primeiros registros...</p>}
          </div>
        </div>
      )}
    </div>
  );
};
export default ImportadorEscala;