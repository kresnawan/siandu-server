import express from 'express';
import con from '../db_connect.js';
import { authenticateUserToken } from '../authentication.js';
import 'dotenv/config';

const userRoutes = express.Router();
const userTable = process.env.MYSQL_TABLE_USERS;
const userDetailTable = 'user_detail';

userRoutes.get('/profile', authenticateUserToken, (req, res) => {
  // Get user basic info
  con.execute(`SELECT * FROM ${userTable} WHERE email = ?`, [req.user.email], (err, userResults, fields) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!userResults[0]) return res.status(404).json({ message: 'User not found' });

    const user = userResults[0];

    // Then get user details
    con.execute(`SELECT * FROM ${userDetailTable} WHERE id = ?`, [user.id], (err2, detailResults, fields2) => {
      if (err2) return res.status(500).json({ error: err2.message });

      const userDetail = detailResults[0] || {};

      res.json({
        user: {
          id: user.id,
          nama: user.nama,
          email: user.email,
          role: user.role,
          verified: user.verified
        },
        details: userDetail
      });
    });
  });
});

userRoutes.put('/profile', authenticateUserToken, (req, res) => {
  const updateData = req.body;

  // First get the user ID
  con.execute(`SELECT id FROM ${userTable} WHERE email = ?`, [req.user.email], (err, userResults, fields) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!userResults[0]) return res.status(404).json({ message: 'User not found' });

    const userId = userResults[0].id;

    // Update basic user info
    if (updateData.nama || updateData.email) {
      const updateFields = [];
      const updateValues = [];

      if (updateData.nama) {
        updateFields.push('nama = ?');
        updateValues.push(updateData.nama);
      }
      if (updateData.email) {
        updateFields.push('email = ?');
        updateValues.push(updateData.email);
      }

      updateValues.push(req.user.email); // WHERE clause

      con.execute(`UPDATE ${userTable} SET ${updateFields.join(', ')} WHERE email = ?`, updateValues, (err, results, fields) => {
        if (err) return res.status(500).json({ error: err.message });
      });
    }

    // Update user details
    if (Object.keys(updateData).some(key => ['tempatLahir', 'tanggalLahir', 'alamat', 'pekerjaan', 'negara', 'golDarah', 'NIK', 'jenisKelamin', 'noHp'].includes(key))) {
      // Check if user_detail record exists
      con.execute(`SELECT id FROM ${userDetailTable} WHERE id = ?`, [userId], (err, checkResults, fields) => {
        if (err) return res.status(500).json({ error: err.message });

        const detailFields = [];
        const detailValues = [];
        const placeholders = [];

        Object.keys(updateData).forEach(key => {
          if (['tempatLahir', 'tanggalLahir', 'alamat', 'pekerjaan', 'negara', 'golDarah', 'NIK', 'jenisKelamin', 'noHp'].includes(key)) {
            detailFields.push(key);
            detailValues.push(updateData[key]);
            placeholders.push('?');
          }
        });

        if (checkResults.length === 0) {
          // Insert new record
          detailFields.unshift('id');
          detailValues.unshift(userId);
          placeholders.unshift('?');

          con.execute(`INSERT INTO ${userDetailTable} (${detailFields.join(', ')}) VALUES (${placeholders.join(', ')})`, detailValues, (err, results, fields) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Profile updated successfully' });
          });
        } else {
          // Update existing record
          const updateFields = detailFields.map(field => `${field} = ?`);

          detailValues.push(userId);

          con.execute(`UPDATE ${userDetailTable} SET ${updateFields.join(', ')} WHERE id = ?`, detailValues, (err, results, fields) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Profile updated successfully' });
          });
        }
      });
    } else {
      res.json({ message: 'Profile updated successfully' });
    }
  });
});

// =====================================================
// PATIENT ROUTES (Users with role=1) - Available at /pasien
// =====================================================

