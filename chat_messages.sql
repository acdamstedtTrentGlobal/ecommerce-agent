USE ecommerce;

CREATE TABLE chat_messages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL,
  role ENUM('human', 'ai') NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT NOW(),
  INDEX idx_session_id (session_id)
);