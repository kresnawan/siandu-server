-- =====================================================
-- PASIEN TABLE (Patient data for Posyandu system)
-- =====================================================
CREATE TABLE `pasien` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `nik` varchar(16) NOT NULL UNIQUE,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text NOT NULL,
  `birthDate` date NOT NULL,
  `gender` enum('Laki-laki','Perempuan') NOT NULL,
  `bloodType` enum('A+','A-','B+','B-','AB+','AB-','O+','O-') DEFAULT NULL,
  `status` enum('Aktif','Tidak Aktif') DEFAULT 'Aktif',
  `lastVisit` date DEFAULT NULL,
  `medicalRecords` int DEFAULT 0,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nik_unique` (`nik`),
  KEY `status_index` (`status`),
  KEY `lastVisit_index` (`lastVisit`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- Insert sample patient data
INSERT INTO `pasien` (`name`, `nik`, `phone`, `email`, `address`, `birthDate`, `gender`, `bloodType`, `status`, `lastVisit`, `medicalRecords`) VALUES
('Ahmad Surya', '1234567890123456', '+6281234567890', 'ahmad@example.com', 'Jl. Sudirman No. 123, Jakarta', '1990-05-15', 'Laki-laki', 'O+', 'Aktif', '2024-09-01', 3),
('Siti Aminah', '2345678901234567', '+6281234567891', 'siti@example.com', 'Jl. Thamrin No. 456, Jakarta', '1985-08-20', 'Perempuan', 'A-', 'Aktif', '2024-08-15', 5),
('Budi Santoso', '3456789012345678', '+6281234567892', 'budi@example.com', 'Jl. Gatot Subroto No. 789, Jakarta', '1992-12-10', 'Laki-laki', 'B+', 'Aktif', '2024-09-05', 2),
('Maya Sari', '4567890123456789', '+6281234567893', 'maya@example.com', 'Jl. MH Thamrin No. 101, Jakarta', '1988-03-25', 'Perempuan', 'AB+', 'Tidak Aktif', '2024-06-20', 4),
('Rudi Hartono', '5678901234567890', '+6281234567894', 'rudi@example.com', 'Jl. Sudirman No. 202, Jakarta', '1995-11-30', 'Laki-laki', 'O-', 'Aktif', '2024-08-30', 1);