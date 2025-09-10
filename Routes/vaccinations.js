import express from 'express';
import con from '../db_connect.js';
import { authenticateUserToken } from '../authentication.js';
import 'dotenv/config';

const vaccinationRoutes = express.Router();

// GET /vaccinations - Get all vaccinations
vaccinationRoutes.get('/', authenticateUserToken, (req, res) => {
  const query = `
    SELECT
      v.*,
      COUNT(vr.id) as interestedCount
    FROM vaccinations v
    LEFT JOIN vaccination_registrations vr ON v.id = vr.vaccination_id AND vr.status = 'registered'
    GROUP BY v.id
    ORDER BY v.date DESC
  `;

  con.execute(query, (err, results, fields) => {
    if (err) {
      console.error('Error fetching vaccinations:', err);
      return res.status(500).json({ error: 'Failed to fetch vaccinations' });
    }

    res.json(results);
  });
});

// GET /vaccinations/:id - Get vaccination by ID with interested users
vaccinationRoutes.get('/:id', authenticateUserToken, (req, res) => {
  const { id } = req.params;

  // Get vaccination details
  const vaccinationQuery = 'SELECT * FROM vaccinations WHERE id = ?';
  con.execute(vaccinationQuery, [id], (err, vaccinationResults, fields) => {
    if (err) {
      console.error('Error fetching vaccination:', err);
      return res.status(500).json({ error: 'Failed to fetch vaccination' });
    }

    if (vaccinationResults.length === 0) {
      return res.status(404).json({ error: 'Vaccination not found' });
    }

    const vaccination = vaccinationResults[0];

    // Get interested users
    const usersQuery = `
      SELECT
        u.id,
        u.nama as name,
        u.email,
        COALESCE(ud.noHp, '') as phone
      FROM vaccination_registrations vr
      JOIN users u ON vr.user_id = u.id
      LEFT JOIN user_detail ud ON u.id = ud.id
      WHERE vr.vaccination_id = ? AND vr.status = 'registered'
      ORDER BY vr.registration_date DESC
    `;

    con.execute(usersQuery, [id], (err, usersResults, fields) => {
      if (err) {
        console.error('Error fetching interested users:', err);
        return res.status(500).json({ error: 'Failed to fetch interested users' });
      }

      vaccination.interestedUsers = usersResults;
      vaccination.interestedCount = usersResults.length;

      res.json(vaccination);
    });
  });
});

// POST /vaccinations - Create new vaccination
vaccinationRoutes.post('/', authenticateUserToken, (req, res) => {
  const vaccinationData = req.body;

  // Validate required fields
  const requiredFields = ['title', 'description', 'date', 'location', 'vaccineType', 'maxParticipants'];
  const missingFields = requiredFields.filter(field => !vaccinationData[field]);

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: `Missing required fields: ${missingFields.join(', ')}`
    });
  }

  const insertQuery = `
    INSERT INTO vaccinations (
      title,
      description,
      date,
      location,
      vaccine_type,
      max_participants,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, 'active')
  `;

  const values = [
    vaccinationData.title,
    vaccinationData.description,
    vaccinationData.date,
    vaccinationData.location,
    vaccinationData.vaccineType,
    vaccinationData.maxParticipants
  ];

  con.execute(insertQuery, values, (err, results, fields) => {
    if (err) {
      console.error('Error creating vaccination:', err);
      return res.status(500).json({ error: 'Failed to create vaccination' });
    }

    // Return the created vaccination
    const selectQuery = 'SELECT * FROM vaccinations WHERE id = ?';
    con.execute(selectQuery, [results.insertId], (err, selectResults, fields) => {
      if (err) {
        console.error('Error fetching created vaccination:', err);
        return res.status(500).json({ error: 'Vaccination created but failed to retrieve' });
      }

      res.status(201).json(selectResults[0]);
    });
  });
});

