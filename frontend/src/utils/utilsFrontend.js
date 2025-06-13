//Serve a calcolare le ore e i minuti trascorsi da OraIngresso a orario attuale.
//Richiamata da GestoreBarraSuperiore.jsx

export function calcolaTempoTrascorso(oraIngresso) {
  if (!oraIngresso) return '00:00'; // se da DB non arriva mostra 00:00

  const oggi = new Date();
  //Compone la stringa nel formato giusto 
  const yyyy = oggi.getFullYear();
  const mm = String(oggi.getMonth() + 1).padStart(2, '0');
  const dd = String(oggi.getDate()).padStart(2, '0');
  const dataOggi = `${yyyy}-${mm}-${dd}`; 

  const inizio = new Date(`${dataOggi}T${oraIngresso}`); //compone orario ingresso di oggi+data
  if (isNaN(inizio.getTime())) return '00:00';

  const adesso = new Date();
  const diffSec = Math.floor((adesso - inizio) / 1000); // differenza in secondi tra ora e oraingresso
  //differenza espressa in ore e minuti
  const ore = String(Math.floor(diffSec / 3600)).padStart(2, '0');
  const min = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');

  return `${ore}:${min}`; // returna le ore lavorate in formato hh:mm
}