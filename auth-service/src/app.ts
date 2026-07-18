import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import authRoutes from "./modules/auth/routes"
const app = express();

app.use(cors());
app.use(helmet());
app.use(compression());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/", authRoutes);
 
app.get('/health', (_, res) => {
    res.status(200).json({
        success: true,
        message: 'TaskFlow API is running',
    });
});
app.use((err: any, req: any, res: any, next: any) => {

    return res.status(err.statusCode || 500).json({

        success: false,
        message: err.message,

    });

});
export default app;