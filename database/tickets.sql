CREATE TABLE `tickets` (
  `ticketId` int NOT NULL AUTO_INCREMENT,
  `senderId` int DEFAULT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `message` varchar(500) DEFAULT NULL,
  `createdAt` varchar(255) DEFAULT NULL,
  `isAnswered` tinyint(1) DEFAULT NULL,
  `answeredAt` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`ticketId`),
  KEY `senderId` (`senderId`),
  CONSTRAINT `tickets_ibfk_1` FOREIGN KEY (`senderId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;