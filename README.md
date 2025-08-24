# 🚀 Multi-Tenant SaaS Application - Complete Beginner's Guide

A powerful web application that allows multiple businesses (tenants) to use the same software while keeping their data completely separate. Think of it like apartment building - multiple tenants live in the same building, but each has their own private space.



# How to run the project on your local machine:
```
git clone https://github.com/badalhalder99/vital.git
cd "VITAL - Copy"
```

### Step 3: Set Up the Backend (Server)

```bash
# Navigate to backend folder
cd backend

# Install all required packages
npm install



### Step 4: Set Up the Database

```bash
# Create database collections and indexes
npm run migrate

# Add sample data for testing
npm run seed
```

**What does seeding do?**
- Creates 3 sample businesses (tenants)
- Creates 5 sample users with different roles
- Creates sample subscription data
- Adds test analytics data

### Step 5: Set Up the Frontend (User Interface)

Open a new terminal window and run:

```bash
# Navigate to frontend folder
cd frontend

# Install all required packages
npm install
```

## 🚀 Running the Application

You need to run both the backend and frontend at the same time.

### Terminal 1 (Backend):
```bash
cd backend
npm start          # For production
# OR
npm run dev        # For development (auto-restarts when you make changes)
```

You should see:
```
Connected to MongoDB
Database connected successfully
Server running on http://localhost:3005
```

### Terminal 2 (Frontend):
```bash
cd frontend
npm start
```

Your browser should automatically open to http://localhost:3000

## 🔐 How to Test the Application

After running the seed script, you can log in with these test accounts:

| User Type | Email | Password | What They Can Do |
|-----------|--------|----------|------------------|
| **Admin** | admin@vital.com | admin123 | Manage everything, all tenants |
|



### Adding Sample Data
```bash
# Clear existing data and add fresh sample data
cd backend
node scripts/seed.js --clear
```

### API Endpoints You Can Test

```bash
# Check if server is running
curl http://localhost:3005/health

# Get analytics dashboard data
curl http://localhost:3005/api/analytics/dashboard

# Get list of tenants
curl http://localhost:3005/api/tenants/list
```
