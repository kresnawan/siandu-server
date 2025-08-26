import express from 'express';
import con from './db_connect.js';
import 'dotenv/config';

const app = express()
const port = process.env.PORT;

con.connect((err) =>{
    if(err) console.log(err);
    console.log("Database terkoneksi");
})

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})