// GET /user/patients - Get all patients (users with role=1)
userRoutes.get('/patients', authenticateUserToken, (req, res) => {
  const query = `
    SELECT
      u.id,
      u.nama as name,
      ud.NIK as nik,
      ud.noHp as phone,
      u.email,
      ud.alamat as address,
      ud.tanggalLahir as birthDate,
      ud.jenisKelamin as gender,
      ud.golDarah as bloodType,
      ud.status,
      ud.lastVisit,
      ud.medicalRecords
    FROM ${userTable} u
    LEFT JOIN user_detail ud ON u.id = ud.id
    WHERE u.role = 1
    ORDER BY u.id DESC
  `;

  con.execute(query, (err, results, fields) => {
    if (err) {
      console.error('Error fetching patients:', err);
      return res.status(500).json({ error: 'Failed to fetch patients' });
    }
    res.json(results);
  });
});

// GET /user/patients/search - Search patients
userRoutes.get('/patients/search', authenticateUserToken, (req, res) => {
  const { q } = req.query;
  if (!q || q.trim() === '') {
    return res.json([]);
  }

  const searchQuery = `
    SELECT
      u.id,
      u.nama as name,
      ud.NIK as nik,
      ud.noHp as phone,
      u.email,
      ud.alamat as address,
      ud.tanggalLahir as birthDate,
      ud.jenisKelamin as gender,
      ud.golDarah as bloodType,
      ud.status,
      ud.lastVisit,
      ud.medicalRecords
    FROM ${userTable} u
    LEFT JOIN user_detail ud ON u.id = ud.id
    WHERE u.role = 1 AND (
      u.nama LIKE ? OR
      ud.NIK LIKE ? OR
      ud.noHp LIKE ? OR
      u.email LIKE ?
    )
    ORDER BY u.id DESC
  `;
  const searchTerm = `%${q}%`;

  con.execute(searchQuery, [searchTerm, searchTerm, searchTerm, searchTerm], (err, results, fields) => {
    if (err) {
      console.error('Error searching patients:', err);
      return res.status(500).json({ error: 'Failed to search patients' });
    }
    res.json(results);
  });
});

