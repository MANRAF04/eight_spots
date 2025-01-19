INSERT INTO users (id, username, password) VALUES
(nextval('users_id_seq'), 'admin', '$2b$10$h7jzO8C3okoU1xe6bCJdlOMHoShP8/0T062ZJiNFoddgLs9USAMU2'),
(nextval('users_id_seq'), 'user', '$2b$10$rCoGCFb4YJu54uAjrEeDou5YednnHl5GPR.sMh/ASL9QSiHWLLAaS');

INSERT INTO movies (id, title, score, price, genre_bitmap, poster_url) VALUES
(nextval('movies_id_seq'), 'Interstellar', 9.2, 19.99, 520, '/app/src/uploads/posters/1736717835051.jpg'),
(nextval('movies_id_seq'), 'The Room', 0, 0.01, 512, '/app/src/uploads/posters/1736434560320.webp'),
(nextval('movies_id_seq'), 'Inception', 8.8, 14.99, 8200, '/app/src/uploads/posters/1736717997586.jpg'),
(nextval('movies_id_seq'), 'The Matrix', 8.7, 12.99, 8200, '/app/src/uploads/posters/1736718634525.webp'),
(nextval('movies_id_seq'), 'Star Wars: Episode IV', 8.3, 9.99, 12552, '/app/src/uploads/posters/1736718822072.jpg'),
(nextval('movies_id_seq'), 'The Dark Knight Rises', 9.0, 14.99, 8704, '/app/src/uploads/posters/1736718284682.jpg');

INSERT INTO stores (id, phone_num, city, address) VALUES
(nextval('stores_id_seq'), '123-456-7890', 'New York', '123 Main St'),
(nextval('stores_id_seq'), '987-654-3210', 'Los Angeles', '456 Elm St'),
(nextval('stores_id_seq'), '+302421053705', 'Βόλος', 'Καρτάλη Κωνσταντίνου 222');

INSERT INTO user_library (user_id, movie_id, status) VALUES
(1, 1, TRUE),
(1, 2, FALSE),
(2, 1, TRUE);

INSERT INTO reviews (review_id, user_id, movie_id, rating, comment) VALUES
(nextval('reviews_id_seq'), 1, 1, 5, 'Amazing movie!'),
(nextval('reviews_id_seq'), 2, 2, 4, 'Great action scenes.');