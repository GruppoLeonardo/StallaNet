const express = require('express'); // creare API REST , HTTP
const mysql = require('mysql2'); // 2 = pacchetto piu' moderno e asincrono
const cors = require('cors'); // Blocca/Permette richieste da altri domini o porte (3001+5173) 
const bodyParser = require('body-parser'); // Per leggere JSON dentro ai POST 

const {
  getDataOdierna,
  getOraAttuale,
  formattaDurata,
  calcolaTempoTrascorsoOperai,
  calcolaDifferenzaOrari
} = require('./utils');

require('./tasks/scheduler');
const conn = require('./connDb');// crea ad attiva la connessione al database

const app = express(); // crea istanza express (per usare app.get() , app.post()...)
app.use(cors());
app.use(bodyParser.json());


//ACCESSO.JSX
// -------------------- /ACCESSO   (Login utente, verifica credenziali, definizione ruolo e stato del cartellino)----------------------
  app.post('/accesso', (req, res) => {
    const { nomeUtente, password } = req.body; //metti in costanti dati JSON arrivati da frontend 

    //Query per trovare utente che sta accedendo.
    const utenteQuery = 
    `SELECT * FROM Utente 
    WHERE NomeUtente = ? AND Psw = ? AND Disattivato = 0`;

    // Controlla se utente e' presente in database
    conn.query(utenteQuery, [nomeUtente, password], (err, results) => {
      if (err) return res.status(500).json({ error: 'Errore server' });
      if (results.length === 0) {
        return res.status(401).json({ error: 'Credenziali errate' });
    }

      const utente = results[0]; // Array Dati Utente trovato

      // Controlla se e' Direttore
      if (utente.Ruolo === 'direttore') { 
        return res.json({
          success: true,
          ruolo: 'direttore',
          idUtente: utente.ID
        });
      }

      const oggi = getDataOdierna(); //hardcoded 

      const cartellinoQuery = `
        SELECT * FROM Cartellino
        WHERE idUtente = ? AND Data = ?
      `;

      // Trova cartellino odierno dell'utente
      conn.query(cartellinoQuery, [utente.ID, oggi], (err2, cartellinoResults) => {
        if (err2) return res.status(500).json({ error: 'Errore cartellino' });

        if (cartellinoResults.length === 0) {
          return res.status(400).json({ error: 'Nessun cartellino trovato per oggi' });
        }

        const cartellino = cartellinoResults[0]; // Array dati Cartellino trovato 
        
        //Logica di indirizzamento basta su Cartellino

        //TURNO NON INIZIATO
        if (!cartellino.OraIngresso && !cartellino.OraUscita) {
          return res.json({
            success: true,
            ruolo: utente.Ruolo,
            idUtente: utente.ID,
            stato: 'timbraEntrata'
          });
        }
        //TURNO INIZIATO
        if (cartellino.OraIngresso && !cartellino.OraUscita) {
          return res.json({
            success: true,
            ruolo: utente.Ruolo,
            idUtente: utente.ID,
            stato: 'turnoAttivo'
          });
        }
        //TURNO GIA' FINITO
        if (cartellino.OraIngresso && cartellino.OraUscita) {
          return res.json({
            success: true,
            ruolo: utente.Ruolo,
            idUtente: utente.ID,
            stato: 'turnoTerminato'
          });
        }

        res.status(500).json({ error: 'Stato cartellino non gestito' });
      });
    });
  });


//TIMBRAENTRATA.JSX
// -------------------- /TIMBRA-INGRESSO   (Segna OraIngresso in Cartellino) ----------------------
  app.post('/timbra-ingresso', (req, res) => {
    const {idUtente} = req.body; //id utente
    const ora = getOraAttuale();
    const data = getDataOdierna(); // hardoded 

    const updateQuery = 
    `UPDATE Cartellino
    SET OraIngresso = ?
    WHERE idUtente = ? AND Data = ?`;

    //Per capire se va mandato a : /HomeOperaio o /GestorePagHome.
    const ruoloQuery = 
    `SELECT Ruolo FROM Utente 
    WHERE ID = ?`;
    
    //Segna OraIngresso
    conn.query(updateQuery, [ora, idUtente, data], (err) => {
      if (err) return res.status(500).json({ success: false });

      //Manda a TimbraEntrata il ruolo
      conn.query(ruoloQuery, [idUtente], (err2, results) => {
        if (err2 || results.length === 0) return res.status(500).json({ success: false });
        res.json({ success: true, ruolo: results[0].Ruolo });
      });
    });
  });


//TIMBRAUSCITA.JSX
// -------------------- /ORE-LAVORATE    (Calcola ore lavorate da mostrare in uscita) --------------------         
  app.get('/timbra-uscita/ore-lavorate/:idUtente', (req, res) => {
  const idUtente = req.params.idUtente;
  const data = getDataOdierna();

  const query = `
    SELECT OraIngresso
    FROM Cartellino
    WHERE idUtente = ? AND DATE(Data) = ?
  `;

  conn.query(query, [idUtente, data], (err, result) => {
    if (err) {
      console.error('Errore nel calcolo minuti lavorati:', err);
      return res.status(500).json({ error: 'Errore server' });
    }

    const oraIngresso = result[0]?.OraIngresso;
    if (!oraIngresso) {
      return res.status(404).json({ error: 'Ora di ingresso non trovata' });
    }

    const now = new Date(); // ora attuale del sistema
    const oggi = getDataOdierna();
    const ingresso = new Date(`${oggi}T${oraIngresso}`);

    const diffMs = now - ingresso;
    const diffMinuti = Math.max(Math.floor(diffMs / 60000), 0);
    const ore = String(Math.floor(diffMinuti / 60)).padStart(2, '0');
    const minuti = String(diffMinuti % 60).padStart(2, '0');

    res.json({ oreLavoro: `${ore}:${minuti}` });
  });
  });

