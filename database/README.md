# Siandu Database Schema

This directory contains the complete database schema for the Siandu Posyandu Digital System.

## Files Overview

### 📄 `schema.sql`
Complete database schema containing all tables with proper foreign key relationships.

**Tables included:**
- `roles` - User roles (Admin, User, Petugas, Kader)
- `users` - Main user accounts
- `user_detail` - Extended user information (birth place, address, etc.)
- `hasilPemeriksaan` - Health examination results
- `jadwal` - Schedule/appointments
- `tickets` - Support tickets

### 📄 `setup.sql`
Database initialization script that creates the database and runs the complete schema.

### 📄 Individual Table Files
- `users.sql` - Users table only
- `user_detail.sql` - User details table only
- `roles.sql` - Roles table only
- `hasilPemeriksaan.sql` - Health examination table only
- `jadwal.sql` - Schedule table only
- `tickets.sql` - Support tickets table only

## How to Use

### Option 1: Complete Setup (Recommended)
```bash
# Run the complete setup script
mysql -u your_username -p < setup.sql
```

### Option 2: Manual Setup
```bash
# Create database
mysql -u your_username -p -e "CREATE DATABASE siandu_db;"

# Use the database
mysql -u your_username -p siandu_db < schema.sql
```

### Option 3: Individual Tables
If you need to create tables individually:
```bash
mysql -u your_username -p your_database < roles.sql
mysql -u your_username -p your_database < users.sql
mysql -u your_username -p your_database < user_detail.sql
# ... and so on
```

## Default Data

The schema includes:
- **4 default roles**: User (1), Admin (3421), Petugas (2), Kader (3)
- **1 default admin user**:
  - Email: `admin@siandu.com`
  - Password: `admin123` (hashed)
  - Role: Admin

## Important Notes

1. **Foreign Key Dependencies**: Tables are created in the correct order to handle foreign key constraints
2. **Character Set**: All tables use UTF-8 encoding for Indonesian language support
3. **Engine**: All tables use InnoDB engine for transaction support
4. **Admin Password**: Change the default admin password in production!

## Environment Variables

Make sure your `.env` file includes:
```
MYSQL_HOST=localhost
MYSQL_USER=your_username
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=siandu_db
MYSQL_TABLE_USERS=users
SECRET_KEY_AUTH=your_jwt_secret
PORT=3001
```

## Useful Queries

```sql
-- View all users with roles
SELECT u.id, u.nama, u.email, r.roleName
FROM users u
LEFT JOIN roles r ON u.role = r.id;

-- View user details
SELECT u.nama, ud.*
FROM users u
LEFT JOIN user_detail ud ON u.id = ud.id;

-- View health examination results
SELECT u.nama, hp.*
FROM users u
LEFT JOIN hasilPemeriksaan hp ON u.id = hp.userId;