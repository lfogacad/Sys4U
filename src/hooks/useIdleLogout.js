import { useEffect, useRef } from 'react';

// Chave onde fica o timestamp do último momento de atividade
const STORAGE_KEY = 'sys4u_last_activity';
// Chave onde fica o timestamp do LOGIN (para expiração absoluta)
const LOGIN_KEY = 'sys4u_login_at';

// Atualiza o "último momento de atividade" no localStorage
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
  } catch (e) { /* ignora */ }
};

// Limpa os marcadores de sessão (chamar no logout)
export const clearSession = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LOGIN_KEY);
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

/**
 * useIdleLogout
 * @param {Function} onLogout          callback de logout
 * @param {boolean}  enabled           ativa/desativa o hook
 * @param {number}   timeoutMs         inatividade até deslogar (padrão 2h)
 * @param {Object}   options
 * @param {boolean}  options.absolute  se true, desloga 2h após o LOGIN mesmo com atividade
 * @param {number}   options.checkIntervalMs  intervalo de checagem (padrão 60s)
 */
const useIdleLogout = (
  onLogout,
  enabled = true,
  timeoutMs = 2 * 60 * 60 * 1000,
  options = {}
) => {
  const { checkIntervalMs = 60 * 1000 } = options;

  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  // Evita disparar o logout mais de uma vez
  const disparadoRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    disparadoRef.current = false;

    // ---------- verificação central ----------
    const verificar = () => {
      if (disparadoRef.current) return;
      const inativo = isSessionExpired(timeoutMs);

      if (inativo) {
        disparadoRef.current = true;
        onLogoutRef.current();
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

    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', aoGanharFoco);
    window.addEventListener('pageshow', aoGanharFoco);

    // ---------- checagem periódica ----------
    // No mobile, timers longos são suspensos; um intervalo curto
    // continua disparando enquanto o app está visível.
    const intervalo = setInterval(() => {
      if (document.visibilityState === 'visible') verificar();
    }, checkIntervalMs);

    // Checagem imediata na montagem
    verificar();

    return () => {
      events.forEach(ev => window.removeEventListener(ev, resetTimer));
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', aoGanharFoco);
      window.removeEventListener('pageshow', aoGanharFoco);
      if (idleTimer) clearTimeout(idleTimer);
      clearInterval(intervalo);
    };
  }, [enabled, timeoutMs, checkIntervalMs]);
};

export default useIdleLogout;