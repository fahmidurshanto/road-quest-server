# Road Quest Server

This is the server for the Road Quest application. It is built with Express.js and connects to a MongoDB database.

## Features

*   **RESTful API:** Exposes a simple REST API to interact with the application's data.
*   **MongoDB Integration:** Connects to a MongoDB database to store and retrieve data.
*   **Service Endpoints:** Provides endpoints to get a list of all available services and to retrieve a single service by its unique ID.
*   **CORS Enabled:** Configured with the `cors` middleware to allow cross-origin requests.
*   **Environment-Based Configuration:** Uses `dotenv` to manage environment variables for configuration (e.g., database connection strings, port).
*   **Vercel Deployment:** Ready for deployment on the Vercel platform.

## Tools and Libraries Used

*   **[Node.js](https://nodejs.org/):** A JavaScript runtime environment that executes JavaScript code outside a web browser.
*   **[Express.js](https://expressjs.com/):** A minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications.
*   **[MongoDB](https://www.mongodb.com/):** A NoSQL database used for storing application data. The server uses the `mongodb` Node.js driver to interact with the database.
*   **[cors](https://www.npmjs.com/package/cors):** A Node.js package for providing a Connect/Express middleware that can be used to enable CORS with various options.
*   **[dotenv](https://www.npmjs.com/package/dotenv):** A zero-dependency module that loads environment variables from a `.env` file into `process.env`.
*   **[Vercel](https://vercel.com/):** A cloud platform for static sites and Serverless Functions that fits perfectly with a Node.js backend.

## Build

For this project, the "build" step is the installation of the required `npm` packages.

```bash
npm install
```

This command will download and install all the dependencies listed in the `package.json` file into a `node_modules` directory.

## Installation

To run this server locally, you need to have Node.js and npm installed.

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/road-quest-server.git
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```

## Usage

To start the server, run the following command:

```bash
npm start
```

The server will start on port 5000 by default. You can specify a different port by creating a `.env` file and adding a `PORT` variable.

## API Endpoints

### `GET /`

Returns a welcome message.

### `GET /all-services`

Returns a list of all services from the database.

### `GET /service/:id`

Returns a single service by its ID.

## Deployment

This server is configured for deployment on [Vercel](https://vercel.com/). The `vercel.json` file contains the necessary configuration for Vercel to build and deploy the server.