// -------------------- /TIMBRA-USCITA    (Segna OraUscita in Cartellino) -----------------
  app.post('/timbra-uscita', (req, res) => {
    const { idUtente } = req.body;
    const ora = getOraAttuale(); // hardcoded
    const data = getDataOdierna(); // hardcoded
  
    const query = `
      UPDATE Cartellino
      SET OraUscita = ?
      WHERE idUtente = ? AND Data = ?
    `;
  
    conn.query(query, [ora, idUtente, data], (err) => {
      if (err) {
        console.error('Errore durante la timbratura di uscita', err);
        return res.status(500).json({ success: false });
      }
      res.json({ success: true });
    });
  });


//HOMEOPERAIO.JSX
// --------------------- /DATI-OPERAIO    (Carica Mansioni Quotidiane/Accessorie dell'operaio)-----------------
  app.get('/home-operaio/dati-operaio/:idUtente', (req, res) => {
  const idUtente = req.params.idUtente;
  const data = getDataOdierna();

  const cartellinoQuery = `
    SELECT OraIngresso
    FROM Cartellino
    WHERE idUtente = ? AND DATE(Data) = ?
  `;

  const bestiameQuery = `
    SELECT Q.ID, Q.idAnimale, Q.Pulizia, Q.Mungitura1, Q.Mungitura2, Q.Alimentazione
    FROM Quotidiana Q
    WHERE Q.idOperaio = ? AND DATE(Q.Data) = ?
  `;

  const accessorieQuery = `
    SELECT ID, Testo, Stato
    FROM Comunicazione
    WHERE idDestinatario = ? AND DATE(DataInvio) = ? AND idMittente IN (
      SELECT U2.ID FROM Utente U2 WHERE U2.Ruolo = 'gestore'
    )
  `;

  const finalResponse = {};

  conn.query(cartellinoQuery, [idUtente, data], (err, cartResult) => {
    if (err) return res.status(500).json({ error: 'Errore cartellino' });

    const oraIngresso = cartResult[0]?.OraIngresso || null;
    finalResponse.oraIngresso = oraIngresso;

    if (oraIngresso) {
      const ingresso = new Date(`${data}T${oraIngresso}`);
      const now = new Date();
      const diffMinuti = Math.max(Math.floor((now - ingresso) / 60000), 0);
      finalResponse.oreLavoro = formattaDurata(diffMinuti);
    } else {
      finalResponse.oreLavoro = "00:00";
    }

    conn.query(bestiameQuery, [idUtente, data], (err2, bestiameResult) => {
      if (err2) return res.status(500).json({ error: 'Errore bestiame' });
      finalResponse.capiBestiame = bestiameResult;

      conn.query(accessorieQuery, [idUtente, data], (err3, accessorieResult) => {
        if (err3) return res.status(500).json({ error: 'Errore accessorie' });
        finalResponse.mansioniAccessorie = accessorieResult;

        res.json(finalResponse);
      });
    });
  });
  });

// --------------------- /NOME-GESTORE   (Recupera il Gestore dell'operaio) -----------------
  app.get('/home-operaio/nome-gestore/:idUtente', (req, res) => {
    const { idUtente } = req.params;

    const query = `
      SELECT u.NomeUtente AS NomeGestore
      FROM Utente o
      JOIN Animale a ON a.idOperaio = o.ID
      JOIN Gestione g ON a.idStalla = g.idStalla
      JOIN Utente u ON g.idGestore = u.ID
      WHERE o.ID = ?
      LIMIT 1
    `;

    conn.query(query, [idUtente], (err, rows) => {
      if (err) {
        console.error('Errore nel recupero del gestore:', err);
        return res.status(500).json({ message: "Errore interno del server" });
      }

      if (rows.length === 0) {
        return res.status(404).json({ message: "Gestore non trovato" });
      }

      res.json(rows[0]); 
    });
  });
  
// --------------------- /AGGIORNA-QUOTIDIANE    (Aggiornare la tabella delle Mansioni Quotidiane)-----------------
  app.post('/home-operaio/aggiorna-quotidiane', (req, res) => {
    const { idQuotidiana, campo, valore } = req.body;
  
    // Protezione: Si possono aggiornare solo i 4 campi
    const campiValidi = ['Pulizia', 'Mungitura1', 'Mungitura2', 'Alimentazione'];
    if (!campiValidi.includes(campo)) {
      return res.status(400).json({ success: false, message: 'Campo non valido' });
    }
    
    const query = 
    `UPDATE Quotidiana SET ${campo} = ? WHERE ID = ?`;

    //Manda true a toggleMansione , se casella si e' aggiornata
    conn.query(query, [valore, idQuotidiana], (err) => {
      if (err) {
        console.error('Errore MySQL:', err);
        return res.status(500).json({ success: false });
      }
      res.json({ success: true });
    });
  });

// --------------------- /AGGIORNA-MANSIONE-ACCESSORIA    (Aggiornare le Mansioni accessorie)-----------------
  app.post('/home-operaio/aggiorna-mansione-accessoria', (req, res) => {
    const { idComunicazione, nuovoStato } = req.body;

    const query = 
    `UPDATE Comunicazione SET Stato = ? WHERE ID = ?`;

    //Trova la comunicazione , se casella si aggiorna , manda true alle checkbox.
    conn.query(query, [nuovoStato, idComunicazione], (err) => {
      if (err) {
        console.error('Errore aggiornamento comunicazione:', err);
        return res.status(500).json({ success: false });
      }
      console.log(`✓ Stato comunicazione ${idComunicazione} aggiornato a ${nuovoStato}`);
      res.json({ success: true });
    });
  });

