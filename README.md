# Workshop Registration Service

A full-stack workshop registration system built with **ASP.NET Core Web API, React, and Microsoft SQL Server**. The application supports role-based access control, workshop management, attendee registration, cancellation history, and workshop capacity tracking.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Authentication and Authorization](#authentication-and-authorization)
- [API Endpoints](#api-endpoints)
- [Business Rules](#business-rules)
- [Testing the Application](#testing-the-application)
- [Project Structure](#project-structure)
- [Known Limitations](#known-limitations)
- [Future Improvements](#future-improvements)

## Overview

The Workshop Registration Service provides a centralized platform for managing workshops and attendee registrations.

Administrators can manage user accounts and roles, while Managers can create and update workshops. Managers and Staff can register attendees, cancel registrations, and view registration history.

The backend enforces authorization and validates workshop capacity to prevent registrations from exceeding the configured limit.

## Features

### Authentication and User Management

- JWT-based authentication.
- Password hashing using BCrypt.
- Role-based authorization.
- Admin-only user management endpoints.
- Create Admin, Manager, and Staff accounts.
- Deactivate user accounts.
- Reject login attempts for inactive or invalid users.

### Workshop Management

- Create workshops with a unique workshop code.
- View workshop details and workshop listings.
- Update workshop information.
- Set workshop capacity and status.
- Filter workshops by status and date range.
- Filter workshops with available seats.
- Display total active registrations and remaining seats.
- Prevent reducing capacity below the number of active registrations.

### Attendee Registration

- Register attendees for scheduled workshops.
- Validate workshop availability and capacity.
- Prevent duplicate active registrations for the same workshop and attendee email.
- Cancel registrations without deleting their records.
- Preserve cancellation timestamps and the user who performed the cancellation.
- View registration history, including cancelled registrations.

### Frontend

- Login interface.
- Workshop dashboard.
- Workshop creation and editing forms.
- Date, status, and availability filters.
- Attendee registration form.
- Registration history table.
- Registration cancellation.
- Role-aware interface elements.

## Technology Stack

| Component | Technology |
|---|---|
| Backend | ASP.NET Core Web API |
| Framework | .NET 8 |
| Frontend | React |
| Frontend tooling | Vite |
| Language | C# and JavaScript |
| Database | Microsoft SQL Server |
| ORM | Entity Framework Core |
| Authentication | JWT Bearer Authentication |
| Password hashing | BCrypt.Net-Next |
| API documentation | Swagger / OpenAPI |
| Version control | Git and GitHub |

## Architecture

The application uses a frontend/backend architecture.

```text
React Frontend (Vite)
        |
        | HTTP requests + JWT Bearer token
        v
ASP.NET Core Web API
        |
        +-- AuthController
        +-- UsersController
        +-- WorkshopsController
        +-- RegistrationsController
        |
        v
Entity Framework Core
        |
        v
Microsoft SQL Server
        |
        +-- Users
        +-- Workshops
        +-- Registrations
```

The frontend communicates with the API over HTTP. The API validates requests, enforces authorization, applies business rules, and persists data through Entity Framework Core.

## Prerequisites

Install the following software before running the application:

- [.NET 8 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/8.0)
- [Node.js and npm](https://nodejs.org/)
- [Microsoft SQL Server Express](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
- [SQL Server Management Studio](https://learn.microsoft.com/en-us/ssms/install/install)
- [Git](https://git-scm.com/downloads)

A SQL Server instance configured for Windows Authentication is used in the example below.

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/HasiniSooorige/workshop.git
cd workshop
```

### 2. Configure the database connection

Open:

`WorkshopRegistration.Api/appsettings.json`

Update the `DefaultConnection` value to match your SQL Server instance.

Example:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=YOUR_SERVER_NAME;Database=WorkshopRegistrationDb;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "Jwt": {
    "Key": "REPLACE_WITH_A_LONG_RANDOM_SECRET_FOR_LOCAL_DEVELOPMENT"
  }
}
```

Preserve any other settings already present in the application's configuration file.

**Security:** The connection string and JWT key above are examples. Never commit production passwords, API keys, or JWT secrets to a public repository. Use environment variables or .NET User Secrets for sensitive configuration.

### 3. Run the backend

From the repository root:

```powershell
dotnet restore
dotnet build
dotnet run --project WorkshopRegistration.Api
```

The API uses the URL configured by its launch settings. In the current development setup, the API runs at:

`http://localhost:5227`

Keep the backend terminal running while using the frontend.

### 4. Database migrations

The project uses Entity Framework Core migrations.

In Development mode, the application applies pending migrations when it starts. The SQL Server instance must be accessible, and the configured account must have the required database permissions.

To inspect the migration state manually:

```powershell
dotnet ef migrations list --project WorkshopRegistration.Api
```

To apply migrations manually, stop the API first and run:

```powershell
dotnet ef database update --project WorkshopRegistration.Api
```

The Entity Framework Core CLI must be installed if you use these manual commands.

### 5. Run the frontend

Open a separate terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite. In the current setup, it is:

`http://localhost:5173`

The frontend is configured to call the API at `http://localhost:5227/api`. If either port changes, update the relevant configuration and CORS policy.

## Configuration

### Backend configuration

The backend uses:

- `ConnectionStrings:DefaultConnection` for SQL Server.
- `Jwt:Key` for signing JWT tokens.
- Development environment settings for local development and initial database seeding.

Keep development credentials and secrets out of production configuration.

### CORS

The API permits requests from the React development origin:

`http://localhost:5173`

If the frontend runs on a different origin, update the `ReactFrontend` CORS policy in `Program.cs`.

### Development administrator

When running in Development mode, the application creates an initial administrator if no Admin user exists.

| Field | Development value |
|---|---|
| Email | `admin@workshop.local` |
| Password | `Admin@12345` |
| Role | Admin |

Use this account only for local development and testing. Change or remove development credentials before deployment.

## Authentication and Authorization

The login endpoint verifies the user's email, password hash, and active status. A successful login returns a JWT token.

Include the token in authenticated API requests:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Roles and permissions

| Operation | Admin | Manager | Staff |
|---|---:|---:|---:|
| Login | Yes | Yes | Yes |
| View workshops | Yes | Yes | Yes |
| Create workshops | Yes | Yes | No |
| Edit workshops | Yes | Yes | No |
| Register attendees | Yes | Yes | Yes |
| Cancel registrations | Yes | Yes | Yes |
| View registration history | Yes | Yes | Yes |
| List users | Yes | No | No |
| Create users | Yes | No | No |
| Deactivate users | Yes | No | No |

Authorization is enforced by the backend. Hiding a button in the frontend is not considered a security boundary.

## API Endpoints

Base URL:

`http://localhost:5227/api`

Authenticated endpoints require a valid JWT Bearer token unless otherwise specified.

### Authentication

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| POST | `/Auth/login` | Authenticate a user and obtain a JWT | Public |

Example request:

```json
{
  "email": "admin@workshop.local",
  "password": "Admin@12345"
}
```

### Users

All user-management endpoints require the Admin role.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/Users` | List users |
| POST | `/Users` | Create a user |
| PATCH | `/Users/{id}/deactivate` | Deactivate a user |

Example create-user request:

```json
{
  "fullName": "Workshop Manager",
  "email": "manager@workshop.local",
  "password": "Manager@12345",
  "role": "Manager"
}
```

Supported roles: `Admin`, `Manager`, and `Staff`.

### Workshops

All workshop endpoints require authentication. Creating and updating workshops require Admin or Manager authorization.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/Workshops` | List and filter workshops |
| GET | `/Workshops/{id}` | Retrieve workshop details |
| POST | `/Workshops` | Create a workshop |
| PUT | `/Workshops/{id}` | Update a workshop |

Supported query parameters for `GET /Workshops`:

| Parameter | Description |
|---|---|
| `status` | Filter by workshop status |
| `fromDate` | Include workshops starting on or after this date |
| `toDate` | Include workshops starting on or before this date |
| `available=true` | Return scheduled workshops with available seats |

Example request:

`GET /api/Workshops?status=Scheduled&available=true`

Example create-workshop request:

```json
{
  "code": "WS001",
  "title": "ASP.NET Core Web API Workshop",
  "instructor": "Senior Software Engineer",
  "startDateTime": "2026-11-15T09:00:00",
  "capacity": 20
}
```

Supported workshop statuses:

- `Scheduled`
- `Completed`
- `Cancelled`

### Registrations

Registration endpoints require an authenticated Admin, Manager, or Staff user.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/Registrations` | Register an attendee |
| GET | `/Registrations` | View registration history |
| POST | `/Registrations/{id}/cancel` | Cancel an active registration |

Supported query parameters for `GET /Registrations`:

| Parameter | Description |
|---|---|
| `workshopId` | Filter by workshop |
| `cancelled=true` | Return cancelled registrations |
| `cancelled=false` | Return active registrations |

Example registration request:

```json
{
  "workshopId": 1,
  "attendeeName": "Test Attendee",
  "attendeeEmail": "attendee@example.com"
}
```

## Business Rules

### Workshop capacity

A workshop cannot accept more active registrations than its configured capacity. Cancelled registrations are excluded from the active registration count.

The registration implementation locks the relevant workshop row during registration processing so competing registration requests for the same workshop are serialized.

### Duplicate registrations

The API rejects a new registration when the same attendee email already has an active registration for that workshop.

After cancellation, the existing record is preserved. A subsequent registration may be allowed because the duplicate check considers active registrations only.

### Cancellation history

Cancellation updates the existing registration record instead of deleting it. The record retains:

- Registration timestamp.
- Cancellation status.
- Cancellation timestamp.
- User ID of the person who cancelled it.

### Workshop capacity updates

The API rejects capacity changes that would reduce the workshop capacity below the number of active registrations.

## Testing the Application

### 1. Test login

Start the API and use PowerShell:

```powershell
$body = @{
    email = "admin@workshop.local"
    password = "Admin@12345"
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "http://localhost:5227/api/Auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body

$headers = @{
    Authorization = "Bearer $($response.token)"
}

$response | Select-Object fullName, email, role
```

### 2. List workshops

```powershell
Invoke-RestMethod `
    -Uri "http://localhost:5227/api/Workshops" `
    -Method Get `
    -Headers $headers
```

### 3. Test registration and cancellation

Use a valid workshop ID and a user token:

```powershell
$registrationBody = @{
    workshopId = 1
    attendeeName = "Test Attendee"
    attendeeEmail = "attendee@example.com"
} | ConvertTo-Json

$registration = Invoke-RestMethod `
    -Uri "http://localhost:5227/api/Registrations" `
    -Method Post `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $registrationBody
```

Cancel the registration:

```powershell
Invoke-RestMethod `
    -Uri "http://localhost:5227/api/Registrations/$($registration.id)/cancel" `
    -Method Post `
    -Headers $headers
```

Verify that the cancellation record remains in the history:

```powershell
Invoke-RestMethod `
    -Uri "http://localhost:5227/api/Registrations?cancelled=true" `
    -Method Get `
    -Headers $headers
```

### 4. Build verification

Backend:

```powershell
dotnet build
```

Frontend, from the `frontend` directory:

```powershell
npm run build
```

These commands verify that the projects compile. They do not replace automated integration or concurrency tests.

## Project Structure

```text
WorkshopRegistrationService/
├── WorkshopRegistration.Api/
│   ├── Controllers/
│   │   ├── AuthController.cs
│   │   ├── UsersController.cs
│   │   ├── WorkshopsController.cs
│   │   └── RegistrationsController.cs
│   ├── Data/
│   │   └── AppDbContext.cs
│   ├── DTOs/
│   ├── Migrations/
│   ├── Models/
│   │   ├── User.cs
│   │   ├── Workshop.cs
│   │   └── Registration.cs
│   ├── Properties/
│   ├── Program.cs
│   └── appsettings.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── package.json
│   └── index.html
├── .gitignore
└── WorkshopRegistrationService.slnx
```

## Known Limitations

- The frontend is a development-oriented interface and does not yet include a dedicated Admin user-management screen.
- Automated unit, integration, and concurrency tests should be added to strengthen verification.
- JWT secrets and database credentials must be configured securely for deployment.
- The Swagger UI rendering issue encountered during development should be verified and resolved before relying on Swagger for API exploration.
- Production deployment requires HTTPS, appropriate CORS origins, secure secret management, and production-specific database configuration.

## Future Improvements

- Add automated unit and integration tests.
- Add a dedicated user-management interface for Admins.
- Add pagination and richer registration filters.
- Add audit logging for important administrative operations.
- Introduce a waitlist for fully booked workshops.
- Add CI/CD workflows and production deployment configuration.
- Improve error handling, monitoring, and API documentation.

## Repository

GitHub: [https://github.com/HasiniSooorige/workshop](https://github.com/HasiniSooorige/workshop)

## License

No license has been specified yet. Add a `LICENSE` file if you intend to distribute this project under an open-source license.
