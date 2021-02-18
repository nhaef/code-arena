import express, {Application, Request, Response, Router} from 'express';
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
router.use('**', (req: Request, res: Response) => res.sendFile(path.join(uiPath, 'index.html')));

app.use(router);
app.listen(port);

// API up and running
console.log(`Currently listening on Port ${port}`);
