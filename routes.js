import express from 'express';
import authRoutes from './Routes/auth.js';
import adminRoutes from './Routes/admin.js';
import userRoutes from './Routes/user.js';
import pasienRoutes from './Routes/pasien.js';
import kaderRoutes from './Routes/kader.js';
import pemeriksaanRoutes from './Routes/pemeriksaan.js';
import vaccinationRoutes from './Routes/vaccinations.js';
import jadwalPemeriksaanRoutes from './Routes/jadwal_pemeriksaan.js';
import dashboardRoutes from './Routes/dashboard.js';

const routes = express.Router();

// Mount sub-routers
routes.use('/auth', authRoutes);
routes.use('/admin', adminRoutes);
routes.use('/user', userRoutes);
routes.use('/patients', pasienRoutes);
routes.use('/kader', kaderRoutes);
routes.use('/api/examinations', pemeriksaanRoutes);
routes.use('/api/vaccinations', vaccinationRoutes);
routes.use('/api/jadwal-pemeriksaan', jadwalPemeriksaanRoutes);
routes.use('/api/dashboard', dashboardRoutes);
routes.use('/uploads', express.static('uploads'));

export default routes;