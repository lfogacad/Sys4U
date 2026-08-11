import { useEffect, useRef } from 'react';

const useIdleLogout = (onLogout, enabled = true, timeoutMs = 90 * 60 * 1000) => {
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout; // sempre usa a versão mais recente

  useEffect(() => {
    if (!enabled) return; // só ativa quando o usuário está logado

    const events = ['mousemove', 'mousedown', 'keydown', 'click', 'scroll', 'touchstart'];
    let timer = null;

    const resetTimer = () => {
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