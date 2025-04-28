const express = require('express'); // creare API REST , HTTP
const mysql = require('mysql2'); // 2 = pacchetto piu' moderno 
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


//HOMEOPERAIO.JSX
// ----------------- HomeOperaio.jsx --> /HOME-OPERAIO        (Mostrare al frontend:Mansioni Quotidiane/Mansioni Accessorie/Invia Segnalazione-----------------
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
      `SELECT TIMESTAMPDIFF(HOUR, OraIngresso, '17:00:00') AS oreLavoro
      FROM Cartellino
      WHERE idUtente = ? AND DATE(Data) = ? `;
  
    const comunicazioniQuery = //Trova tutte comunicazioni per oggi
      `SELECT ID, Testo, Stato
      FROM Comunicazione
      WHERE idDestinatario = ? AND DATE(DataInvio) = ?`;
  
    const partnerQuery = //Trova tutti i partner collegati al gestore
      `SELECT P.ID, P.Nominativo, P.Descrizione, P.Telefono
      FROM Partner P
      JOIN Corrispondenza C ON C.idPartner = P.ID
      WHERE C.idGestore = ? AND P.Ruolo = ?`;
  
    const result = {}; //Oggetto per tenere tutti i dati 
    
    // Ottiene tutti i dati e li mette in result
    conn.query(oreQuery, [idUtente, data], (err, oreRes) => {
      if (err) return res.status(500).json({ error: 'Errore ore' });
  
      result.oreLavoro = oreRes[0]?.oreLavoro || 0;
  
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


// GESTOREPAGMUCCHE.JSX
// ------------------ GestorePagMucche.jsx --> /MUCCHE-GESTORE/:IDUTENTE         (Trova tutte le mucche presenti nella stalla del Gestore)--------------------
    app.get('/mucche-gestore/:idUtente', (req, res) => {
      const idUtente = req.params.idUtente; //prende da url 
      const data = '2025-01-01'; // hardcoded
    
      const stallaQuery = // trova la stalla gestita dal gestore
        `SELECT idStalla FROM Gestione 
        WHERE IdGestore = ?`;
      
      
      conn.query(stallaQuery, [idUtente], (err, stallaResult) => { //esegue query 
        if (err || stallaResult.length === 0) { 
          console.error('Errore recupero stalla', err); 
          return res.status(500).json({ success: false }); 
        }
    
        const idStalla = stallaResult[0].idStalla; // se trovato prendi l'idStalla
    
        const muccheQuery = // trova tutte le mucche che stanno in quella stalla
          `SELECT ID, Nota, Vaccinazioni
          FROM Animale
          WHERE idStalla = ?`;
    
        conn.query(muccheQuery, [idStalla], (err2, muccheResult) => { //esegue la query
          if (err2) {
            console.error('Errore recupero mucche', err2);
            return res.status(500).json({ success: false });
          }
          res.json({ idStalla, mucche: muccheResult }); //manda al frontend json con risultati
        });
      });
    });

// ------------------ GestorePagMucche.jsx --> /OPERAI-STALLA/:IDSTALLA          (POP-UP Aggiungi Mucca , Modifica Dati Mucca : indica operai attivi e quante mucche hanno) ------------------
    app.get('/operai-stalla/:idStalla', (req, res) => {
      const idStalla = req.params.idStalla; // prende da url
    
      const query = // Trova Operai operativi nella stalla e conta quante mucche hanno assegnate
      ` SELECT U.ID, U.NomeUtente, COUNT(A.ID) AS numMucche
        FROM Utente U
        LEFT JOIN Animale A ON U.ID = A.idOperaio
        WHERE U.Ruolo = 'operaio'
        AND U.Disattivato = 0
        AND A.idStalla = ?
        GROUP BY U.ID`;
    
      conn.query(query, [idStalla], (err, result) => { //esegue query
        if (err) {
          console.error('Errore recupero operai', err);
          return res.status(500).json({ success: false });
        }
    
        res.json({ operai: result }); //manda risultati al frontend in json
      });
    });
    
// ------------------ GestorePagMucche.jsx --> /AGGIUNGI-MUCCA                (POP-UP Aggingi Mucca : aggiunge una nuova mucca nel DB) ------------------
    app.post('/aggiungi-mucca', (req, res) => {
      const { Nota, Vaccinazioni, idOperaio, idStalla } = req.body; //carica dati inseriti nel form
    
      const query = // inserire nuova mucca in DB
      `INSERT INTO Animale (Nota, Vaccinazioni, idOperaio, idStalla)
       VALUES (?, ?, ?, ?)
      `;
    
      conn.query(query, [Nota, Vaccinazioni, idOperaio || null, idStalla], (err) => { // Esegue query (se non definito operaio = null)
        if (err) {
          console.error('Errore aggiunta mucca', err);
          return res.status(500).json({ success: false });
        }
        res.json({ success: true }); //Risponde al frontend
      });
    });
  
// ------------------ GestorePagMucche.jsx --> /MODIFICA-MUCCA                (POP-UP Modifica Dati Mucca : modifica i dati di una mucca)------------------
    app.post('/modifica-mucca', (req, res) => {
      const { idMucca, Nota, Vaccinazioni, idOperaio } = req.body; // prende i dati dal frontend
    
      const query =  //Aggiorna un istanza di tabella Aniamali
        `UPDATE Animale
        SET Nota = ?, Vaccinazioni = ?, idOperaio = ?
        WHERE ID = ?`;
    
      conn.query(query, [Nota, Vaccinazioni, idOperaio || null, idMucca], (err) => { //esegue query
        if (err) {
          console.error('Errore modifica mucca', err);
          return res.status(500).json({ success: false });
        }
    
        res.json({ success: true }); //risponde al frontend
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







// AVVIO SERVER EXPRESS
  app.listen(3001, () => {
    console.log('Server avviato su http://localhost:3001');
  });

// MESSAGGIO DI COLLEGAMENTO A localhost:3001
  app.get('/', (req, res) => {
    res.send('StallaNet Backend API attivo 🚜');
  });
