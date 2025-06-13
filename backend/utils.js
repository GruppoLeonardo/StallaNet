// contiene funzioni di utilità relative alla gestione degli orari per il server


// restituisce la data odierna in formato yyyy-mm-dd
function getDataOdierna() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// restituisce l'orario attuale in formato hh:mm:ss
function getOraAttuale() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

// converte un numero di minuti in un orario in formato hh:mm 
function formattaDurata(minutiTotali) {
  const ore = String(Math.floor(minutiTotali / 60)).padStart(2, '0');
  const minuti = String(minutiTotali % 60).padStart(2, '0');
  return `${ore}:${minuti}`;
}

// resttituisce una quantità di tempo in formato hh:mm (differenza tra orario attuale e orario in entrata)
function calcolaTempoTrascorsoOperai(orarioIngresso) {
  if (!orarioIngresso) return "00:00";
  const [hh, mm, ss] = orarioIngresso.split(":").map(Number);
  const inizio = new Date();
  inizio.setHours(hh, mm, ss || 0, 0);
  const adesso = new Date();
  const diffMinuti = Math.max(Math.floor((adesso - inizio) / 60000), 0);
  return formattaDurata(diffMinuti);
}

// differenza tra due orari, risultato in formato hh:mm
function calcolaDifferenzaOrari(inizioStr, fineStr) {
  const [hhI, mmI, ssI] = inizioStr.split(":").map(Number);
  const [hhF, mmF, ssF] = fineStr.split(":").map(Number);
  const inizio = new Date();
  const fine = new Date();
  inizio.setHours(hhI, mmI, ssI || 0, 0);
  fine.setHours(hhF, mmF, ssF || 0, 0);
  const diffMinuti = Math.max(Math.floor((fine - inizio) / 60000), 0);
  return formattaDurata(diffMinuti);
}

// rende le dunzioni chiamabili da altri file
module.exports = {
  getDataOdierna,
  getOraAttuale,
  formattaDurata,
  calcolaTempoTrascorsoOperai,
  calcolaDifferenzaOrari
};