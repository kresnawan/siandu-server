import express from 'express';
import { requestLog, pR } from '../demo.js';
import con from '../db_connect.js';
import { authenticateAdminToken } from '../authentication.js';
import 'dotenv/config';

const adminRoutes = express.Router();
const userTable = process.env.MYSQL_TABLE_USERS;

adminRoutes.get('/', authenticateAdminToken, (req, res) => {
  con.execute(`SELECT * from ${userTable}`, (err, results, fields) => {
    requestLog(req, res);
    con.execute(`SELECT * FROM ${userTable} WHERE email = '${req.user.email}'`, (err2, results2, fields2) => {
      res.json({ result: results, loggedInAs: results2[0].nama, role: pR(req.user.role) });
    });
  });
});

adminRoutes.get('/deleteuser/:id', authenticateAdminToken, (req, res) => {
  var userId = req.params.id;
  con.execute(`DELETE FROM ${userTable} WHERE id = '${userId}'`, (err, results, fields) => {
    requestLog(req, res);
    res.send(results);
  });
});

export default adminRoutes;