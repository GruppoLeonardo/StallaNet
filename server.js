const express = require('express'); // creare API REST , HTTP
const mysql = require('mysql2'); // 2 = pacchetto piu' moderno e asincrono
const cors = require('cors'); // Blocca/Permette richieste da altri domini o porte (3001+5173) 
const bodyParser = require('body-parser'); // Per leggere JSON dentro ai POST 

  const app = express(); // crea istanza express (per usare app.get() , app.post()...)
  app.use(cors());
  app.use(bodyParser.json());

  // CONNESSIONE DATABASE
  const conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'SQLitps2324Gio', 
    database: 'StallaNet'
  });

  // Attiva connessione Database
  conn.connect(err => {
    if (err) throw err;
    console.log('Connected to MySQL');
  });





//ACCESSO.JSX
// ----------------- Accesso.jsx --> /LOGIN        (Autenticazione con credenziali/Definire Ruolo/Stato Cartellino)-----------------
  app.post('/login', (req, res) => {
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

      const oggi = '2025-01-01'; //hardcoded 

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
// ----------------- TimbraEntrata.jsx --> /TIMBRA-INGRESSO         (Timbratura di OrarioEntrata) -----------------
  app.post('/timbra-ingresso', (req, res) => {
    const {idUtente} = req.body; //id utente
    const ora = '17:00:00'; // hardcoded 
    const data = '2025-01-01'; // hardoded 

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
// ----------------- TimbraUscita.jsx --> /TIMBRA-USCITA          (Segna nel Cartellino l'orario di uscita) -----------------
  app.post('/timbra-uscita', (req, res) => {
    const { idUtente } = req.body;
    const ora = '17:00:00'; // hardcoded
    const data = '2025-01-01'; // hardcoded
  
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

  //AGGIUNTA il 20 maggio 
  // ----------------  TimbraUscita.jsx --> /ore-lavoro/:idUtente           
  app.get('/ore-lavoro/:idUtente', (req, res) => {
  const idUtente = req.params.idUtente;
  const data = '2025-01-01'; // hardcoded

  const query = `
    SELECT TIMESTAMPDIFF(MINUTE, OraIngresso, COALESCE(OraUscita, '17:00:00')) AS minutiLavorati
    FROM Cartellino
    WHERE idUtente = ? AND DATE(Data) = ?
  `;

  conn.query(query, [idUtente, data], (err, result) => {
    if (err) {
      console.error('Errore nel calcolo minuti lavorati:', err);
      return res.status(500).json({ error: 'Errore server' });
    }

    const minuti = result[0]?.minutiLavorati || 0;
    const ore = String(Math.floor(minuti / 60)).padStart(2, '0');
    const minutiRestanti = String(minuti % 60).padStart(2, '0');

    res.json({ oreLavoro: `${ore}:${minutiRestanti}` });
  });
});















//HOMEOPERAIO.JSX
// ----------------- HomeOperaio.jsx --> /HOME-OPERAIO/:IDUTENTE        (Mostrare al frontend:Mansioni Quotidiane/Mansioni Accessorie/Invia Segnalazione-----------------
  app.get('/home-operaio/:idUtente', (req, res) => {
    const idUtente = req.params.idUtente; // riceve idUtente come paramentro da URL
    const data = '2025-01-01'; // hardcoded
    
    // Calcola ore lavorate fino ad ora
    const cartellinoQuery = `
    SELECT OraIngresso
    FROM Cartellino
    WHERE idUtente = ? AND DATE(Data) = ?`;  
    //Trova quotidiane
    const bestiameQuery = `
    SELECT Q.ID, Q.idAnimale, Q.Pulizia, Q.Mungitura1, Q.Mungitura2, Q.Alimentazione
    FROM Quotidiana Q
    WHERE Q.idOperaio = ? AND DATE(Q.Data) = ?`;
    
    //Trova accessorie 
    const accessorieQuery = 
    `SELECT ID, Testo, Stato
    FROM Comunicazione
    WHERE idDestinatario = ? AND DATE(DataInvio) = ? AND idMittente IN (
     SELECT U2.ID FROM Utente U2 WHERE U2.Ruolo = 'gestore'
    )`;
  
    const finalResponse = {}; // Array per mettere i vari risulati delle query 
  
    conn.query(cartellinoQuery, [idUtente, data], (err, cartResult) => {
      if (err) return res.status(500).json({ error: 'Errore cartellino' });
      finalResponse.oreLavoro = cartResult[0]?.oreLavoro || 0;
      
      finalResponse.oraIngresso = cartResult[0]?.OraIngresso || null;

      conn.query(bestiameQuery, [idUtente, data], (err2, bestiameResult) => {
        if (err2) return res.status(500).json({ error: 'Errore bestiame' });
        finalResponse.capiBestiame = bestiameResult;
  
        conn.query(accessorieQuery, [idUtente, data], (err3, accessorieResult) => {
          if (err3) return res.status(500).json({ error: 'Errore accessorie' });
          finalResponse.mansioniAccessorie = accessorieResult;
  
          res.json(finalResponse); //Invio dell'array riempito
        });
      });
    });
  });

// ----------------- HomeOperaio.jsx --> /UPDATE-QUOTIDIANA          (Aggiornare le quotidiane per una mucca)-----------------
  app.post('/update-quotidiana', (req, res) => {
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
  
// ----------------- HomeOperaio.jsx --> /SEGNA-MANSIONE-ACCESSORIA            (Aggiornare le mansioni accessorie)-----------------
  app.post('/segna-mansione-accessoria', (req, res) => {
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

// ----------------- HomeOperaio.jsx --> INVIA-SEGNALAZIONE          (Mette in database comunicazione da mandare al proprio gestore)-----------------
  app.post('/invia-segnalazione', (req, res) => {
    const { idMittente, testo } = req.body;
    const data = '2025-01-01'; // hardcoded 
  
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

// ----------------- HomeOperaio.jsx --> HOME-OPERAIO/GESTORE/:ID         (Recupera il Gestore dell'operaio) -----------------
  app.get('/home-operaio/gestore/:id', (req, res) => {
    const { id } = req.params;

    const query = `
      SELECT u.NomeUtente AS NomeGestore
      FROM Utente o
      JOIN Animale a ON a.idOperaio = o.ID
      JOIN Gestione g ON a.idStalla = g.idStalla
      JOIN Utente u ON g.idGestore = u.ID
      WHERE o.ID = ?
      LIMIT 1
    `;

    conn.query(query, [id], (err, rows) => {
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












// GESTOREPAGHOME.JSX
// ----------------- GestorePagHome.jsx --> /HOME-GESTORE/:IDUTENTE              (Mostra ore lavorate,visualizzare comunicazioni,vedere e filtrare i Partner) -----------------
  app.get('/home-gestore/:idUtente', (req, res) => {
    const idUtente = req.params.idUtente; // prende id utente dall'url 
    const data = '2025-01-01'; //hardcoded 
    const ruoloPartner = req.query.ruoloPartner || 'fornitore'; // partner di default = fornitore 
  
    const oreQuery =  //Calcola ore di lavoro svolte
      `SELECT 
        TIMESTAMPDIFF(MINUTE, OraIngresso, COALESCE(OraUscita, '17:00:00')) AS minutiLavoro
      FROM Cartellino
      WHERE idUtente = ? AND DATE(Data) = ?`;
  
    const comunicazioniQuery = //Trova tutte comunicazioni per oggi
      `SELECT ID, Testo, Stato
      FROM Comunicazione
      WHERE idDestinatario = ? AND DATE(DataInvio) = ?`;
  
    const partnerQuery = //Trova tutti i partner collegati al gestore
      `SELECT P.ID, P.Nominativo, P.Descrizione, P.Telefono , P.Email
      FROM Partner P
      JOIN Corrispondenza C ON C.idPartner = P.ID
      WHERE C.idGestore = ? AND P.Ruolo = ?`;
  
    const result = {}; //Oggetto per tenere tutti i dati 
    
    // Ottiene tutti i dati e li mette in result
    conn.query(oreQuery, [idUtente, data], (err, oreRes) => {
      if (err) return res.status(500).json({ error: 'Errore ore' });
  
      const minutiTotali = oreRes[0]?.minutiLavoro || 0;
      const ore = String(Math.floor(minutiTotali / 60)).padStart(2, '0');
      const minuti = String(minutiTotali % 60).padStart(2, '0');
      result.oreLavoro = `${ore}:${minuti}`;

  
      conn.query(comunicazioniQuery, [idUtente, data], (err2, commRes) => {
        if (err2) return res.status(500).json({ error: 'Errore comunicazioni' });
  
        result.comunicazioni = commRes;
  
        conn.query(partnerQuery, [idUtente, ruoloPartner], (err3, partnerRes) => {
          if (err3) return res.status(500).json({ error: 'Errore contatti' });
  
          result.contatti = partnerRes;
          res.json(result); // manda risultati completi al frontend in json 
        });
      });
    });
  });

// ----------------- GestorePagHome.jsx --> /AGGIORNA-LETTURA                 (Rispecchia in DB le modifiche fatte alla tabella Comunicazioni) -----------------
  app.post('/aggiorna-lettura', (req, res) => {
    const { idComunicazione, nuovoStato } = req.body; // riceve valori
  
    const query = // aggiorna la comunicazione
    `UPDATE Comunicazione SET Stato = ?
    WHERE ID = ?`;
  
    conn.query(query, [nuovoStato, idComunicazione], (err) => {
      if (err) return res.status(500).json({ success: false }); // segnala un possibile errore
      res.json({ success: true }); // manda il risultato in json 
    });
  });














//GESTOREPAGOPERAI.JSX
//recupero OPERAI della STALLA di un GESTORE e stato delle QUODIDIANE a loro associate  (per la tabella Operai Stalla)
app.get('/gestore-pag-operai/operai-della-stalla/:idStalla', (req, res) => {
  const idStalla = req.params.idStalla;

  const query = `
    SELECT 
      u.ID AS IdOperaio,
      u.NomeUtente,

      -- Pulizie svolte
      (
        SELECT COUNT(*)
        FROM Quotidiana q
        WHERE q.idOperaio = u.ID 
          AND DATE(q.Data) = '2025-01-01' 
          AND q.Pulizia = 1
      ) AS PulizieSvolte,

      -- Mungiture svolte (Mungitura1 + Mungitura2)
      (
        SELECT SUM(
          (CASE WHEN q.Mungitura1 = 1 THEN 1 ELSE 0 END) + 
          (CASE WHEN q.Mungitura2 = 1 THEN 1 ELSE 0 END)
        )
        FROM Quotidiana q
        WHERE q.idOperaio = u.ID 
          AND DATE(q.Data) = '2025-01-01'
      ) AS MungitureSvolte,

      -- Alimentazioni svolte
      (
        SELECT COUNT(*)
        FROM Quotidiana q
        WHERE q.idOperaio = u.ID 
          AND DATE(q.Data) = '2025-01-01' 
          AND q.Alimentazione = 1
      ) AS AlimentazioniSvolte,

      -- Mansioni accessorie completate
      (
        SELECT COUNT(*)
        FROM Comunicazione c
        WHERE c.idDestinatario = u.ID 
          AND DATE(c.DataInvio) = '2025-01-01' 
          AND c.idMittente IN (
            SELECT ID FROM Utente WHERE Ruolo = 'gestore'
          )
          AND c.Stato = 1
      ) AS MansioniSvolte,

      -- Ore lavorate (differenza tra ora ingresso e ora uscita, o fine giornata)
      (
        SELECT CASE 
           WHEN ca.OraUscita IS NOT NULL 
            THEN TIMESTAMPDIFF(HOUR, CONCAT('2025-01-01 ', ca.OraIngresso), CONCAT('2025-01-01 ', ca.OraUscita))
          ELSE TIMESTAMPDIFF(HOUR, CONCAT('2025-01-01 ', ca.OraIngresso), '2025-01-01 17:00:00')
        END
        FROM Cartellino ca
        WHERE ca.idUtente = u.ID 
          AND DATE(ca.Data) = '2025-01-01'
      ) AS OreLavorate,

      -- Totale mungiture attese (2 per ogni quotidiana)
      (
        SELECT COUNT(*) * 2
        FROM Quotidiana q
        WHERE q.idOperaio = u.ID 
          AND DATE(q.Data) = '2025-01-01'
      ) AS TotaleMungiture,

      -- Totale quotidiane assegnate
      (
        SELECT COUNT(*)
        FROM Quotidiana q
        WHERE q.idOperaio = u.ID 
          AND DATE(q.Data) = '2025-01-01'
      ) AS TotaleQuotidiane,

      -- Totale mansioni accessorie assegnate
      (
        SELECT COUNT(*)
        FROM Comunicazione c
        WHERE c.idDestinatario = u.ID 
          AND DATE(c.DataInvio) = '2025-01-01'
      ) AS TotaleMansioni

    FROM Utente u
    WHERE 
      u.Ruolo = 'operaio' 
      AND u.Disattivato = 0 
      AND u.idStalla = ?;

  `;

  conn.query(query, [idStalla], (err, results) => {
    if (err) {
      console.error("Errore nel recupero operai della stalla:", err);
      return res.status(500).json({ error: "Errore server" });
    }

    res.json({ operai: results });
  });
});

//recupero STALLA ASSOCIATA ad un GESTORE (visualizzare l'ID della stalla)
app.get('/gestore-pag-operai/stalla-gestore/:idGestore', (req, res) => {
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

//invio della MANSIONE ACCESSORIA al database
app.post('/gestore-pag-operai/invia-mansione-accessoria', (req, res) => {
  const { idMittente, idDestinatario, testo } = req.body;
  const dataOggi = '2025-01-01'; // hardcoded per ora

  const insertQuery = `
    INSERT INTO Comunicazione (Testo, Stato, idMittente, idDestinatario, DataInvio)
    VALUES (?, 0, ?, ?, ?)
  `;

  conn.query(insertQuery, [testo, idMittente, idDestinatario, dataOggi], (err, result) => {
    if (err) {
      console.error('Errore inserimento mansione accessoria', err);
      return res.status(500).json({ success: false });
    }
    res.json({ success: true });
  });
});

//recupero delle MUCCHE appartenenti alla STALLA del GESTORE
app.get('/gestore-pag-operai/mucche-gestore/:idStalla', (req, res) => {
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

//aggiunta di un NUOVO OPERAIO nel database
//aggiunta di un NUOVO OPERAIO nel database
app.post('/gestore-pag-operai/aggiungi-operaio', (req, res) => {
  const { nomeUtente, password, mucche, idStalla } = req.body;
  const dataOggi = '2025-01-01'; // hardcoded per testing

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

    if (muccheArray.length === 0) {
      return res.json({ success: true });
    }

    // 1. Assegna le mucche
    const updateMuccheQuery = `UPDATE Animale SET idOperaio = ? WHERE ID = ?`;
    const updateQuotidianeQuery = `
      UPDATE Quotidiana SET idOperaio = ?
      WHERE idAnimale = ? AND DATE(Data) = ?
    `;

    const updates = muccheArray.map(idMucca => new Promise((resolve, reject) => {
      // aggiorna animale
      conn.query(updateMuccheQuery, [nuovoID, idMucca], (err1) => {
        if (err1) return reject(err1);

        // aggiorna mansioni quotidiane
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

//recupero OPERAI in base alla STALLA (per popup MODIFICA)
app.get('/gestore-pag-operai/operai-stalla/:idStalla', (req, res) => {
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

//recupero operai eliminabili dal database
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

//eliminazione dell'OPERAIO nel database
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

//recupero ORE LAVORATE del GESTORE
app.get('/gestore-pag-operai/ore-lavoro-totali/:idStalla', (req, res) => {
  const idStalla = req.params.idStalla;

  const query = `
    SELECT SUM(
      CASE
        WHEN c.OraUscita IS NOT NULL 
        THEN TIMESTAMPDIFF(MINUTE, CONCAT('2025-01-01 ', c.OraIngresso), CONCAT('2025-01-01 ', c.OraUscita))
        ELSE TIMESTAMPDIFF(MINUTE, CONCAT('2025-01-01 ', c.OraIngresso), '2025-01-01 17:00:00')
      END
    ) AS MinutiTotali
    FROM Cartellino c
    WHERE DATE(c.Data) = '2025-01-01'
    AND c.idUtente IN (
      SELECT DISTINCT a.idOperaio
      FROM Animale a
      WHERE a.idStalla = ?
    )
  `;

  conn.query(query, [idStalla], (err, result) => {
    if (err) {
      console.error("Errore calcolo minuti lavorati:", err);
      return res.status(500).json({ error: "Errore server" });
    }

    const minuti = result[0]?.MinutiTotali || 0;
    const ore = String(Math.floor(minuti / 60)).padStart(2, '0');
    const minutiRestanti = String(minuti % 60).padStart(2, '0');
    res.json({ oreLavoro: `${ore}:${minutiRestanti}` });
  });
});












// GESTOREPAGMUCCHE.JSX
// CREATA IL 20 MAggio 
app.get('/ore-lavoro-gestore/:idUtente', (req, res) => {
  const idUtente = req.params.idUtente;
  const data = '2025-01-01'; // hardcoded

  const query = `
    SELECT TIMESTAMPDIFF(MINUTE, OraIngresso, COALESCE(OraUscita, '17:00:00')) AS minutiLavoro
    FROM Cartellino
    WHERE idUtente = ? AND DATE(Data) = ?
  `;

  conn.query(query, [idUtente, data], (err, result) => {
    if (err) {
      console.error('Errore calcolo ore lavorate gestore:', err);
      return res.status(500).json({ error: 'Errore server' });
    }

    const minuti = result[0]?.minutiLavoro || 0;
    const ore = String(Math.floor(minuti / 60)).padStart(2, '0');
    const minutiRestanti = String(minuti % 60).padStart(2, '0');
    res.json({ oreLavoro: `${ore}:${minutiRestanti}` });
  });
});

// ------------------ GestorePagMucche.jsx --> /MUCCHE-GESTORE/:IDUTENTE         (Trova tutte le mucche presenti nella stalla del Gestore)--------------------
app.get('/mucche-gestore/:idUtente', (req, res) => {
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

//Creata dopo il nuovo database
app.get('/operai-stalla/:idStalla', (req, res) => {
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

// ------------------ GestorePagMucche.jsx --> /AGGIUNGI-MUCCA                (POP-UP Aggingi Mucca : aggiunge una nuova mucca nel DB) ------------------
app.post('/aggiungi-mucca', (req, res) => {
  const { Nota, Vaccinazioni, idOperaio, idStalla } = req.body; //carica dati inseriti nel form
  const dataOggi = '2025-01-01'; // per ora hardcoded

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
  
// ------------------ GestorePagMucche.jsx --> /MODIFICA-MUCCA                (POP-UP Modifica Dati Mucca : modifica i dati di una mucca)------------------
  app.post('/modifica-mucca', (req, res) => {
  const { idMucca, Nota, Vaccinazioni, idOperaio } = req.body;
  const dataOggi = '2025-01-01'; // hardcoded per ora

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


// ------------------ GestorePagMucche.jsx --> /ELIMINA-MUCCA                  (POP-UP Elimina Mucca : elimina una mucca dal DB)
  app.post('/elimina-mucca', (req, res) => {
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
// ----------------- HomeDirettore.jsx --> /HOME-DIRETTORE                   (Per ottenere i dati riassuntivi dell'intera azienda) -----------------
  app.get('/home-direttore', (req, res) => {
    const data = '2025-01-01'; // hardcoded

    const produzioneLatteQuery =  // Calcolare produzione odierna di latte (1 mungitura = 13 litri)
    `SELECT 
        SUM ((CASE WHEN Mungitura1 = 1 THEN 13 ELSE 0 END) + 
            (CASE WHEN Mungitura2 = 1 THEN 13 ELSE 0 END)) AS latte
      FROM Quotidiana
      WHERE DATE(Data) = ?`;

    const consumoMangimeQuery =  // Calcolare consumo odierno di mangime (1 alimentazione = 45kg)
    `SELECT 
        SUM(CASE WHEN Alimentazione = 1 THEN 45 ELSE 0 END) AS mangime
      FROM Quotidiana
      WHERE DATE(Data) = ?`;

    const gradoPuliziaQuery =   // Calcolare grado di pulizia 
    `SELECT 
        (SUM(CASE WHEN Pulizia = 1 THEN 1 ELSE 0 END) / COUNT(*)) * 100 AS pulizia
      FROM Quotidiana
      WHERE DATE(Data) = ?`;

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

// ----------------- HomeDirettore.jsx --> /HOME-DIRETTORE/STALLE             (Per ottenere i dati relativi alle singole stalle)-----------------
  app.get('/home-direttore/stalle', (req, res) => {
  const data = '2025-01-01'; // hardcoded

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

// ----------------- HomeDirettore.jsx --> /COMUNICA-GESTORE                  (Inserire Comunicazione del Direttore nel DB)-----------------
  app.post('/comunica-gestore', (req, res) => {  //attende messaggio da frontend
    const { idMittente, idDestinatario, testo } = req.body; // carica da corpo messaggio i dati
    const data = '2025-01-01'; // hardcoded
    const stato = 0;

    const query = //Per inserire nuova istanza in tabella Comunicazione
      `INSERT INTO Comunicazione (Testo, Stato, idMittente, idDestinatario, DataInvio)
      VALUES (?, ?, ?, ?, ?)`;

    //Esegue la query
    conn.query(query, [testo, stato, idMittente, idDestinatario, data], (err) => {
      if (err) {
        console.error('Errore invio comunicazione', err);
        return res.status(500).json({ success: false }); // se va tutto bene manda success al frontend
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

