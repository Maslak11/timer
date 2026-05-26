<?php
// Credentials loaded from config.php (not in git, deployed via FTP)
$cfg = __DIR__ . '/config.php';
if (!file_exists($cfg)) {
    http_response_code(503);
    echo json_encode(['error' => 'Server not configured. Create api/config.php from config.example.php']);
    exit;
}
require_once $cfg;

function db() {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
             PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
    }
    return $pdo;
}

function cors() {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Room-Secret');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
}

function init_tables() {
    $db = db();
    $db->exec("CREATE TABLE IF NOT EXISTS rooms (
        id VARCHAR(8) PRIMARY KEY,
        secret VARCHAR(64) NOT NULL,
        state MEDIUMTEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $db->exec("CREATE TABLE IF NOT EXISTS commands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id VARCHAR(8) NOT NULL,
        command TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        executed TINYINT(1) DEFAULT 0,
        INDEX idx_room_exec (room_id, executed, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $db->exec("CREATE TABLE IF NOT EXISTS connections (
        id VARCHAR(64) PRIMARY KEY,
        room_id VARCHAR(8) NOT NULL,
        view_name VARCHAR(32) DEFAULT 'unknown',
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        kicked TINYINT(1) DEFAULT 0,
        INDEX idx_room (room_id),
        INDEX idx_last_seen (last_seen)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}
