import express from 'express';
import con from './db_connect.js';
import 'dotenv/config';

const app = express()
const port = process.env.PORT;

con.connect((err) =>{
    if(err) console.log(err);
    console.log("Database terkoneksi");
})

app.get('/main', (req, res) => {
  con.execute('SELECT * from `user`', (err, results, fields) =>{
    res.send(results)
  })
})

app.listen(port, (a) => {
  console.log(`Example app listening on port ${port}`)
  console.log(a)
})