// --------------------- /INVIA-SEGNALAZIONE          (Segna la comunicazione al Gestore)-----------------
  app.post('/home-operaio/invia-segnalazione', (req, res) => {
    const { idMittente, testo } = req.body;
    const data = new Date(); // hardcoded 
  
    // Capire in che stalla lavora l'operaio
    const getStallaQuery = 
    `SELECT idStalla FROM Animale
    WHERE idOperaio = ?
    LIMIT 1`; // Operaio lavora in solo una stalla , quindi basta trovare un animale
    

    conn.query(getStallaQuery, [idMittente], (err, stallaResult) => {
      if (err || stallaResult.length === 0) {
        console.error('Errore recupero stalla', err);
        return res.status(500).json({ success: false });
      }
  
      const idStalla = stallaResult[0].idStalla;
      
      // Trovare Gestore della stalla
      const getGestoreQuery = `
        SELECT IdGestore FROM Gestione
        WHERE idStalla = ?
      `;
      
      conn.query(getGestoreQuery, [idStalla], (err2, gestoreResult) => {
        if (err2 || gestoreResult.length === 0) {
          console.error('Errore recupero gestore', err2);
          return res.status(500).json({ success: false });
        }
        
        const idDestinatario = gestoreResult[0].IdGestore;
        
        // Creare nuova istanza di Comunicazione nel database
        const insertQuery = `
          INSERT INTO Comunicazione (Testo, Stato, idMittente, idDestinatario, DataInvio)
          VALUES (?, 0, ?, ?, ?)
        `;
  
        conn.query(insertQuery, [testo, idMittente, idDestinatario, data], (err3) => {
          if (err3) {
            console.error('Errore inserimento comunicazione', err3);
            return res.status(500).json({ success: false });
          }
  
          console.log(`✓ Segnalazione inviata da ${idMittente} a ${idDestinatario}`);
          res.json({ success: true }); // Se va bene manda true a HomeOperaio
        });
      });
    });
  });


// GESTOREPAGHOME.JSX
// --------------------- /GESTORE-PAG-HOME           (Mostra ore lavorate,visualizzare comunicazioni,vedere e filtrare i Partner) -----------------
  app.get('/gestore-pag-home/:idUtente', (req, res) => {
    const idUtente = req.params.idUtente;
    const data = getDataOdierna(); // usa la data odierna reale
    const ruoloPartner = req.query.ruoloPartner || 'fornitore';

    const oreQuery = `
      SELECT OraIngresso, OraUscita
      FROM Cartellino
      WHERE idUtente = ? AND DATE(Data) = ?
    `;

    const comunicazioniQuery = `
      SELECT ID, Testo, Stato
      FROM Comunicazione
      WHERE idDestinatario = ? AND DATE(DataInvio) = ?
    `;

    const partnerQuery = `
      SELECT P.ID, P.Nominativo, P.Descrizione, P.Telefono , P.Email
      FROM Partner P
      JOIN Corrispondenza C ON C.idPartner = P.ID
      WHERE C.idGestore = ? AND P.Ruolo = ?
    `;

    const result = {};

    conn.query(oreQuery, [idUtente, data], (err, oreRes) => {
      if (err) return res.status(500).json({ error: 'Errore ore' });

      const oraIngresso = oreRes[0]?.OraIngresso;
      const oraUscita = oreRes[0]?.OraUscita;

      result.oraIngresso = oraIngresso || null; // 👈 AGGIUNTO

      if (!oraIngresso) {
        result.oreLavoro = "00:00";
      } else {
        const inizio = new Date(`${data}T${oraIngresso}`);
        const fine = oraUscita ? new Date(`${data}T${oraUscita}`) : new Date();
        const diffMinuti = Math.max(Math.floor((fine - inizio) / 60000), 0);
        const ore = String(Math.floor(diffMinuti / 60)).padStart(2, '0');
        const minuti = String(diffMinuti % 60).padStart(2, '0');
        result.oreLavoro = `${ore}:${minuti}`;
      }

      conn.query(comunicazioniQuery, [idUtente, data], (err2, commRes) => {
        if (err2) return res.status(500).json({ error: 'Errore comunicazioni' });

        result.comunicazioni = commRes;

        conn.query(partnerQuery, [idUtente, ruoloPartner], (err3, partnerRes) => {
          if (err3) return res.status(500).json({ error: 'Errore contatti' });

          result.contatti = partnerRes;
          res.json(result);
        });
      });
    });
  });

// --------------------- /AGGIORNA-LETTURA            (Aggiorna in DB le modifiche fatte alla tabella Comunicazioni) -----------------
  app.post('/gestore-pag-home/aggiorna-lettura', (req, res) => {
    const { idComunicazione, nuovoStato } = req.body; // riceve valori
  
    const query = // aggiorna la comunicazione
    `UPDATE Comunicazione SET Stato = ?
    WHERE ID = ?`;
  
    conn.query(query, [nuovoStato, idComunicazione], (err) => {
      if (err) return res.status(500).json({ success: false }); // segnala un possibile errore
      res.json({ success: true }); // manda il risultato in json 
    });
  });


