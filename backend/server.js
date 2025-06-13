const express = require('express'); // creare API REST , HTTP
process.env.TZ = 'Europe/Rome';
const mysql = require('mysql2'); // 2 = pacchetto piu' moderno e asincrono
const cors = require('cors'); // Blocca/Permette richieste da altri domini o porte (3001+5173) 
const bodyParser = require('body-parser'); // Per leggere JSON dentro ai POST 
const bcrypt = require('bcrypt'); // fare l'hashing delle password
const cookieParser = require('cookie-parser'); // leggere ed analizzare l'header dei cookie in ogni richiesta http
const jwt = require('jsonwebtoken'); //per generare e analizzare i JWT

const JWT_SECRET = 'StallaNetSegreta123';  // Chiave per firmare i JWT
const NODE_ENV = 'development';  // ambiente di esecuzione

//Carica le varie utility
const {
  getDataOdierna,
  getOraAttuale,
  formattaDurata,
  calcolaTempoTrascorsoOperai,
  calcolaDifferenzaOrari
} = require('./utils');

require('./tasks/scheduler'); // Per creare cartellini e quotidiane a mezzanotte

const conn = require('./connDb');// Crea ad attiva la connessione al database

const app = express(); // crea istanza express 

app.use(cors({
 origin: ['http://nome_host:5173', 'http://IPv4:5173'],  //Domini frontend abilitati
  credentials: true  //permette l'invio dei cookie di autenticazione
}));

app.use(bodyParser.json()); // abilita lettura del body dei JSON  
app.use(cookieParser()); // abilita la lettura dei cookie 

//MIDDLEWARE VerificaToken : per proteggere le rotte private nel backend , analizza cookie e vede se c'e JWT valido , se si , da accesso alla rotta. 
function verificaToken(req, res, next) {
  const token = req.cookies.access_token; //Legge il JWT dal cookie
  //Se token mancante o utente non autenticato : 401
  if (!token) {
    return res.status(401).json({ success: false, error: 'Token mancante' });
  }
  //Verifica validita del token usando la chiave segreta
  try {
    const payload = jwt.verify(token,JWT_SECRET);
    req.utente = payload; // decodifica il contentuto e lo salva cosi sara' disponibile nelle rotte
    next(); // passa controllo alla rotta successiva
  } catch (err) { 
    return res.status(401).json({ success: false, error: 'Token non valido o scaduto' });
  }
}

//--------------------------------------------------------- ROTTE HTTP ----------------------------------------------------------------------------------- 
 
// TOKEN
// -------------------- /INFORMAZIONI-UTENTE (Recupera i dati utente dal token JWT) ------------------
  app.get('/informazioni-utente', verificaToken, (req, res) => { //usa il middleware verificaToken
    const utente = req.utente;

    res.json({
      success: true,
      utente: {
        ID: utente.ID,
        NomeUtente: utente.NomeUtente,
        Ruolo: utente.Ruolo,
        idStalla: utente.idStalla || null // solo se presente
      }
    });
  });

//--------------------- /LOGOUT       (Rotta per la rimozione del cookie) --------------------------------------
  app.post('/logout', (req, res) => {
    res.clearCookie('access_token', { // cancella acces_token
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'Strict'
    });
    res.json({ success: true });
  });


