import pg from 'pg';
import env from '../config/env.js';

const { Pool } = pg;

export default new Pool(env.db);
