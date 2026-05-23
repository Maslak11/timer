<?php
// Web clients POST commands here: POST /api/command.php
// Body: JSON { id, action, ...params }
require_once __DIR__ . '/db.php';
cors();
init_tables();

header('Content-Type: application/json');

$body = json_decode(file_get_contents('php://input'), true);
if (!$body || empty($body['id']) || empty($body['action'])) {
    http_response_code(400); echo json_encode(['error' => 'missing fields']); exit;
}

$id = strtoupper(preg_replace('/[^a-zA-Z0-9]/', '', $body['id']));

// Verify room exists
$db = db();
$room = $db->prepare("SELECT id FROM rooms WHERE id = ? AND updated_at > DATE_SUB(NOW(), INTERVAL 30 SECOND)");
$room->execute([$id]);
if (!$room->fetch()) {
    http_response_code(404); echo json_encode(['error' => 'room not found or offline']); exit;
}

// Queue command (remove room_id from payload, store separately)
$cmd = $body;
unset($cmd['id']);

$db->prepare("INSERT INTO commands (room_id, command) VALUES (?, ?)")->execute([$id, json_encode($cmd)]);

echo json_encode(['ok' => true]);