// GESTOREPAGOPERAI.JSX
//--------------------- /STALLA-DEL-GESTORE        (recupera la stalla affidata al Gestore)----------------------
  app.get('/gestore-pag-operai/stalla-del-gestore/:idGestore', (req, res) => {
  const idGestore = req.params.idGestore;

  const query = `
    SELECT idStalla
    FROM Gestione
    WHERE idGestore = ?
    LIMIT 1
  `;

  conn.query(query, [idGestore], (err, results) => {
    if (err) {
      console.error('Errore recupero stalla:', err);
      return res.status(500).json({ error: 'Errore server' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Stalla non trovata' });
    }

    res.json({ idStalla: results[0].idStalla });
  });
});

//--------------------- /OPERAI-IN-STALLA           (recupero Elenco operai assegnati in questa stalla + ore lavorate da ognuno)--------------------- 
  app.get('/gestore-pag-operai/operai-in-stalla/:idStalla', (req, res) => {
  const idStalla = req.params.idStalla;
  const dataOggi = getDataOdierna(); // usa data reale

  const query = `
    SELECT 
      u.ID AS IdOperaio,
      u.NomeUtente,

      (
        SELECT COUNT(*)
        FROM Quotidiana q
        WHERE q.idOperaio = u.ID 
          AND DATE(q.Data) = ?
          AND q.Pulizia = 1
          AND q.idAnimale IS NOT NULL
      ) AS PulizieSvolte,

      (
        SELECT SUM(
          (CASE WHEN q.Mungitura1 = 1 THEN 1 ELSE 0 END) + 
          (CASE WHEN q.Mungitura2 = 1 THEN 1 ELSE 0 END)
        )
        FROM Quotidiana q
        WHERE q.idOperaio = u.ID 
          AND DATE(q.Data) = ?
          AND q.idAnimale IS NOT NULL
      ) AS MungitureSvolte,

      (
        SELECT COUNT(*)
        FROM Quotidiana q
        WHERE q.idOperaio = u.ID 
          AND DATE(q.Data) = ?
          AND q.Alimentazione = 1
          AND q.idAnimale IS NOT NULL
      ) AS AlimentazioniSvolte,

      (
        SELECT COUNT(*)
        FROM Comunicazione c
        WHERE c.idDestinatario = u.ID 
          AND DATE(c.DataInvio) = ?
          AND c.idMittente IN (
            SELECT ID FROM Utente WHERE Ruolo = 'gestore'
          )
          AND c.Stato = 1
      ) AS MansioniSvolte,

      -- Ora di ingresso (una sola colonna)
      (
        SELECT ca.OraIngresso
        FROM Cartellino ca
        WHERE ca.idUtente = u.ID 
          AND DATE(ca.Data) = ?
        LIMIT 1
      ) AS OraIngresso,

      -- Ora di uscita (una sola colonna)
      (
        SELECT ca.OraUscita
        FROM Cartellino ca
        WHERE ca.idUtente = u.ID 
          AND DATE(ca.Data) = ?
        LIMIT 1
      ) AS OraUscita,

      (
        SELECT COUNT(*) * 2
        FROM Quotidiana q
        WHERE q.idOperaio = u.ID 
          AND DATE(q.Data) = ?
          AND q.idAnimale IS NOT NULL
      ) AS TotaleMungiture,

      (
        SELECT COUNT(*)
        FROM Quotidiana q
        WHERE q.idOperaio = u.ID 
          AND DATE(q.Data) = ?
          AND q.idAnimale IS NOT NULL
      ) AS TotaleQuotidiane,

      (
        SELECT COUNT(*)
        FROM Comunicazione c
        WHERE c.idDestinatario = u.ID 
          AND DATE(c.DataInvio) = ?
      ) AS TotaleMansioni

    FROM Utente u
    WHERE 
      u.Ruolo = 'operaio' 
      AND u.Disattivato = 0 
      AND u.idStalla = ?
  `;

  // Nota: il valore ? viene sostituito *in ordine* quindi va replicato per ogni sottoselezione che usa la data
  const placeholders = [
  dataOggi, // Pulizie
  dataOggi, // Mungiture
  dataOggi, // Alimentazioni
  dataOggi, // Mansioni svolte
  dataOggi, // OraIngresso
  dataOggi, // OraUscita
  dataOggi, // Totale mungiture
  dataOggi, // Totale quotidiane
  dataOggi, // Totale mansioni
  idStalla  // Stalla
  ];

  //per restituire a GestorePagOperai.jsx direttamente le ore lavorate di ogni operaio
  conn.query(query, placeholders, (err, results) => {  
    const operaiModificati = results.map(operaio => {
      const ingresso = operaio.OraIngresso;
      const uscita = operaio.OraUscita;

      //se non è presente OraIngresso allora OreLavorate = "00:00"
      if (!ingresso) {
        operaio.OreLavorate = "00:00";
        return operaio;
      }

      //se è presente OraUscita allora usala per il calcolo
      if (uscita) {
        operaio.OreLavorate = calcolaDifferenzaOrari(ingresso, uscita); 
      } else {
        operaio.OreLavorate = calcolaTempoTrascorsoOperai(ingresso);
      }

      return operaio;
    });

    res.json({ operai: operaiModificati });
  });
});

//--------------------- /ORARIO-INGRESSO          (recupera le ore lavorate dal Gestore)--------------------- 
  app.get('/gestore-pag-operai/orario-ingresso/:idUtente', (req, res) => {
  const { idUtente } = req.params;
  const dataOggi = getDataOdierna();

  const query = `
    SELECT OraIngresso
    FROM Cartellino
    WHERE idUtente = ? AND DATE(Data) = ?
    LIMIT 1
  `;

  conn.query(query, [idUtente, dataOggi], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Errore server" });
    }

    if (!rows || rows.length === 0 || !rows[0].OraIngresso) {
      return res.json({ orarioIngresso: null });
    }

    const orario = rows[0].OraIngresso.toString(); 
    res.json({ orarioIngresso: orario });
  });
});

//---------------------/MUCCHE-IN-STALLA          (recupero mucche assegnate agli operai)--------------------- 
  app.get('/gestore-pag-operai/mucche-in-stalla/:idStalla', (req, res) => {
    const idStalla = req.params.idStalla;

    const query = `
    SELECT a.ID, u.NomeUtente AS OperaioCorrente
    FROM Animale a
    LEFT JOIN Utente u ON a.idOperaio = u.ID
    WHERE a.idStalla = ?
    ORDER BY u.NomeUtente IS NULL, u.NomeUtente, a.ID
  `;

    conn.query(query, [idStalla], (err, result) => {
      if (err) {
        console.error("Errore mucche gestore (by idStalla):", err);
        return res.status(500).json({ error: 'Errore server' });
      }
      res.json(result);
    });
  });