//ACCESSO.JSX
// -------------------- /ACCESSO   (Login utente, stato del cartellino e creazione JWT)----------------------
  app.post('/accesso', (req, res) => {
    const { nomeUtente, password } = req.body; 

    // Cerca l'utente con quel nome e che non sia disattivato
    const utenteQuery = `
      SELECT * FROM Utente 
      WHERE NomeUtente = ? AND Disattivato = 0
    `;

    conn.query(utenteQuery, [nomeUtente], (err, results) => {
      //Se non trova nulla
      if (err) return res.status(500).json({ error: 'Errore server' });
      if (results.length === 0) {
        return res.status(401).json({ error: 'Credenziali errate' });
      }

      const utente = results[0]; // Array dati Utente trovato

      // Confronto della password in chiaro con password hashata
      bcrypt.compare(password, utente.Psw, (errBcrypt, isMatch) => {
        if (errBcrypt) return res.status(500).json({ error: 'Errore bcrypt' });
        if (!isMatch) return res.status(401).json({ error: 'Credenziali errate' });

        // Crea payload JWT
        const payload = {
          ID: utente.ID,
          NomeUtente: utente.NomeUtente,
          Ruolo: utente.Ruolo
        };
        if (utente.Ruolo === 'operaio') {
          payload.idStalla = utente.idStalla;  // Solo per operai : mette nel token idStalla 
        }
        //CREA E FIRMA IL JWT
        const token = jwt.sign(payload, JWT_SECRET);


        // IMPOSTAZIONE DEL COOKIE SICURO
        res.cookie('access_token', token, { 
          httpOnly: true, // non accessibile tramite JavaScript
          secure: NODE_ENV === 'production', // mandati solo tramite https in produzione
          sameSite: 'Strict' // non si invia cookie a siti esterni
        });

        // Controllo : se Direttore allora bypassa logica cartellino
        if (utente.Ruolo === 'direttore') { 
          return res.json({
          success: true, 
          ruolo: 'direttore'
        });
        }

        const oggi = getDataOdierna(); 

        //Cercare cartellino di oggi per utente appena loggato 
        const cartellinoQuery = `
          SELECT * FROM Cartellino
          WHERE idUtente = ? AND Data = ?
        `;

        // Esegue la query
        conn.query(cartellinoQuery, [utente.ID, oggi], (err2, cartellinoResults) => {
          if (err2) return res.status(500).json({ error: 'Errore cartellino' });

          if (cartellinoResults.length === 0) {
            return res.status(400).json({ error: 'Nessun cartellino trovato per oggi' });
          }

          const cartellino = cartellinoResults[0]; // Array dati Cartellino trovato 

          // Logica di indirizzamento basata su Cartellino:
          // TURNO NON INIZIATO
          if (!cartellino.OraIngresso && !cartellino.OraUscita) {
            return res.json({
              success: true,
              ruolo: utente.Ruolo,
              idUtente: utente.ID,
              stato: 'timbraEntrata'
            });
          }
          // TURNO INIZIATO
          if (cartellino.OraIngresso && !cartellino.OraUscita) {
            return res.json({
              success: true,
              ruolo: utente.Ruolo,
              idUtente: utente.ID,
              stato: 'turnoAttivo'
            });
          }
          // TURNO GIÀ FINITO
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
  });


//TIMBRAENTRATA.JSX
// -------------------- /TIMBRA-INGRESSO   (Segna OraIngresso in Cartellino) ----------------------
  app.post('/timbra-ingresso', verificaToken, (req, res) => {

    const idUtente = req.utente.ID;  // prende l'id dal JWT

    const ora = getOraAttuale();
    const data = getDataOdierna(); 
    console.log("ID dal token:", req.utente.ID);

    //Aggiorna OraIngresso solo se e' ancora NULL
    const updateQuery = `
      UPDATE Cartellino
      SET OraIngresso = ?
      WHERE idUtente = ? AND Data = ? AND OraIngresso IS NULL
    `;

    //Esegue query
    conn.query(updateQuery, [ora, idUtente, data], (err, result) => {
      if (err) {
        console.error("Errore nella timbratura:", err);
        return res.status(500).json({ success: false });
      }
      if (result.affectedRows === 0) { // se nessuna riga e' stata aggiornata : o cartellino non esiste o OraIngresso era gia compilata
        return res.status(400).json({ success: false, error: "Nessun cartellino aggiornato" });
      }
      // Ruolo preso dal token JWT (già disponibile)
      const ruolo = req.utente.Ruolo;
      res.json({ success: true, ruolo });
    });
  });


//TIMBRAUSCITA.JSX
// -------------------- /ORE-LAVORATE    (Calcola ore lavorate da mostrare in uscita) --------------------         
  app.get('/timbra-uscita/ore-lavorate/', verificaToken, (req, res) => {
  const idUtente = req.utente.ID;
  const data = getDataOdierna();

  //Ottiene OraIngresso dal cartellino di oggi
  const query = `
    SELECT OraIngresso
    FROM Cartellino
    WHERE idUtente = ? AND DATE(Data) = ?
  `;

  //Esegue query
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

    const diffMs = now - ingresso; // calcola differenza tra OraIngresso e Adesso
    //converte in hh:mm
    const diffMinuti = Math.max(Math.floor(diffMs / 60000), 0);
    const ore = String(Math.floor(diffMinuti / 60)).padStart(2, '0');
    const minuti = String(diffMinuti % 60).padStart(2, '0');

    res.json({ oreLavoro:`${ore}:${minuti}`});
  });
  });

// -------------------- /TIMBRA-USCITA    (Segna OraUscita in Cartellino) -----------------
  app.post('/timbra-uscita', verificaToken, (req, res) => {
    const idUtente = req.utente.ID;
    const ora = getOraAttuale();
    const data = getDataOdierna();

    //Segna OraUscita nel cartellino di oggi , solo se e' NULL
    const updateQuery = `
      UPDATE Cartellino
      SET OraUscita = ?
      WHERE idUtente = ? AND Data = ? AND OraUscita IS NULL
    `;

    conn.query(updateQuery, [ora, idUtente, data], (err, result) => {
      if (err) {
        console.error("Errore timbratura uscita:", err);
        return res.status(500).json({ success: false });
      }

      if (result.affectedRows === 0) {
        return res.status(400).json({ success: false, error: 'Nessun cartellino aggiornato' });
      }

      res.json({ success: true });
    });
  });







































//HOMEOPERAIO.JSX
// --------------------- /DATI-OPERAIO    (Carica Mansioni Quotidiane/Accessorie dell'operaio)-----------------
  app.get('/home-operaio/dati-operaio/', verificaToken, (req, res) => {
  const idUtente = req.utente.ID; // recupero id utente dal JWT
  const data = getDataOdierna(); // recupero data odierna in formato yyyy-mm-dd

  // recupera l’orario di ingresso dell’operaio nel giorno corrente.
  const cartellinoQuery = `
    SELECT OraIngresso
    FROM Cartellino
    WHERE idUtente = ? AND DATE(Data) = ?
  `;
  
  // recupera le mansioni giornaliere sugli animali assegnate all’operaio
  const bestiameQuery = `
    SELECT Q.ID, Q.idAnimale, Q.Pulizia, Q.Mungitura1, Q.Mungitura2, Q.Alimentazione
    FROM Quotidiana Q
    WHERE Q.idOperaio = ? AND DATE(Q.Data) = ?
  `;

  // recupera le comunicazioni inviate oggi all’operaio da utenti con ruolo gestore
  const accessorieQuery = `
    SELECT ID, Testo, Stato
    FROM Comunicazione
    WHERE idDestinatario = ? AND DATE(DataInvio) = ? AND idMittente IN (
      SELECT U2.ID FROM Utente U2 WHERE U2.Ruolo = 'gestore'
    )
  `;

  const finalResponse = {}; // conterrà la risposta da inviare al frontend

  conn.query(cartellinoQuery, [idUtente, data], (err, cartResult) => {
    if (err) return res.status(500).json({ error: 'Errore cartellino' }); // se c’è errore nel DB, ritorna errore 500

    const oraIngresso = cartResult[0]?.OraIngresso || null; // estrae OraIngresso o null
    finalResponse.oraIngresso = oraIngresso; 

    // calcola quanti minuti sono passati da oraIngresso fino ad ora
    if (oraIngresso) {
      const ingresso = new Date(`${data}T${oraIngresso}`);
      const now = new Date();
      const diffMinuti = Math.max(Math.floor((now - ingresso) / 60000), 0);
      finalResponse.oreLavoro = formattaDurata(diffMinuti); // formatta la risposta in hh:mm
    } else {
      finalResponse.oreLavoro = "00:00"; // se oraIngresso è assente, inserisci 00:00
    }

    // recupera le mucche e le mansioni assegnate all’operaio oggi
    conn.query(bestiameQuery, [idUtente, data], (err2, bestiameResult) => {
      if (err2) return res.status(500).json({ error: 'Errore bestiame' });
      finalResponse.capiBestiame = bestiameResult;

      // recupera tutte le comunicazioni dal gestore all’operaio per oggi
      conn.query(accessorieQuery, [idUtente, data], (err3, accessorieResult) => {
        if (err3) return res.status(500).json({ error: 'Errore accessorie' });
        finalResponse.mansioniAccessorie = accessorieResult;

        res.json(finalResponse);
      });
    });
  });
  });

// --------------------- /NOME-GESTORE   (Recupera il Gestore dell'operaio) -----------------
  app.get('/home-operaio/nome-gestore/', verificaToken, (req, res) => {
    const idUtente = req.utente.ID; // recupero id utente dal JWT

    // recupero del nome del gestore associato all'operaio
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
      // se si verifica un errore nel recupero
      if (err) {
        console.error('Errore nel recupero del gestore:', err);
        return res.status(500).json({ message: "Errore interno del server" });
      }

      // se non è stato trovato nessun gestore associato
      if (rows.length === 0) {
        return res.status(404).json({ message: "Gestore non trovato" });
      }

      res.json(rows[0]); 
    });
  });
  
// --------------------- /AGGIORNA-QUOTIDIANE    (Aggiornare la tabella delle Mansioni Quotidiane)-----------------
  app.post('/home-operaio/aggiorna-quotidiane', (req, res) => {
    const { idQuotidiana, campo, valore } = req.body; // estrae i dati dal corpo della richiesta
  
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
        return res.status(500).json({ success: false }); // in caso di errore manda un generico errore 500
      }
      res.json({ success: true });
    });
  });

