
CREATE DATABASE StallaNet;
USE StallaNet;

CREATE TABLE Stalla (
  ID int NOT NULL AUTO_INCREMENT,
  Posizione varchar(50) NOT NULL,
  PRIMARY KEY (ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Partner (
  ID int NOT NULL AUTO_INCREMENT,
  Nominativo varchar(50) NOT NULL,
  Descrizione varchar(300) DEFAULT NULL,
  Telefono varchar(15) DEFAULT NULL,
  Email varchar(320) NOT NULL,
  Ruolo enum('veterinario','fornitore') NOT NULL,
  PRIMARY KEY (ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Utente (
  ID int NOT NULL AUTO_INCREMENT,
  NomeUtente varchar(50) NOT NULL,
  Psw varchar(16) NOT NULL,
  Ruolo enum('operaio','gestore','direttore') NOT NULL,
  Disattivato tinyint(1) DEFAULT '0',
  PRIMARY KEY (ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Comunicazione (
  ID int NOT NULL AUTO_INCREMENT,
  Testo varchar(800) NOT NULL,
  Stato tinyint NOT NULL,
  idMittente int NOT NULL,
  idDestinatario int NOT NULL,
  DataInvio datetime NOT NULL,
  PRIMARY KEY (ID),
  KEY idMittente (idMittente),
  KEY idDestinatario (idDestinatario),
  CONSTRAINT comunicazione_ibfk_1 FOREIGN KEY (idMittente) REFERENCES Utente (ID) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT comunicazione_ibfk_2 FOREIGN KEY (idDestinatario) REFERENCES Utente (ID) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Cartellino (
  ID int NOT NULL AUTO_INCREMENT,
  OraIngresso time DEFAULT NULL,
  OraUscita time DEFAULT NULL,
  Data date DEFAULT NULL,
  idUtente int DEFAULT NULL,
  PRIMARY KEY (ID),
  UNIQUE KEY unique_cartellino (idUtente,Data),
  KEY idUtente (idUtente),
  CONSTRAINT cartellino_ibfk_1 FOREIGN KEY (idUtente) REFERENCES Utente (ID) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Corrispondenza (
  idPartner int NOT NULL,
  idGestore int NOT NULL,
  PRIMARY KEY (idPartner,idGestore),
  KEY fk_Corrispondenza_Utente (idGestore),
  CONSTRAINT fk_Corrispondenza_Partner FOREIGN KEY (idPartner) REFERENCES Partner (ID) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_Corrispondenza_Utente FOREIGN KEY (idGestore) REFERENCES Utente (ID) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Gestione (
  IdGestore int NOT NULL,
  idStalla int NOT NULL,
  PRIMARY KEY (IdGestore,idStalla),
  KEY idStalla (idStalla),
  CONSTRAINT gestione_ibfk_1 FOREIGN KEY (IdGestore) REFERENCES Utente (ID) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT gestione_ibfk_2 FOREIGN KEY (idStalla) REFERENCES Stalla (ID) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Animale (
  ID int NOT NULL AUTO_INCREMENT,
  Nota varchar(800) DEFAULT NULL,
  Vaccinazioni varchar(800) DEFAULT NULL,
  idOperaio int DEFAULT NULL,
  idStalla int DEFAULT NULL,
  PRIMARY KEY (ID),
  KEY idStalla (idStalla),
  KEY idOperaio (idOperaio),
  CONSTRAINT animale_ibfk_1 FOREIGN KEY (idStalla) REFERENCES Stalla (ID) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT animale_ibfk_2 FOREIGN KEY (idOperaio) REFERENCES Utente (ID) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Quotidiana (
  ID int NOT NULL AUTO_INCREMENT,
  Pulizia tinyint NOT NULL,
  Mungitura1 tinyint NOT NULL,
  Mungitura2 tinyint NOT NULL,
  Alimentazione tinyint NOT NULL,
  Data date NOT NULL,
  idAnimale int NOT NULL,
  idOperaio int NOT NULL,
  PRIMARY KEY (ID),
  KEY idOperaio (idOperaio),
  KEY idAnimale (idAnimale),
  CONSTRAINT quotidiana_ibfk_1 FOREIGN KEY (idOperaio) REFERENCES Utente (ID) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT quotidiana_ibfk_2 FOREIGN KEY (idAnimale) REFERENCES Animale (ID) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;