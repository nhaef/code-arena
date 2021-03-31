# code-arena
Code Arena is a project which will allow users to let their AI-Models compete in different games. Therefore, code-arena provides an API and an angular-based UI.

### Requirements
- [Node](https://nodejs.org/en/)
- Angular (run ```npm install -g @angular/cli```)

### Local Setup
- Install all the necessary dependencies. Therefore, run ```npm ci``` in both app\ui\app and app\api.  
- Build the frontend by executing ```ng build``` in app\ui\app.  
- Execute ```npm run build-start``` in app\api will then compile the backend and run it for you, providing the app locally on Port 3000 (default).

### Setup Environment
- Create a file named ".env" in app\api
- Different environment constants have to be configured
```
Contents of app\api\.env

PORT=3000
SESSION_SECRET={{ Insert Session-Secret here }}
MONGO_USER={{ Insert MongoDB-User here }}
MONGO_PASS={{ Insert MongoDB-Pass here }}
MONGO_HOST={{ Insert MongoDB-Host here }}

DATABASE_TYPE={{ Insert Database-Type here }}
DATABASE_HOST={{ Insert Database-Host here }}
DATABASE_PORT={{ Insert Database-Port here }}
DATABASE_USERNAME={{ Insert Database-Username here }}
DATABASE_PASSWORD={{ Insert Database-Password here }}
DATABASE_NAME={{ Insert Database-Name here }}
```

### View Apidoc
- Navigate to app\api and run ```npm run doc```
- The apidoc should be available in the app\api\apidoc directory