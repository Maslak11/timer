<?php
// Desktop app POSTs state here: POST /api/push.php
// Body: JSON { id, secret, state }
require_once __DIR__ . '/db.php';
cors();
init_tables();

header('Content-Type: application/json');

$body = json_decode(file_get_contents('php://input'), true);
if (!$body || empty($body['id']) || empty($body['secret']) || !isset($body['state'])) {
    http_response_code(400); echo json_encode(['error' => 'missing fields']); exit;
}

$id     = strtoupper(preg_replace('/[^a-zA-Z0-9]/', '', $body['id']));
$secret = $body['secret'];
$state  = json_encode($body['state']);

$db = db();

// Upsert room
$stmt = $db->prepare("INSERT INTO rooms (id, secret, state) VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
        secret = IF(secret = ?, secret, secret),
        state = IF(secret = ?, VALUES(state), state),
        updated_at = IF(secret = ?, CURRENT_TIMESTAMP, updated_at)");
$stmt->execute([$id, $secret, $state, $secret, $secret, $secret]);

// Check if secret matches
$room = $db->prepare("SELECT secret FROM rooms WHERE id = ?");
$room->execute([$id]);
$row = $room->fetch();
if (!$row || $row['secret'] !== $secret) {
    http_response_code(403); echo json_encode(['error' => 'wrong secret']); exit;
}

// Update state
$db->prepare("UPDATE rooms SET state = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")->execute([$state, $id]);

// Return pending commands and mark as executed
$cmds = $db->prepare("SELECT id, command FROM commands WHERE room_id = ? AND executed = 0 ORDER BY created_at ASC LIMIT 20");
$cmds->execute([$id]);
$rows = $cmds->fetchAll();

if ($rows) {
    $ids = array_column($rows, 'id');
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $db->prepare("UPDATE commands SET executed = 1 WHERE id IN ($placeholders)")->execute($ids);
}

echo json_encode([
    'ok' => true,
    'commands' => array_map(fn($r) => json_decode($r['command'], true), $rows)
]);
