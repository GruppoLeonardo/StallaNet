const cron = require('node-cron');
const creaCartelliniOggi = require('./creaCartellini');
const creaQuotidianeOggi = require('./creaQuotidiane');

// All'avvio del server
creaCartelliniOggi();
creaQuotidianeOggi();

// Ogni giorno a mezzanotte
cron.schedule('0 0 * * *', () => {
  console.log("Mezzanotte: creazione cartellini e quotidiane");
  creaCartelliniOggi();
  creaQuotidianeOggi();
});

