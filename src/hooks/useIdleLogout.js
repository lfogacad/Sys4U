import { useEffect, useRef } from 'react';

// Chave onde fica o timestamp do último momento de atividade
const STORAGE_KEY = 'sys4u_last_activity';
// Chave onde fica o timestamp do LOGIN (base da expiração absoluta)
const LOGIN_KEY = 'sys4u_login_at';
// Chave de controle do aviso de 5 min (evita reabrir o alerta em loop)
const WARNED_KEY = 'sys4u_warned_3h';

// Atualiza o "último momento de atividade"
export const touchActivity = () => {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch (e) { /* modo privado — ignora */ }
};

// Registra o momento do login (chamar logo após autenticar com sucesso)
export const markLogin = () => {
  try {
    const agora = Date.now();
    localStorage.setItem(LOGIN_KEY, String(agora));
    localStorage.setItem(STORAGE_KEY, String(agora));
    localStorage.removeItem(WARNED_KEY);
  } catch (e) { /* ignora */ }
};

// Limpa os marcadores de sessão (chamar no logout)
export const clearSession = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LOGIN_KEY);
    localStorage.removeItem(WARNED_KEY);
  } catch (e) { /* ignora */ }
};

// Retorna true se a sessão está expirada por inatividade
export const isSessionExpired = (timeoutMs) => {
  try {
    const last = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    if (!last) return false;
    return Date.now() - last > timeoutMs;
  } catch (e) {
    return false;
  }
};

// Timestamp do login (0 se não registrado)
export const getLoginAt = () => {
  try {
    return parseInt(localStorage.getItem(LOGIN_KEY) || '0', 10);
  } catch (e) {
    return 0;
  }
};

// Quanto falta para o limite absoluto (ms). Negativo = já passou.
export const msRestantesAbsoluto = (absTimeoutMs) => {
  const loginAt = getLoginAt();
  if (!loginAt) return Infinity;
  return (loginAt + absTimeoutMs) - Date.now();
};

// Reinicia APENAS o relógio absoluto (usuário pediu "continuar" no aviso)
export const renovarSessaoAbsoluta = () => {
  try {
    localStorage.setItem(LOGIN_KEY, String(Date.now()));
    localStorage.removeItem(WARNED_KEY);
  } catch (e) { /* ignora */ }
};

/**
 * useIdleLogout
 * @param {Function} onLogout          callback de logout
 * @param {boolean}  enabled           ativa/desativa o hook
 * @param {number}   timeoutMs         inatividade até deslogar (padrão 2h)
 * @param {Object}   options
 * @param {number}   options.checkIntervalMs     intervalo de checagem (padrão 60s)
 * @param {number}   options.absoluteTimeoutMs   logout absoluto (padrão 3h)
 * @param {number}   options.warnBeforeMs        aviso prévio (padrão 5min)
 * @param {Function} options.onWarn              callback do aviso
 */
const useIdleLogout = (
  onLogout,
  enabled = true,
  timeoutMs = 2 * 60 * 60 * 1000,
  options = {}
) => {
  const {
    checkIntervalMs = 60 * 1000,
    absoluteTimeoutMs = 3 * 60 * 60 * 1000,
    warnBeforeMs = 5 * 60 * 1000,
    onWarn = null
  } = options;

  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  const onWarnRef = useRef(onWarn);
  onWarnRef.current = onWarn;

  // Evita disparar o logout mais de uma vez
  const disparadoRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    disparadoRef.current = false;

    // ---------- verificação central ----------
    // Tenta deslogar e, se falhar, rearma a flag para não travar a sessão.
    const executarLogout = async (motivo) => {
      if (disparadoRef.current) return;
      disparadoRef.current = true;
      try {
        await onLogoutRef.current(motivo);
      } catch (e) {
        // Falhou (rede, signOut travado). Rearma para tentar de novo
        // na próxima checagem, em vez de deixar a sessão presa.
        console.error('[SYS4U] Falha ao deslogar, será retentado:', e);
        disparadoRef.current = false;
      }
    };

    const verificar = () => {
      if (disparadoRef.current) return;

      const restanteAbs = msRestantesAbsoluto(absoluteTimeoutMs);

      // 1) Expiração absoluta
      if (restanteAbs <= 0) {
        executarLogout('absoluto');
        return;
      }

      // 2) Aviso prévio (só se ainda há tempo)
      if (restanteAbs > 0 && restanteAbs <= warnBeforeMs) {
        let jaAvisou = false;
        try {
          jaAvisou = localStorage.getItem(WARNED_KEY) === String(getLoginAt());
        } catch (e) { /* ignora */ }

        if (!jaAvisou && onWarnRef.current) {
          try {
            localStorage.setItem(WARNED_KEY, String(getLoginAt()));
          } catch (e) { /* ignora */ }
          onWarnRef.current(Math.ceil(restanteAbs / 60000));
        }
      }

      // 3) Inatividade
      if (isSessionExpired(timeoutMs)) {
        executarLogout('inatividade');
      }
    };

    // ---------- timers ----------
    let idleTimer = null;

    const resetTimer = () => {
      touchActivity();
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(verificar, timeoutMs);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'click', 'scroll', 'touchstart'];

    events.forEach(ev =>
      window.addEventListener(ev, resetTimer, { passive: true })
    );
    resetTimer();

    // ---------- retorno ao app (crucial no mobile) ----------
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') verificar();
    };

    const aoGanharFoco = () => verificar();

    // O bfcache restaura a página com o React intacto. Sempre revalidar.
    const aoPageshow = (ev) => {
      if (ev.persisted) disparadoRef.current = false; // sessão restaurada, permite nova tentativa
      verificar();
    };

    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', aoGanharFoco);
    window.addEventListener('pageshow', aoPageshow);

    // ---------- checagem periódica ----------
    // No mobile o app pode ficar 'hidden' por longos períodos sem morrer.
    // O absoluto NÃO depende de atividade, então podemos verificar sempre:
    // se já passou das 3h, desloga mesmo em background.
    // (deslogar é seguro em background: signOut + redirect não dependem de UI)
    const intervalo = setInterval(() => {
      verificar();
    }, Math.min(checkIntervalMs, 30 * 1000));

    // Checagem imediata na montagem
    verificar();

    return () => {
      events.forEach(ev => window.removeEventListener(ev, resetTimer));
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', aoGanharFoco);
      window.removeEventListener('pageshow', aoPageshow);
      if (idleTimer) clearTimeout(idleTimer);
      clearInterval(intervalo);
    };
  }, [enabled, timeoutMs, checkIntervalMs, absoluteTimeoutMs, warnBeforeMs]);
};

export default useIdleLogout;