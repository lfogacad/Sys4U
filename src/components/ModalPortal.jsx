import { createPortal } from 'react-dom';

/**
 * Portal para modais. Renderiza fora da árvore do componente pai,
 * ancorado no document.body. Evita problemas de stacking context,
 * overflow hidden e z-index de containers pais.
 */
export const ModalPortal = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

export default ModalPortal;