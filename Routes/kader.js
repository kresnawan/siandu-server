import express from 'express';
import con from '../db_connect.js';
import { authenticateUserToken } from '../authentication.js';
import 'dotenv/config';
import { uploadPhoto } from '../multerConfig.js'; // Adjust path as needed
import multer from 'multer';

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store in memory for now
const upload = multer({ storage: storage });

const kaderRoutes = express.Router();
const userTable = process.env.MYSQL_TABLE_USERS;

// GET /kader - Get all kaders (users with role=3)
kaderRoutes.get('/', authenticateUserToken, (req, res) => {
  const query = `
    SELECT
      u.id,
      u.nama as name,
      kd.nik as nik,
      kd.phone as phone,
      kd.email,
      kd.birth_date as birthDate,
      kd.gender as gender,
      kd.ktp_address as ktpAddress,
      kd.residence_address as residenceAddress,
      kd.kader_since as kaderSince,
      kd.education,
      kd.health_insurance as healthInsurance,
      kd.bank_account as bankAccount,
      kd.posyandu_area as posyanduArea,
      kd.posyandu_name as posyanduName,
      kd.training,
      kd.photo,
      kd.status
    FROM ${userTable} u
    LEFT JOIN kader_detail kd ON u.id = kd.user_id
    WHERE u.role = 3
    ORDER BY u.id DESC
  `;

  con.execute(query, (err, results, fields) => {
    if (err) {
      console.error('Error fetching kaders:', err);
      return res.status(500).json({ error: 'Failed to fetch kaders' });
    }
    
    res.json(results);
  });
});

// GET /kader/search - Search kaders
kaderRoutes.get('/search', authenticateUserToken, (req, res) => {
  const { q } = req.query;
  if (!q || q.trim() === '') {
    return res.json([]);
  }

  const searchQuery = `
    SELECT
      u.id,
      u.nama as name,
      kd.nik as nik,
      kd.phone as phone,
      kd.email,
      kd.birth_date as birthDate,
      kd.gender as gender,
      kd.ktp_address as ktpAddress,
      kd.residence_address as residenceAddress,
      kd.kader_since as kaderSince,
      kd.education,
      kd.health_insurance as healthInsurance,
      kd.bank_account as bankAccount,
      kd.posyandu_area as posyanduArea,
      kd.posyandu_name as posyanduName,
      kd.training,
      kd.photo,
      kd.status
    FROM ${userTable} u
    LEFT JOIN kader_detail kd ON u.id = kd.user_id
    WHERE u.role = 3 AND (
      u.nama LIKE ? OR
      kd.nik LIKE ? OR
      kd.phone LIKE ? OR
      kd.email LIKE ?
    )
    ORDER BY u.id DESC
  `;
  const searchTerm = `%${q}%`;

  con.execute(searchQuery, [searchTerm, searchTerm, searchTerm, searchTerm], (err, results, fields) => {
    if (err) {
      console.error('Error searching kaders:', err);
      return res.status(500).json({ error: 'Failed to search kaders' });
    }
    
    res.json(results);
  });
});

