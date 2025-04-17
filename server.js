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
    password: 'password', 
    database: 'StallaNet'
  });

  // Attiva connessione Database
  conn.connect(err => {
    if (err) throw err;
    console.log('Connected to MySQL');
  });

// ----------------- LOGIN : AUTENTICAZIONE / DEFINIRE RUOLO / STATO CARTELLINO (Chiamato da Accesso.jsx)-----------------
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

// ----------------- TIMBRA-INGRESSO : Timbratura di OrarioEntrata (Chiamato da : TimbraEntrata.jsx )-----------------
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
  
// ----------------- HOME-OPERAIO : Mostrare al frontend : Mansioni Quotidiane / Mansioni Accessorie / Invia Segnalazione (Chiamato da : HomeOperaio.jsx )-----------------
  app.get('/home-operaio/:idUtente', (req, res) => {
    const idUtente = req.params.idUtente; // riceve idUtente come paramentro da URL
    const data = '2025-01-01'; // hardcoded
    
    // Calcola ore lavorate fino ad ora
    const cartellinoQuery = `
    SELECT TIMESTAMPDIFF(HOUR, OraIngresso, '17:00:00') AS oreLavoro
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

// ----------------- UPDATE-QUOTIDIANA : Aggiornare le quotidiane per una mucca (Chiamato da : HomeOperaio.jsx )-----------------
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
  
// ----------------- SEGNA-MANSIONE-ACCESSORIA : Aggiornare le mansioni accessorie (Chiamato da : HomeOperaio.jsx )-----------------
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
  
// ----------------- INVIA-SEGNALAZIONE : Mette in database comunicazione per il proprio gestore -----------------
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
  
// AVVIO SERVER EXPRESS
  app.listen(3001, () => {
    console.log('Server avviato su http://localhost:3001');
  });

// MESSAGGIO DI COLLEGAMENTO A localhost:3001
  app.get('/', (req, res) => {
    res.send('StallaNet Backend API attivo 🚜');
  });