// PUT /vaccinations/:id - Update vaccination
vaccinationRoutes.put('/:id', authenticateUserToken, (req, res) => {
  const { id } = req.params;
  const vaccinationData = req.body;

  // Check if vaccination exists
  const checkQuery = 'SELECT id FROM vaccinations WHERE id = ?';
  con.execute(checkQuery, [id], (err, results, fields) => {
    if (err) {
      console.error('Error checking vaccination existence:', err);
      return res.status(500).json({ error: 'Failed to update vaccination' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Vaccination not found' });
    }

    const updateFields = [];
    const updateValues = [];

    const fieldMappings = {
      title: 'title',
      description: 'description',
      date: 'date',
      location: 'location',
      vaccineType: 'vaccine_type',
      maxParticipants: 'max_participants',
      status: 'status'
    };

    Object.keys(vaccinationData).forEach(key => {
      if (fieldMappings[key] && vaccinationData[key] !== undefined) {
        updateFields.push(`${fieldMappings[key]} = ?`);
        updateValues.push(vaccinationData[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(id);

    const updateQuery = `UPDATE vaccinations SET ${updateFields.join(', ')} WHERE id = ?`;
    con.execute(updateQuery, updateValues, (err, results, fields) => {
      if (err) {
        console.error('Error updating vaccination:', err);
        return res.status(500).json({ error: 'Failed to update vaccination' });
      }

      // Return updated vaccination
      const selectQuery = 'SELECT * FROM vaccinations WHERE id = ?';
      con.execute(selectQuery, [id], (err, selectResults, fields) => {
        if (err) {
          console.error('Error fetching updated vaccination:', err);
          return res.status(500).json({ error: 'Vaccination updated but failed to retrieve' });
        }

        res.json(selectResults[0]);
      });
    });
  });
});

// DELETE /vaccinations/:id - Delete vaccination
vaccinationRoutes.delete('/:id', authenticateUserToken, (req, res) => {
  const { id } = req.params;

  // Check if vaccination exists
  const checkQuery = 'SELECT id FROM vaccinations WHERE id = ?';
  con.execute(checkQuery, [id], (err, results, fields) => {
    if (err) {
      console.error('Error checking vaccination existence:', err);
      return res.status(500).json({ error: 'Failed to delete vaccination' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Vaccination not found' });
    }

    // Delete vaccination (registrations will be deleted automatically due to CASCADE)
    const deleteQuery = 'DELETE FROM vaccinations WHERE id = ?';
    con.execute(deleteQuery, [id], (err, results, fields) => {
      if (err) {
        console.error('Error deleting vaccination:', err);
        return res.status(500).json({ error: 'Failed to delete vaccination' });
      }

      res.json({ message: 'Vaccination deleted successfully' });
    });
  });
});

// POST /vaccinations/:id/register - Register for vaccination
vaccinationRoutes.post('/:id/register', authenticateUserToken, (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  // Check if vaccination exists and is active
  const checkVaccinationQuery = 'SELECT id, max_participants FROM vaccinations WHERE id = ? AND status = "active"';
  con.execute(checkVaccinationQuery, [id], (err, vaccinationResults, fields) => {
    if (err) {
      console.error('Error checking vaccination:', err);
      return res.status(500).json({ error: 'Failed to register for vaccination' });
    }

    if (vaccinationResults.length === 0) {
      return res.status(404).json({ error: 'Vaccination not found or not active' });
    }

    // Check current registrations count
    const countQuery = 'SELECT COUNT(*) as count FROM vaccination_registrations WHERE vaccination_id = ? AND status = "registered"';
    con.execute(countQuery, [id], (err, countResults, fields) => {
      if (err) {
        console.error('Error counting registrations:', err);
        return res.status(500).json({ error: 'Failed to register for vaccination' });
      }

      if (countResults[0].count >= vaccinationResults[0].max_participants) {
        return res.status(409).json({ error: 'Vaccination is full' });
      }

      // Register user
      const registerQuery = `
        INSERT INTO vaccination_registrations (vaccination_id, user_id, status)
        VALUES (?, ?, 'registered')
        ON DUPLICATE KEY UPDATE status = 'registered'
      `;

      con.execute(registerQuery, [id, userId], (err, results, fields) => {
        if (err) {
          console.error('Error registering for vaccination:', err);
          return res.status(500).json({ error: 'Failed to register for vaccination' });
        }

        res.json({ message: 'Successfully registered for vaccination' });
      });
    });
  });
});

// DELETE /vaccinations/:id/register - Unregister from vaccination
vaccinationRoutes.delete('/:id/register', authenticateUserToken, (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const unregisterQuery = 'DELETE FROM vaccination_registrations WHERE vaccination_id = ? AND user_id = ?';
  con.execute(unregisterQuery, [id, userId], (err, results, fields) => {
    if (err) {
      console.error('Error unregistering from vaccination:', err);
      return res.status(500).json({ error: 'Failed to unregister from vaccination' });
    }

    res.json({ message: 'Successfully unregistered from vaccination' });
  });
});

export default vaccinationRoutes;