import { useRef } from 'react';
export default function usePreserveScrollOnDeps(containerRef, deps=[]){
  const last = useRef({top:0});
  const runScrollSafe = (fn)=>{
    const el = containerRef?.current;
    if(el){ last.current.top = el.scrollTop; }
    fn && fn();
    requestAnimationFrame(()=>{
      const el2 = containerRef?.current;
      if(el2){ el2.scrollTop = last.current.top; }
    });
  };
  return { runScrollSafe };
}