//--------------------- /OPERAI-PER-POPUP           (recupera OPERAI in base alla STALLA (per popup MODIFICA))--------------------- 
  app.get('/gestore-pag-operai/operai-per-popup-modifica/:idStalla', (req, res) => {
    const idStalla = req.params.idStalla;

    const query = `
      SELECT ID, NomeUtente, Psw
      FROM Utente
      WHERE Ruolo = 'operaio' AND Disattivato = 0 AND idStalla = ?
    `;

    conn.query(query, [idStalla], (err, results) => {
      if (err) {
        console.error("Errore recupero operai:", err);
        return res.status(500).json({ error: "Errore server" });
      }

      res.json(results);
    });
  });

//--------------------- /OPERAI-ELIMINABILI       (recupero operai eliminabili)--------------------- 
  app.get('/gestore-pag-operai/operai-eliminabili/:idStalla', (req, res) => {
    const idStalla = req.params.idStalla;

    const query = `
      SELECT ID, NomeUtente
      FROM Utente
      WHERE Ruolo = 'operaio'
        AND Disattivato = 0
        AND idStalla = ?
    `;

    conn.query(query, [idStalla], (err, results) => {
      if (err) {
        console.error("Errore recupero operai per eliminazione:", err);
        return res.status(500).json({ error: "Errore server" });
      }

      res.json(results);
    });
  });

//--------------------- /INVIA-MANSIONE-ACCESSORIA      (invio di Mansione Accessoria) --------------------- 
  app.post('/gestore-pag-operai/invia-mansione-accessoria', (req, res) => {
  const { idMittente, idDestinatario, testo } = req.body;

  const data = getDataOdierna();
  const ora = getOraAttuale();
  const dataOraCompleta = `${data} ${ora}`;  //unione di data e orario

  const insertQuery = `
    INSERT INTO Comunicazione (Testo, Stato, idMittente, idDestinatario, DataInvio)
    VALUES (?, 0, ?, ?, ?)
  `;

  conn.query(insertQuery, [testo, idMittente, idDestinatario, dataOraCompleta], (err, result) => {
    if (err) {
      console.error('Errore inserimento mansione accessoria', err);
      return res.status(500).json({ success: false });
    }
    res.json({ success: true });
  });
});

//---------------------/AGGIUNGI-OPERAIO           (aggiunta di un nuovo operaio) --------------------- 
  app.post('/gestore-pag-operai/aggiungi-operaio', (req, res) => {
  const { nomeUtente, password, mucche, idStalla } = req.body;
  const dataOggi = getDataOdierna(); //'YYYY-MM-DD'

  if (!nomeUtente || !password || !idStalla) {
    return res.status(400).json({ success: false, message: 'Dati mancanti.' });
  }

  const muccheArray = Array.isArray(mucche) ? mucche : [];

  const insertOperaioQuery = `
    INSERT INTO Utente (NomeUtente, Psw, Ruolo, Disattivato, idStalla)
    VALUES (?, ?, 'operaio', 0, ?)
  `;

  conn.query(insertOperaioQuery, [nomeUtente, password, idStalla], (err, result) => {
    if (err) {
      console.error("Errore creazione operaio:", err);
      return res.status(500).json({ success: false });
    }

    const nuovoID = result.insertId;

    //creazione di un nuovo CARTELLINO per l'operaio aggiunto
    const insertCartellinoQuery = `
      INSERT INTO Cartellino (idUtente, Data)
      VALUES (?, ?)
    `;
    conn.query(insertCartellinoQuery, [nuovoID, dataOggi], (err2) => {
      if (err2) {
        console.error("Errore inserimento cartellino:", err2);
      }

      //se non sono state selezione mucche da trasferire
      if (muccheArray.length === 0) {
        return res.json({ success: true });
      }

      //assegnazione mucche e delle loro quotidiane all'operaio
      const updateMuccheQuery =`UPDATE Animale SET idOperaio = ? WHERE ID = ?`;
      const updateQuotidianeQuery = `
        UPDATE Quotidiana SET idOperaio = ?
        WHERE idAnimale = ? AND DATE(Data) = ?
      `;

      const updates = muccheArray.map(idMucca => new Promise((resolve, reject) => {
        conn.query(updateMuccheQuery, [nuovoID, idMucca], (err1) => {
          if (err1) return reject(err1);

          conn.query(updateQuotidianeQuery, [nuovoID, idMucca, dataOggi], (err2) => {
            if (err2) return reject(err2);
            resolve();
          });
        });
      }));

      Promise.all(updates)
        .then(() => res.json({ success: true }))
        .catch(error => {
          console.error("Errore aggiornamento mucche o quotidiane:", error);
          res.status(500).json({ success: false });
        });
    });
  });
});

//---------------------/MODIFICA-OPERAIO        (modifica dati di un operaio)
  app.post('/gestore-pag-operai/modifica-operaio', (req, res) => {
    const { idOperaio, nuovoNomeUtente, nuovaPassword } = req.body;

    if (!idOperaio || !nuovoNomeUtente || !nuovaPassword) {
      return res.status(400).json({ success: false, message: 'Dati mancanti per la modifica.' });
    }

    const query = `
      UPDATE Utente
      SET NomeUtente = ?, Psw = ?
      WHERE ID = ? AND Ruolo = 'operaio'
    `;

    conn.query(query, [nuovoNomeUtente, nuovaPassword, idOperaio], (err, result) => {
      if (err) {
        console.error("Errore modifica operaio:", err);
        return res.status(500).json({ success: false });
      }

      res.json({ success: true });
    });
  });

