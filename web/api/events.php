<?php
// SSE endpoint: GET /api/events.php?id=ROOM_ID
// Streams state updates to web clients as Server-Sent Events
require_once __DIR__ . '/db.php';
cors();
init_tables();

$id = strtoupper(preg_replace('/[^a-zA-Z0-9]/', '', $_GET['id'] ?? ''));
if (!$id) { http_response_code(400); echo 'missing id'; exit; }

header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('X-Accel-Buffering: no');

set_time_limit(60);
ini_set('output_buffering', 'off');

$db = db();
$lastUpdated = '';

function sse($event, $data) {
    echo "event: $event\n";
    echo "data: " . json_encode($data) . "\n\n";
    if (ob_get_level() > 0) ob_flush();
    flush();
}

// Send initial state
$row = $db->prepare("SELECT state, updated_at FROM rooms WHERE id = ?");
$row->execute([$id]);
$room = $row->fetch();

if (!$room) {
    sse('error', ['message' => 'Room not found']);
    exit;
}

$lastUpdated = $room['updated_at'];
sse('state', json_decode($room['state'], true));
sse('connected', ['id' => $id]);

$deadline = time() + 55; // max 55s (server timeout safety)

while (time() < $deadline && !connection_aborted()) {
    sleep(1);

    $q = $db->prepare("SELECT state, updated_at FROM rooms WHERE id = ? AND updated_at > ?");
    $q->execute([$id, $lastUpdated]);
    $updated = $q->fetch();

    if ($updated) {
        $lastUpdated = $updated['updated_at'];
        sse('state', json_decode($updated['state'], true));
    } else {
        // Keepalive
        echo ": keepalive\n\n";
        if (ob_get_level() > 0) ob_flush();
        flush();
    }
}

// Tell client to reconnect
sse('reconnect', []);
