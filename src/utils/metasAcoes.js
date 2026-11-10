// ============================================================
// metasAcoes.js — Fonte única de verdade para permissões e
// rótulos das metas da Visita Multidisciplinar.
// Usado por: VisitaMultiTab.jsx e ModuloUTI.jsx
// ============================================================

// Origens de metas sugeridas pela Nutrição
export const ORIGENS_NUTRI = [
  'auto_mudar_via',
  'auto_adicionar_via',
  'auto_mudar_consistencia',
  'auto_mudar_caracteristica',
  'auto_ajustar_vazao',
  'auto_aumentar_calorico',
  'auto_aumentar_proteico',
  'auto_controle_glicemico',
  'auto_mudar_enteral'
];

// Origens de metas sugeridas pela Fisioterapia
export const ORIGENS_FISIO = [
  'auto_corrigir_assincronias',
  'auto_tre'
];

// Origens de metas sugeridas pela Enfermagem
export const ORIGENS_ENFERMAGEM = [
  'auto_sacar_cvc',
  'auto_sacar_shiley',
  'auto_sacar_svd',
  'auto_curativo',
  'auto_higiene_oral',
  'auto_higiene_intima',
  'auto_retorno_sne'
];

// Rótulos das categorias (mesma ordem de CATEGORIAS do VisitaMultiTab)
export const LABEL_CATEGORIA = {
  medicoRotina: 'Médico RT',
  medicoPlantonista: 'Médico Plantão',
  enfermeiroPlantonista: 'Enfermagem',
  fisioterapeutaPlantonista: 'Fisioterapia',
  nutricionista: 'Nutrição',
  tecnicoEnfermagem: 'Téc. Enfermagem'
};

// Rótulos legíveis por origem (fallback quando descricao vem vazia ou técnica)
export const ROTULO_ORIGEM = {
  auto_tvp_mecanica: 'Profilaxia mecânica para TVP',
  auto_ulcera_ev: 'Profilaxia de úlcera de estresse EV',
  auto_ulcera_vo: 'Profilaxia de úlcera de estresse VO',
  auto_ibp_terapeutico: 'Iniciar IBP em dose terapêutica',
  auto_plano_rx_torax: 'Solicitar Rx de Tórax',
  auto_plano_pocus: 'Realizar POCUS pulmonar/cardíaco',
  auto_plano_desmame_dobuta: 'Desmame de Dobutamina',
  auto_plano_trocar_atb: 'Trocar antibiótico',
  auto_plano_suspender_atb: 'Suspender antibiótico',
  auto_plano_nefrologia: 'Avaliação da Nefrologia',
  auto_plano_corrigir_nak: 'Corrigir Na/K',
  auto_plano_suspender_dieta: 'Suspender dieta',
  auto_plano_suspender_anticoag: 'Suspender anticoagulante',
  auto_plano_trocar_svd: 'Trocar SVD',
  auto_plano_trocar_cvc: 'Trocar CVC',
  auto_nefrologia: 'Avaliação da Nefrologia',
  auto_repor_k: 'Repor K',
  auto_desmame_sedacao: 'Desmame de sedação',
  auto_higiene_oral: 'Realizar Higiene Oral 3x/d',
  auto_higiene_intima: 'Realizar Higiene Íntima 3x/d',
  auto_sacar_cvc: 'Sacar CVC',
  auto_sacar_shiley: 'Sacar Shiley (cateter de HD)',
  auto_sacar_svd: 'Sacar SVD',
  auto_tre: 'Tentativa de TRE',
  auto_corrigir_assincronias: 'Corrigir Assincronias',
  auto_controle_glicemico: 'Controle glicêmico',
  auto_retorno_sne: 'Estimular esvaziamento gástrico',
  auto_aumentar_calorico: 'Aumentar aporte calórico',
  auto_aumentar_proteico: 'Aumentar aporte proteico',
  auto_ssvv_hipertensao: 'Controle pressórico',
  auto_diurese_baixa: 'Estimular diurese',
  auto_evacuacao_atrasada: 'Medidas laxativas',
  auto_diarreia: 'Medidas constipantes',
  auto_vomitos: 'Estimular esvaziamento gástrico'
};

/**
 * Nome legível da meta. Usa `descricao` quando ela é válida;
 * se estiver vazia, igual à origem ou parecer identificador,
 * cai no mapa de rótulos; no fim, humaniza a origem.
 */
