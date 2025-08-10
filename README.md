# Chat App

A real-time chat application built with React and Node.js.

## Features

- Real-time messaging
- User authentication
- Modern UI/UX
- Responsive design

## Tech Stack

- **Frontend**: React, Tailwind CSS
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Real-time**: Socket.io

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd chat-app
```

2. Install backend dependencies
```bash
cd backend
npm install
```

3. Install frontend dependencies
```bash
cd ../frontend
npm install
```

4. Set up environment variables
```bash
# Backend .env
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Frontend .env
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your configuration
```

5. Start the development servers
```bash
# Backend (from backend directory)
npm run dev

# Frontend (from frontend directory)
npm start
```

## Project Structure

```
chat-app/
├── backend/          # Node.js backend
├── frontend/         # React frontend
└── README.md
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the MIT License.