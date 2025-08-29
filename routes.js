import express from 'express';
import { capitalize, requestLog, pR } from './demo.js';
import bcrypt from 'bcrypt';
import con from './db_connect.js';
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { authenticateUserToken, authenticateAdminToken } from './authentication.js';
var days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const routes = express.Router();
const userTable = process.env.MYSQL_TABLE_USERS;
const secretKey = process.env.SECRET_KEY_AUTH;


// ADMIN ROUTES (require admin user credentials)
// CHECKING COOKIES

routes.get('/', authenticateAdminToken, (req, res) => {
  con.execute(`SELECT * from ${userTable}`, (err, results, fields) =>{
    requestLog(req, res);
    con.execute(`SELECT * FROM ${userTable} WHERE email = '${req.user.email}'`, (err2, results2, fields2) =>{
      res.json({result : results, loggedInAs : results2[0].nama, role: pR(req.user.role)})
    })
  });
});

routes.get('/deleteuser/:id', authenticateAdminToken, (req, res) =>{
  var userId = req.params.id
  con.execute(`DELETE FROM ${userTable} WHERE id = '${userId}'`, (err, results, fields) =>{
    requestLog(req, res);
    res.send(results)
  });
})

routes.post('/tambah-jadwal', authenticateAdminToken, (req, res) =>{
  const dateNow = new Date();
  const judul = req.body.title;
  const keterangan = req.body.message;
  
  con.execute(`INSERT INTO jadwal (day, date, title, message) VALUES ('${days[dateNow.getDay()]}', '${dateNow.toLocaleString}', '${judul}', '${keterangan}')`, (err, results, fields) =>{
    if(err) return res.send({message: err})

    return res.send({message: "Jadwal berhasil ditambahkan"})
  })
})

// routes.post('/tambah-hasilpemeriksaan', authenticateAdminToken, (req, res) =>{
//   const 
// })


// USER ROUTES (require user credentials)

// CHECKING COOKIES
// METHOD : GET

routes.get('/user-dashboard', authenticateUserToken, (req, res) =>{
  var email = req.user.email;
  con.execute(`SELECT nama, email, password from users WHERE email = '${email}'`, (err, results, fields) =>{
    con.execute(`SELECT * from user_detail WHERE id = '${results[0].id}'`, (err2, results2, fields2) =>{
      res.json({
        user: results[0],
        user_detail: results2[0]
      })
    })
  });
});

routes.get('/jadwal', authenticateUserToken, (req, res) =>{
  con.execute(`SELECT * from jadwal`, (err, results, fields) =>{
    return res.json(results);
  })
})

routes.get('/hasil-pemeriksaan', authenticateUserToken, (req, res) =>{
  const email = req.user.email
  con.execute(`SELECT id from users WHERE email = '${email}'`, (err, results, fields) =>{
    con.execute(`SELECT * from hasilPemeriksaan WHERE userId = '${results[0].id}'`)
  });
})

routes.get('/my-ticket', (req, res) =>{

})

// METHOD POST

routes.post('/create-ticket', authenticateUserToken, (req, res) =>{
  // create ticket for consulting
})



// UNAUTHORIZED ROUTE (doesnt require anything)
// A CAGE TO LOGIN

routes.post('/login', (req, res) =>{
  var email, password;
  var reqBody = req.body;

  email = reqBody.email;
  password = reqBody.password

  con.execute(`SELECT * FROM ${userTable} WHERE email = '${email}'`, (err, results, fields) =>{

    // Email tidak ditemukan
    if(!results[0]) return res.send({ message : "Email tidak ditemukan" })

    const data = results[0];
    bcrypt.compare(password, data.password, (err, hash) =>{

      // Password salah
      if(!hash) return res.send({ message : "Password salah" });
      var token = jwt.sign({email: data.email, role: data.role}, secretKey);

      res.cookie("token", token, {httpOnly: true, secure: true, sameSite: true})
      return res.send(data);
    })
  })
})

routes.post('/signup', (req, res) =>{
  const saltRounds = 12
  var nama, email;
  var reqBody = req.body;

  nama = capitalize(reqBody.nama);
  email = reqBody.email;

  con.execute(`SELECT * FROM ${userTable} WHERE email = '${email}'`, (err, results, fields) =>{
    if(results[0]) {
      return res.send("Email telah didaftarkan, harap login!")
    }

    bcrypt.hash(reqBody.password, saltRounds, (err, hash) =>{
    con.execute(`INSERT INTO ${userTable} (nama, email, password, role) VALUES ('${nama}', '${email}', '${hash}', '3421')`, (err, results, fields) =>{
        if (err) res.send(err);
        con.execute(`INSERT INTO user_detail (id) VALUES ('${results.insertId}')`, (err2, results2, fields2) =>{
          res.send(results2);
          requestLog(req, res);
        })
        
      });
    });
  })

  
})


export default routes