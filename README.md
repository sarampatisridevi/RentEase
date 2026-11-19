# 🏠 RentEase: AI-Powered House Rental Platform

RentEase is a full-stack house rental web application built with the MERN stack. It supports role-based access for **users, owners, and admin**, secure authentication, property listing and booking, and an **AI chatbot assistant powered by Google Gemini** that answers questions using live data from the database.

## ✨ Features

- **Role-based access:** separate experiences for renters, property owners, and admin
- **Secure authentication:** JWT tokens and bcrypt password hashing
- **Property listings:** owners can add and manage properties for rent or sale
- **Booking:** renters can book properties and owners can manage requests
- **Dynamic filtering:** search properties by type, ad type, and price
- **Login-protected details:** full property details are visible only to logged-in users
- **AI chatbot assistant:** answers questions about available properties, locations, prices, and rent or sale status

## 🤖 AI Chatbot: How It Works

1. The user types a question in the React chat widget.
2. The frontend sends the message and recent chat history to `POST /api/ai/chat`.
3. The Express backend fetches live property listings from MongoDB.
4. The listings are passed to the Gemini API as context along with strict instructions (grounded prompting), so answers come only from real data.
5. The backend includes retry and model-fallback handling for when the API is busy.
6. The reply is returned to the chat widget.

The API key is stored on the server in `.env` and is never exposed to the frontend.

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React.js (Vite), CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Auth | JWT, bcrypt |
| AI | Google Gemini API (`@google/genai`) |

## 📁 Project Structure

```
Housing project
├── client          # React frontend
│   └── src/modules
│       ├── admin   # admin pages
│       ├── common  # shared pages and ChatBot
│       └── user    # user and owner pages
└── server          # Express backend
    ├── config
    ├── controllers
    ├── middlewares
    ├── models
    ├── routes
    └── index.js
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- A free Gemini API key from [Google AI Studio](https://aistudio.google.com)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

### 2. Set up the backend
```bash
cd server
npm install
```

Create a `.env` file inside `server`:
```
PORT=8001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-flash-latest
```

Start the server:
```bash
node index.js
```

### 3. Set up the frontend
```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## 🔐 Security Notes

- Passwords are hashed with bcrypt and never stored in plain text.
- Protected routes are verified with JWT middleware.
- API keys are kept in `.env` and excluded from Git through `.gitignore`.

## 🔮 Future Improvements

- Clickable property cards inside the chatbot
- AI-generated property descriptions for owners
- Natural language property search
- Pagination and rate limiting

## 👩‍💻 Author

**Your Name**
[GitHub](https://github.com/your-username) | [LinkedIn](https://linkedin.com/in/your-profile)