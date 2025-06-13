//Determina dinamicamente quale indirizzo del backend usare a seconda del dispositivo che si usa.
const hostname = window.location.hostname; //prende hostname attuale da browser (= dove si trova il frontend)

let SERVER_URL;

if (hostname === 'nome_host' || hostname === 'IPv4_host') {
  SERVER_URL = 'http://nome_host:3001'; // se apri sito da questo computer 
} else {
  SERVER_URL = 'http://IPv4:3001'; // se apri il sito da smartphone collegato in rete
}

export { SERVER_URL };
