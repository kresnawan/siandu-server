import express from 'express';
import con from '../db_connect.js';
import { authenticateUserToken } from '../authentication.js';
import 'dotenv/config';
import nodemailer from 'nodemailer';

const pemeriksaanRoutes = express.Router();

let transporter;
if (process.env.EMAIL_SERVICE) {
  // Use service like 'gmail'
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS // Use App Password for Gmail
    }
  });
} else if (process.env.EMAIL_HOST) {
  // Use custom SMTP settings
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
} else {
  console.warn('Email configuration not found. Email notifications will be disabled.');
  transporter = null; // Disable email if not configured
}

// Helper function to send email (optional but good practice)
const sendExaminationEmail = async (patientEmail, patientName, examData) => {
  if (!transporter) {
    console.warn('Email transporter not configured. Skipping email send.');
    return { success: false, message: 'Email not configured' };
  }

  if (!patientEmail) {
    console.warn('No email address provided for patient. Skipping email send.');
    return { success: false, message: 'No patient email' };
  }

  // --- Customize your email content here ---
  const mailOptions = {
    from: process.env.EMAIL_USER, // Sender address
    to: patientEmail, // List of recipients
    subject: `Hasil Pemeriksaan - ${patientName || 'Pasien'}`, // Subject line
    text: `Halo ${patientName || 'Pasien'},\n\n` +
          `Berikut adalah hasil pemeriksaan Anda pada tanggal ${examData.exam_date}:\n\n` +
          `Berat Badan: ${examData.weight ? `${examData.weight} kg` : 'N/A'}\n` +
          `Tinggi Badan: ${examData.height ? `${examData.height} cm` : 'N/A'}\n` +
          `Tekanan Darah: ${examData.blood_pressure_systolic && examData.blood_pressure_diastolic ?
                             `${examData.blood_pressure_systolic}/${examData.blood_pressure_diastolic} mmHg` : 'N/A'}\n` +
          `Gula Darah: ${examData.blood_sugar ? `${examData.blood_sugar} mg/dL` : 'N/A'}\n` +
          `Status Gizi: ${examData.nutrition_status || 'N/A'}\n` +
          `Hipertensi: ${(examData.hypertension || "Tidak") === "Ya" ? 'Ya' : 'Tidak'}\n` +
          `Diabetes: ${(examData.diabetes || "Tidak") === "Ya" ? 'Ya' : 'Tidak'}\n` +
          `Kolesterol: ${examData.cholesterol ? `${examData.cholesterol} mg/dL` : 'N/A'}\n` +
          `Asam Urat: ${examData.uric_acid ? `${examData.uric_acid} mg/dL` : 'N/A'}\n` +
          `Masalah Penglihatan: ${(examData.vision_problems || "Tidak") === "Ya" ? 'Ya' : 'Tidak'}\n` +
          `Masalah Pendengaran: ${(examData.hearing_problems || "Tidak") === "Ya" ? 'Ya' : 'Tidak'}\n` +
          `Pengobatan: ${examData.treatment || 'Tidak ada'}\n` +
          `Rujukan: ${examData.referral || 'Tidak ada'}\n` +
          `Catatan: ${examData.notes || 'Tidak ada'}\n\n` +
          `Terima kasih.\nSalam sehat!`,
    // html: '<b>Hello world?</b>' // You can also send HTML emails
  };
  // -----------------------------------------

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};
// ---------------------------------------------

