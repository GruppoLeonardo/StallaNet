const conn = require('../connDb'); // crea ad attiva la connessione al database
const { getDataOdierna } = require('../utils');

function creaCartelliniOggi() {
  const dataOggi = getDataOdierna();

  const query = `
    INSERT INTO Cartellino (idUtente, Data)
    SELECT u.ID, ?
    FROM Utente u
    WHERE u.Disattivato = 0
      AND NOT EXISTS (
        SELECT 1 FROM Cartellino c
        WHERE c.idUtente = u.ID AND DATE(c.Data) = ?
      )
  `;

  conn.query(query, [dataOggi, dataOggi], (err, result) => {
    if (err) {
      console.error("Errore nella creazione dei cartellini:", err);
    } else {
      console.log(`Cartellini creati: ${result.affectedRows}`);
    }
  });
}

module.exports = creaCartelliniOggi;