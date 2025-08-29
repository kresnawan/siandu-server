import express from 'express';
import con from './db_connect.js';
import bodyParser from 'body-parser';
import 'dotenv/config';
import cors from 'cors';
import routes from './routes.js';
import cookieParser from 'cookie-parser';

const app = express()
const port = process.env.PORT

app.use(cookieParser());
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.use(cors({credentials: true}));

con.connect((err) =>{
    if(err) console.log(err);
    console.log("Database terkoneksi");
})

// ROUTE
app.use('/', routes)

// RUN THE APP
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})