// --------------------- /AGGIORNA-MANSIONE-ACCESSORIA    (Aggiornare le Mansioni accessorie)-----------------
  app.post('/home-operaio/aggiorna-mansione-accessoria', (req, res) => {
    const { idComunicazione, nuovoStato } = req.body; // estrae i dati dal corpo della richiesta

    // query per aggiornare lo stato della comunicazione specificata
    const query = 
    `UPDATE Comunicazione SET Stato = ? WHERE ID = ?`;

    // trova la comunicazione , se casella si aggiorna , manda true alle checkbox.
    conn.query(query, [nuovoStato, idComunicazione], (err) => {
      if (err) {
        // in caso di errore nel DB
        console.error('Errore aggiornamento comunicazione:', err);
        return res.status(500).json({ success: false });
      }
      // se l'aggiornamento è andato a buon fine
      console.log(`✓ Stato comunicazione ${idComunicazione} aggiornato a ${nuovoStato}`);
      res.json({ success: true });
    });
  });

// --------------------- /INVIA-SEGNALAZIONE          (Segna la comunicazione al Gestore)-----------------
  app.post('/home-operaio/invia-segnalazione', verificaToken, (req, res) => {
    const idMittente = req.utente.ID; // estrae ID dell'operaio dal JWT
    const { testo } = req.body;  // estrae il contenuto del messaggio dal corpo della richiesta

    const data = new Date(); // si ottiene data ed orario attuali
  
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
      
      // trovare il Gestore della stalla
      const getGestoreQuery = `
        SELECT IdGestore FROM Gestione
        WHERE idStalla = ?
      `;
      
      conn.query(getGestoreQuery, [idStalla], (err2, gestoreResult) => {
        if (err2 || gestoreResult.length === 0) {
          // in caso di errore dal DB
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
            // in caso di errore dal DB
            console.error('Errore inserimento comunicazione', err3);
            return res.status(500).json({ success: false });
          }

          // se va bene manda true a HomeOperaio
          console.log(`✓ Segnalazione inviata da ${idMittente} a ${idDestinatario}`);
          res.json({ success: true }); 
        });
      });
    });
  });


//GESTOREBARRASUPERIORE.JSX 
// --------------------- /BARRA-SUPERIORE/ORARIO-INGRESSO        (Recupera ora di ingresso del gestore)---------------------
app.get('/barra-superiore/orario-ingresso/:idUtente', (req, res) => {
  const { idUtente } = req.params; // estrae il contenuto del messaggio dal corpo della richiesta
  const data = getDataOdierna(); // recupero della data odierna (yyyy-mm-dd)

  // recupero dell'OraIngresso del cartellino odierno del gestore
  const query = `
    SELECT OraIngresso
    FROM Cartellino
    WHERE idUtente = ? AND DATE(Data) = ?
  `;

  conn.query(query, [idUtente, data], (err, result) => {
    if (err) {
      // in caso di errore dal DB
      console.error("Errore orario ingresso barra superiore:", err);
      return res.status(500).json({ error: 'Errore server' });
    }

    const ora = result[0]?.OraIngresso || null; // se presente inserisci OraIngresso, altrimenti null
    res.json({ oraIngresso: ora });
  });
});


