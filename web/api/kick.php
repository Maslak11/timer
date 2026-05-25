<?php
// Mark a relay client as kicked: POST /api/kick.php
// Body: JSON { id: ROOM_ID, secret, clientId }
require_once __DIR__ . '/db.php';
cors();

header('Content-Type: application/json');

$body     = json_decode(file_get_contents('php://input'), true);
$id       = strtoupper(preg_replace('/[^a-zA-Z0-9]/', '', $body['id']       ?? ''));
$secret   = $body['secret']   ?? '';
$clientId = preg_replace('/[^a-zA-Z0-9_-]/', '', $body['clientId'] ?? '');

if (!$id || !$secret || !$clientId) {
    http_response_code(400); echo json_encode(['error' => 'missing fields']); exit;
}

$db = db();

// Verify room secret
$row = $db->prepare("SELECT secret FROM rooms WHERE id = ?");
$row->execute([$id]);
$room = $row->fetch();
if (!$room || $room['secret'] !== $secret) {
    http_response_code(403); echo json_encode(['error' => 'wrong secret']); exit;
}

$db->prepare("UPDATE connections SET kicked = 1 WHERE id = ? AND room_id = ?")
   ->execute([$clientId, $id]);

echo json_encode(['ok' => true]);
