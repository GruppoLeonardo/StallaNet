const mysql = require('mysql2'); // 2 = pacchetto piu' moderno e asincrono

 // CONNESSIONE DATABASE
const conn = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Password_del_tuo_DB', 
  database: 'StallaNet'
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