// GESTOREPAGHOME.JSX
// --------------------- /GESTORE-PAG-HOME           (Mostra ore lavorate, visualizzare comunicazioni, vedere e filtrare i Partner) -----------------
  app.get('/gestore-pag-home/:idUtente', (req, res) => {
  const idUtente = req.params.idUtente; // estrae l'ID del gestore dalla URL
  const data = getDataOdierna(); // ottiene la data odierna in formato YYYY-MM-DD
  const ruoloPartner = req.query.ruoloPartner || 'fornitore'; // estrare ruoloPartner, per default è fornitore

  // ottiene comunicazioni ricevute dal gestore nella data odierna
  const comunicazioniQuery = `
    SELECT ID, Testo, Stato
    FROM Comunicazione
    WHERE idDestinatario = ? AND DATE(DataInvio) = ?
  `;

  // ottiene i partner associati al gestore, filtrati per ruolo 
  const partnerQuery = `
    SELECT P.ID, P.Nominativo, P.Descrizione, P.Telefono , P.Email
    FROM Partner P
    JOIN Corrispondenza C ON C.idPartner = P.ID
    WHERE C.idGestore = ? AND P.Ruolo = ?
  `;

  const result = {}; // conterrà la risposta finale da inviare al frontend

  conn.query(comunicazioniQuery, [idUtente, data], (err2, commRes) => {
    if (err2) return res.status(500).json({ error: 'Errore comunicazioni' });

    // salva le comunicazioni nel risultato
    result.comunicazioni = commRes;

    conn.query(partnerQuery, [idUtente, ruoloPartner], (err3, partnerRes) => {
      if (err3) return res.status(500).json({ error: 'Errore contatti' });

      // salva i partner nel risultato
      result.contatti = partnerRes;
      res.json(result);
    });
  });
});

// --------------------- /AGGIORNA-LETTURA            (Aggiorna in DB le modifiche fatte alla tabella Comunicazioni) -----------------
  app.post('/gestore-pag-home/aggiorna-lettura', (req, res) => {
    const { idComunicazione, nuovoStato } = req.body; // estrae i dati dal corpo della richiesta 
  
    // aggiorna lo stato della comunicazione
    const query = 
    `UPDATE Comunicazione SET Stato = ?
    WHERE ID = ?`;
  
    conn.query(query, [nuovoStato, idComunicazione], (err) => {
      if (err) return res.status(500).json({ success: false }); // segnala un possibile errore
      res.json({ success: true }); // manda il risultato in JSON
    });
  });


