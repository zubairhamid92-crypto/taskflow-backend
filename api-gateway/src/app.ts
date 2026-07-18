import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createProxyMiddleware } from "http-proxy-middleware";

dotenv.config();

const app = express();

app.use(cors());

// app.use(express.json());

app.use(
    "/api/v1/auth",
    createProxyMiddleware({

        target: process.env.AUTH_SERVICE,

        changeOrigin: true,

    })
);

app.use(
    "/api/v1/employees",
    createProxyMiddleware({

        target: process.env.EMPLOYEE_SERVICE,

        changeOrigin: true,

    })
);

export default app;