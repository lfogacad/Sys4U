import { useEffect, useRef } from 'react';

// Chave onde fica o timestamp do último momento de atividade
const STORAGE_KEY = 'sys4u_last_activity';

// Atualiza o "último momento de atividade" no localStorage
export const touchActivity = () => {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch (e) {
    // storage indisponível (modo privado) — ignora
  }
};

// Retorna true se a sessão está expirada (inatividade > timeoutMs)
export const isSessionExpired = (timeoutMs) => {
  try {
    const last = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    if (!last) return false; // nunca registrou atividade — deixa passar
    return Date.now() - last > timeoutMs;
  } catch (e) {
    return false;
  }
};

const useIdleLogout = (onLogout, enabled = true, timeoutMs = 2 * 60 * 60 * 1000) => {
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  useEffect(() => {
    if (!enabled) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'click', 'scroll', 'touchstart'];
    let timer = null;

    const resetTimer = () => {
      touchActivity(); // grava o momento de atividade
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onLogoutRef.current(), timeoutMs);
    };

    events.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach(ev => window.removeEventListener(ev, resetTimer));
      if (timer) clearTimeout(timer);
    };
  }, [enabled, timeoutMs]);
};

export default useIdleLogout;