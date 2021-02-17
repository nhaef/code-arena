import express, {Application, Router} from 'express';
import {config} from 'dotenv';
import path from 'path';

import {apiRouter} from './routes';

// Load environment
config();
const port = process.env.PORT || 3000;
const uiPath = path.join(path.dirname(path.dirname(__dirname)), 'ui/app/dist/app');

//Define routes
const app: Application = express();
const router: Router = Router();

// Handle API routes
router.use('/api', apiRouter);
// Handle UI routes
router.use(express.static(uiPath));
// Handle 404 routes
router.use((req, res, next) => res.status(404).end('This page does not exist :( :( :('));

app.use(router);
app.listen(port);

// API up and running
console.log(`Currently listening on Port ${port}`);
