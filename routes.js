import express from 'express';
import { capitalize, requestLog, pR } from './demo.js';
import bcrypt from 'bcrypt';
import con from './db_connect.js';
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { authenticateUserToken, authenticateAdminToken } from './authentication.js';
import nodemailer from 'nodemailer';

var days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const routes = express.Router();
const userTable = process.env.MYSQL_TABLE_USERS;
const secretKey = process.env.SECRET_KEY_AUTH;
const emailAPI = process.env.EMAIL_API_TOKEN;

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  auth: {
    user: 'siandu@zohomail.com',
    pass: emailAPI
  }
})

// ADMIN ROUTES (require admin user credentials)
// CHECKING COOKIES

// update akun
// routes.post('/updatepasien/:email/:atribut', authenticateAdminToken, (req, res) =>{
//   var atribut = req.params.atribut;
//   var email = req.params.email;

//   var value = req.body.value;

//   con.execute(`UPDATE user_detail SET ${atribut} = '${value}' WHERE id = '${email}'`, (err, results, fields) =>{
//     if (err) return res.send(err.message);

//     res.send("Berhasil mengubah data")
//   })
// });


// regis akun
routes.post('/pasien', authenticateAdminToken, (req, res) =>{
  const saltRounds = 12
  var send;
  var nama, email;
  var noHp, tempatLahir, tanggalLahir, alamat, pekerjaan, negara, golDarah, NoInduk, jenisKelamin
  var reqBody = req.body;

  nama = capitalize(reqBody.nama);
  email = reqBody.email;

  noHp = reqBody.nohp;
  tempatLahir =  reqBody.tempatLahir;
  tanggalLahir = reqBody.tanggalLahir;
  alamat = reqBody.alamat;
  pekerjaan = reqBody.pekerjaan;
  negara = reqBody.negara;
  golDarah = reqBody.golDarah;
  NoInduk = reqBody.NoInduk;
  jenisKelamin = reqBody.gender;

  con.execute(`SELECT * FROM ${userTable} WHERE email = '${email}'`, (err, results, fields) =>{
    if(results[0]) {
      return res.send("Email telah didaftarkan, harap login!")
    }

    const hashEmail = jwt.sign({ email: email }, secretKey);

    con.execute(`INSERT INTO emailVerif (token) VALUES ('${hashEmail}')`, (err3, results3, fields3) =>{
      if (err3) return res.send(err);
    })

    let mailOption = {
      from: 'Siandu Service siandu@zohomail.com',
      to: email,
      subject: 'Email Verification',
      text: `Click this link to verify your account : http://localhost:3001/verify-email/${hashEmail}`
    }

    transporter.sendMail(mailOption, (err, info) =>{
      if (err) return res.send(err);
    });


    bcrypt.hash(reqBody.password, saltRounds, (err, hash) =>{
    con.execute(`INSERT INTO ${userTable} (nama, email, password, role) VALUES ('${nama}', '${email}', '${hash}', '3421')`, (err, results, fields) =>{
        if (err) res.send(err);
        con.execute(`
          INSERT INTO user_detail (id, tempatLahir, tanggalLahir, alamat, pekerjaan, negara, golDarah, NIK, jenisKelamin, noHp) 
          VALUES ('${results.insertId}', '${tempatLahir}', '${tanggalLahir}', '${alamat}', '${pekerjaan}', '${negara}', '${golDarah}', '${NoInduk}', '${jenisKelamin}', '${noHp}', )`, (err2, results2, fields2) =>{
          res.send("Akun berhasil dibuat, silakan cek email anda untuk verifikasi sebelum login");
          requestLog(req, res);
        })
        
      });
    });
  })

  
})

routes.post('/email', (req, res) =>{
  const email = req.body.email;

  if (!email) return res.send("Sertakan email");

  let mailOption = {
    from: 'Siandu Service siandu@zohomail.com',
    to: email,
    subject: 'Email Verification',
    text: 'This is a test email sent using nodemailer'
  }

  transporter.sendMail(mailOption, (err, info) =>{
    if (err) return res.send(err);

    return res.send("Cek email anda")
  })
})

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
  const tanggal = req.body.date;
  
  con.execute(`INSERT INTO jadwal (date, title, message, createdAt) VALUES ('${tanggal}, '${judul}', '${keterangan}', '${dateNow}')`, (err, results, fields) =>{
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

routes.get('/my-ticket', authenticateUserToken, (req, res) =>{
  const email = req.user.email
  con.execute(`SELECT id from users WHERE email = '${email}'`, (err, results, fields) =>{
    con.execute(`SELECT * from tickets WHERE senderId = '${results[0].id}'`, (err, results, fields) =>{
      res.send(results);
    });
  });
})

// METHOD POST

routes.post('/create-ticket', authenticateUserToken, (req, res) =>{
  const email = req.user.email;
  const subject = req.body.subject;
  const message = req.body.message;
  const dateNow = new Date();
  const isAnswered = 0;

  con.execute(`SELECT * from users WHERE email = '${email}'`, (err, results, fields) =>{
    con.execute(`INSERT INTO tickets (senderId, subject, message, createdAt, isAnswered) VALUES ('${results[0].id}','${subject}', '${message}', '${dateNow}', '${isAnswered}')`, (err, results, fields) =>{
      if(err) return res.send(err);
      return res.send({message: "Ticket berhasil di submit, mohon untuk menunggu balasan"})
    })
  });
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
    if(!results[0]) return res.send({ message : "Email tidak ditemukan" });
    if(results[0].verified === null) return res.send({ message: "Email anda belum diverifikasi, silakan verifikasi terlebih dahulu" });

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



routes.get('/verify-email/:verifytoken', (req, res) =>{
  let verifyToken = req.params.verifytoken;
  var userEmail;
  con.execute(`SELECT * from emailVerif WHERE token = '${verifyToken}'`, (err, results, fields) =>{
    if(err) return res.send(err);
    if(!results[0]) return res.send("Token verifikasi salah, email tidak terverifikasi.");
    
    jwt.verify(verifyToken, secretKey, (err2, user2) =>{
      userEmail = user2.email;
    })
    con.execute(`UPDATE users SET verified = '1' WHERE email = '${userEmail}'`, (err3, results3, fields3) =>{
      if (err3) return res.send(err3);
      
      return res.send("Email akun anda telah diverifikasi, silahkan login")
    })
  })

})


export default routes