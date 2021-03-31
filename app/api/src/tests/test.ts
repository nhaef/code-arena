import { test as dbTest } from './dbtest'


//Test the db functionality
dbTest().catch((reason) => {
    console.log(reason);
});