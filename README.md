# Eight Spots Video Club 🎬

A full-stack web application for managing a video club chain, built with Node.js, Express, PostgreSQL, and Docker. Users can browse movies, purchase them, track their watching status, and write reviews.

![Eight Spots Logo](app/src/assets/logo.png)

## Features ✨

- User authentication and profile management
- Browse and search movies
- Purchase movies and maintain a personal library
- Mark movies as watched/unwatched
- Write and read movie reviews
- View store locations and contact information
- Movie categorization using genre bitmaps
- Rating system for movies (0-5 stars)
- Full responsive design

## Technology Stack 🛠

- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL
- **Containerization**: Docker & Docker Compose
- **Frontend**: HTML, CSS, JavaScript
- **Architecture**: MVC pattern
- **Database Design**: BCNF normalized schema

## Prerequisites 📋

- Docker (latest version)
- Docker Compose (included with Docker Desktop)

## Getting Started 🚀

1. Clone the repository
```bash
git clone https://github.com/yourusername/eight-spots.git
cd eight-spots
```

2. Start the application using Docker
```bash
cd app
./build_docker.sh
```

3. Access the application at `http://localhost:3000`

## Database Schema 📊

The database consists of the following main tables:
- `users`: User account information
- `movies`: Movie details and metadata
- `stores`: Store location information
- `user_library`: User's movie purchases and watch status
- `reviews`: User reviews and ratings for movies

## Project Structure 📁

```
app/
├── build_docker.sh
├── docker-compose.yml
├── Dockerfile
├── .env
├── package.json
├── package-lock.json
├── src/
│   ├── index.js
│   ├── assets/
│   ├── styles/
│   └── uploads/posters/
└── initdb/
    ├── db.sql
    └── initdb.sql
```

## Troubleshooting 🔧

If you encounter any issues:

1. Ensure Docker is running and up to date
2. Check terminal output for error messages
3. Verify `.env` file configuration
4. Try resetting the containers:
```bash
docker compose down -v
./build_docker.sh
```

## Future Enhancements 🔮

- Popular movies showcase
- Movie recommendations based on user preferences
- User balance system for purchases
- Special offers and promotions
- Physical store inventory tracking
- Social features (friend system)
- Sales statistics for administrators
- Multi-language support

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

## License 📄

This project is licensed under the MIT License - see the LICENSE file for details.

## Author ✍️

Raftopoulos Emmanouil
- University: University of Thessaly
- Department: Electrical and Computer Engineering
- Course: Database Systems I
- Student ID: 03735

---

For any additional information or questions, please refer to the project documentation or create an issue on GitHub.
