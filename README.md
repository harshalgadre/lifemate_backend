# Basic Backend Server with MongoDB

This is a simple Node.js backend server using Express.js framework with MongoDB integration.

## Getting Started

### Prerequisites
- Node.js installed on your machine
- MongoDB installed and running locally, or MongoDB Atlas account for cloud database

### Installation
1. Clone the repository
2. Run `npm install` to install dependencies
3. Make sure MongoDB is running on your system (default: mongodb://localhost:27017)

### Running the Server
- To run in development mode: `npm run dev`
- To run in production mode: `npm start`

The server will start on port 3000 by default.

## API Endpoints

### Health Check
- `GET /health` - Returns server health status and MongoDB connection status

### Basic Route
- `GET /` - Returns a simple Hello World message

### Items CRUD Operations
- `POST /items` - Create a new item
- `GET /items` - Get all items
- `GET /items/:id` - Get a specific item by ID
- `PUT /items/:id` - Update a specific item by ID
- `DELETE /items/:id` - Delete a specific item by ID

## Environment Variables
- `PORT` - Port for the server to listen on (default: 3000)
- `MONGODB_URI` - MongoDB connection string (default: mongodb://localhost:27017)

## Dependencies

- Express.js - Web framework for Node.js
- MongoDB - Official MongoDB driver for Node.js
- Nodemon - Development tool for auto-restarting the server

## Example Usage

### Creating an item
```bash
curl -X POST http://localhost:3000/items \
  -H "Content-Type: application/json" \
  -d '{"name":"Sample Item","description":"This is a sample item"}'
```

### Getting all items
```bash
curl http://localhost:3000/items
```