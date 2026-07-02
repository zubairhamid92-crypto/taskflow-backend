import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import authRoutes from "./modules/auth/routes";

const app = express();

app.use(cors());
app.use(helmet());
app.use("/api/v1/auth", authRoutes);
app.use(compression());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_, res) => {
    res.status(200).json({
        success: true,
        message: 'TaskFlow API is running',
    });
});

export default app;