//---------------------/ELIMINA-OPERAIO       (elimina un operaio)
  app.post('/gestore-pag-operai/elimina-operaio', (req, res) => {
    const { idOperaio } = req.body;

    if (!idOperaio) {
      return res.status(400).json({ success: false, message: 'Operaio non selezionato.' });
    }

    const checkMuccheQuery = `
      SELECT COUNT(*) AS count
      FROM Animale
      WHERE idOperaio = ?
    `;

    conn.query(checkMuccheQuery, [idOperaio], (err, result) => {
      if (err) {
        console.error("Errore controllo mucche:", err);
        return res.status(500).json({ success: false, message: 'Errore controllo mucche.' });
      }

      if (result[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: 'Per eliminare un operaio è necessario che non abbia nessuna mucca associata ad esso.'
        });
      }

      const eliminaQuery = `
        UPDATE Utente
        SET Disattivato = 1
        WHERE ID = ?
      `;

      conn.query(eliminaQuery, [idOperaio], (err2) => {
        if (err2) {
          console.error("Errore eliminazione operaio:", err2);
          return res.status(500).json({ success: false, message: 'Errore eliminazione.' });
        }

        res.json({ success: true });
      });
    });
  });


// GESTOREPAGMUCCHE.JSX
// --------------------- /MUCCHE-IN-STALLA        (Trova tutte le mucche presenti nella stalla del Gestore) ----------------------
  app.get('/gestore-pag-mucche/mucche-in-stalla/:idUtente', (req, res) => {
    const { idUtente } = req.params;

    const query = `
      SELECT 
        S.ID as idStalla,
        S.Posizione as posizioneStalla,
        A.ID as ID,
        A.Nota,
        A.Vaccinazioni,
        A.idOperaio,
        U2.NomeUtente as NomeOperaio
      FROM Gestione G
      JOIN Stalla S ON G.idStalla = S.ID
      LEFT JOIN Animale A ON A.idStalla = S.ID
      LEFT JOIN Utente U2 ON A.idOperaio = U2.ID
      WHERE G.IdGestore = ?
    `;

    conn.query(query, [idUtente], (err, results) => {
      if (err) {
        console.error("Errore nella query mucche-gestore:", err);
        return res.status(500).json({ error: 'Errore interno server' });
      }

      if (!results || results.length === 0) {
        return res.status(404).json({ error: 'Nessun dato trovato per questo gestore' });
      }

      const mucche = results.filter(r => r.ID !== null);
      const idStalla = results[0].idStalla || null;
      const posizioneStalla = results[0].posizioneStalla || '';

      res.json({ mucche, idStalla, posizioneStalla });
    });
  });

// ---------------------//OPERAI-IN-STALLA        (Elenco operai disponibili per riassegnare mucche)----------------------
  app.get('/gestore-pag-mucche/operai-in-stalla/:idStalla', (req, res) => {
    const { idStalla } = req.params;

    const query = `
      SELECT 
        U.ID, 
        U.NomeUtente,
        COUNT(A.ID) AS numMucche
      FROM Utente U
      LEFT JOIN Animale A ON A.idOperaio = U.ID
      WHERE 
        U.idStalla = ? 
        AND U.Ruolo = 'operaio'
        AND U.Disattivato = 0
      GROUP BY U.ID
    `;

    conn.query(query, [idStalla], (err, results) => {
      if (err) {
        console.error("Errore nella query operai-stalla:", err);
        return res.status(500).json({ error: 'Errore interno server' });
      }

      res.json({ operai: results });
    });
  });

// --------------------- //ORE-LAVORATE          (Recupera ore lavorate oggi dal gestore)----------------------
  app.get('/gestore-pag-mucche/ore-lavorate/:idUtente', (req, res) => {
    const idUtente = req.params.idUtente;
    const dataOggi = getDataOdierna();

    const query = `
      SELECT OraIngresso
      FROM Cartellino
      WHERE idUtente = ? AND DATE(Data) = ?
    `;

    conn.query(query, [idUtente, dataOggi], (err, result) => {
      if (err) {
        console.error('Errore caricamento oraIngresso:', err);
        return res.status(500).json({ error: 'Errore server' });
      }

      const riga = result[0];
      res.json({ oraIngresso: riga?.OraIngresso || null });
    });
  });

// -------------------- /AGGIUNGI-MUCCA         (POP-UP Aggingi Mucca) ---------------------
  app.post('/gestore-pag-mucche/aggiungi-mucca', (req, res) => {
    const { Nota, Vaccinazioni, idOperaio, idStalla } = req.body; //carica dati inseriti nel form
    const dataOggi = getDataOdierna(); // per ora hardcoded

    const insertMuccaQuery = `
      INSERT INTO Animale (Nota, Vaccinazioni, idOperaio, idStalla)
      VALUES (?, ?, ?, ?)
    `;

    conn.query(insertMuccaQuery, [Nota, Vaccinazioni, idOperaio, idStalla], (err, result) => {// Esegue query (se non definito operaio = null)
      if (err) {
        console.error("Errore inserimento mucca:", err);
        return res.status(500).json({ success: false });
      }

      const idNuovaMucca = result.insertId;

      const insertQuotidianaQuery = `
        INSERT INTO Quotidiana (idAnimale, idOperaio, Data, Pulizia, Mungitura1, Mungitura2, Alimentazione)
        VALUES (?, ?, ?, 0, 0, 0, 0)
      `;

      conn.query(insertQuotidianaQuery, [idNuovaMucca, idOperaio, dataOggi], (err2) => { 
        if (err2) {
          console.error("Errore creazione mansione quotidiana:", err2);
          return res.status(500).json({ success: false });
        }

        res.json({ success: true }); //Risponde al frontend
      });
    });
  });
  
