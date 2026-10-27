# Warehouse Management System with AI Integration

A complete warehouse management system built with FastAPI (backend) and React (frontend) featuring real-time inventory tracking, import/export management, and AI-powered insights.

## 🎯 Features

### Core Functionality
- **Product Management**: Full CRUD operations for products, categories, units, and suppliers
- **Inventory Tracking**: Real-time stock monitoring with low-stock alerts
- **Import/Export Receipts**: Manage warehouse inbound and outbound transactions
- **Role-Based Access Control**: Admin, Storekeeper, and Accountant roles
- **JWT Authentication**: Secure API access with token-based authentication
- **AI Insights**: AI-powered recommendations and anomaly detection

### Technical Stack
- **Backend**: FastAPI 0.141.1 with SQLAlchemy ORM
- **Database**: SQLite with enforced constraints
- **Frontend**: React with Vite
- **Authentication**: JWT tokens with bcrypt password hashing
- **API Format**: RESTful JSON endpoints

## 📁 Project Structure

```
warehouse-ai/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI entry point
│   │   ├── config.py               # Configuration
│   │   ├── database.py             # SQLAlchemy setup
│   │   ├── exceptions.py           # Custom exceptions
│   │   ├── models/                 # SQLAlchemy models
│   │   │   └── __init__.py         # All ORM models
│   │   ├── schemas/                # Pydantic schemas
│   │   │   ├── base.py
│   │   │   ├── user.py
│   │   │   ├── product.py
│   │   │   ├── category.py
│   │   │   ├── unit.py
│   │   │   ├── supplier.py
│   │   │   ├── import_receipt.py
│   │   │   ├── export_receipt.py
│   │   │   └── inventory.py
│   │   ├── services/               # Business logic
│   │   │   ├── auth_service.py
│   │   │   ├── product_service.py
│   │   │   ├── master_service.py
│   │   │   └── receipt_service.py
│   │   ├── routers/                # API endpoints
│   │   │   ├── auth.py
│   │   │   ├── products.py
│   │   │   ├── categories.py
│   │   │   ├── units.py
│   │   │   ├── suppliers.py
│   │   │   ├── imports_router.py
│   │   │   ├── exports_router.py
│   │   │   ├── inventory.py
│   │   │   ├── reports.py
│   │   │   └── ai.py
│   │   └── auth/
│   │       ├── security.py
│   │       ├── jwt_handler.py
│   │       └── dependencies.py
│   ├── requirements-simple.txt      # Python dependencies
│   └── test_api.py                 # API tests
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Main React component
│   │   ├── App.css                 # Dashboard styling
│   │   ├── index.css               # Global styles
│   │   └── services/
│   │       └── api.js              # API client service
│   ├── package.json
│   └── vite.config.js
│
├── DATABASE_DESIGN.md              # Database schema documentation
├── ERD_DESIGN.md                   # Entity relationship diagram
├── REST_API_DESIGN.md              # API endpoint documentation
└── README.md                       # This file
```

## 🚀 Quick Start

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements-simple.txt
   ```

3. **Run the server** (default port: 8000):
   ```bash
   python -m uvicorn app.main:app --reload
   ```

4. **Access API documentation**:
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the dev server** (default port: 5173):
   ```bash
   npm run dev
   ```

4. **Access the dashboard**:
   - http://localhost:5173

## 🔐 Default Credentials

- **Username**: `admin`
- **Password**: `password123`
- **Role**: Admin (full access)

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/products/{id}` - Get product details
- `PUT /api/products/{id}` - Update product
- `DELETE /api/products/{id}` - Delete product
- `GET /api/products/stock/low-stock` - Get low-stock products

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `PUT /api/categories/{id}` - Update category
- `DELETE /api/categories/{id}` - Delete category

### Units
- `GET /api/units` - List units
- `POST /api/units` - Create unit
- `PUT /api/units/{id}` - Update unit
- `DELETE /api/units/{id}` - Delete unit

### Suppliers
- `GET /api/suppliers` - List suppliers
- `POST /api/suppliers` - Create supplier
- `PUT /api/suppliers/{id}` - Update supplier
- `DELETE /api/suppliers/{id}` - Delete supplier

### Import Receipts
- `GET /api/imports` - List import receipts
- `POST /api/imports` - Create import receipt
- `GET /api/imports/{id}` - Get import receipt
- `POST /api/imports/{id}/confirm` - Confirm receipt and update stock
- `POST /api/imports/{id}/cancel` - Cancel receipt

### Export Receipts
- `GET /api/exports` - List export receipts
- `POST /api/exports` - Create export receipt
- `GET /api/exports/{id}` - Get export receipt
- `POST /api/exports/{id}/confirm` - Confirm receipt and update stock
- `POST /api/exports/{id}/cancel` - Cancel receipt

## 🧪 Testing

### Run API Tests
```bash
cd backend
python test_api.py
```

### Run Integration Tests
```bash
cd backend
python test_integration.py
```

## 📝 Authentication

All API endpoints (except login) require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

The token is obtained from the `/api/auth/login` endpoint and is stored in localStorage on the frontend.

## 🔑 Role-Based Access Control

- **ADMIN**: Full access to all features including user management
- **STOREKEEPER**: Can manage inventory, create import/export receipts
- **ACCOUNTANT**: Read-only access to reports and analytics

## 🛠️ Development

### Backend
- Framework: FastAPI
- Database: SQLite + SQLAlchemy
- Authentication: JWT + bcrypt
- API Documentation: OpenAPI/Swagger

### Frontend
- Framework: React 18 + Vite
- Styling: CSS (dark theme)
- State Management: React Hooks
- API Client: Fetch API

## 📦 Key Dependencies

### Backend
- fastapi==0.141.1
- sqlalchemy==2.2.24
- pydantic==2.13.0
- pydantic-settings==2.6.1
- python-jose==3.3.0
- bcrypt==4.2.1
- email-validator==2.2.0

### Frontend
- react==18.x
- vite==5.x

## 🐛 Troubleshooting

### Port Already in Use
- Backend: Change port in main.py or use `--port 8001`
- Frontend: Change port in vite.config.js

### Database Issues
- Delete `warehouse.db` file to reset the database
- Database initializes automatically on server startup

### CORS Issues
- Ensure frontend is running on http://localhost:5173
- Backend CORS is configured in `main.py`

## 📄 Documentation Files

- **DATABASE_DESIGN.md** - Database schema and relationships
- **ERD_DESIGN.md** - Entity relationship diagram
- **REST_API_DESIGN.md** - Detailed API endpoint specifications
- **FASTAPI_ARCHITECTURE.md** - Architecture and design patterns

## 🎓 Learning Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy ORM](https://docs.sqlalchemy.org/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)

## 🚀 Production Deployment

For production deployment:
1. Replace SQLite with PostgreSQL
2. Use environment variables for sensitive config
3. Enable HTTPS/SSL
4. Set `debug=False` in FastAPI
5. Use a production ASGI server (Gunicorn, Uvicorn cluster)
6. Deploy frontend to CDN or static hosting
7. Implement rate limiting and request logging

## 📞 Support

For issues or questions:
1. Check the API documentation at http://localhost:8000/docs
2. Review the database schema in DATABASE_DESIGN.md
3. Check test files for usage examples

---

**Version**: 1.0.0  
**Last Updated**: 2026-08-16  
**Status**: MVP Complete ✅
