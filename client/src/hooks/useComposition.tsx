import { useState, KeyboardEvent } from 'react';

interface UseCompositionProps {
  onEnter?: () => void;
}

export const useComposition = ({ onEnter }: UseCompositionProps = {}) => {
  const [isComposing, setIsComposing] = useState(false);

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isComposing && onEnter) {
      onEnter();
    }
  };

  return {
    isComposing,
    compositionProps: {
      onCompositionStart: handleCompositionStart,
      onCompositionEnd: handleCompositionEnd,
      onKeyDown: handleKeyDown,
    },
  };
};

export default useComposition;
