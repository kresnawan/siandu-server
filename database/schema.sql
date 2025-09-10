-- Siandu Database Schema
-- Complete database setup for Posyandu Digital System
-- Created: 2025-09-06

-- =====================================================
-- ROLES TABLE (No dependencies)
-- =====================================================
CREATE TABLE `roles` (
  `id` int NOT NULL,
  `roleName` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- =====================================================
-- USERS TABLE (Depends on roles)
-- =====================================================
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(1000) DEFAULT NULL,
  `verified` tinyint(1) DEFAULT NULL,
  `token` varchar(1000) DEFAULT NULL,
  `role` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `role` (`role`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- =====================================================
-- USER_DETAIL TABLE (Depends on users)
-- =====================================================
CREATE TABLE `user_detail` (
  `tempatLahir` varchar(255) DEFAULT NULL,
  `tanggalLahir` date DEFAULT NULL,
  `alamat` varchar(255) DEFAULT NULL,
  `pekerjaan` varchar(255) DEFAULT NULL,
  `negara` varchar(255) DEFAULT NULL,
  `golDarah` varchar(5) DEFAULT NULL,
  `id` int NOT NULL,
  `NIK` varchar(16) DEFAULT NULL,
  `jenisKelamin` varchar(20) DEFAULT NULL,
  `noHp` varchar(20) DEFAULT NULL,
  `status` enum('Aktif','Tidak Aktif') DEFAULT 'Aktif',
  `lastVisit` date DEFAULT NULL,
  `medicalRecords` int DEFAULT 0,
  KEY `id` (`id`),
  CONSTRAINT `user_detail_ibfk_1` FOREIGN KEY (`id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- =====================================================
-- HASIL_PEMERIKSAAN TABLE (Depends on users)
-- =====================================================
CREATE TABLE `hasilPemeriksaan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `tanggalPemeriksaan` varchar(50) DEFAULT NULL,
  `hasilPemeriksaan` varchar(1000) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `hasilPemeriksaan_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- =====================================================
-- JADWAL TABLE (No dependencies)
-- =====================================================
CREATE TABLE `jadwal` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` varchar(50) DEFAULT NULL,
  `title` varchar(50) DEFAULT NULL,
  `message` varchar(150) DEFAULT NULL,
  `createdAt` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- =====================================================
-- TICKETS TABLE (Depends on users)
-- =====================================================
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

-- =====================================================
-- KADER_DETAIL TABLE (Depends on users)
-- =====================================================
CREATE TABLE `kader_detail` (
  `id` int NOT NULL,
  `ktpAddress` varchar(255) DEFAULT NULL,
  `residenceAddress` varchar(255) DEFAULT NULL,
  `kaderSince` int DEFAULT NULL,
  `education` varchar(50) DEFAULT NULL,
  `healthInsurance` varchar(10) DEFAULT NULL,
  `bankAccount` varchar(50) DEFAULT NULL,
  `posyanduArea` varchar(100) DEFAULT NULL,
  `posyanduName` varchar(100) DEFAULT NULL,
  `training` varchar(500) DEFAULT NULL,
  `photo` varchar(500) DEFAULT NULL,
  `status` enum('Aktif','Tidak Aktif') DEFAULT 'Aktif',
  PRIMARY KEY (`id`),
  CONSTRAINT `kader_detail_ibfk_1` FOREIGN KEY (`id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;


-- =====================================================
-- INITIAL DATA INSERTION
-- =====================================================

-- Insert default roles
INSERT INTO `roles` (`id`, `roleName`) VALUES
(1, 'User'),
(3421, 'Admin'),
(2, 'Petugas'),
(3, 'Kader');

-- Insert sample admin user (password: admin123)
-- Note: Password should be hashed in production
INSERT INTO `users` (`nama`, `email`, `password`, `verified`, `role`) VALUES
('Administrator', 'admin@siandu.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPjYfY8Z6Q1K', 1, 3421);

-- Insert sample patients (role=1)
INSERT INTO `users` (`nama`, `email`, `password`, `verified`, `role`) VALUES
('Ahmad Surya', 'ahmad@example.com', '', 1, 1),
('Siti Aminah', 'siti@example.com', '', 1, 1),
('Budi Santoso', 'budi@example.com', '', 1, 1),
('Maya Sari', 'maya@example.com', '', 1, 1),
('Rudi Hartono', 'rudi@example.com', '', 1, 1);

-- Insert sample patient details
INSERT INTO `user_detail` (`id`, `NIK`, `noHp`, `alamat`, `tanggalLahir`, `jenisKelamin`, `golDarah`, `status`, `lastVisit`, `medicalRecords`) VALUES
(2, '1234567890123456', '+6281234567890', 'Jl. Sudirman No. 123, Jakarta', '1990-05-15', 'Laki-laki', 'O+', 'Aktif', '2024-09-01', 3),
(3, '2345678901234567', '+6281234567891', 'Jl. Thamrin No. 456, Jakarta', '1985-08-20', 'Perempuan', 'A-', 'Aktif', '2024-08-15', 5),
(4, '3456789012345678', '+6281234567892', 'Jl. Gatot Subroto No. 789, Jakarta', '1992-12-10', 'Laki-laki', 'B+', 'Aktif', '2024-09-05', 2),
(5, '4567890123456789', '+6281234567893', 'Jl. MH Thamrin No. 101, Jakarta', '1988-03-25', 'Perempuan', 'AB+', 'Tidak Aktif', '2024-06-20', 4),
(6, '5678901234567890', '+6281234567894', 'Jl. Sudirman No. 202, Jakarta', '1995-11-30', 'Laki-laki', 'O-', 'Aktif', '2024-08-30', 1);


-- =====================================================
-- USEFUL QUERIES FOR DEVELOPMENT
-- =====================================================

-- View all users with their roles
-- SELECT u.id, u.nama, u.email, r.roleName FROM users u LEFT JOIN roles r ON u.role = r.id;

-- View user details
-- SELECT u.nama, ud.* FROM users u LEFT JOIN user_detail ud ON u.id = ud.id;

-- View health examination results
-- SELECT u.nama, hp.* FROM users u LEFT JOIN hasilPemeriksaan hp ON u.id = hp.userId;

-- View support tickets
-- SELECT u.nama as sender, t.* FROM users u LEFT JOIN tickets t ON u.id = t.senderId;

-- View kader details
-- SELECT u.nama, kd.* FROM users u LEFT JOIN kader_detail kd ON u.id = kd.id;

COMMIT;