// GESTOREPAGOPERAI.JSX
//--------------------- /STALLA-DEL-GESTORE        (recupera la stalla affidata al Gestore)----------------------
  app.get('/gestore-pag-operai/stalla-del-gestore/:idGestore', (req, res) => {
  const idGestore = req.params.idGestore; // estrae l'ID della stalla dai parametri dell' URL

  // cerca la stalla associata al gestore specificato
  const query = `
    SELECT idStalla
    FROM Gestione
    WHERE idGestore = ?
    LIMIT 1
  `;

  conn.query(query, [idGestore], (err, results) => {
    if (err) {
      // in caso di errore del DB
      console.error('Errore recupero stalla:', err);
      return res.status(500).json({ error: 'Errore server' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Stalla non trovata' }); // se non viene trovata nessuna stalla associata al gestore
    }

    res.json({ idStalla: results[0].idStalla });
  });
});

//--------------------- /OPERAI-IN-STALLA           (recupero Elenco operai assegnati in questa stalla + ore lavorate da ognuno)--------------------- 
  app.get('/gestore-pag-operai/operai-in-stalla/:idStalla', (req, res) => {
  const idStalla = req.params.idStalla; // estrae l'ID della stalla dai parametri dell' URL
  const dataOggi = getDataOdierna(); // ottiene data odierna (yyyy-mm-dd)

  /* query che calcola vari dati giornalieri per ciascun operaio nella stalla:
      - mansioni svolte (pulizia, mungitura, alimentazione)
      - comunicazioni completate
      - orari di ingresso/uscita
      - totali attesi (di mansioni e comunicazioni)
  */
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

  // array dei valori da inserire nei punti interrogativi (?) della query
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

  // esegue la query e restituisce a GestorePagOperai.jsx direttamente le ore lavorate di ogni operaio
  conn.query(query, placeholders, (err, results) => {  

    // per ogni operaio calcola le ore lavorate in formato hh:mm
    const operaiModificati = results.map(operaio => {
      const ingresso = operaio.OraIngresso;
      const uscita = operaio.OraUscita;

      // se non è presente OraIngresso allora OreLavorate = "00:00"
      if (!ingresso) {
        operaio.OreLavorate = "00:00";
        return operaio;
      }

      // se è presente OraUscita allora usala per il calcolo
      if (uscita) {
        operaio.OreLavorate = calcolaDifferenzaOrari(ingresso, uscita); 
      } else {
        operaio.OreLavorate = calcolaTempoTrascorsoOperai(ingresso);
      }

      return operaio;
    });

    res.json({ operai: operaiModificati }); // risposta al frontend
  });
});

//---------------------/MUCCHE-IN-STALLA          (recupero mucche assegnate agli operai)--------------------- 
  app.get('/gestore-pag-operai/mucche-in-stalla/:idStalla', (req, res) => {
    const idStalla = req.params.idStalla; // estrae l'ID della stalla dai parametri dell' URL

    // recupera le mucche e i loro operai associati
    const query = `
    SELECT a.ID, u.NomeUtente AS OperaioCorrente
    FROM Animale a
    LEFT JOIN Utente u ON a.idOperaio = u.ID
    WHERE a.idStalla = ?
    ORDER BY u.NomeUtente IS NULL, u.NomeUtente, a.ID
  `;

    conn.query(query, [idStalla], (err, result) => {
      if (err) {
        // in caso di errore del DB
        console.error("Errore mucche gestore (by idStalla):", err);
        return res.status(500).json({ error: 'Errore server' });
      }
      res.json(result);
    });
  });

//--------------------- /OPERAI-PER-POPUP-MODIFICA           (recupera OPERAI in base alla STALLA (per popup MODIFICA))--------------------- 
  app.get('/gestore-pag-operai/operai-per-popup-modifica/:idStalla', (req, res) => {
    const idStalla = req.params.idStalla; // estrae l'ID della stalla dai parametri dell' URL

    // recupera tutti gli operai non disattivati della stalla
    const query = `
      SELECT ID, NomeUtente
      FROM Utente
      WHERE Ruolo = 'operaio' AND Disattivato = 0 AND idStalla = ?
    `;

    conn.query(query, [idStalla], (err, results) => {
      if (err) {
        // in caso di errore del DB
        console.error("Errore recupero operai:", err);
        return res.status(500).json({ error: "Errore server" });
      }

      res.json(results);
    });
  });

//--------------------- /OPERAI-ELIMINABILI       (recupero operai eliminabili)--------------------- 
  app.get('/gestore-pag-operai/operai-eliminabili/:idStalla', (req, res) => {
    const idStalla = req.params.idStalla; // estrae l'ID della stalla dai parametri dell' URL

    // recupera tutti gli operai non disattivati della stalla
    const query = `
      SELECT ID, NomeUtente
      FROM Utente
      WHERE Ruolo = 'operaio'
        AND Disattivato = 0
        AND idStalla = ?
    `;

    conn.query(query, [idStalla], (err, results) => {
      if (err) {
        // in caso di errore del DB
        console.error("Errore recupero operai per eliminazione:", err);
        return res.status(500).json({ error: "Errore server" });
      }

      res.json(results);
    });
  });

//--------------------- /INVIA-MANSIONE-ACCESSORIA      (invio di Mansione Accessoria) --------------------- 
  app.post('/gestore-pag-operai/invia-mansione-accessoria', (req, res) => {
    const { idMittente, idDestinatario, testo } = req.body; // estrae i parametri dal corpo della richiesta

    const data = getDataOdierna(); // ottiene la data odierna (yyyy-mm-dd)
    const ora = getOraAttuale(); // ottiene l'orario attuale (hh:mm:ss)
    const dataOraCompleta = `${data} ${ora}`;  //unione di data e orario

    // inserisce una nuova comunicazione nella tabella Comunicazione (stato = 0)
    const insertQuery = `
      INSERT INTO Comunicazione (Testo, Stato, idMittente, idDestinatario, DataInvio)
      VALUES (?, 0, ?, ?, ?)
    `;

    conn.query(insertQuery, [testo, idMittente, idDestinatario, dataOraCompleta], (err, result) => {
      if (err) {
        // in caso di errore del DB
        console.error('Errore inserimento mansione accessoria', err);
        return res.status(500).json({ success: false });
      }
      res.json({ success: true });
    });
  });

//---------------------/AGGIUNGI-OPERAIO           (aggiunta di un nuovo operaio) --------------------- 
  app.post('/gestore-pag-operai/aggiungi-operaio', async (req, res) => {
  const { nomeUtente, password, mucche, idStalla } = req.body; // estrae i parametri dal corpo della richiesta
  const dataOggi = getDataOdierna(); // ottiene la data odierna (yyyy-mm-dd)

  // controlla che i dati principali siano presenti
  if (!nomeUtente || !password || !idStalla) {
    return res.status(400).json({ success: false, message: 'Dati mancanti.' });
  }


  const muccheArray = Array.isArray(mucche) ? mucche : []; // se non sono state selezionate mucche, crea array vuoto

  try {
    const passwordHashata = await bcrypt.hash(password, 10); // crea l'hash sicuro della password da salvare nel DB

    // inserisce il nuovo operaio nella tabella Utente
    const insertOperaioQuery = `
      INSERT INTO Utente (NomeUtente, Psw, Ruolo, Disattivato, idStalla)
      VALUES (?, ?, 'operaio', 0, ?)
    `;

    conn.query(insertOperaioQuery, [nomeUtente, passwordHashata, idStalla], (err, result) => {
      if (err) {
        // in caso di errore del DB
        console.error("Errore creazione operaio:", err);
        return res.status(500).json({ success: false });
      }

      const nuovoID = result.insertId; // ottiene l'ID del nuovo operaio creato

      // crea un nuovo cartellino odierno per l'operaio appena aggiunto
      const insertCartellinoQuery = `
        INSERT INTO Cartellino (idUtente, Data)
        VALUES (?, ?)
      `;
      conn.query(insertCartellinoQuery, [nuovoID, dataOggi], (err2) => {
        if (err2) {
          // in caso di errore del DB, continua
          console.error("Errore inserimento cartellino:", err2);
        }

        // se non sono state selezione mucche da trasferire, termina con successo
        if (muccheArray.length === 0) {
          return res.json({ success: true });
        }

        // assegnazione mucche e delle loro quotidiane all'operaio
        const updateMuccheQuery = `UPDATE Animale SET idOperaio = ? WHERE ID = ?`;
        const updateQuotidianeQuery = `
          UPDATE Quotidiana SET idOperaio = ?
          WHERE idAnimale = ? AND DATE(Data) = ?
        `;

        // Per ogni mucca da assegnare, aggiorna entrambe le tabelle (Animale e Quotidiana)
        const updates = muccheArray.map(idMucca => new Promise((resolve, reject) => {
          conn.query(updateMuccheQuery, [nuovoID, idMucca], (err1) => {
            if (err1) return reject(err1);

            conn.query(updateQuotidianeQuery, [nuovoID, idMucca, dataOggi], (err2) => {
              if (err2) return reject(err2);
              resolve();
            });
          });
        }));

         // attende che tutti gli aggiornamenti siano completati
        Promise.all(updates)
          .then(() => res.json({ success: true })) // se tutto è andato a buon fine
          .catch(error => {// errore durante l’aggiornamento di Animale o Quotidiana
            console.error("Errore aggiornamento mucche o quotidiane:", error);
            res.status(500).json({ success: false });
          });
      });
    });
    // messaggio di errore per eventuali problemi nella generazione dell'hash
  } catch (erroreHash) {
    console.error("Errore hash password:", erroreHash);
    return res.status(500).json({ success: false, message: 'Errore interno hash' });
  }
  });

//---------------------/MODIFICA-OPERAIO        (modifica dati di un operaio)--------------------------------
  app.post('/gestore-pag-operai/modifica-operaio', async (req, res) => {
  const { idOperaio, nuovoNomeUtente, nuovaPassword } = req.body; // estrae i parametri dal corpo della richiesta

  // controllo dei dati obbligatori
  if (!idOperaio || !nuovoNomeUtente) {
    return res.status(400).json({ success: false, message: 'Dati mancanti per la modifica.' });
  }

  try {
    // se è stata fornita una nuova password hashala e aggiorna anche la password
    if (nuovaPassword && nuovaPassword.trim() !== '') {
      const passwordHashata = await bcrypt.hash(nuovaPassword, 10);

      // aggiorna sia il nome utente che la password nella tabella Utent
      const query = `
        UPDATE Utente
        SET NomeUtente = ?, Psw = ?
        WHERE ID = ? AND Ruolo = 'operaio'
      `;

      conn.query(query, [nuovoNomeUtente, passwordHashata, idOperaio], (err, result) => {
        if (err) {
          // in caso di errore del DB
          console.error("Errore modifica operaio (nome + password):", err);
          return res.status(500).json({ success: false });
        }
        res.json({ success: true });
      });

    } else {
      // solo aggiornamento nome utente se la password resta invariata
      const query = `
        UPDATE Utente
        SET NomeUtente = ?
        WHERE ID = ? AND Ruolo = 'operaio'
      `;

      conn.query(query, [nuovoNomeUtente, idOperaio], (err, result) => {
        if (err) {
          // in caso di errore del DB
          console.error("Errore modifica operaio (solo nome):", err);
          return res.status(500).json({ success: false });
        }
        res.json({ success: true });
      });
    }

  } catch (errHash) {
    // in caso di errore nell generazione dell'hash
    console.error("Errore durante modifica operaio:", errHash);
    return res.status(500).json({ success: false, message: 'Errore interno durante modifica' });
  }
  });

//---------------------/ELIMINA-OPERAIO       (elimina un operaio)
  app.post('/gestore-pag-operai/elimina-operaio', (req, res) => {
    const { idOperaio } = req.body; // estrai i dati dal corpo della richiesta 

    // controllo se è stato fornito l'ID
    if (!idOperaio) {
      return res.status(400).json({ success: false, message: 'Operaio non selezionato.' });
    }

    // verifica se l'operaio ha ancora mucche associate
    const checkMuccheQuery = `
      SELECT COUNT(*) AS count
      FROM Animale
      WHERE idOperaio = ?
    `;

    conn.query(checkMuccheQuery, [idOperaio], (err, result) => {
      if (err) {
        // in caso di errore del DB
        console.error("Errore controllo mucche:", err);
        return res.status(500).json({ success: false, message: 'Errore controllo mucche.' });
      }

      // se ci sono ancora mucche assegnate all'operaio, blocca l’eliminazione
      if (result[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: 'Per eliminare un operaio è necessario che non abbia nessuna mucca associata ad esso.'
        });
      }

      // disattiva l’operaio impostando il campo "Disattivato" a 1
      const eliminaQuery = `
        UPDATE Utente
        SET Disattivato = 1
        WHERE ID = ?
      `;

      conn.query(eliminaQuery, [idOperaio], (err2) => {
        if (err2) {
          // in caso di errore del DB
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
    const { idUtente } = req.params; // estrae l'ID del gestore dall' URL

    // query per ottenere: l'ID + posizione della stalla gestita, mucche nella stalla + nome operai associati per ogni mucca
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
        // in caso di errore del DB
        console.error("Errore nella query mucche-gestore:", err);
        return res.status(500).json({ error: 'Errore interno server' });
      }

      if (!results || results.length === 0) {
        // se non ci sono risultati, manda errore 404
        return res.status(404).json({ error: 'Nessun dato trovato per questo gestore' });
      }
      
      const mucche = results.filter(r => r.ID !== null); // filtra i risultati per ottenere solo le righe in cui è presente una mucca
      const idStalla = results[0].idStalla || null; // ottiene idStalla
      const posizioneStalla = results[0].posizioneStalla || ''; // otiene posizioneStalla

      res.json({ mucche, idStalla, posizioneStalla }); // restituisce lista mucce, id stalla e la sua posizione
    });
  });

// ---------------------//OPERAI-IN-STALLA        (Elenco operai disponibili per riassegnare mucche)----------------------
  app.get('/gestore-pag-mucche/operai-in-stalla/:idStalla', (req, res) => {
    const { idStalla } = req.params; // estrae l'ID della stalla dai parametri dell' URL

    // query per ottenere id utenti, nomi utente e numero di mucche associate ad ogni operaio attivo
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
        // in caso di errore del DB
        console.error("Errore nella query operai-stalla:", err);
        return res.status(500).json({ error: 'Errore interno server' });
      }

      res.json({ operai: results }); // restituisce in un array ogni riga ottenuta dal DB
    });
  });