// GET /user/patients/:id - Get patient by ID
userRoutes.get('/patients/:id', authenticateUserToken, (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT
      u.id,
      u.nama as name,
      ud.NIK as nik,
      ud.noHp as phone,
      u.email,
      ud.alamat as address,
      ud.tanggalLahir as birthDate,
      ud.jenisKelamin as gender,
      ud.golDarah as bloodType,
      ud.status,
      ud.lastVisit,
      ud.medicalRecords
    FROM ${userTable} u
    LEFT JOIN user_detail ud ON u.id = ud.id
    WHERE u.id = ? AND u.role = 1
  `;

  con.execute(query, [id], (err, results, fields) => {
    if (err) {
      console.error('Error fetching patient:', err);
      return res.status(500).json({ error: 'Failed to fetch patient' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(results[0]);
  });
});

// POST /user/patients - Create new patient
userRoutes.post('/patients', authenticateUserToken, (req, res) => {
  const patientData = req.body;

  // Validate required fields
  const requiredFields = ['name', 'nik', 'phone', 'address', 'birthDate', 'gender'];
  const missingFields = requiredFields.filter(field => !patientData[field]);

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: `Missing required fields: ${missingFields.join(', ')}`
    });
  }

  // Check if NIK already exists
  const checkNikQuery = 'SELECT id FROM user_detail WHERE NIK = ?';
  con.execute(checkNikQuery, [patientData.nik], (err, results, fields) => {
    if (err) {
      console.error('Error checking NIK:', err);
      return res.status(500).json({ error: 'Failed to create patient' });
    }

    if (results.length > 0) {
      return res.status(409).json({ error: 'NIK already exists' });
    }

    // Create user account first
    const userInsertQuery = `
      INSERT INTO ${userTable} (nama, email, password, verified, role)
      VALUES (?, ?, '', 1, 1)
    `;

    con.execute(userInsertQuery, [patientData.name, patientData.email || null], (err, userResults, fields) => {
      if (err) {
        console.error('Error creating user:', err);
        return res.status(500).json({ error: 'Failed to create patient' });
      }

      const userId = userResults.insertId;

      // Create user details
      const detailInsertQuery = `
        INSERT INTO user_detail (
          id, tempatLahir, tanggalLahir, alamat, golDarah, NIK, jenisKelamin, noHp, status, lastVisit, medicalRecords
        ) VALUES (?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const detailValues = [
        userId,
        patientData.birthDate,
        patientData.address,
        patientData.bloodType || null,
        patientData.nik,
        patientData.gender,
        patientData.phone,
        patientData.status || 'Aktif',
        patientData.lastVisit || null,
        patientData.medicalRecords || 0
      ];

      con.execute(detailInsertQuery, detailValues, (err, detailResults, fields) => {
        if (err) {
          console.error('Error creating user details:', err);
          // Rollback user creation
          con.execute(`DELETE FROM ${userTable} WHERE id = ?`, [userId]);
          return res.status(500).json({ error: 'Failed to create patient details' });
        }

        // Return the created patient
        const selectQuery = `
          SELECT
            u.id,
            u.nama as name,
            ud.NIK as nik,
            ud.noHp as phone,
            u.email,
            ud.alamat as address,
            ud.tanggalLahir as birthDate,
            ud.jenisKelamin as gender,
            ud.golDarah as bloodType,
            ud.status,
            ud.lastVisit,
            ud.medicalRecords
          FROM ${userTable} u
          LEFT JOIN user_detail ud ON u.id = ud.id
          WHERE u.id = ?
        `;

        con.execute(selectQuery, [userId], (err, patientResults, fields) => {
          if (err) {
            console.error('Error fetching created patient:', err);
            return res.status(500).json({ error: 'Patient created but failed to retrieve' });
          }

          res.status(201).json(patientResults[0]);
        });
      });
    });
  });
});

