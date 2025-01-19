CREATE SEQUENCE users_id_seq;
CREATE SEQUENCE movies_id_seq;
CREATE SEQUENCE reviews_id_seq;
CREATE SEQUENCE stores_id_seq;

CREATE TABLE users (
    id INT,
    username TEXT,
    password TEXT,
    PRIMARY KEY(id)
);

CREATE TABLE movies (
    id INT,
    title TEXT,
    score REAL,
    price REAL,
    genre_bitmap INT DEFAULT 0,
    poster_url TEXT,
    PRIMARY KEY(id)
);

CREATE TABLE stores (
    id INT,
    phone_num TEXT,
    city TEXT,
    address TEXT,
    PRIMARY KEY(id)
);

CREATE TABLE user_library (
    user_id INT NOT NULL,
    movie_id INT NOT NULL,
    status BOOLEAN, -- 'watched', 'unwatched'
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, movie_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (movie_id) REFERENCES movies(id)
);

CREATE TABLE reviews (
    review_id INT,
    user_id INT NOT NULL,
    movie_id INT NOT NULL,
    rating INT,
    comment TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (review_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (movie_id) REFERENCES movies(id)
);

-- Create indexes
CREATE INDEX idx_user_library_user_movie ON user_library (user_id, movie_id);
CREATE INDEX idx_reviews_movie_id ON reviews (movie_id);


-- Create views
CREATE VIEW user_movie_library AS
SELECT ul.user_id, m.*, ul.status
FROM movies m
JOIN user_library ul ON m.id = ul.movie_id;

CREATE VIEW movie_reviews AS
SELECT r.movie_id, r.review_id, r.rating, r.comment, r.timestamp, u.username
FROM reviews r
JOIN users u ON r.user_id = u.id;