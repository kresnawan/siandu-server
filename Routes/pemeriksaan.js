import express from 'express';
import con from '../db_connect.js';
import { authenticateUserToken } from '../authentication.js';
import 'dotenv/config';

const pemeriksaanRoutes = express.Router();

// POST /pemeriksaan - Create new examination result
pemeriksaanRoutes.post('/', authenticateUserToken, (req, res) => {
  const examData = req.body;

  // Validate required fields
  const requiredFields = ['patient_id', 'exam_date'];
  const missingFields = requiredFields.filter(field => !examData[field]);

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: `Missing required fields: ${missingFields.join(', ')}`
    });
  }

  // Prepare insert query
  const insertQuery = `
    INSERT INTO hasilpemeriksaan (
      patient_id,
      exam_date,
      weight,
      height,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      nutrition_status,
      hypertension,
      diabetes,
      high_cholesterol,
      high_uric_acid,
      vision_problems,
      hearing_problems,
      treatment,
      referral,
      notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    examData.patient_id,
    examData.exam_date,
    examData.weight || null,
    examData.height || null,
    examData.blood_pressure_systolic || null,
    examData.blood_pressure_diastolic || null,
    examData.nutrition_status || null,
    (examData.hypertension || "Tidak") === "Ya" ? 1 : 0,
    (examData.diabetes || "Tidak") === "Ya" ? 1 : 0,
    (examData.high_cholesterol || "Tidak") === "Ya" ? 1 : 0,
    (examData.high_uric_acid || "Tidak") === "Ya" ? 1 : 0,
    (examData.vision_problems || "Tidak") === "Ya" ? 1 : 0,
    (examData.hearing_problems || "Tidak") === "Ya" ? 1 : 0,
    examData.treatment || null,
    examData.referral || null,
    examData.notes || null
  ];

  con.execute(insertQuery, values, (err, results, fields) => {
    if (err) {
      console.error('Error creating examination result:', err);
      return res.status(500).json({ error: 'Failed to create examination result' });
    }

    // Return the created record
    const selectQuery = 'SELECT * FROM hasilpemeriksaan WHERE id = ?';
    con.execute(selectQuery, [results.insertId], (err, selectResults, fields) => {
      if (err) {
        console.error('Error fetching created examination result:', err);
        return res.status(500).json({ error: 'Examination result created but failed to retrieve' });
      }

      res.status(201).json(selectResults[0]);
    });
  });
});

// PUT /pemeriksaan/:id - Update examination result by ID
pemeriksaanRoutes.put('/:id', authenticateUserToken, (req, res) => {
  const { id } = req.params;
  const examData = req.body;

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'Invalid examination ID' });
  }

  // Check if examination exists
  const checkQuery = 'SELECT id FROM hasilpemeriksaan WHERE id = ?';
  con.execute(checkQuery, [id], (err, results, fields) => {
    if (err) {
      console.error('Error checking examination existence:', err);
      return res.status(500).json({ error: 'Failed to update examination result' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Examination result not found' });
    }

    // Prepare update query
    const updateFields = [];
    const updateValues = [];

    const fieldMappings = {
      patient_id: 'patient_id',
      exam_date: 'exam_date',
      weight: 'weight',
      height: 'height',
      blood_pressure_systolic: 'blood_pressure_systolic',
      blood_pressure_diastolic: 'blood_pressure_diastolic',
      nutrition_status: 'nutrition_status',
      hypertension: 'hypertension',
      diabetes: 'diabetes',
      high_cholesterol: 'high_cholesterol',
      high_uric_acid: 'high_uric_acid',
      vision_problems: 'vision_problems',
      hearing_problems: 'hearing_problems',
      treatment: 'treatment',
      referral: 'referral',
      notes: 'notes'
    };

    Object.keys(examData).forEach(key => {
      if (fieldMappings[key] !== undefined && examData[key] !== undefined) {
        updateFields.push(`${fieldMappings[key]} = ?`);
        // Convert boolean strings to integers for database
        if (['hypertension', 'diabetes', 'high_cholesterol', 'high_uric_acid', 'vision_problems', 'hearing_problems'].includes(key)) {
          updateValues.push((examData[key] || "Tidak") === "Ya" ? 1 : 0);
        } else {
          updateValues.push(examData[key] || null);
        }
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(id);

    const updateQuery = `UPDATE hasilpemeriksaan SET ${updateFields.join(', ')} WHERE id = ?`;

    con.execute(updateQuery, updateValues, (err, results, fields) => {
      if (err) {
        console.error('Error updating examination result:', err);
        return res.status(500).json({ error: 'Failed to update examination result' });
      }

      // Return the updated record
      const selectQuery = 'SELECT * FROM hasilpemeriksaan WHERE id = ?';
      con.execute(selectQuery, [id], (err, selectResults, fields) => {
        if (err) {
          console.error('Error fetching updated examination result:', err);
          return res.status(500).json({ error: 'Examination result updated but failed to retrieve' });
        }

        res.status(200).json(selectResults[0]);
      });
    });
  });
});

// GET /pemeriksaan - Get all examination results
pemeriksaanRoutes.get('/', authenticateUserToken, (req, res) => {
  const selectAllQuery = 'SELECT * FROM hasilpemeriksaan ORDER BY exam_date DESC';

  con.execute(selectAllQuery, (err, results, fields) => {
    if (err) {
      console.error('Error fetching examination results:', err);
      return res.status(500).json({ error: 'Failed to fetch examination results' });
    }

    res.status(200).json(results);
  });
});

// DELETE /pemeriksaan/:id - Delete examination result by ID
pemeriksaanRoutes.delete('/:id', authenticateUserToken, (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'Invalid examination ID' });
  }

  const deleteQuery = 'DELETE FROM hasilpemeriksaan WHERE id = ?';

  con.execute(deleteQuery, [id], (err, results, fields) => {
    if (err) {
      console.error('Error deleting examination result:', err);
      return res.status(500).json({ error: 'Failed to delete examination result' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Examination result not found' });
    }

    res.status(200).json({ message: 'Examination result deleted successfully' });
  });
});

export default pemeriksaanRoutes;