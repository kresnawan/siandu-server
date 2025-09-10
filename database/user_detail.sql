CREATE TABLE `user_detail` (
  `tempatLahir` varchar(255) DEFAULT NULL,
  `tanggalLahir` date DEFAULT NULL,
  `alamat` varchar(255) DEFAULT NULL,
  `pekerjaan` varchar(255) DEFAULT NULL,
  `negara` varchar(255) DEFAULT NULL,
  `golDarah` varchar(5) DEFAULT NULL,
  `id` int NOT NULL,
  `NIK` int DEFAULT NULL,
  `jenisKelamin` varchar(20) DEFAULT NULL,
  `noHp` int DEFAULT NULL,
  KEY `id` (`id`),
  CONSTRAINT `user_detail_ibfk_1` FOREIGN KEY (`id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;