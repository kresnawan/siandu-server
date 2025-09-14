import express from 'express';
import con from '../db_connect.js';
import { authenticateUserToken } from '../authentication.js';
import 'dotenv/config';

const jadwalPemeriksaanRoutes = express.Router();

// Helper function to format date for MySQL DATE column
const formatDateForMySQL = (dateString) => {
  if (!dateString) return null;
  
  // If it's already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // If it's an ISO string, extract just the date part without timezone conversion
  if (dateString.includes('T')) {
    return dateString.split('T')[0];
  }
  
  // For other formats, try to parse as date but avoid timezone issues
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format');
  }
  
  // Use local date formatting to avoid timezone conversion
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// POST /jadwal-pemeriksaan - Create new examination schedule
jadwalPemeriksaanRoutes.post('/', authenticateUserToken, (req, res) => {
  const scheduleData = req.body;
  const userId = req.user.id;
  console.log(req);
  // Validate required fields
  const requiredFields = ['patient_id', 'visit_date', 'visit_time'];
  const missingFields = requiredFields.filter(field => !scheduleData[field]);

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: `Missing required fields: ${missingFields.join(', ')}`
    });
  }

  // Validate visit_type enum
  const validVisitTypes = ['Rumah', 'Posyandu', 'Puskesmas'];
  if (scheduleData.visit_type && !validVisitTypes.includes(scheduleData.visit_type)) {
    return res.status(400).json({
      error: 'Invalid visit_type. Must be one of: Rumah, Posyandu, Puskesmas'
    });
  }

  // Validate status enum
  const validStatuses = ['Terjadwal', 'Selesai', 'Dibatalkan', 'Ditunda'];
  if (scheduleData.status && !validStatuses.includes(scheduleData.status)) {
    return res.status(400).json({
      error: 'Invalid status. Must be one of: Terjadwal, Selesai, Dibatalkan, Ditunda'
    });
  }

  // Check if patient exists and has role 1 (patient)
  const checkPatientQuery = `
    SELECT u.id, u.nama, u.role 
    FROM users u 
    WHERE u.id = ? AND u.role = 1
  `;
  
  con.execute(checkPatientQuery, [scheduleData.patient_id], (err, patientResults) => {
    if (err) {
      console.error('Error checking patient:', err);
      return res.status(500).json({ error: 'Failed to validate patient' });
    }

    if (patientResults.length === 0) {
      return res.status(404).json({ error: 'Patient not found or invalid role' });
    }

    // Prepare insert query
    const insertQuery = `
      INSERT INTO jadwal_pemeriksaan (
        patient_id,
        petugas_id,
        visit_date,
        visit_time,
        visit_type,
        status,
        notes,
        examination_type,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Format visit_date properly for MySQL
    let formattedVisitDate;
    try {
      formattedVisitDate = formatDateForMySQL(scheduleData.visit_date);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid date format for visit_date' });
    }

    const values = [
      scheduleData.patient_id,
      scheduleData.petugas_id || null,
      formattedVisitDate,
      scheduleData.visit_time,
      scheduleData.visit_type || 'Rumah',
      scheduleData.status || 'Terjadwal',
      scheduleData.notes || null,
      scheduleData.examination_type || 'Pemeriksaan Rutin',
      userId
    ];
    console.log(values);

    con.execute(insertQuery, values, (err, results) => {
      if (err) {
        console.error('Error creating examination schedule:', err);
        return res.status(500).json({ error: 'Failed to create examination schedule' });
      }

      // Return the created record with patient details
      const selectQuery = `
        SELECT 
          jp.*,
          u.nama as patient_name,
          p.nama as petugas_name
        FROM jadwal_pemeriksaan jp
        LEFT JOIN users u ON jp.patient_id = u.id
        LEFT JOIN users p ON jp.petugas_id = p.id
        WHERE jp.id = ?
      `;
      
      con.execute(selectQuery, [results.insertId], (err, selectResults, fields) => {
        if (err) {
          console.error('Error fetching created schedule:', err);
          return res.status(500).json({ error: 'Schedule created but failed to retrieve' });
        }

        res.status(201).json(selectResults[0]);
      });
    });
  });
});

// POST /jadwal-pemeriksaan/weekly - Create weekly schedule for a patient
jadwalPemeriksaanRoutes.post('/weekly', authenticateUserToken, (req, res) => {
  const { patient_id, start_date, visit_time, visit_type, petugas_id, examination_type, notes } = req.body;
  const userId = req.user.id;

  // Validate required fields
  if (!patient_id || !start_date || !visit_time) {
    return res.status(400).json({
      error: 'Missing required fields: patient_id, start_date, visit_time'
    });
  }

  // Check if patient exists and has role 1 (patient)
  const checkPatientQuery = `
    SELECT u.id, u.nama, u.role 
    FROM users u 
    WHERE u.id = ? AND u.role = 1
  `;
  
  con.execute(checkPatientQuery, [patient_id], (err, patientResults) => {
    if (err) {
      console.error('Error checking patient:', err);
      return res.status(500).json({ error: 'Failed to validate patient' });
    }

    if (patientResults.length === 0) {
      return res.status(404).json({ error: 'Patient not found or invalid role' });
    }

    // Generate 4 weekly schedules (1 month)
    const schedules = [];
    const startDate = new Date(start_date);
    
    for (let i = 0; i < 4; i++) {
      const visitDate = new Date(startDate);
      visitDate.setDate(startDate.getDate() + (i * 7));
      
      schedules.push([
        patient_id,
        petugas_id || null,
        visitDate.toISOString().split('T')[0],
        visit_time,
        visit_type || 'Rumah',
        'Terjadwal',
        notes || null,
        examination_type || 'Pemeriksaan Rutin',
        userId
      ]);
    }

    const columns = [
      'patient_id', 'petugas_id', 'visit_date', 'visit_time', 'visit_type',
      'status', 'notes', 'examination_type', 'created_by'
    ];

    // Generate placeholder string: (?,?,?,?,?,?,?,?,?), (?,?,?,?,?,?,?,?,?), ...
    const valuesPlaceholders = schedules.map(() => '(' + '?,'.repeat(columns.length - 1) + '?)').join(', ');
    
    // Insert all schedules
    const insertQuery = `
      INSERT INTO jadwal_pemeriksaan (${columns.join(', ')})
      VALUES ${valuesPlaceholders}
    `;

    con.execute(insertQuery, schedules.flat(), (err, results, fields) => {
      if (err) {
        console.error('Error creating weekly schedules:', err);
        return res.status(500).json({ error: 'Failed to create weekly schedules' });
      }

      // Return the created schedules
      const selectQuery = `
        SELECT 
          jp.*,
          u.nama as patient_name,
          p.nama as petugas_name
        FROM jadwal_pemeriksaan jp
        LEFT JOIN users u ON jp.patient_id = u.id
        LEFT JOIN users p ON jp.petugas_id = p.id
        WHERE jp.patient_id = ? AND jp.created_by = ?
        ORDER BY jp.visit_date ASC
      `;
      
      con.execute(selectQuery, [patient_id, userId], (err, selectResults, fields) => {
        if (err) {
          console.error('Error fetching created schedules:', err);
          return res.status(500).json({ error: 'Schedules created but failed to retrieve' });
        }

        res.status(201).json({
          message: 'Weekly schedules created successfully',
          schedules: selectResults
        });
      });
    });
  });
});

// GET /jadwal-pemeriksaan - Get all examination schedules
jadwalPemeriksaanRoutes.get('/', authenticateUserToken, (req, res) => {
  const { patient_id, petugas_id, status, visit_type, start_date, end_date } = req.query;
  
  let whereConditions = [];
  let queryParams = [];

  // Build dynamic WHERE clause
  if (patient_id) {
    whereConditions.push('jp.patient_id = ?');
    queryParams.push(patient_id);
  }
  
  if (petugas_id) {
    whereConditions.push('jp.petugas_id = ?');
    queryParams.push(petugas_id);
  }
  
  if (status) {
    whereConditions.push('jp.status = ?');
    queryParams.push(status);
  }
  
  if (visit_type) {
    whereConditions.push('jp.visit_type = ?');
    queryParams.push(visit_type);
  }
  
  if (start_date) {
    whereConditions.push('jp.visit_date >= ?');
    queryParams.push(start_date);
  }
  
  if (end_date) {
    whereConditions.push('jp.visit_date <= ?');
    queryParams.push(end_date);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const selectQuery = `
    SELECT 
      jp.*,
      u.nama as patient_name,
      p.nama as petugas_name,
      creator.nama as created_by_name
    FROM jadwal_pemeriksaan jp
    LEFT JOIN users u ON jp.patient_id = u.id
    LEFT JOIN users p ON jp.petugas_id = p.id
    LEFT JOIN users creator ON jp.created_by = creator.id
    ${whereClause}
    ORDER BY jp.visit_date ASC, jp.visit_time ASC
  `;

  con.execute(selectQuery, queryParams, (err, results, fields) => {
    if (err) {
      console.error('Error fetching examination schedules:', err);
      return res.status(500).json({ error: 'Failed to fetch examination schedules' });
    }

    res.status(200).json(results);
  });
});

// GET /jadwal-pemeriksaan/patient/:patient_id - Get schedules for specific patient
jadwalPemeriksaanRoutes.get('/patient/:patient_id', authenticateUserToken, (req, res) => {
  const { patient_id } = req.params;
  const { status, upcoming } = req.query;

  if (!patient_id || isNaN(patient_id)) {
    return res.status(400).json({ error: 'Invalid patient ID' });
  }

  let whereConditions = ['jp.patient_id = ?'];
  let queryParams = [patient_id];

  if (status) {
    whereConditions.push('jp.status = ?');
    queryParams.push(status);
  }

  if (upcoming === 'true') {
    whereConditions.push('jp.visit_date >= CURDATE()');
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  const selectQuery = `
    SELECT 
      jp.*,
      u.nama as patient_name,
      p.nama as petugas_name
    FROM jadwal_pemeriksaan jp
    LEFT JOIN users u ON jp.patient_id = u.id
    LEFT JOIN users p ON jp.petugas_id = p.id
    ${whereClause}
    ORDER BY jp.visit_date ASC, jp.visit_time ASC
  `;

  con.execute(selectQuery, queryParams, (err, results, fields) => {
    if (err) {
      console.error('Error fetching patient schedules:', err);
      return res.status(500).json({ error: 'Failed to fetch patient schedules' });
    }

    res.status(200).json(results);
  });
});

// GET /jadwal-pemeriksaan/petugas/:petugas_id - Get schedules for specific staff member
jadwalPemeriksaanRoutes.get('/petugas/:petugas_id', authenticateUserToken, (req, res) => {
  const { petugas_id } = req.params;
  const { status, upcoming } = req.query;

  if (!petugas_id || isNaN(petugas_id)) {
    return res.status(400).json({ error: 'Invalid petugas ID' });
  }

  let whereConditions = ['jp.petugas_id = ?'];
  let queryParams = [petugas_id];

  if (status) {
    whereConditions.push('jp.status = ?');
    queryParams.push(status);
  }

  if (upcoming === 'true') {
    whereConditions.push('jp.visit_date >= CURDATE()');
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  const selectQuery = `
    SELECT 
      jp.*,
      u.nama as patient_name,
      p.nama as petugas_name
    FROM jadwal_pemeriksaan jp
    LEFT JOIN users u ON jp.patient_id = u.id
    LEFT JOIN users p ON jp.petugas_id = p.id
    ${whereClause}
    ORDER BY jp.visit_date ASC, jp.visit_time ASC
  `;

  con.execute(selectQuery, queryParams, (err, results, fields) => {
    if (err) {
      console.error('Error fetching petugas schedules:', err);
      return res.status(500).json({ error: 'Failed to fetch petugas schedules' });
    }

    res.status(200).json(results);
  });
});

// PUT /jadwal-pemeriksaan/:id - Update examination schedule
jadwalPemeriksaanRoutes.put('/:id', authenticateUserToken, (req, res) => {
  const { id } = req.params;
  const scheduleData = req.body;
  const userId = req.user.id;

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'Invalid schedule ID' });
  }

  // Check if schedule exists
  const checkQuery = 'SELECT id FROM jadwal_pemeriksaan WHERE id = ?';
  con.execute(checkQuery, [id], (err, results, fields) => {
    if (err) {
      console.error('Error checking schedule existence:', err);
      return res.status(500).json({ error: 'Failed to update schedule' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Validate enums if provided
    if (scheduleData.visit_type) {
      const validVisitTypes = ['Rumah', 'Posyandu', 'Puskesmas'];
      if (!validVisitTypes.includes(scheduleData.visit_type)) {
        return res.status(400).json({
          error: 'Invalid visit_type. Must be one of: Rumah, Posyandu, Puskesmas'
        });
      }
    }

    if (scheduleData.status) {
      const validStatuses = ['Terjadwal', 'Selesai', 'Dibatalkan', 'Ditunda'];
      if (!validStatuses.includes(scheduleData.status)) {
        return res.status(400).json({
          error: 'Invalid status. Must be one of: Terjadwal, Selesai, Dibatalkan, Ditunda'
        });
      }
    }

    // Prepare update query
    const updateFields = [];
    const updateValues = [];

    const fieldMappings = {
      patient_id: 'patient_id',
      petugas_id: 'petugas_id',
      visit_date: 'visit_date',
      visit_time: 'visit_time',
      visit_type: 'visit_type',
      status: 'status',
      notes: 'notes',
      examination_type: 'examination_type'
    };

    Object.keys(scheduleData).forEach(key => {
      if (fieldMappings[key] !== undefined && scheduleData[key] !== undefined) {
        updateFields.push(`${fieldMappings[key]} = ?`);
        
        // Special handling for visit_date to format it properly for MySQL
        if (key === 'visit_date') {
          try {
            console.log('Original visit_date:', scheduleData[key]);
            const formattedDate = formatDateForMySQL(scheduleData[key]);
            console.log('Formatted visit_date:', formattedDate);
            updateValues.push(formattedDate);
          } catch (error) {
            console.error('Date formatting error:', error);
            return res.status(400).json({ error: 'Invalid date format for visit_date' });
          }
        } else {
          updateValues.push(scheduleData[key]);
        }
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add updated_by and updated_at
    updateFields.push('updated_by = ?', 'updated_at = CURRENT_TIMESTAMP');
    updateValues.push(userId, id);

    const updateQuery = `UPDATE jadwal_pemeriksaan SET ${updateFields.join(', ')} WHERE id = ?`;

    con.execute(updateQuery, updateValues, (err, results, fields) => {
      if (err) {
        console.error('Error updating schedule:', err);
        return res.status(500).json({ error: 'Failed to update schedule' });
      }

      // Return the updated record
      const selectQuery = `
        SELECT 
          jp.*,
          u.nama as patient_name,
          p.nama as petugas_name
        FROM jadwal_pemeriksaan jp
        LEFT JOIN users u ON jp.patient_id = u.id
        LEFT JOIN users p ON jp.petugas_id = p.id
        WHERE jp.id = ?
      `;
      
      con.execute(selectQuery, [id], (err, selectResults, fields) => {
        if (err) {
          console.error('Error fetching updated schedule:', err);
          return res.status(500).json({ error: 'Schedule updated but failed to retrieve' });
        }

        res.status(200).json(selectResults[0]);
      });
    });
  });
});

// PUT /jadwal-pemeriksaan/:id/status - Update status to "Selesai"
jadwalPemeriksaanRoutes.put('/:id/status', authenticateUserToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'Invalid schedule ID' });
  }

  const updateQuery = `
    UPDATE jadwal_pemeriksaan 
    SET status = 'Selesai', updated_by = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `;

  con.execute(updateQuery, [userId, id], (err, results, fields) => {
    if (err) {
      console.error('Error updating schedule status:', err);
      return res.status(500).json({ error: 'Failed to update schedule status' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Return the updated record
    const selectQuery = `
    SELECT 
      jp.*,
      u.nama as patient_name,
      p.nama as petugas_name
    FROM jadwal_pemeriksaan jp
    LEFT JOIN users u ON jp.patient_id = u.id
    LEFT JOIN users p ON jp.petugas_id = p.id
    WHERE jp.id = ?
  `;
    
    con.execute(selectQuery, [id], (err, selectResults, fields) => {
      if (err) {
        console.error('Error fetching updated schedule:', err);
        return res.status(500).json({ error: 'Schedule updated but failed to retrieve' });
      }

      res.status(200).json({
        message: 'Schedule status updated to Selesai successfully',
        schedule: selectResults[0]
      });
    });
  });
});

// PATCH /jadwal-pemeriksaan/:id/status - Update only the status
jadwalPemeriksaanRoutes.patch('/:id/status', authenticateUserToken, (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  const userId = req.user.id;

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'Invalid schedule ID' });
  }

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const validStatuses = ['Terjadwal', 'Selesai', 'Dibatalkan', 'Ditunda'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Invalid status. Must be one of: Terjadwal, Selesai, Dibatalkan, Ditunda'
    });
  }

  const updateQuery = `
    UPDATE jadwal_pemeriksaan 
    SET status = ?, notes = COALESCE(?, notes), updated_by = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `;

  con.execute(updateQuery, [status, notes, userId, id], (err, results, fields) => {
    if (err) {
      console.error('Error updating schedule status:', err);
      return res.status(500).json({ error: 'Failed to update schedule status' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Return the updated record
    const selectQuery = `
      SELECT 
        jp.*,
        u.nama as patient_name,
        p.nama as petugas_name
      FROM jadwal_pemeriksaan jp
      LEFT JOIN users u ON jp.patient_id = u.id
      LEFT JOIN users p ON jp.petugas_id = p.id
      WHERE jp.id = ?
    `;
    
    con.execute(selectQuery, [id], (err, selectResults, fields) => {
      if (err) {
        console.error('Error fetching updated schedule:', err);
        return res.status(500).json({ error: 'Schedule updated but failed to retrieve' });
      }

      res.status(200).json(selectResults[0]);
    });
  });
});

// DELETE /jadwal-pemeriksaan/:id - Delete examination schedule
jadwalPemeriksaanRoutes.delete('/:id', authenticateUserToken, (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'Invalid schedule ID' });
  }

  const deleteQuery = 'DELETE FROM jadwal_pemeriksaan WHERE id = ?';

  con.execute(deleteQuery, [id], (err, results, fields) => {
    if (err) {
      console.error('Error deleting schedule:', err);
      return res.status(500).json({ error: 'Failed to delete schedule' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.status(200).json({ message: 'Schedule deleted successfully' });
  });
});

// GET /jadwal-pemeriksaan/upcoming - Get upcoming visits (next 7 days)
jadwalPemeriksaanRoutes.get('/upcoming', authenticateUserToken, (req, res) => {
  const { petugas_id, patient_id } = req.query;
  
  let whereConditions = ['jp.visit_date >= CURDATE()', 'jp.visit_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)', "jp.status = 'Terjadwal'"];
  let queryParams = [];

  if (petugas_id) {
    whereConditions.push('jp.petugas_id = ?');
    queryParams.push(petugas_id);
  }

  if (patient_id) {
    whereConditions.push('jp.patient_id = ?');
    queryParams.push(patient_id);
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  const selectQuery = `
    SELECT 
      jp.*,
      u.nama as patient_name,
      p.nama as petugas_name
    FROM jadwal_pemeriksaan jp
    LEFT JOIN users u ON jp.patient_id = u.id
    LEFT JOIN users p ON jp.petugas_id = p.id
    ${whereClause}
    ORDER BY jp.visit_date ASC, jp.visit_time ASC
  `;

  con.execute(selectQuery, queryParams, (err, results, fields) => {
    if (err) {
      console.error('Error fetching upcoming schedules:', err);
      return res.status(500).json({ error: 'Failed to fetch upcoming schedules' });
    }

    res.status(200).json(results);
  });
});

export default jadwalPemeriksaanRoutes;
