import express from 'express';
import con from '../db_connect.js';
import { authenticateUserToken } from '../authentication.js';

const dashboardRoutes = express.Router();

// GET /dashboard/stats - Get comprehensive dashboard statistics
dashboardRoutes.get('/stats', authenticateUserToken, (req, res) => {
  try {
    // Get current month and year
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    const currentYear = currentDate.getFullYear();
    
    // Calculate age groups based on birth dates from ALL patients
    const ageGroupQuery = `
      SELECT 
        CASE 
          WHEN TIMESTAMPDIFF(YEAR, ud.tanggalLahir, CURDATE()) < 5 THEN 'Balita'
          WHEN TIMESTAMPDIFF(YEAR, ud.tanggalLahir, CURDATE()) BETWEEN 5 AND 17 THEN 'Remaja'
          WHEN TIMESTAMPDIFF(YEAR, ud.tanggalLahir, CURDATE()) BETWEEN 18 AND 59 THEN 'Dewasa'
          WHEN TIMESTAMPDIFF(YEAR, ud.tanggalLahir, CURDATE()) >= 60 THEN 'Lansia'
          ELSE 'Unknown'
        END as age_group,
        COUNT(*) as count
      FROM users u
      JOIN user_detail ud ON u.id = ud.user_id
      WHERE u.role = 1
        AND ud.tanggalLahir IS NOT NULL
      GROUP BY age_group
    `;

    // Get health condition statistics from examination results
    const healthStatsQuery = `
      SELECT 
        COUNT(CASE WHEN hypertension = 1 THEN 1 END) as hypertension_count,
        COUNT(CASE WHEN diabetes = 1 THEN 1 END) as diabetes_count,
        COUNT(CASE WHEN cholesterol > 200 THEN 1 END) as high_cholesterol_count,
        COUNT(CASE WHEN uric_acid > 7.0 THEN 1 END) as high_uric_acid_count,
        COUNT(CASE WHEN vision_problems = 1 THEN 1 END) as vision_problems_count,
        COUNT(CASE WHEN hearing_problems = 1 THEN 1 END) as hearing_problems_count,
        COUNT(CASE WHEN blood_sugar > 126 THEN 1 END) as high_blood_sugar_count,
        COUNT(*) as total_examinations
      FROM hasilpemeriksaan hp
      JOIN users u ON hp.patient_id = u.id
      WHERE MONTH(hp.exam_date) = ?
        AND YEAR(hp.exam_date) = ?
        AND u.role = 1
    `;

    // Get monthly examination trends (last 6 months)
    const trendsQuery = `
      SELECT 
        DATE_FORMAT(jp.visit_date, '%Y-%m') as month,
        COUNT(*) as total_examinations,
        COUNT(CASE WHEN jp.status = 'Selesai' THEN 1 END) as completed_examinations,
        COUNT(CASE WHEN jp.status = 'Terjadwal' THEN 1 END) as scheduled_examinations
      FROM jadwal_pemeriksaan jp
      JOIN users u ON jp.patient_id = u.id
      WHERE jp.visit_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        AND u.role = 1
      GROUP BY DATE_FORMAT(jp.visit_date, '%Y-%m')
      ORDER BY month DESC
    `;

    // Get today's statistics
    const todayStatsQuery = `
      SELECT 
        COUNT(*) as today_examinations,
        COUNT(CASE WHEN jp.status = 'Selesai' THEN 1 END) as today_completed,
        COUNT(CASE WHEN jp.status = 'Terjadwal' THEN 1 END) as today_scheduled
      FROM jadwal_pemeriksaan jp
      JOIN users u ON jp.patient_id = u.id
      WHERE jp.visit_date = CURDATE()
        AND u.role = 1
    `;

    // Get total patients count
    const totalPatientsQuery = `
      SELECT COUNT(*) as total_patients
      FROM users u
      WHERE u.role = 1
    `;

    // Execute all queries
    con.execute(ageGroupQuery, [], (err, ageGroups) => {
      if (err) {
        console.error('Error fetching age groups:', err);
        return res.status(500).json({ error: 'Failed to fetch age group statistics' });
      }
      
      console.log('Age groups query result:', ageGroups);

      con.execute(healthStatsQuery, [currentMonth, currentYear], (err, healthStats) => {
        if (err) {
          console.error('Error fetching health statistics:', err);
          return res.status(500).json({ error: 'Failed to fetch health statistics' });
        }

        con.execute(trendsQuery, (err, trends) => {
          if (err) {
            console.error('Error fetching trends:', err);
            return res.status(500).json({ error: 'Failed to fetch trend data' });
          }

          con.execute(todayStatsQuery, (err, todayStats) => {
            if (err) {
              console.error('Error fetching today stats:', err);
              return res.status(500).json({ error: 'Failed to fetch today statistics' });
            }

            con.execute(totalPatientsQuery, (err, totalPatients) => {
              if (err) {
                console.error('Error fetching total patients:', err);
                return res.status(500).json({ error: 'Failed to fetch total patients count' });
              }

              // Format the response
              const response = {
                ageGroups: ageGroups.reduce((acc, item) => {
                  acc[item.age_group] = item.count;
                  return acc;
                }, {}),
                healthConditions: {
                  hypertension: healthStats[0]?.hypertension_count || 0,
                  diabetes: healthStats[0]?.diabetes_count || 0,
                  highCholesterol: healthStats[0]?.high_cholesterol_count || 0,
                  highUricAcid: healthStats[0]?.high_uric_acid_count || 0,
                  visionProblems: healthStats[0]?.vision_problems_count || 0,
                  hearingProblems: healthStats[0]?.hearing_problems_count || 0,
                  highBloodSugar: healthStats[0]?.high_blood_sugar_count || 0,
                  totalExaminations: healthStats[0]?.total_examinations || 0
                },
                monthlyTrends: trends,
                todayStats: {
                  total: todayStats[0]?.today_examinations || 0,
                  completed: todayStats[0]?.today_completed || 0,
                  scheduled: todayStats[0]?.today_scheduled || 0
                },
                totalPatients: totalPatients[0]?.total_patients || 0,
                currentMonth: currentMonth,
                currentYear: currentYear
              };

              res.status(200).json(response);
            });
          });
        });
      });
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /dashboard/quick-stats - Get quick overview statistics
dashboardRoutes.get('/quick-stats', authenticateUserToken, (req, res) => {
  try {
    const quickStatsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 1) as total_patients,
        (SELECT COUNT(*) FROM jadwal_pemeriksaan jp 
         JOIN users u ON jp.patient_id = u.id 
         WHERE jp.visit_date = CURDATE() AND u.role = 1) as today_visits,
        (SELECT COUNT(*) FROM jadwal_pemeriksaan jp 
         JOIN users u ON jp.patient_id = u.id 
         WHERE jp.visit_date = CURDATE() AND jp.status = 'Selesai' AND u.role = 1) as today_completed,
        (SELECT COUNT(*) FROM jadwal_pemeriksaan jp 
         JOIN users u ON jp.patient_id = u.id 
         WHERE MONTH(jp.visit_date) = MONTH(CURDATE()) 
         AND YEAR(jp.visit_date) = YEAR(CURDATE()) AND u.role = 1) as monthly_examinations
    `;

    con.execute(quickStatsQuery, (err, results) => {
      if (err) {
        console.error('Error fetching quick stats:', err);
        return res.status(500).json({ error: 'Failed to fetch quick statistics' });
      }

      res.status(200).json(results[0]);
    });

  } catch (error) {
    console.error('Quick stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default dashboardRoutes;
