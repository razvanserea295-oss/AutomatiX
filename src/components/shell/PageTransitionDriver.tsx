







import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  resolvePageCommit, runBackForwardTransition, applyScroll, focusNewPage, saveScroll,
} from '@/lib/pageTransitions';

export default function PageTransitionDriver() {
  const [location] = useLocation();
  const prev = useRef(location);
  const isBack = useRef(false);

  
  
  useEffect(() => {
    const onPop = () => {
      isBack.current = true;
      saveScroll(prev.current);
      runBackForwardTransition();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  
  useEffect(() => {
    if (location === prev.current) return;
    const back = isBack.current;
    isBack.current = false;
    resolvePageCommit();        
    applyScroll(location, back); 
    focusNewPage();             
    prev.current = location;
  }, [location]);

  return null;
}
