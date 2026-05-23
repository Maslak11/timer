<?php
// Quick state snapshot: GET /api/state.php?id=ROOM_ID
require_once __DIR__ . '/db.php';
cors();

header('Content-Type: application/json');

$id = strtoupper(preg_replace('/[^a-zA-Z0-9]/', '', $_GET['id'] ?? ''));
if (!$id) { http_response_code(400); echo json_encode(['error' => 'missing id']); exit; }

$db = db();
init_tables();
$q = $db->prepare("SELECT state, updated_at, TIMESTAMPDIFF(SECOND, updated_at, NOW()) AS age FROM rooms WHERE id = ?");
$q->execute([$id]);
$row = $q->fetch();

if (!$row) { http_response_code(404); echo json_encode(['error' => 'not found']); exit; }

$state = json_decode($row['state'], true);
$state['_relay'] = ['age' => (int)$row['age'], 'online' => $row['age'] < 15];
echo json_encode($state);
