import { useRef, useCallback } from 'react';










export function useFocusVisible() {
  const isFocusVisibleRef = useRef(false);

  const handleMouseDown = useCallback(() => {
    isFocusVisibleRef.current = false;
  }, []);

  const handleKeyDown = useCallback(() => {
    isFocusVisibleRef.current = true;
  }, []);

  const handleFocus = useCallback((e: React.FocusEvent<any>) => {
    if (isFocusVisibleRef.current) {
      e.currentTarget.classList.add('focus-visible');
    }
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<any>) => {
    e.currentTarget.classList.remove('focus-visible');
  }, []);

  return {
    onMouseDown: handleMouseDown,
    onKeyDown: handleKeyDown,
    onFocus: handleFocus,
    onBlur: handleBlur,
  };
}
