# Quizify Web Service – Proyek Web Service

A RESTful web service designed to support an educational quiz platform called **Quizify**, featuring role-based access for Admin, Teachers (Free & Subscription), and Students. Built using Node.js, Express, Sequelize ORM, and MySQL, this project emphasizes scalability and structured API development.

---

## 👥 Team Members (Kelompok)

| Name                      | NRP         |
|---------------------------|-------------|
| Marcella Thamrin          | 223117095   |
| Ophelia Calysta Feodora   | 223117100   |
| Tertania Adisty           | 223117112   |

## 📦 Dependencies

You can install all dependencies by running:

```bash
npm install
```

## Environment Variables

Copy `.env.example` to `.env` and update the values as needed:

```bash
cp .env.example .env
```
Then, configure your environment:
```
DB_USER=your_db_user
DB_PASS=your_db_password
DB_DBNAME=your_db_name
DB_HOST=your_db_host
DB_PORT=your_db_port

ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
```
