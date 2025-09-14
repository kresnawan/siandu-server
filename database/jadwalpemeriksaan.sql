-- =====================================================
-- JADWAL PEMERIKSAAN TABLE (Examination Schedule)
-- =====================================================
-- Table for managing examination schedules and home visits
-- Created: 2025-01-15
-- Purpose: Track scheduled examinations for patients

CREATE TABLE `jadwal_pemeriksaan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `petugas_id` int DEFAULT NULL,
  `visit_date` date NOT NULL,
  `visit_time` time NOT NULL,
  `visit_type` enum('Rumah','Posyandu','Puskesmas') DEFAULT 'Rumah',
  `status` enum('Terjadwal','Selesai','Dibatalkan','Ditunda') DEFAULT 'Terjadwal',
  `notes` text,
  `examination_type` varchar(100) DEFAULT 'Pemeriksaan Rutin',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `patient_id` (`patient_id`),
  KEY `petugas_id` (`petugas_id`),
  KEY `visit_date` (`visit_date`),
  KEY `status` (`status`),
  KEY `visit_type` (`visit_type`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`),
  CONSTRAINT `jadwal_pemeriksaan_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `jadwal_pemeriksaan_ibfk_2` FOREIGN KEY (`petugas_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `jadwal_pemeriksaan_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `jadwal_pemeriksaan_ibfk_4` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- =====================================================
-- JADWAL PEMERIKSAAN HISTORY TABLE (Audit Trail)
-- =====================================================
-- Track changes to examination schedules for audit purposes