// -------------------- /AGGIUNGI-MUCCA         (POP-UP Aggingi Mucca) ---------------------
  app.post('/gestore-pag-mucche/aggiungi-mucca', (req, res) => {
    const { Nota, Vaccinazioni, idOperaio, idStalla } = req.body; // estrae i dati dal corpo della richiesta 
    const dataOggi = getDataOdierna(); // ottiene data odierna (yyyy-mm-dd)

    // query per inserire la nuova mucca nella tabella Animale
    const insertMuccaQuery = `
      INSERT INTO Animale (Nota, Vaccinazioni, idOperaio, idStalla)
      VALUES (?, ?, ?, ?)
    `;

    conn.query(insertMuccaQuery, [Nota, Vaccinazioni, idOperaio, idStalla], (err, result) => {// Esegue query (se non definito operaio = null)
      if (err) {
        // in caso di errore del DB
        console.error("Errore inserimento mucca:", err);
        return res.status(500).json({ success: false });
      }

      const idNuovaMucca = result.insertId; // ottiene l'id della mucca appena inserita

      // query per inserire una nuova quotidiana per la mucca appena inserita nella tabella Quotidiana
      const insertQuotidianaQuery = `
        INSERT INTO Quotidiana (idAnimale, idOperaio, Data, Pulizia, Mungitura1, Mungitura2, Alimentazione)
        VALUES (?, ?, ?, 0, 0, 0, 0)
      `;

      conn.query(insertQuotidianaQuery, [idNuovaMucca, idOperaio, dataOggi], (err2) => { 
        if (err2) {
          // in caso di errore del DB
          console.error("Errore creazione mansione quotidiana:", err2);
          return res.status(500).json({ success: false });
        }

        res.json({ success: true }); // risposta per il frontend
      });
    });
  });
  
