//Modulo node che crea automaticamente le Quotidiane per ogni mucca attualmente affidata ad un operaio attivo , una volta al giorno.

const conn = require('../connDb');
const { getDataOdierna } = require('../utils');

function creaQuotidianeOggi() {
  const dataOggi = getDataOdierna(); //salva Data di oggi
  
  //Crea quotidiana per ogni mucca che rispetta questi criteri 
  //ha idOperaio associato e Operaio non e' disattivato , non ha gia una quotidiana odierna.
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