const KEY='S360_STATE_V1';
export function loadState(){
  try{ return JSON.parse(localStorage.getItem(KEY)) }catch{ return null }
}
export function saveStateRaw(s){
  try{ localStorage.setItem(KEY, JSON.stringify(s)) }catch{}
}
export function clearState(){ try{ localStorage.removeItem(KEY) }catch{} }

import { useEffect, useRef } from 'react';
export function useDebouncedEffect(fn, deps, delay){
  const h = useRef();
  useEffect(()=>{
    clearTimeout(h.current);
    h.current = setTimeout(fn, delay);
    return ()=> clearTimeout(h.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
