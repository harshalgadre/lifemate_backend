# LifeMate Backend API

A comprehensive healthcare job platform backend built with Node.js, Express, and MongoDB. This API provides authentication, job management, application tracking, and communication features for healthcare professionals and employers.

## 🏥 Features

### Authentication & Authorization
- User registration and login (Job Seekers, Employers, Admins)
- JWT-based authentication with refresh tokens
- Email verification and password reset
- Role-based access control
- Account security (login attempts, account locking)

### User Management
- **Job Seekers**: Profile management, resume upload, job preferences
- **Employers**: Organization profiles, job posting, candidate management
- **Admins**: Platform moderation, analytics, user management

### Job Management
- Job posting and management
- Advanced job search and filtering
- Application tracking and status updates
- Interview scheduling and notifications

### Communication
- Real-time messaging between employers and candidates
- Email notifications for important events
- Application status updates

### File Management
- Resume and document uploads (Cloudinary integration)
- Profile image management
- Document verification

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account or local MongoDB instance
- Email service (Gmail, SendGrid, etc.)
- Cloudinary account (for file uploads)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lifemate_backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Database Configuration
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lifemate

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d
   JWT_REFRESH_SECRET=your_super_secret_refresh_key_here
   JWT_REFRESH_EXPIRE=30d

   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   EMAIL_FROM=noreply@lifemate.com

   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret

   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 📁 Project Structure

```
lifemate_backend/
├── config/                 # Configuration files
│   ├── database.js        # MongoDB connection
│   └── cloudinary.js      # Cloudinary configuration
├── controllers/           # Route controllers
│   └── authController.js  # Authentication logic
├── middlewares/           # Custom middleware
│   ├── auth.js           # Authentication middleware
│   └── validation.js     # Request validation
├── models/               # Mongoose models
│   ├── User.js          # Base user model
│   ├── JobSeeker.js     # Job seeker profile
│   └── Employer.js      # Employer profile
├── routes/              # API routes
│   └── auth.js         # Authentication routes
├── services/           # Business logic services
│   └── emailService.js # Email sending service
├── utils/             # Utility functions
│   ├── jwt.js        # JWT utilities
│   └── response.js   # Response formatting
├── server.js         # Main server file
└── package.json      # Dependencies
```

## 🔐 API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | No |
| POST | `/login` | User login | No |
| POST | `/logout` | User logout | Yes |
| POST | `/refresh-token` | Refresh access token | No |
| GET | `/verify-email/:token` | Verify email address | No |
| POST | `/resend-verification` | Resend verification email | No |
| POST | `/forgot-password` | Request password reset | No |
| POST | `/reset-password/:token` | Reset password | No |
| GET | `/profile` | Get user profile | Yes |
| PUT | `/profile` | Update user profile | Yes |
| PUT | `/change-password` | Change password | Yes |

### Example API Usage

#### Register a new user
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123",
    "firstName": "John",
    "lastName": "Doe",
    "role": "jobseeker",
    "phone": "+1234567890"
  }'
```

#### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

#### Get profile (with authentication)
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🛡️ Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing configuration
- **Rate Limiting**: API request rate limiting
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Input Validation**: Request data validation
- **Account Locking**: Protection against brute force attacks

## 📧 Email Features

The platform sends various types of emails:
- Email verification
- Password reset
- Job application notifications
- Interview invitations
- Welcome emails

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 5000 |
| `NODE_ENV` | Environment | No | development |
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `JWT_REFRESH_SECRET` | JWT refresh secret | Yes | - |
| `EMAIL_HOST` | SMTP host | Yes | - |
| `EMAIL_USER` | SMTP username | Yes | - |
| `EMAIL_PASS` | SMTP password | Yes | - |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes | - |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes | - |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes | - |

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run tests in watch mode
npm run test:watch
```

## 📝 API Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🚀 Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secrets
- [ ] Configure production MongoDB
- [ ] Set up email service
- [ ] Configure Cloudinary
- [ ] Set up SSL/HTTPS
- [ ] Configure CORS for production domain
- [ ] Set up monitoring and logging

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Version History

- **v1.0.0** - Initial release with authentication system
- **v1.1.0** - Job management features (planned)
- **v1.2.0** - Application tracking (planned)
- **v1.3.0** - Messaging system (planned)

---

**LifeMate** - Connecting Healthcare Professionals with Opportunities 🏥💼