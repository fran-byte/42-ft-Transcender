CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    chips INT DEFAULT 1000
);

INSERT INTO users (username, email) VALUES ('demo_user', 'demo@42.fr');