// -------------------- /MODIFICA-MUCCA          (POP-UP Modifica Dati Mucca)---------------------
  app.post('/gestore-pag-mucche/modifica-mucca', (req, res) => {
  const { idMucca, Nota, Vaccinazioni, idOperaio } = req.body;
  const dataOggi = getDataOdierna(); // hardcoded per ora

  // Recupera i dati attuali della mucca
  const getQuery = `SELECT Nota, Vaccinazioni, idOperaio FROM Animale WHERE ID = ?`;

  conn.query(getQuery, [idMucca], (err, result) => {
    if (err || result.length === 0) {
      console.error('Errore nel recupero dati esistenti', err);
      return res.status(500).json({ success: false });
    }

    const attuale = result[0];

    const nuovaNota = Nota !== '' ? Nota : attuale.Nota;
    const nuovaVacc = Vaccinazioni !== '' ? Vaccinazioni : attuale.Vaccinazioni;
    const nuovoOperaio = idOperaio !== '' ? idOperaio : attuale.idOperaio;

    // 1. Aggiorna la tabella Animale
    const updateAnimaleQuery = `
      UPDATE Animale
      SET Nota = ?, Vaccinazioni = ?, idOperaio = ?
      WHERE ID = ?
    `;

    conn.query(updateAnimaleQuery, [nuovaNota, nuovaVacc, nuovoOperaio, idMucca], (err2) => {
      if (err2) {
        console.error('Errore aggiornamento mucca', err2);
        return res.status(500).json({ success: false });
      }

      // 2. Aggiorna la tabella Quotidiana: cambia idOperaio mantenendo i campi esistenti
      const updateQuotidianaQuery = `
        UPDATE Quotidiana
        SET idOperaio = ?
        WHERE idAnimale = ? AND DATE(Data) = ?
      `;

      conn.query(updateQuotidianaQuery, [nuovoOperaio, idMucca, dataOggi], (err3) => {
        if (err3) {
          console.error('Errore aggiornamento quotidiana', err3);
          return res.status(500).json({ success: false });
        }

        res.json({ success: true });
      });
    });
  });
  });

// -------------------- /ELIMINA-MUCCA            (POP-UP Elimina Mucca)---------------------
  app.post('/gestore-pag-mucche/elimina-mucca', (req, res) => {
    const { idMucca } = req.body; 
  
    const query =  //Cancella uma mucca dal DB
      `DELETE FROM Animale
      WHERE ID = ? `;
  
    conn.query(query, [idMucca], (err) => { //esegue query
      if (err) {
        console.error('Errore eliminazione mucca', err);
        return res.status(500).json({ success: false });
      }
  
      res.json({ success: true }); // risponde al frontend
    });
  });


// HOMEDIRETTORE.JSX
// ------------------- /STATO-AZIENDA     (Ottiene i dati riassuntivi dell'intera azienda) -----------------
  app.get('/home-direttore/stato-azienda', (req, res) => {
    const data = getDataOdierna(); // hardcoded

    const produzioneLatteQuery =  // Calcolare produzione odierna di latte (1 mungitura = 13 litri)
    `SELECT 
      SUM ((CASE WHEN Mungitura1 = 1 THEN 13 ELSE 0 END) + 
          (CASE WHEN Mungitura2 = 1 THEN 13 ELSE 0 END)) AS latte
    FROM Quotidiana
    WHERE DATE(Data) = ? AND idAnimale IS NOT NULL
    `;

    const consumoMangimeQuery =  // Calcolare consumo odierno di mangime (1 alimentazione = 45kg)
    `SELECT 
      SUM(CASE WHEN Alimentazione = 1 THEN 45 ELSE 0 END) AS mangime
    FROM Quotidiana
    WHERE DATE(Data) = ? AND idAnimale IS NOT NULL
    `;

    const gradoPuliziaQuery =   // Calcolare grado di pulizia 
    `SELECT 
      (SUM(CASE WHEN Pulizia = 1 THEN 1 ELSE 0 END) / COUNT(*)) * 100 AS pulizia
    FROM Quotidiana
    WHERE DATE(Data) = ? AND idAnimale IS NOT NULL
    `;

    const costoManodoperaQuery = // Calcolare costo manodopera giornaliero (Operaio:112 , Gestore:205)
    `SELECT 
      SUM(CASE WHEN Ruolo = 'operaio' THEN 112 
              WHEN Ruolo = 'gestore' THEN 205 
              ELSE 0 END) AS costo
      FROM Utente
      WHERE Disattivato = 0`;

    const numOperaiQuery = // Calcola numero operai attivi 
    `SELECT COUNT(*) AS operai
      FROM Utente
      WHERE Ruolo = 'operaio' AND Disattivato = 0`;

    const numGestoriQuery = // Calcola numero gestori attivi 
      `SELECT COUNT(*) AS gestori
      FROM Utente
      WHERE Ruolo = 'gestore' AND Disattivato = 0`;

    const numBestiameQuery = // Calcolare numero totale di mucche
      `SELECT COUNT(*) AS bestie
      FROM Animale`;

    const result = {}; // raccoglie risultati di tutte query s

    //Esegue tutte le query in database
    conn.query(produzioneLatteQuery, [data], (err, latteRes) => {
      if (err) return res.status(500).json({ error: 'Errore latte' });
      result.latte = latteRes[0]?.latte || 0;

      conn.query(consumoMangimeQuery, [data], (err2, mangimeRes) => {
        if (err2) return res.status(500).json({ error: 'Errore mangime' });
        result.mangime = mangimeRes[0]?.mangime || 0;

        conn.query(gradoPuliziaQuery, [data], (err3, puliziaRes) => {
          if (err3) return res.status(500).json({ error: 'Errore pulizia' });
          result.pulizia = Math.round(puliziaRes[0]?.pulizia || 0);

          conn.query(costoManodoperaQuery, (err4, costoRes) => {
            if (err4) return res.status(500).json({ error: 'Errore costo' });
            result.costo = costoRes[0]?.costo || 0;

            conn.query(numOperaiQuery, (err5, operaiRes) => {
              if (err5) return res.status(500).json({ error: 'Errore operai' });
              result.operai = operaiRes[0]?.operai || 0;

              conn.query(numGestoriQuery, (err6, gestoriRes) => {
                if (err6) return res.status(500).json({ error: 'Errore gestori' });
                result.gestori = gestoriRes[0]?.gestori || 0;

                conn.query(numBestiameQuery, (err7, bestieRes) => {
                  if (err7) return res.status(500).json({ error: 'Errore bestiame' });
                  result.bestie = bestieRes[0]?.bestie || 0;

                  res.json(result); // invia json al frontend
                });
              });
            });
          });
        });
      });
    });
  });