export const nomeLegivelMeta = (meta) => {
  if (!meta) return '';
  const desc = String(meta.descricao || '').trim();
  const origem = String(meta.origem || '');

  // descrição válida = tem texto real, não é a origem e não parece slug
  const descValida =
    desc &&
    desc !== origem &&
    !/^auto_/i.test(desc) &&
    !/_/.test(desc);

  if (descValida) return desc;
  if (ROTULO_ORIGEM[origem]) return ROTULO_ORIGEM[origem];

  // fallback: humaniza a origem (auto_plano_trocar_svd → "Trocar SVD")
  const base = origem
    .replace(/^auto_/, '')
    .replace(/^plano_/, '')
    .replace(/^mudar_/, 'Mudar ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

  return base || desc || '—';
};

// Mapeia o cargo real (moduloadmin) para a categoria interna.
// Usa comparação normalizada (sem acento, sem caixa) para tolerar variações.
export const cargoParaCategoria = (cargo) => {
  const norm = String(cargo || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const mapa = {
    'medico': 'medicoPlantonista',
    'rt medico': 'medicoRotina',
    'desenvolvedor': 'medicoRotina',
    'enfermeiro': 'enfermeiroPlantonista',
    'gerente de enfermagem': 'enfermeiroPlantonista',
    'tec. em enf.': 'tecnicoEnfermagem',
    'tec em enf': 'tecnicoEnfermagem',
    'tecnico de enfermagem': 'tecnicoEnfermagem',
    'nutricionista': 'nutricionista',
    'fisioterapeuta': 'fisioterapeutaPlantonista',
    'rt da fisioterapia': 'fisioterapeutaPlantonista'
  };
  return mapa[norm] || null;
};

/// Acesso irrestrito: médicos, nefrologistas, dev, RT, plantonistas, intensivistas.
const ehAcessoIrrestrito = (cargoLower) =>
  /medic|médic|nefrolog|desenvolvedor|developer|\bdev\b|rt\b|plantonista|intensivista/.test(cargoLower);


// Concatena cargoLocal + perfil (um dos dois sempre vem preenchido).
const resolverCargo = (userProfile) =>
  `${userProfile?.cargoLocal || ''} ${userProfile?.perfil || ''}`.toLowerCase().trim();

/**
 * Determina a categoria REAL de quem está logado.
 * Usa `perfil` como fonte primária (sempre presente) e `cargoLocal` quando existir.
 * `categoriaAtiva` (aba visível) é apenas último recurso — nunca a identidade.
 */
export const determinarCategoriaAutor = (userProfile, categoriaAtiva) => {
  // 1) Tenta o mapeamento exato no perfil
  const porPerfil = cargoParaCategoria(userProfile?.perfil);
  if (porPerfil) return porPerfil;

  // 2) Tenta o mapeamento exato no cargoLocal
  const porCargo = cargoParaCategoria(userProfile?.cargoLocal);
  if (porCargo) return porCargo;

  // 3) Fallback por padrão textual (tolerância a variações de grafia)
  const texto = `${userProfile?.perfil || ''} ${userProfile?.cargoLocal || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (!texto) {
    console.warn('[META-AUTORIA] Sem perfil nem cargo no userProfile', userProfile);
    return categoriaAtiva || 'medicoRotina';
  }

  if (/tec/.test(texto) && /enf/.test(texto)) return 'tecnicoEnfermagem';
  if (/gerente|coordena/.test(texto) && /enf/.test(texto)) return 'enfermeiroPlantonista';
  if (/enfermeir|enfermagem/.test(texto)) return 'enfermeiroPlantonista';
  if (/fisiot/.test(texto)) return 'fisioterapeutaPlantonista';   // ← sobe para cá
  if (/nutric/.test(texto)) return 'nutricionista';
  if (/psic/.test(texto)) return 'psicologo';
  if (/fono/.test(texto)) return 'fonoaudiologo';
  if (/nefrolog/.test(texto)) return 'medicoRotina';              // nefrologista é médico
  if (/rt\b|rotina/.test(texto)) {                                 // ← depois
    // 'RT da Fisioterapia' já caiu em /fisiot/ acima; aqui é RT Médico
    return 'medicoRotina';
  }
  if (/plantonista|plantao/.test(texto)) return 'medicoPlantonista';
  if (/medic|intensivista|diarista/.test(texto)) return 'medicoRotina';
  if (/desenvolvedor|developer|\bdev\b/.test(texto)) return 'medicoRotina';

  console.warn('[META-AUTORIA] Perfil não reconhecido, usando aba ativa', {
    perfil: userProfile?.perfil,
    cargoLocal: userProfile?.cargoLocal,
    categoriaAtiva
  });
  return categoriaAtiva || 'medicoRotina';
};

/**
 * Regra única de permissão, compartilhada por podeConfirmarMeta e podeManipularMeta.
 */
const avaliarPermissaoMeta = (meta, userProfile) => {
  if (!meta) return false;
  const origem = meta.origem || '';
  const cargo = resolverCargo(userProfile);

  // Acesso irrestrito (médicos, nefrologistas, dev)
  if (ehAcessoIrrestrito(cargo)) return true;

  if (origem === 'manual') {
    // 🛡️ FONTE CORRETA: perfil → cargoLocal → fallback textual.
    // Antes usava só `cargoLocal` (undefined no seu perfil) e bloqueava tudo.
    const categoriaUsuario = determinarCategoriaAutor(userProfile, null);
    const criador = meta.adicionadoPor || meta.criadoPor || '';

    if (criador === categoriaUsuario) return true;

    // Autoridade de enfermagem: enfermeiro gerencia manuais do técnico
    if (categoriaUsuario === 'enfermeiroPlantonista' && criador === 'tecnicoEnfermagem') {
      return true;
    }

    return false;
  }

  // Metas automáticas: só a categoria de origem gerencia
  if (/\b(enfermeir|enfermagem)/.test(cargo)) return ORIGENS_ENFERMAGEM.some(p => origem.startsWith(p));
  if (/\bnutric/.test(cargo))                 return ORIGENS_NUTRI.some(p => origem.startsWith(p));
  if (/\bfisiot/.test(cargo))                 return ORIGENS_FISIO.some(p => origem.startsWith(p));

  return false;
};

export const podeConfirmarMeta = (meta, userProfile) => {
  return avaliarPermissaoMeta(meta, userProfile);
};

export const podeManipularMeta = (meta, userProfile) => {
  return avaliarPermissaoMeta(meta, userProfile);
};

/**
 * Rótulo legível para exibição da origem da meta.
 */
export const labelOrigemMeta = (meta) => {
  if (!meta) return '';
  if (meta.origem === 'manual') {
    const cat = meta.adicionadoPor || meta.criadoPor;
    return cat ? `Manual · ${LABEL_CATEGORIA[cat] || cat}` : 'Manual';
  }
  return meta.origem;
};