// -------------------- /MODIFICA-MUCCA          (POP-UP Modifica Dati Mucca)---------------------
  app.post('/gestore-pag-mucche/modifica-mucca', (req, res) => {
  const { idMucca, Nota, Vaccinazioni, idOperaio } = req.body; // estrae i dati dal corpo della richiesta
  const dataOggi = getDataOdierna(); // ottiene la data odierna (yyyy-mm-dd)

  // query per recuperare i dati attuali della mucca
  const getQuery = `SELECT Nota, Vaccinazioni, idOperaio FROM Animale WHERE ID = ?`;

  conn.query(getQuery, [idMucca], (err, result) => {
    if (err || result.length === 0) {
      // in caso di errore del DB
      console.error('Errore nel recupero dati esistenti', err);
      return res.status(500).json({ success: false });
    }

    const attuale = result[0]; // dati attuali della mucca 

    // se i campi ricevuti sono vuoti, mantieni i valori esistenti
    const nuovaNota = Nota !== '' ? Nota : attuale.Nota;
    const nuovaVacc = Vaccinazioni !== '' ? Vaccinazioni : attuale.Vaccinazioni;
    const nuovoOperaio = idOperaio !== '' ? idOperaio : attuale.idOperaio;

    // query per aggiornare la tabella Animale
    const updateAnimaleQuery = `
      UPDATE Animale
      SET Nota = ?, Vaccinazioni = ?, idOperaio = ?
      WHERE ID = ?
    `;

    conn.query(updateAnimaleQuery, [nuovaNota, nuovaVacc, nuovoOperaio, idMucca], (err2) => {
      if (err2) {
        // in caso di errore del DB
        console.error('Errore aggiornamento mucca', err2);
        return res.status(500).json({ success: false });
      }

      // query per aggiornare la riga quotidiana, cambia solo idOperaio, i flag rimangono invariati
      const updateQuotidianaQuery = `
        UPDATE Quotidiana
        SET idOperaio = ?
        WHERE idAnimale = ? AND DATE(Data) = ?
      `;

      conn.query(updateQuotidianaQuery, [nuovoOperaio, idMucca, dataOggi], (err3) => {
        if (err3) {
          // in caso di errore del DB
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
    const { idMucca } = req.body; // estrae i dati dal corpo della richiesta
  
    // query per cancellare la mucca dal DB
    const query =  
      `DELETE FROM Animale
      WHERE ID = ? `;

    //manda la query la DB per eseguirla
    conn.query(query, [idMucca], (err) => { 
      if (err) {
        // in caso di errore del DB
        console.error('Errore eliminazione mucca', err);
        return res.status(500).json({ success: false });
      }
  
      res.json({ success: true }); 
    });
  });


// HOMEDIRETTORE.JSX
// ------------------- /STATO-AZIENDA     (Ottiene i dati riassuntivi dell'intera azienda) -----------------
  app.get('/home-direttore/stato-azienda', (req, res) => {
    const data = getDataOdierna();  // ottiene la data odierna in formato yyyy-mm-dd

    // query per calcolare la produzione odierna di latte (1 mungitura = 13 litri)
    const produzioneLatteQuery =  
    `SELECT 
      SUM ((CASE WHEN Mungitura1 = 1 THEN 13 ELSE 0 END) + 
          (CASE WHEN Mungitura2 = 1 THEN 13 ELSE 0 END)) AS latte
    FROM Quotidiana
    WHERE DATE(Data) = ? AND idAnimale IS NOT NULL
    `;

    // query per calcolare il consumo odierno di mangime (1 alimentazione = 45kg)
    const consumoMangimeQuery =  
    `SELECT 
      SUM(CASE WHEN Alimentazione = 1 THEN 45 ELSE 0 END) AS mangime
    FROM Quotidiana
    WHERE DATE(Data) = ? AND idAnimale IS NOT NULL
    `;

    // query per calcolare il grado di pulizia 
    const gradoPuliziaQuery =   
    `SELECT 
      (SUM(CASE WHEN Pulizia = 1 THEN 1 ELSE 0 END) / COUNT(*)) * 100 AS pulizia
    FROM Quotidiana
    WHERE DATE(Data) = ? AND idAnimale IS NOT NULL
    `;

    // query per calcolare il costo di manodopera giornaliero (Operaio:112 , Gestore:205)
    const costoManodoperaQuery = 
    `SELECT 
      SUM(CASE WHEN Ruolo = 'operaio' THEN 112 
              WHEN Ruolo = 'gestore' THEN 205 
              ELSE 0 END) AS costo
      FROM Utente
      WHERE Disattivato = 0`;

    // query per calcolare il numero operai attivi 
    const numOperaiQuery = 
    `SELECT COUNT(*) AS operai
      FROM Utente
      WHERE Ruolo = 'operaio' AND Disattivato = 0`;

    // query per calcolare il numero gestori attivi 
    const numGestoriQuery = 
      `SELECT COUNT(*) AS gestori
      FROM Utente
      WHERE Ruolo = 'gestore' AND Disattivato = 0`;

    // query per calcolare il numero totale di mucche
    const numBestiameQuery = 
      `SELECT COUNT(*) AS bestie
      FROM Animale`;

    const result = {}; // raccoglie risultati di tutte le query 

    // esegue tutte le query in modo annidato nel database
    conn.query(produzioneLatteQuery, [data], (err, latteRes) => {
      if (err) return res.status(500).json({ error: 'Errore latte' });
      result.latte = latteRes[0]?.latte || 0;

      conn.query(consumoMangimeQuery, [data], (err2, mangimeRes) => {
        if (err2) return res.status(500).json({ error: 'Errore mangime' });
        result.mangime = mangimeRes[0]?.mangime || 0;

        conn.query(gradoPuliziaQuery, [data], (err3, puliziaRes) => {
          if (err3) return res.status(500).json({ error: 'Errore pulizia' });
          result.pulizia = Math.round(puliziaRes[0]?.pulizia || 0); // arrotonda il valore in percentuale

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
  const data = getDataOdierna(); // ottiene data odierna in formato yyyy-mm-dd

  // recupera tutte le stalle attive, con ID, nome gestore e ID gestore
  const query = 
  `SELECT S.ID AS idStalla, U.NomeUtente AS nomeGestore, U.ID AS idGestore
    FROM Stalla S
    JOIN Gestione G ON S.ID = G.idStalla
    JOIN Utente U ON G.idGestore = U.ID`;
  
  conn.query(query, (err, stalleRes) => {
    if (err) return res.status(500).json({ error: 'Errore stalle' });

    const stalle = []; // array finale con i dati aggregati di ogni stalla

    // funzione ricorsiva per processare una stalla alla volta
    const processaStalla = (index) => {
      if (index >= stalleRes.length) return res.json(stalle); // finite le stalle, inivia la risposta JSON

      const stalla = stalleRes[index]; // stalla corrente
      const idStalla = stalla.idStalla;

      // conta quanti operai e quante mucche ci sono nella stalla
      const countQuery = `
        SELECT 
          (SELECT COUNT(*) FROM Utente WHERE Ruolo = 'operaio' AND idStalla = ?) AS numOperai,
          (SELECT COUNT(*) FROM Animale WHERE idStalla = ?) AS numMucche
      `;

      // calcola il progresso sulle mansioni odierne per la stalla
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

          // controllo di protezione da risultati null o vuoti
          const safeProgRes = (!progRes || progRes.length === 0 || progRes[0] === null)
            ? { mungiture: 0, pulizie: 0, alimentazioni: 0, totaleAttese: 0 }
            : progRes[0];

          // estrazione dei valori calcolati o fallback
          const mungiture = safeProgRes.mungiture ?? 0;
          const pulizie = safeProgRes.pulizie ?? 0;
          const alimentazioni = safeProgRes.alimentazioni ?? 0;
          const totaleMungiture = safeProgRes.totaleMungiture ?? 0;
          const totaleRecord = safeProgRes.totaleRecord ?? 1; 

          // Calcolo delle percentuali
          const mungituraPerc = totaleMungiture > 0 ? Math.round((mungiture / totaleMungiture) * 100) : 0;
          const puliziaPerc = totaleRecord > 0 ? Math.round((pulizie / totaleRecord) * 100) : 0;
          const alimentazionePerc = totaleRecord > 0 ? Math.round((alimentazioni / totaleRecord) * 100) : 0;

           // aggiunta dei dati aggregati alla lista finale
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

          
          processaStalla(index + 1); // vai alla prossima stalla
        });
      });
    };

    processaStalla(0); // avvia dalla prima stalla
  });
  });

// ----------------- /INVIA-COMUNICAZIONE             (Inserire Comunicazioni nel DB)-----------------
  app.post('/home-direttore/invia-comunicazione', (req, res) => {
  const { idMittente, idDestinatario, testo } = req.body; // estrae i dati dal corpo della richiesta 
  const data = new Date(); // ottiene data e ora corrente 
  const stato = 0; // stato iniziale della comunicazione 

  // inserisce una nuova riga nella tabella Comunicazione
  const query = `
    INSERT INTO Comunicazione (Testo, Stato, idMittente, idDestinatario, DataInvio)
    VALUES (?, ?, ?, ?, ?)`;

  conn.query(query, [testo, stato, idMittente, idDestinatario, data], (err) => {
    if (err) {
      // in caso di errore del DB
      console.error('Errore invio comunicazione', err);
      return res.status(500).json({ success: false });
    }
    res.json({ success: true });
  });
  });



// --------------------- AVVIO DEL SERVER EXPRESS ---------------------


  // avvia il server Express sulla porta 3001
  app.listen(3001, () => {
    console.log('Server avviato su http://localhost:3001');
  });

  // messaggio di collegamento a localhost:3001
  app.get('/', (req, res) => {
    res.send('StallaNet Backend API attivo 🚜');
  });
