import express from 'express';
import con from './db_connect.js';
import bodyParser from 'body-parser';
import 'dotenv/config';

const app = express()
const port = process.env.PORT;

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))

con.connect((err) =>{
    if(err) console.log(err);
    console.log("Database terkoneksi");
})

app.get('/main', (req, res) => {
  con.execute('SELECT * from `user`', (err, results, fields) =>{
    res.send(results)
  })
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})