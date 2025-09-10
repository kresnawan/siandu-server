-- Siandu Database Setup Script
-- Run this script to initialize the complete database

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS siandu;
USE siandu;

-- Run the complete schema
SOURCE schema.sql;

-- Verify setup
SELECT 'Database setup completed successfully!' as Status;
SHOW TABLES;