// ----------------- /SINGOLE-STALLE            (Ottiene i dati relativi alle singole stalle)-----------------
  app.get('/home-direttore/singole-stalle', (req, res) => {
  const data = getDataOdierna(); // hardcoded

  const query = // Recupera ID Stalla , Nome Gestore , ID Gestore
  `SELECT S.ID AS idStalla, U.NomeUtente AS nomeGestore, U.ID AS idGestore
    FROM Stalla S
    JOIN Gestione G ON S.ID = G.idStalla
    JOIN Utente U ON G.idGestore = U.ID`;

  conn.query(query, (err, stalleRes) => {
    if (err) return res.status(500).json({ error: 'Errore stalle' });
    const stalle = [];

    const processaStalla = (index) => {
      if (index >= stalleRes.length) return res.json(stalle);

      const stalla = stalleRes[index];
      const idStalla = stalla.idStalla;

      const countQuery = `
        SELECT 
          (SELECT COUNT(*) FROM Utente WHERE Ruolo = 'operaio' AND idStalla = ?) AS numOperai,
          (SELECT COUNT(*) FROM Animale WHERE idStalla = ?) AS numMucche
      `;

      const progressoQuery = `
      SELECT
        SUM(CASE WHEN Mungitura1 = 1 THEN 1 ELSE 0 END + CASE WHEN Mungitura2 = 1 THEN 1 ELSE 0 END) AS mungiture,
        SUM(CASE WHEN Pulizia = 1 THEN 1 ELSE 0 END) AS pulizie,
        SUM(CASE WHEN Alimentazione = 1 THEN 1 ELSE 0 END) AS alimentazioni,
        COUNT(*) * 2 AS totaleMungiture,
        COUNT(*) AS totaleRecord
      FROM Quotidiana Q
      JOIN Animale A ON Q.idAnimale = A.ID
      WHERE A.idStalla = ? AND DATE(Q.Data) = ?
      `;

      conn.query(countQuery, [idStalla, idStalla], (err2, countRes) => {
        if (err2) return res.status(500).json({ error: 'Errore count stalla' });

        conn.query(progressoQuery, [idStalla, data], (err3, progRes) => {
          if (err3) return res.status(500).json({ error: 'Errore progresso stalla' });

          const safeProgRes = (!progRes || progRes.length === 0 || progRes[0] === null)
            ? { mungiture: 0, pulizie: 0, alimentazioni: 0, totaleAttese: 0 }
            : progRes[0];

          const mungiture = safeProgRes.mungiture ?? 0;
          const pulizie = safeProgRes.pulizie ?? 0;
          const alimentazioni = safeProgRes.alimentazioni ?? 0;
          const totaleMungiture = safeProgRes.totaleMungiture ?? 0;
          const totaleRecord = safeProgRes.totaleRecord ?? 1; // fallback

          const mungituraPerc = totaleMungiture > 0 ? Math.round((mungiture / totaleMungiture) * 100) : 0;
          const puliziaPerc = totaleRecord > 0 ? Math.round((pulizie / totaleRecord) * 100) : 0;
          const alimentazionePerc = totaleRecord > 0 ? Math.round((alimentazioni / totaleRecord) * 100) : 0;


          stalle.push({
            idStalla: stalla.idStalla,
            nomeGestore: stalla.nomeGestore,
            idGestore: stalla.idGestore,
            numOperai: countRes[0]?.numOperai || 0,
            numMucche: countRes[0]?.numMucche || 0,
            mungitura: mungituraPerc,
            pulizia: puliziaPerc,
            alimentazione: alimentazionePerc
          });

          processaStalla(index + 1);
        });
      });
    };

    processaStalla(0);
  });
  });

// ----------------- /INVIA-COMUNICAZIONE             (Inserire Comunicazioni nel DB)-----------------
  app.post('/home-direttore/invia-comunicazione', (req, res) => {
  const { idMittente, idDestinatario, testo } = req.body;
  const data = new Date(); 
  const stato = 0;

  const query = `
    INSERT INTO Comunicazione (Testo, Stato, idMittente, idDestinatario, DataInvio)
    VALUES (?, ?, ?, ?, ?)`;

  conn.query(query, [testo, stato, idMittente, idDestinatario, data], (err) => {
    if (err) {
      console.error('Errore invio comunicazione', err);
      return res.status(500).json({ success: false });
    }
    res.json({ success: true });
  });
  });


// AVVIO SERVER EXPRESS
  app.listen(3001, () => {
    console.log('Server avviato su http://localhost:3001');
  });

// MESSAGGIO DI COLLEGAMENTO A localhost:3001
  app.get('/', (req, res) => {
    res.send('StallaNet Backend API attivo 🚜');
  });

