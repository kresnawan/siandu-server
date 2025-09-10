import express from 'express';
import { capitalize, requestLog } from '../demo.js';
import bcrypt from 'bcrypt';
import con from '../db_connect.js';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const authRoutes = express.Router();
const userTable = process.env.MYSQL_TABLE_USERS;
const secretKey = process.env.SECRET_KEY_AUTH;

authRoutes.post('/login', (req, res) => {
  var email, password;
  var reqBody = req.body;

  email = reqBody.email;
  password = reqBody.password;

  con.execute(`SELECT * FROM ${userTable} WHERE email = '${email}'`, (err, results, fields) => {
    // Email tidak ditemukan
    if (!results[0]) return res.send({ message: "Email tidak ditemukan" });

    const data = results[0];
    bcrypt.compare(password, data.password, (err, hash) => {
      // Password salah
      if (!hash) return res.send({ message: "Password salah" });
      var token = jwt.sign({ email: data.email, role: data.role }, secretKey);

      res.cookie("token", token, { httpOnly: true, secure: true, sameSite: true });
      return res.send(data);
    });
  });
});

authRoutes.post('/adduser', (req, res) => {
  const saltRounds = 12;
  var nama, email;
  var reqBody = req.body;

  nama = capitalize(reqBody.nama);
  email = reqBody.email;

  con.execute(`SELECT * FROM ${userTable} WHERE email = '${email}'`, (err, results, fields) => {
    if (results[0]) {
      return res.send("Email telah didaftarkan, harap login!");
    }

    bcrypt.hash(reqBody.password, saltRounds, (err, hash) => {
      con.execute(`INSERT INTO ${userTable} (nama, email, password, role) VALUES ('${nama}', '${email}', '${hash}', '3421')`, (err, results, fields) => {
        if (err) res.send(err);
        res.send(results);
        requestLog(req, res);
      });
    });
  });
});

authRoutes.post('/logout', (req, res) => {
  // Clear the token cookie
  res.clearCookie('token');
  res.json({ message: 'Logout berhasil' });
});

export default authRoutes;