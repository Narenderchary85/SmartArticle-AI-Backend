import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import ScraperRoute from './router/scaper.js';
import OptimizerRoute from './router/optimizer.js';

const app=express();
dotenv.config();
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/article',ScraperRoute);
app.use('/optimize',OptimizerRoute)

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('DB connected'))
  .catch(err => console.error(err));

app.listen(1000,()=>{
    console.log("Server is running on port 1000");
})