// POST /pemeriksaan - Create new examination result
pemeriksaanRoutes.post('/', authenticateUserToken, async (req, res) => { // <-- Make function async
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
      blood_sugar,
      nutrition_status,
      hypertension,
      diabetes,
      cholesterol,
      uric_acid,
      vision_problems,
      hearing_problems,
      treatment,
      referral,
      notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    examData.patient_id,
    examData.exam_date,
    examData.weight || null,
    examData.height || null,
    examData.blood_pressure_systolic || null,
    examData.blood_pressure_diastolic || null,
    examData.blood_sugar || null,
    examData.nutrition_status || null,
    (examData.hypertension || "Tidak") === "Ya" ? 1 : 0,
    (examData.diabetes || "Tidak") === "Ya" ? 1 : 0,
    examData.cholesterol || null,
    examData.uric_acid || null,
    (examData.vision_problems || "Tidak") === "Ya" ? 1 : 0,
    (examData.hearing_problems || "Tidak") === "Ya" ? 1 : 0,
    examData.treatment || null,
    examData.referral || null,
    examData.notes || null
  ];

  con.execute(insertQuery, values, async (err, results, fields) => { // <-- Make callback async
    if (err) {
      console.error('Error creating examination result:', err);
      return res.status(500).json({ error: 'Failed to create examination result' });
    }

    // Return the created record
    const selectQuery = 'SELECT * FROM hasilpemeriksaan WHERE id = ?';
    con.execute(selectQuery, [results.insertId], async (err, selectResults, fields) => { // <-- Make callback async
      if (err) {
        console.error('Error fetching created examination result:', err);
        // Even if fetching fails, the record was created. Decide if you want to return error or success here.
        // For now, let's try to get patient details for email even if final select fails.
        // But it's complex. Better to assume select works or handle it differently.
        // Let's simplify: if insert succeeds, try to send email using data we have or fetch again shortly.
        // Or, fetch patient details *before* inserting.

        // Fetch patient details for email *before* inserting the exam result
        const patientQuery = `
         SELECT u.email, u.nama
         FROM users u
         WHERE u.id = ? AND u.role = 1
        `;
        con.execute(patientQuery, [examData.patient_id], async (err, patientResults, fields) => {
           if (err) {
             console.error('Error fetching patient email for notification (after insert error):', err);
             // We couldn't fetch the record or send email, but the DB insert happened.
             // Returning the insert error is confusing. Better to acknowledge the insert
             // and log the fetch/email error separately.
             return res.status(201).json({ message: 'Examination result created but failed to retrieve details for email', insertId: results.insertId });
           }

           if (patientResults.length === 0) {
             console.warn('Patient not found for email notification (after insert error).');
             return res.status(201).json({ message: 'Examination result created but patient not found for email', insertId: results.insertId });
           }

           const patient = patientResults[0];

           // Attempt to send email even though we couldn't fetch the full exam record
           // We'll use the original examData for the email content
           const emailResult = await sendExaminationEmail(patient.email, patient.nama, examData);
           if (emailResult.success) {
             console.log('Email notification sent (using original data) for new examination result ID:', results.insertId);
           } else {
             console.warn('Failed to send email notification (using original data) for new examination result ID:', results.insertId, emailResult.message || emailResult.error);
           }

           // Return success for creation, even if retrieval or email failed
           return res.status(201).json({ message: 'Examination result created. Email notification attempted.', insertId: results.insertId });
        });
        // Original code path if select succeeds:
        // return res.status(500).json({ error: 'Examination result created but failed to retrieve' });
      } else {
        const createdExam = selectResults[0];

        // --- ADD EMAIL SENDING LOGIC HERE ---
        // Fetch patient details (email, name) for sending the notification
        const patientQuery = `
         SELECT u.email, u.nama
         FROM users u
         WHERE u.id = ? AND u.role = 1
        `;
        con.execute(patientQuery, [createdExam.patient_id], async (err, patientResults, fields) => {
           if (err) {
             console.error('Error fetching patient email for notification:', err);
             // Decide: Return the exam result but log the email error,
             // or return an error indicating partial failure.
             // Let's return the exam result and log the email issue.
             console.warn('Examination result created but failed to fetch patient email for notification.');
             return res.status(201).json({ message: 'Examination result created but failed to fetch patient email', exam: createdExam });
           }

           if (patientResults.length === 0) {
             console.warn('Patient not found for email notification.');
             return res.status(201).json({ message: 'Examination result created but patient not found for email', exam: createdExam });
           }

           const patient = patientResults[0];

           // Send the email
           const emailResult = await sendExaminationEmail(patient.email, patient.nama, createdExam);
           if (emailResult.success) {
             console.log('Email notification sent for new examination result ID:', createdExam.id);
             res.status(201).json({ message: 'Examination result created and email sent', exam: createdExam });
           } else {
             console.warn('Failed to send email notification for new examination result ID:', createdExam.id, emailResult.message || emailResult.error);
             // You might still want to return success for the creation itself
             res.status(201).json({ message: 'Examination result created. Failed to send email notification.', exam: createdExam, emailError: emailResult.message || emailResult.error });
             // Or return an error if email is critical
             // return res.status(500).json({ error: 'Examination result created but failed to send email notification', emailError: emailResult.message || emailResult.error });
           }
        });
        // -------------------------------
      }
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
      blood_sugar: 'blood_sugar',
      nutrition_status: 'nutrition_status',
      hypertension: 'hypertension',
      diabetes: 'diabetes',
      cholesterol: 'cholesterol',
      uric_acid: 'uric_acid',
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
        if (['hypertension', 'diabetes', 'vision_problems', 'hearing_problems'].includes(key)) {
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
// ... (at the top of your pemeriksaanRoutes file, make sure you have the userTable defined)
// const userTable = process.env.MYSQL_TABLE_USERS; // Make sure this is defined like in userRoutes
const userDetailTable = 'user_detail'; // Ensure this matches your table name

// GET /pemeriksaan - Get all examination results with patient details
pemeriksaanRoutes.get('/', authenticateUserToken, (req, res) => {
  // Updated query to join hasilpemeriksaan with users and user_detail tables
  const selectAllQuery = `
    SELECT 
      hp.*, 
      u.nama as patient_name,
      ud.NIK as patient_nik,
      ud.alamat as patient_address,
      ud.tanggalLahir as patient_birth_date,
      ud.jenisKelamin as patient_gender,
      ud.golDarah as patient_blood_type,
      ud.noHp as patient_phone
    FROM hasilpemeriksaan hp
    LEFT JOIN users u ON hp.patient_id = u.id
    LEFT JOIN user_detail ud ON hp.patient_id = ud.user_id
    ORDER BY hp.exam_date DESC, hp.created_at DESC
  `;

  con.execute(selectAllQuery, (err, results, fields) => {
    if (err) {
      console.error('Error fetching examination results with patient details:', err);
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