// GET /kader/:id - Get kader by ID
kaderRoutes.get('/:id', authenticateUserToken, (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT
      u.id,
      u.nama as name,
      kd.nik as nik,
      kd.phone as phone,
      kd.email,
      kd.birth_date as birthDate,
      kd.gender as gender,
      kd.ktp_address as ktpAddress,
      kd.residence_address as residenceAddress,
      kd.kader_since as kaderSince,
      kd.education,
      kd.health_insurance as healthInsurance,
      kd.bank_account as bankAccount,
      kd.posyandu_area as posyanduArea,
      kd.posyandu_name as posyanduName,
      kd.training,
      kd.photo,
      kd.status
    FROM ${userTable} u
    LEFT JOIN kader_detail kd ON u.id = kd.user_id
    WHERE u.id = ? AND u.role = 3
  `;

  con.execute(query, [id], (err, results, fields) => {
    if (err) {
      console.error('Error fetching kader:', err);
      return res.status(500).json({ error: 'Failed to fetch kader' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Kader not found' });
    }

    res.json(results[0]);
  });
});

// POST /kader - Create new kader
// POST /kader - Create new kader
// POST /kader - Create new kader (Simplified, no transactions)
kaderRoutes.post('/', authenticateUserToken, uploadPhoto, (req, res) => {

  const {
    name,
    kaderSince,
    nik,
    ktpAddress,
    residenceAddress,
    birthDate,
    gender,
    education,
    phone,
    email,
    healthInsurance,
    bankAccount,
    posyanduArea,
    posyanduName,
    training,
    status
  } = req.body;
  
  // Handle photo file if uploaded
  const photo = req.file ? req.file.filename : null;

  // Validate required fields
  const requiredFields = ['name', 'nik', 'phone', 'ktpAddress', 'birthDate', 'gender'];
  const missingFields = requiredFields.filter(field => !req.body[field]);

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: `Missing required fields: ${missingFields.join(', ')}`
    });
  }

  // Step 1: Create user account first (role = 3 for kader)
  const userInsertQuery = `
    INSERT INTO ${userTable} (nama, email, password, verified, role)
    VALUES (?, ?, '', 1, 3)
  `;

  con.execute(userInsertQuery, [name, email || null], (err, userResults) => {
    if (err) {
      console.error('Error creating user:', err);
      return res.status(500).json({ error: 'Gagal membuat data kader' });
    }

    const userId = userResults.insertId;

    // Step 2: Create kader details in the kader_detail table
    const kaderDetailInsertQuery = `
      INSERT INTO kader_detail (
        id, user_id, kader_since, nik, ktp_address, residence_address, birth_date, gender, education, phone, email, health_insurance, bank_account, posyandu_area, posyandu_name, training, photo, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Aktif')
    `;

    const kaderDetailValues = [
      userId,
      userId,
      kaderSince || null,
      nik,
      ktpAddress,
      residenceAddress,
      birthDate,
      gender,
      education,
      phone,
      email || null,
      healthInsurance,
      bankAccount,
      posyanduArea,
      posyanduName,
      training || '',
      photo || null,
      status || 'Aktif'
    ];

    con.execute(kaderDetailInsertQuery, kaderDetailValues, (err, kaderDetailResults) => {
      if (err) {
        console.error('Error creating kader details:', err);
        // Basic cleanup: Attempt to delete the user if kader_detail insert fails
        con.execute(`DELETE FROM ${userTable} WHERE id = ?`, [userId], (deleteErr) => {
          if (deleteErr) {
            console.error('Error cleaning up user after kader detail failure:', deleteErr);
          }
        });
        return res.status(500).json({ error: 'Gagal membuat data detail kader' });
      }

      // Step 3: Fetch and return the created kader
      const selectQuery = `
        SELECT
          u.id,
          u.nama as name,
          kd.nik as nik,
          kd.phone as phone,
          kd.email,
          kd.birth_date as birthDate,
          kd.gender as gender,
          kd.ktp_address as ktpAddress,
          kd.residence_address as residenceAddress,
          kd.kader_since as kaderSince,
          kd.education,
          kd.health_insurance as healthInsurance,
          kd.bank_account as bankAccount,
          kd.posyandu_area as posyanduArea,
          kd.posyandu_name as posyanduName,
          kd.training,
          kd.photo,
          kd.status
        FROM ${userTable} u
        LEFT JOIN kader_detail kd ON u.id = kd.user_id
        WHERE u.id = ?
      `;

      con.execute(selectQuery, [userId], (err, kaderResults) => {
        if (err) {
          console.error('Error fetching created kader:', err);
          return res.status(500).json({ error: 'Data kader berhasil dibuat, tetapi gagal mengambilnya' });
        }

        // Return the newly created kader object
        res.status(201).json(kaderResults[0]);
      });
    });
  });
});

// PUT /kader/:id - Update kader
kaderRoutes.put('/:id', authenticateUserToken, uploadPhoto, (req, res) => { // <-- Changed to use uploadPhoto
  const { id } = req.params;
  const kaderData = req.body;
  
  // Handle photo file if uploaded
  if (req.file) {
    // Since you're using uploadPhoto (which likely saves to disk),
    // use the filename, not the buffer.
    // If your uploadPhoto middleware sets req.file.filename, use that.
    // If it's designed to store the file path, use that.
    kaderData.photo = req.file.filename; // <-- Adjust based on your uploadPhoto logic
    // If uploadPhoto stores the full path or URL, use that instead.
    // Example: kaderData.photo = `/uploads/${req.file.filename}`;
  }

  // Check if kader exists and has role=3
  const checkQuery = `SELECT id FROM ${userTable} WHERE id = ? AND role = 3`;
  con.execute(checkQuery, [id], (err, results, fields) => {
    if (err) {
      console.error('Error checking kader existence:', err);
      return res.status(500).json({ error: 'Failed to update kader' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Kader not found' });
    }

    // Check if NIK is being changed and if it conflicts
    if (kaderData.nik) {
      const checkNikQuery = 'SELECT id FROM kader_detail WHERE nik = ? AND user_id != ?'; // <-- FIXED: use user_id, not id
      con.execute(checkNikQuery, [kaderData.nik, id], (err, nikResults, fields) => {
        if (err) {
          console.error('Error checking NIK conflict:', err);
          return res.status(500).json({ error: 'Failed to update kader' });
        }

        if (nikResults.length > 0) {
          return res.status(409).json({ error: 'NIK already exists for another kader' });
        }

        performUpdate();
      });
    } else {
      performUpdate();
    }

    function performUpdate() {
      // Update user table (name, email)
      if (kaderData.name || kaderData.email) {
        const userUpdateFields = [];
        const userUpdateValues = [];

        if (kaderData.name) {
          userUpdateFields.push('nama = ?');
          userUpdateValues.push(kaderData.name);
        }
        if (kaderData.email) {
          userUpdateFields.push('email = ?');
          userUpdateValues.push(kaderData.email);
        }

        userUpdateValues.push(id);

        const userUpdateQuery = `UPDATE ${userTable} SET ${userUpdateFields.join(', ')} WHERE id = ?`;
        con.execute(userUpdateQuery, userUpdateValues, (err, results, fields) => {
          if (err) {
            console.error('Error updating user:', err);
            return res.status(500).json({ error: 'Failed to update user data' });
          }
        });
      }

      // Update kader_detail table
      const kaderDetailUpdateFields = [];
      const kaderDetailUpdateValues = [];

      // FIXED: Removed 'name: 'nama'' mapping
      const kaderDetailMappings = {
        // name: 'nama', // <-- REMOVED! 'name' is handled in the users table.
        kaderSince: 'kader_since',
        nik: 'nik',
        ktpAddress: 'ktp_address',
        residenceAddress: 'residence_address',
        birthDate: 'birth_date',
        gender: 'gender',
        education: 'education',
        phone: 'phone',
        email: 'email',
        healthInsurance: 'health_insurance',
        bankAccount: 'bank_account',
        posyanduArea: 'posyandu_area',
        posyanduName: 'posyandu_name',
        training: 'training',
        photo: 'photo',
        status: 'status'
      };

     

      Object.keys(kaderData).forEach(key => {
        if (kaderDetailMappings[key]) {
          let value = kaderData[key];
    
          // Special handling for birthDate
          if (key === 'birthDate' && value) {
            value = new Date(value).toISOString().split('T')[0]; // Convert to YYYY-MM-DD
          }
    
          kaderDetailUpdateFields.push(`${kaderDetailMappings[key]} = ?`);
          kaderDetailUpdateValues.push(value); // <-- Push the (possibly converted) value
        }
      });

      if (kaderDetailUpdateFields.length > 0) {
        kaderDetailUpdateValues.push(id);

        const kaderDetailUpdateQuery = `UPDATE kader_detail SET ${kaderDetailUpdateFields.join(', ')} WHERE user_id = ?`; // <-- Use user_id
        con.execute(kaderDetailUpdateQuery, kaderDetailUpdateValues, (err, results, fields) => {
          if (err) {
            console.error('Error updating kader details:', err);
            return res.status(500).json({ error: 'Failed to update kader details' });
          }
        });
      }

      // Return updated kader
      const selectQuery = `
        SELECT
          u.id,
          u.nama as name,
          kd.nik as nik,
          kd.phone as phone,
          kd.email,
          kd.birth_date as birthDate,
          kd.gender as gender,
          kd.ktp_address as ktpAddress,
          kd.residence_address as residenceAddress,
          kd.kader_since as kaderSince,
          kd.education,
          kd.health_insurance as healthInsurance,
          kd.bank_account as bankAccount,
          kd.posyandu_area as posyanduArea,
          kd.posyandu_name as posyanduName,
          kd.training,
          kd.photo,
          kd.status
        FROM ${userTable} u
        LEFT JOIN kader_detail kd ON u.id = kd.user_id
        WHERE u.id = ?
      `;

      con.execute(selectQuery, [id], (err, kaderResults, fields) => {
        if (err) {
          console.error('Error fetching updated kader:', err);
          return res.status(500).json({ error: 'Kader updated but failed to retrieve' });
        }

        if (kaderResults.length === 0) {
          return res.status(404).json({ error: 'Kader not found after update' });
        }

        res.json(kaderResults[0]);
      });
    }
  });
});

// DELETE /kader/:id - Delete kader
kaderRoutes.delete('/:id', authenticateUserToken, (req, res) => {
  const { id } = req.params;

  // Check if kader exists and has role=3
  const checkQuery = `SELECT id FROM ${userTable} WHERE id = ? AND role = 3`;
  con.execute(checkQuery, [id], (err, results, fields) => {
    if (err) {
      console.error('Error checking kader existence:', err);
      return res.status(500).json({ error: 'Failed to delete kader' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Kader not found' });
    }

    // Delete kader details first (due to foreign key constraint)
    con.execute('DELETE FROM kader_detail WHERE id = ?', [id], (err, kaderDetailResults, fields) => {
      if (err) {
        console.error('Error deleting kader details:', err);
        return res.status(500).json({ error: 'Failed to delete kader details' });
      }

      // Delete user
      con.execute(`DELETE FROM ${userTable} WHERE id = ?`, [id], (err, userResults, fields) => {
        if (err) {
          console.error('Error deleting user:', err);
          return res.status(500).json({ error: 'Failed to delete kader' });
        }

        res.json({ message: 'Kader deleted successfully' });
      });
    });
  });
});

export default kaderRoutes;