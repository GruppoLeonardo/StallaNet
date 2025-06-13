// gestione della creazione di cartellini (operai e gestori) e quotidiane (operai)

const cron = require('node-cron'); // per eseguire codice ad orari prestabiliti
const creaCartelliniOggi = require('./creaCartellini'); // crea i cartellini odierni
const creaQuotidianeOggi = require('./creaQuotidiane'); // crea le quotidiane odierne

// creazione all'avvio del server

creaCartelliniOggi();
creaQuotidianeOggi();


// creazione ogni giorno a mezzanotte
cron.schedule('0 0 * * *', () => {
  console.log("Mezzanotte: creazione cartellini e quotidiane");
  creaCartelliniOggi();
  creaQuotidianeOggi();
});

