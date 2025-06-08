const conn = require('../connDb');
const { getDataOdierna } = require('../utils');

function creaQuotidianeOggi() {
  const dataOggi = getDataOdierna();

  const query = `
    INSERT INTO Quotidiana (idAnimale, idOperaio, Data, Pulizia, Mungitura1, Mungitura2, Alimentazione)
    SELECT a.ID, a.idOperaio, ?, 0, 0, 0, 0
    FROM Animale a
    JOIN Utente u ON a.idOperaio = u.ID
    WHERE u.Disattivato = 0
      AND a.idOperaio IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM Quotidiana q
        WHERE q.idAnimale = a.ID AND DATE(q.Data) = ?
      )
  `;

  conn.query(query, [dataOggi, dataOggi], (err, result) => {
    if (err) {
      console.error(" Errore nella creazione delle quotidiane:", err);
    } else {
      console.log(`Quotidiane create: ${result.affectedRows}`);
    }
  });
}

module.exports = creaQuotidianeOggi;