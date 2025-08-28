import express from 'express';
import { capitalize, requestLog } from './demo.js';
import bcrypt from 'bcrypt';
import con from './db_connect.js';
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import authenticateToken from './authentication.js';

const routes = express.Router();
const secretKey = process.env.SECRET_KEY_AUTH;


routes.get('/', authenticateToken, (req, res) => {
  con.execute('SELECT * from users', (err, results, fields) =>{
    requestLog(req, res);
    con.execute(`SELECT * FROM users WHERE email = '${req.user.email}'`, (err2, results2, fields2) =>{
      res.json({result : results, loggedInAs : results2[0].nama})
    })
  });
});

routes.get('/cookie', (req, res) =>{
  var cookie = req.cookies.token;

  if (!cookie) return res.send({ message: "cookie tidak ditemukan" })
  requestLog(req, res)
  res.send(cookie);
})

routes.get('/deleteuser/:id', (req, res) =>{
  var userId = req.params.id
  con.execute(`DELETE FROM users WHERE id = '${userId}'`, (err, results, fields) =>{
    requestLog(req, res);
    res.send(results)
  });
})

routes.post('/login', (req, res) =>{
  var email, password;
  var reqBody = req.body;

  email = reqBody.email;
  password = reqBody.password

  con.execute(`SELECT * FROM users WHERE email = '${email}'`, (err, results, fields) =>{

    // Email tidak ditemukan
    if(!results[0]) return res.send({ message : "Email tidak ditemukan" })

    const data = results[0];
    bcrypt.compare(password, data.password, (err, hash) =>{

      // Password salah
      if(!hash) return res.send({ message : "Password salah" });
      var token = jwt.sign({email: data.email}, secretKey);

      res.cookie("token", token, {httpOnly: true, secure: true, sameSite: true})
      return res.send(data);
    })
  })
})

routes.post('/adduser', (req, res) =>{
  const saltRounds = 12
  var nama, email;
  var reqBody = req.body;

  nama = capitalize(reqBody.nama);
  email = reqBody.email;

  con.execute(`SELECT * FROM users WHERE email = '${email}'`, (err, results, fields) =>{
    if(results[0]) {
      return res.send("Email telah didaftarkan, harap login!")
    }

    bcrypt.hash(reqBody.password, saltRounds, (err, hash) =>{
    con.execute(`INSERT INTO users (nama, email, password) VALUES ('${nama}', '${email}', '${hash}')`, (err, results, fields) =>{
        if (err) res.send(err);
        res.send(results);
        requestLog(req, res);
      });
    });
  })

  
})


export default routes