import 'dotenv/config';

const config = {
    nodeEnv: process.env.NODE_ENV ?? 'development',

    port: Number(process.env.PORT) || 5000,

    databaseUrl: process.env.DATABASE_URL ?? '',

    jwt: {
        secret: process.env.JWT_SECRET ?? '',
        expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
    },
};

export default config;