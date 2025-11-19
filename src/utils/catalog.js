const KEY='S360_CATALOG_V1';
function read(){
  try{ return JSON.parse(localStorage.getItem(KEY)) || {} }catch{ return {} }
}
function write(obj){
  try{ localStorage.setItem(KEY, JSON.stringify(obj)) }catch{}
}
export function loadCatalog(){ return read(); }
export function upsertCatalog(normRaw, canonical){
  const db = read();
  db[normRaw] = canonical;
  write(db);
  return db;
}
