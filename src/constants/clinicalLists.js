export const PROFISSOES = [
    "Médico",
    "Enfermeiro",
    "Técnico em Enfermagem",
    "Fisioterapeuta",
    "Nutricionista",
    "Psicólogo",
    "Farmacêutico",
    "Gestor",
    "Administrador",
    "Fonoaudiólogo",
  ];
export const CODIGO_MESTRE_RT = "UTI@ARIQUEMES";
  
export const EXAM_ROWS = [
    "Hemoglobina",
    "Hematócrito",
    "Leucócitos",
    "Basófilos",
    "Eosinófilos",
    "Bastões",
    "Segmentados",
    "Linfócitos",
    "Monócitos",
    "Plaquetas",
    "PCR",
    "Ureia",
    "Creatinina",
    "Na (Sódio)",
    "K (Potássio)",
    "TGO (AST)",
    "TGP (ALT)",
    "Bilirrubina Total",
    "Bilirrubina Direta",
    "Bilirrubina Indireta",
    "Amilase",
    "Lipase",
    "GamaGT",
    "Fosfatase Alcalina",
    "Troponina",
    "CPK Total",
    "CK-MB",
    "RNI",
    "TTPA",
    "Proteínas Totais",
    "Albumina",
    "Ácido úrico",
    "Ferritina",
    "DHL",
    "EAS (Leuco/c)",
    "HBV",
    "HCV",
    "HIV",
    "VDRL",
  ];
  
  export const BH_HOURS = Array.from({ length: 24 }, (_, i) => {
    const h = (i + 7) % 24;
    return h.toString().padStart(2, "0") + ":00";
  });
  export const BH_GAINS = [
    "Dieta Oral",
    "Dieta SNE",
    "Água (VO/SNE)",
    "Soro Basal",
    "Diluição EV",
    "Volume",
    "Midazolam",
    "Fentanil",
    "Noradrenalina",
    "Dobutamina",
    "Hemocomponentes",
  ];
  export const BH_LOSSES = [
    "Diurese (Total Coletado)",
    "Drenos",
    "SNG/SNE",
    "HD (Perda)",
    "Vômitos",
    "Evacuação",
    "Diarreia", // <-- Nova linha adicionada aqui
  ];
  
  export const HD_TIMES = [
    "00:00",
    "00:15",
    "00:30",
    "00:45",
    "01:00",
    "01:15",
    "01:30",
    "01:45",
    "02:00",
    "02:15",
    "02:30",
    "02:45",
    "03:00",
    "03:15",
    "03:30",
    "03:45",
    "04:00",
    "04:15",
    "04:30",
    "04:45",
    "05:00",
  ];
  export const HD_SUPPLIES = [
    { id: "dialisador", label: "DIALISADOR" },
    { id: "seringa10", label: "SERINGA 10ML" },
    { id: "linha_v", label: "LINHA VENOSA" },
    { id: "seringa20", label: "SERINGA 20ML" },
    { id: "linha_a", label: "LINHA ARTERIAL" },
    { id: "agulha25", label: "AGULHA 25X7" },
    { id: "equipo", label: "EQUIPO" },
    { id: "agulha40", label: "AGULHA 40X12" },
    { id: "isolador", label: "ISOLADOR DE PRESSÃO" },
    { id: "luva_est", label: "LUVA ESTÉRIL" },
    { id: "sol_acida", label: "SOLUÇÃO ÁCIDA" },
    { id: "luva_proc", label: "LUVA DE PROCEDIMENTO" },
    { id: "sol_basica", label: "SOLUÇÃO BÁSICA" },
    { id: "mascara", label: "MÁSCARA" },
    { id: "sf500", label: "S.F. 0,9% 500 ML" },
    { id: "gorro", label: "GORRO" },
    { id: "sf1000", label: "S.F. 0,9% 1000 ML" },
    { id: "gaze", label: "GAZE" },
    { id: "heparina", label: "HEPARINA" },
    { id: "micropore", label: "MICROPORE" },
  ];
  
  // --- LISTAS ---
  export const CARACTERISTICAS_DIURESE = [
    "Clara",
    "Amarelo Cítrico",
    "Concentrada",
    "Turva",
    "Colúria",
    "Hematúria",
    "Piúria"
  ];
  export const OPCOES_DVA = [
    "Noradrenalina",
    "Vasopressina",
    "Dobutamina",
    "Nipride",
    "Tridil",
    "Dopamina",
  ];
  export const OPCOES_SEDATIVOS = [
    "Midazolam",
    "Cetamina",
    "Propofol",
    "Precedex",
    "Fentanil",
    "Rocurônio",
  ];
  export const GLASGOW_AO = [
    "4 - Espontânea",
    "3 - Ao comando verbal",
    "2 - Ao estímulo doloroso",
    "1 - Ausente",
  ];
  export const GLASGOW_RV = [
    "5 - Orientado",
    "4 - Confuso",
    "3 - Palavras inaprop.",
    "2 - Sons incompreens.",
    "1 - Ausente",
    "T - Tubo/Traqueo",
  ];
  export const GLASGOW_RM = [
    "6 - Obedece comandos",
    "5 - Localiza dor",
    "4 - Flexão normal (retirada)",
    "3 - Flexão anormal (decorticação)",
    "2 - Extensão (descerebração)",
    "1 - Ausente",
  ];
  export const RASS_OPTS = [
    "+4 Combativo",
    "+3 Muito Agitado",
    "+2 Agitado",
    "+1 Inquieto",
    "0 Alerta e Calmo",
    "-1 Sonolento",
    "-2 Sedação Leve",
    "-3 Sedação Moderada",
    "-4 Sedação Profunda",
    "-5 Não Despertável",
  ];
  export const SUPORTE_RESP_OPTS = [
    "Ar Ambiente",
    "Cateter Nasal",
    "Venturi",
    "Máscara não reinalante",
    "VNI",
    "VM",
    "Macronebulização por TQT",
  ];
  export const MODOS_VM = ["PCV", "VCV", "PSV", "SIMV"];
  export const ASPECTO_SECRECAO = ["Fluído", "Espesso", "Rolhas"];
  export const COLORACAO_SECRECAO = [
    "Hialina",
    "Amarelada",
    "Esverdeada",
    "Purulenta",
    "Sanguinolenta",
  ];
  export const QTD_SECRECAO = ["Pouca", "Moderada", "Abundante"];
  export const MOBILIZACAO = [
    "Mudança de decúbito",
    "Sedestação beira leito",
    "Poltrona",
    "Ortostatismo",
    "Deambulação",
    "Exercícios passivos",
    "Exercícios ativos",
    "Exercícios ativos-assistidos",
    "Exercícios resistidos",
    "Cicloergômetro",
  ];
  export const CONSISTENCIA_ALIMENTAR = [
    "Livre",
    "Branda",
    "Leve",
    "Pastosa heterogênea",
    "Pastosa homogênea",
    "Líquida espessada",
    "Líquida",
    "Zero",
  ];
  export const CARACTERISTICAS_DIETA = [
    "Hipossódica",
    "DM",
    "Laxativa",
    "Hiperproteica",
    "Hipolipídica",
    "Constipante",
  ];
  export const UTENSILIOS_AGUA = [
    "Copo aberto",
    "Garrafa",
    "Garrafa controle fluxo",
    "Canudo",
  ];
  export const ESCALA_DOR = [
    "0 - Sem dor",
    "1-3 - Dor Leve",
    "4-6 - Dor Moderada",
    "7-10 - Dor Intensa",
    "Não comunicativo",
  ];
  export const PRECAUCOES = ["Padrão", "Contato", "Gotículas", "Aerossóis", "Reversa"];
  export const RISCO_NUTRICIONAL = ["1", "2", "3", "4", "5", "6", "7"];
  export const FONO_COMPREENSAO = [
    "Gestos",
    "Imagens/Objetos",
    "Palavras",
    "Frases Simples",
    "Frases Complexas",
  ];
  export const FONO_EXPRESSAO = ["Preservada", "Alterada"];
  export const FONO_EXPRESSAO_DETALHE = [
    "Mutismo",
    "Apraxia",
    "Disartria",
    "Agramatismo",
    "Ecolalia",
  ];
  export const FONO_INAPTO_VO = [
    "Escape oral anterior",
    "Tempo de trânsito oral aumentado",
    "Refluxo nasal",
    "Múltiplas deglutições",
    "Resíduo em cavidade oral após deglutição",
    "Elevação laríngea inadequada",
    "Ausculta cervical ruidosa",
    "Mudança na qualidade vocal",
    "Tosse",
    "Engasgo",
    "Cianose",
    "Alteração dos sinais vitais",
  ];
  export const ICU_MOBILITY_SCALE = [
    "0 - Nada (Passivo)",
    "1 - Sentado no leito / Exercícios no leito",
    "2 - Transferência passiva para cadeira",
    "3 - Sentado à beira do leito",
    "4 - Em pé",
    "5 - Transferência ativa para cadeira",
    "6 - Marcha no lugar",
    "7 - Marcha com auxílio (2+ pessoas)",
    "8 - Marcha com auxílio (1 pessoa)",
    "9 - Marcha independente com dispositivo",
    "10 - Marcha independente sem auxílio",
  ];
  
  export const GASOMETRIA_PARAMS = [
    "pH",
    "pCO2",
    "PaO2",
    "BE",
    "HCO3",
    "SatO2",
    "FiO2",
    "P/F",
  ];
  
  export const BRADEN_OPTIONS = {
    percepcao: [
      { value: 1, label: "1 - Totalmente limitado" },
      { value: 2, label: "2 - Muito limitado" },
      { value: 3, label: "3 - Levemente limitado" },
      { value: 4, label: "4 - Nenhuma limitação" },
    ],
    umidade: [
      { value: 1, label: "1 - Completamente molhado" },
      { value: 2, label: "2 - Muito molhado" },
      { value: 3, label: "3 - Ocasionalmente molhado" },
      { value: 4, label: "4 - Raramente molhado" },
    ],
    atividade: [
      { value: 1, label: "1 - Acamado" },
      { value: 2, label: "2 - Confinado à cadeira" },
      { value: 3, label: "3 - Caminha ocasionalmente" },
      { value: 4, label: "4 - Caminha frequentemente" },
    ],
    mobilidade: [
      { value: 1, label: "1 - Totalmente imóvel" },
      { value: 2, label: "2 - Bastante limitado" },
      { value: 3, label: "3 - Levemente limitado" },
      { value: 4, label: "4 - Nenhuma limitação" },
    ],
    nutricao: [
      { value: 1, label: "1 - Muito pobre" },
      { value: 2, label: "2 - Provavelmente inadequada" },
      { value: 3, label: "3 - Adequada" },
      { value: 4, label: "4 - Excelente" },
    ],
    friccao: [
      { value: 1, label: "1 - Problema" },
      { value: 2, label: "2 - Problema potencial" },
      { value: 3, label: "3 - Nenhum problema aparente" },
    ],
  };
  
  export const MORSE_OPTIONS = {
    historico: [
      { value: 0, label: "0 - Não" },
      { value: 25, label: "25 - Sim" },
    ],
    diagnostico: [
      { value: 0, label: "0 - Não" },
      { value: 15, label: "15 - Sim" },
    ],
    auxilio: [
      { value: 0, label: "0 - Nenhum / Acamado / Auxiliado por profissional" },
      { value: 15, label: "15 - Muleta / Bengala / Andador" },
      { value: 30, label: "30 - Apoia-se em móveis" },
    ],
    terapiaIV: [
      { value: 0, label: "0 - Não" },
      { value: 20, label: "20 - Sim" },
    ],
    marcha: [
      { value: 0, label: "0 - Normal / Acamado / Cadeira de rodas" },
      { value: 10, label: "10 - Fraca" },
      { value: 20, label: "20 - Comprometida / Cambaleante" },
    ],
    estadoMental: [
      { value: 0, label: "0 - Orientado / Capaz" },
      { value: 15, label: "15 - Esquece limitações / Superestima capacidade" },
    ],
  };