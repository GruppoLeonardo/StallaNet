const hostname = window.location.hostname;

let SERVER_URL;

if (hostname === 'localhost' || hostname === '127.0.0.1') {
  SERVER_URL = 'http://localhost:3001'; // localhost per non creare problemi interni 
} else {
  SERVER_URL = 'http://172.20.10.4:3001'; // IP del Mac visibile nella rete per entrare da cell 
}

export { SERVER_URL };
