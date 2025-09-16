-- Update examination table to change boolean fields to numeric values
-- File: update_examination_fields.sql
-- Description: Changes high_cholesterol, high_uric_acid to numeric fields and adds blood_sugar

-- Backup existing data (optional - uncomment if you want to backup)
-- CREATE TABLE hasilpemeriksaan_backup AS SELECT * FROM hasilpemeriksaan;

-- Add new numeric columns
ALTER TABLE hasilpemeriksaan 
ADD COLUMN uric_acid DECIMAL(5,2) DEFAULT NULL COMMENT 'Asam urat dalam mg/dL';

ALTER TABLE hasilpemeriksaan 
ADD COLUMN cholesterol DECIMAL(5,2) DEFAULT NULL COMMENT 'Kolesterol dalam mg/dL';

ALTER TABLE hasilpemeriksaan 
ADD COLUMN blood_sugar DECIMAL(5,2) DEFAULT NULL COMMENT 'Gula darah dalam mg/dL';

-- Migrate existing boolean data to numeric (optional - set default values)
-- You can uncomment these lines if you want to migrate existing data
-- UPDATE hasilpemeriksaan SET uric_acid = CASE WHEN high_uric_acid = 1 THEN 7.0 ELSE NULL END;
-- UPDATE hasilpemeriksaan SET cholesterol = CASE WHEN high_cholesterol = 1 THEN 250.0 ELSE NULL END;

-- Drop old boolean columns (uncomment when ready to remove old columns)
-- ALTER TABLE hasilpemeriksaan DROP COLUMN high_cholesterol;
-- ALTER TABLE hasilpemeriksaan DROP COLUMN high_uric_acid;

-- Verify the changes
-- DESCRIBE hasilpemeriksaan;

COMMIT;