// PUT /user/patients/:id - Update patient
userRoutes.put('/patients/:id', authenticateUserToken, (req, res) => {
  const { id } = req.params;
  const patientData = req.body;

  // Check if patient exists and has role=1
  const checkQuery = `SELECT id FROM ${userTable} WHERE id = ? AND role = 1`;
  con.execute(checkQuery, [id], (err, results, fields) => {
    if (err) {
      console.error('Error checking patient existence:', err);
      return res.status(500).json({ error: 'Failed to update patient' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Check if NIK is being changed and if it conflicts
    if (patientData.nik) {
      const checkNikQuery = 'SELECT id FROM user_detail WHERE NIK = ? AND id != ?';
      con.execute(checkNikQuery, [patientData.nik, id], (err, nikResults, fields) => {
        if (err) {
          console.error('Error checking NIK conflict:', err);
          return res.status(500).json({ error: 'Failed to update patient' });
        }

        if (nikResults.length > 0) {
          return res.status(409).json({ error: 'NIK already exists for another patient' });
        }

        performUpdate();
      });
    } else {
      performUpdate();
    }

    function performUpdate() {
      // Update user table
      if (patientData.name || patientData.email) {
        const userUpdateFields = [];
        const userUpdateValues = [];

        if (patientData.name) {
          userUpdateFields.push('nama = ?');
          userUpdateValues.push(patientData.name);
        }
        if (patientData.email) {
          userUpdateFields.push('email = ?');
          userUpdateValues.push(patientData.email);
        }

        userUpdateValues.push(id);

        const userUpdateQuery = `UPDATE ${userTable} SET ${userUpdateFields.join(', ')} WHERE id = ?`;
        con.execute(userUpdateQuery, userUpdateValues, (err, results, fields) => {
          if (err) {
            console.error('Error updating user:', err);
            return res.status(500).json({ error: 'Failed to update patient' });
          }
        });
      }

      // Update user_detail table
      const detailUpdateFields = [];
      const detailUpdateValues = [];

      const detailMappings = {
        birthDate: 'tanggalLahir',
        address: 'alamat',
        bloodType: 'golDarah',
        nik: 'NIK',
        gender: 'jenisKelamin',
        phone: 'noHp',
        status: 'status',
        lastVisit: 'lastVisit',
        medicalRecords: 'medicalRecords'
      };

      Object.keys(patientData).forEach(key => {
        if (detailMappings[key]) {
          detailUpdateFields.push(`${detailMappings[key]} = ?`);
          detailUpdateValues.push(patientData[key]);
        }
      });

      if (detailUpdateFields.length > 0) {
        detailUpdateValues.push(id);

        const detailUpdateQuery = `UPDATE user_detail SET ${detailUpdateFields.join(', ')} WHERE id = ?`;
        con.execute(detailUpdateQuery, detailUpdateValues, (err, results, fields) => {
          if (err) {
            console.error('Error updating user details:', err);
            return res.status(500).json({ error: 'Failed to update patient details' });
          }

          // Return updated patient
          const selectQuery = `
            SELECT
              u.id,
              u.nama as name,
              ud.NIK as nik,
              ud.noHp as phone,
              u.email,
              ud.alamat as address,
              ud.tanggalLahir as birthDate,
              ud.jenisKelamin as gender,
              ud.golDarah as bloodType,
              ud.status,
              ud.lastVisit,
              ud.medicalRecords
            FROM ${userTable} u
            LEFT JOIN user_detail ud ON u.id = ud.id
            WHERE u.id = ?
          `;

          con.execute(selectQuery, [id], (err, patientResults, fields) => {
            if (err) {
              console.error('Error fetching updated patient:', err);
              return res.status(500).json({ error: 'Patient updated but failed to retrieve' });
            }

            res.json(patientResults[0]);
          });
        });
      } else {
        // No detail updates, just return current patient
        const selectQuery = `
          SELECT
            u.id,
            u.nama as name,
            ud.NIK as nik,
            ud.noHp as phone,
            u.email,
            ud.alamat as address,
            ud.tanggalLahir as birthDate,
            ud.jenisKelamin as gender,
            ud.golDarah as bloodType,
            ud.status,
            ud.lastVisit,
            ud.medicalRecords
          FROM ${userTable} u
          LEFT JOIN user_detail ud ON u.id = ud.id
          WHERE u.id = ?
        `;

        con.execute(selectQuery, [id], (err, patientResults, fields) => {
          if (err) {
            console.error('Error fetching patient:', err);
            return res.status(500).json({ error: 'Failed to retrieve patient' });
          }

          res.json(patientResults[0]);
        });
      }
    }
  });
});

// DELETE /user/patients/:id - Delete patient
userRoutes.delete('/patients/:id', authenticateUserToken, (req, res) => {
  const { id } = req.params;

  // Check if patient exists and has role=1
  const checkQuery = `SELECT id FROM ${userTable} WHERE id = ? AND role = 1`;
  con.execute(checkQuery, [id], (err, results, fields) => {
    if (err) {
      console.error('Error checking patient existence:', err);
      return res.status(500).json({ error: 'Failed to delete patient' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Delete user details first (due to foreign key constraint)
    con.execute('DELETE FROM user_detail WHERE id = ?', [id], (err, detailResults, fields) => {
      if (err) {
        console.error('Error deleting user details:', err);
        return res.status(500).json({ error: 'Failed to delete patient details' });
      }

      // Delete user
      con.execute(`DELETE FROM ${userTable} WHERE id = ?`, [id], (err, userResults, fields) => {
        if (err) {
          console.error('Error deleting user:', err);
          return res.status(500).json({ error: 'Failed to delete patient' });
        }

        res.json({ message: 'Patient deleted successfully' });
      });
    });
  });
});

export default userRoutes;