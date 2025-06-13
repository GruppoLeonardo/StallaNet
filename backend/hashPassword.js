//Script node che genera l'hash di una password in modo manuale usando bcrypt

const bcrypt = require('bcrypt'); 

const passwordChiara = process.argv[2]; // ottiene la password da riga di comando

if (!passwordChiara) { //protezione errori
  console.error("Inserisci una password da hashare.\nUso: node hashPassword.js <password>");
  process.exit(1);
}

(async () => {
  try {
    const hash = await bcrypt.hash(passwordChiara, 10); // Salt 10
    console.log(`Password in chiaro: ${passwordChiara}`);
    console.log(`Hash generato: ${hash}`);
  } catch (err) {
    console.error("Errore nella generazione dell'hash:", err);
  }
})();