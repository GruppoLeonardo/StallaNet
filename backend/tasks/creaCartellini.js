//Modulo che crea un Cartellino per la data odierna , per ogni utente attivo (Operai e Gestori) se non ne ha gia uno.
//Inizializza la giornata in StallaNet

const conn = require('../connDb'); // attiva la connessione al database
const { getDataOdierna } = require('../utils');

function creaCartelliniOggi() {
  const dataOggi = getDataOdierna();

  //Crea cartellino di oggi per ogni utente NON disattivato , Gestore o Operaio , che non ce l'abbia gia
  const query = `
    INSERT INTO Cartellino (idUtente, Data)
    SELECT u.ID, ?
    FROM Utente u
    WHERE u.Disattivato = 0
    AND u.Ruolo IN ('operaio', 'gestore')
    AND NOT EXISTS (
    SELECT 1 FROM Cartellino c
    WHERE c.idUtente = u.ID AND DATE(c.Data) = ?
    )`;

  conn.query(query, [dataOggi, dataOggi], (err, result) => {
    if (err) {
      console.error("Errore nella creazione dei cartellini:", err);
    } else {
      console.log(`Cartellini creati: ${result.affectedRows}`);
    }
  });
}

module.exports = creaCartelliniOggi;