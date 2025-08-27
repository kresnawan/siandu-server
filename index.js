import express from 'express';
import con from './db_connect.js';
import bodyParser from 'body-parser';
import 'dotenv/config';
import cors from 'cors';
import capitalize from './demo.js';
import bcrypt from 'bcrypt';

const app = express()
const port = process.env.PORT;

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.use(cors());

con.connect((err) =>{
    if(err) console.log(err);
    console.log("Database terkoneksi");
})

app.get('/', (req, res) => {
  con.execute('SELECT * from users', (err, results, fields) =>{
    res.json(results)
  });
});

app.get('/deleteuser/:id', (req, res) =>{
  var userId = req.params.id
  con.execute(`DELETE FROM users WHERE id = '${userId}'`, (err, results, fields) =>{
    res.send(results)
  });
})

app.post('/adduser', (req, res) =>{
  const saltRounds = 12
  var nama, email, password, verified;
  var reqBody = req.body;

  nama = capitalize(reqBody.nama);
  email = reqBody.email;
  bcrypt.hash(reqBody.password, saltRounds, (err, hash) =>{
    con.execute(`INSERT INTO users (nama, email, password) VALUES ('${nama}', '${email}', '${hash}')`, (err, results, fields) =>{
      if (err) res.send(err);
      res.send(results);
    });
  });

  verified = 0;

  




})


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})