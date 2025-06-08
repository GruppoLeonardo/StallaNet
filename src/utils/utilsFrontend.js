export function calcolaTempoTrascorso(oraIngresso) {
  if (!oraIngresso) return '00:00';

  const oggi = new Date();
  const yyyy = oggi.getFullYear();
  const mm = String(oggi.getMonth() + 1).padStart(2, '0');
  const dd = String(oggi.getDate()).padStart(2, '0');
  const dataOggi = `${yyyy}-${mm}-${dd}`;

  const inizio = new Date(`${dataOggi}T${oraIngresso}`);
  if (isNaN(inizio.getTime())) return '00:00';

  const adesso = new Date();
  const diffSec = Math.floor((adesso - inizio) / 1000);
  const ore = String(Math.floor(diffSec / 3600)).padStart(2, '0');
  const min = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');

  return `${ore}:${min}`;
}