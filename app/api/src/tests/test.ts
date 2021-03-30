//Test the db functionality
import { test as dbTest } from './dbtest'

//Only test when we want to test. Duh
dbTest().catch((reason) => {
    console.log(reason);
});