const mysql = require('mysql2'); // mysql2 = pacchetto piu' moderno e asincrono

 // CONNESSIONE DATABASE
const conn = mysql.createConnection({
  host: 'nome_host',
  user: 'root',
  password: 'password', 
  database: 'nome_database',
});

// Attiva connessione Database
conn.connect(err => {
  if (err) {
    console.error('Errore di connessione al DB:', err);
  } else {
    console.log('Connessione al database MySQL riuscita!');
  }
});

module.exports = conn;