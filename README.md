# Planora Backend ⚙️

> The central API server for the Planora event management system, providing robust data management, secure authentication, and seamless payment processing.

🟢 **Live API URL**: [https://planora-server-two.vercel.app](https://planora-server-two.vercel.app)

*(Note: API is accessible primarily via the `/api/v1` base path)*

## 📖 Description

The Planora Backend is a robust, scalable RESTful API built to support the Planora event management platform. It handles all critical business logic including secure user authentication with role-based access, comprehensive event lifecycle management, participation tracking, revenue reporting, and safe integration with Stripe for payment processing.

## ✨ Features

- **Robust Authentication & Authorization**: Secure JWT-based auth with explicit `USER` and `ADMIN` roles.
- **Event Management Models**: Complete CRUD pipelines for Events, integrated seamlessly with the Prisma ORM.
- **Integrated Payments**: End-to-end integration with Stripe for handling Checkout Sessions, Payment Intents, and Webhooks.
- **Secure Image Uploads**: Middleware-driven cloud storage using Cloudinary and Multer.
- **Strict Data Validation**: Enterprise-grade schema validations using Zod to ensure data integrity at the request boundary.
- **Relational Data Integrity**: Database schemas that carefully track Users, Events, Participations, Payments, and Earnings.
- **Error Handling**: Standardized, predictable API responses and error mapping structure.

## 🛠️ Technologies Used

- **Runtime & Language:** Node.js v20+, [TypeScript](https://www.typescriptlang.org/)
- **Framework:** [Express.js v5](https://expressjs.com/)
- **Database & ORM:** PostgreSQL & [Prisma ORM](https://www.prisma.io/)
- **Security:** `bcrypt` (hashing), `jsonwebtoken` (Auth)
- **Validation:** [Zod](https://zod.dev/)
- **Storage:** [Cloudinary](https://cloudinary.com/) (Images), `multer`
- **Integrations:** [Stripe API](https://stripe.com/docs/api)
- **Utilities:** `cors`, `cookie-parser`, `morgan` (logging), `tsup` (module bundling)

## 📍 API Base Path

The primary base path for hitting the endpoints of this API is:
```text
/api/v1
```

## 🚀 Setup Instructions

Follow these steps to get the backend server running locally:

### Prerequisites

- Node.js (v20+ recommended)
- A running PostgreSQL database instance (or a remote one like Supabase/Neon)
- Cloudinary, Stripe, and JWT credentials

### 1. Clone & Install Dependencies

Navigate into the `server` directory and install the necessary dependencies:

```bash
cd server
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root of the `server` directory. Use the template below and supply your respective credentials.

#### `.env` Example

```env
# Server Port
PORT=5000

# Prisma / Postgres Database URL
# e.g.: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
DATABASE_URL="your_database_url_here"

# JWT Secret Key for Authentication
JWT_SECRET="your_super_secret_jwt_key_here"
JWT_EXPIRES_IN="7d"

# Stripe Integration
STRIPE_SECRET_KEY="sk_test_xxxxxxxxxxxxxxxxxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxx"

# Cloudinary Integration (for Image Uploads)
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# Frontend Application URL (for CORS and specific redirects)
FRONTEND_URL="http://localhost:3000"
```

### 3. Setup the Database

Generate the Prisma client and push your application schema to the connected database:

```bash
# Generate the client
npx prisma generate

# Push the schema changes directly to the database
npx prisma db push
```

*(Optional)* You can also run the seed script to create a default Admin user:
```bash
npm run seed:admin
```

### 4. Run the Server

Start the development server:

```bash
npm run dev
```

The server should now be listening at `http://localhost:5000`.

### 5. Build for Production

To create a production-ready bundled output inside the `api` / `dist` folder:

```bash
npm run build
npm start
```
