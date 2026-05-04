# 📱 WhatsApp Clone – MERN Stack

A professional, real-time messaging application that enables users to chat, share status updates, and perform video calls.  
This project is built using the MERN stack (MongoDB, Express.js, React.js, Node.js).

---

##  Features

-  Real-time messaging with delivery status and unread counts  
-  Status updates (text, images, videos – expire after 24 hours)  
-  User profile management  
-  Video calling using WebRTC  
-  Secure authentication using OTP and JWT  
-  Light/Dark theme support  
-  Fully responsive (mobile + desktop)  

---

##  Technology Stack

###  Backend
The backend is built using **Node.js** and **Express.js**.

- **Database:** MongoDB (via Mongoose)  
- **Real-time Communication:** Socket.IO  
- **Media Storage:** Cloudinary  
- **Authentication:** JSON Web Tokens (JWT)  
- **Services:**
  - Twilio (OTP verification)
  - Nodemailer (email notifications)

---

###  Frontend
The frontend is built using **React.js**.

- **State Management:** Zustand  
- **Styling:** Tailwind CSS + DaisyUI  
- **Real-time Updates:** Socket.io-client  
- **Animations:** Framer Motion  
- **API Communication:** Axios  

---

##  Environment Variables Setup

Create `.env` files in both **backend** and **frontend** directories.

---

###  Backend Configuration (`backend/.env`)

```env
PORT=5001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:3000

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email
EMAIL_USER=your_email
EMAIL_PASS=your_app_password

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_SERVICE_SID=your_twilio_verify_service_sid