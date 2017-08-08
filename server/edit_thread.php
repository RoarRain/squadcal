<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('thread_lib.php');

async_start();

if (!user_logged_in()) {
  async_end(array(
    'error' => 'not_logged_in',
  ));
}

if (!isset($_POST['thread']) || !isset($_POST['personal_password'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
$user = get_viewer_id();
$thread = (int)$_POST['thread'];
$personal_password = $_POST['personal_password'];

$changed_sql_fields = array();
if (isset($_POST['name'])) {
  $changed_sql_fields['name'] =
    "'" . $conn->real_escape_string($_POST['name']) . "'";
}
if (isset($_POST['description'])) {
  $changed_sql_fields['description'] =
    "'" . $conn->real_escape_string($_POST['description']) . "'";
}
if (isset($_POST['color'])) {
  $color = strtolower($_POST['color']);
  if (!preg_match('/^[a-f0-9]{6}$/', $color)) {
    async_end(array(
      'error' => 'invalid_parameters',
    ));
  }
  $changed_sql_fields['color'] = "'" . $color . "'";
}
if (isset($_POST['edit_rules'])) {
  $changed_sql_fields['edit_rules'] = (int)$_POST['edit_rules'];
}

$new_password = null;
if (isset($_POST['new_password'])) {
  $new_password = $_POST['new_password'];
  if (trim($new_password) === '') {
    async_end(array(
      'error' => 'empty_password',
    ));
  }
  $changed_sql_fields['hash'] =
    "'" . password_hash($new_password, PASSWORD_BCRYPT) . "'";
}

$parent_thread_id = null;
if (isset($_POST['parent_thread_id'])) {
  $parent_thread_id = (int)$_POST['parent_thread_id'];
  if (!viewer_can_edit_thread($parent_thread_id)) {
    async_end(array(
      'error' => 'invalid_parameters',
    ));
  }
  $changed_sql_fields['parent_thread_id'] = $parent_thread_id;
}

$vis_rules = null;
if (isset($_POST['visibility_rules'])) {
  $vis_rules = (int)$_POST['visibility_rules'];
  if ($vis_rules <= VISIBILITY_SECRET) {
    if ($parent_thread_id !== null) {
      async_end(array(
        'error' => 'invalid_parameters',
      ));
    }
    $changed_sql_fields['parent_thread_id'] = "NULL";
  }
  if ($vis_rules !== VISIBILITY_NESTED_OPEN) {
    $changed_sql_fields['concrete_ancestor_thread_id'] = "NULL";
  }
  if ($vis_rules !== VISIBILITY_CLOSED && $vis_rules !== VISIBILITY_SECRET) {
    if ($new_password !== null) {
      async_end(array(
        'error' => 'invalid_parameters',
      ));
    }
    $changed_sql_fields['hash'] = "NULL";
  }
  $changed_sql_fields['visibility_rules'] = $vis_rules;
}

if (!$changed_sql_fields) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

// Many unrelated purposes for this query:
// - get hash for viewer password check (users table)
// - figures out if the thread requires auth (threads table)
// - makes sure that viewer has the necessary permissions (roles table)
$role_creator = ROLE_CREATOR;
$query = <<<SQL
SELECT t.visibility_rules, u.hash, t.parent_thread_id
FROM roles r
LEFT JOIN users u ON u.id = r.user
LEFT JOIN threads t ON t.id = r.thread
WHERE r.thread = {$thread} AND r.user = {$user} AND r.role >= {$role_creator}
SQL;
$result = $conn->query($query);
$row = $result->fetch_assoc();
if (!$row) {
  async_end(array(
    'error' => 'internal_error',
  ));
}
if (!password_verify($personal_password, $row['hash'])) {
  async_end(array(
    'error' => 'invalid_credentials',
  ));
}
$old_vis_rules = (int)$row['visibility_rules'];
$old_parent_thread_id = $row['parent_thread_id'] !== null
  ? (int)$row['parent_thread_id']
  : null;

// If the thread is being switched to closed, then a password *must* be
// specified
if (
  $old_vis_rules !== VISIBILITY_CLOSED &&
  $old_vis_rules !== VISIBILITY_SECRET &&
  ($vis_rules === VISIBILITY_CLOSED || $vis_rules === VISIBILITY_SECRET) &&
  $new_password === null
) {
  async_end(array(
    'error' => 'empty_password',
  ));
}

// If the thread is being switched to nested, a parent must be specified
if (
  $old_vis_rules !== VISIBILITY_NESTED_OPEN &&
  $vis_rules === VISIBILITY_NESTED_OPEN &&
  $old_parent_thread_id === null &&
  $parent_thread_id === null
) {
  async_end(array(
    'error' => 'no_parent_thread_specified',
  ));
}

$next_vis_rules = $vis_rules !== null ? $vis_rules : $old_vis_rules;
$next_parent_thread_id = $parent_thread_id !== null
  ? $parent_thread_id
  : $old_parent_thread_id;

// It is not valid to set a parent thread ID on v1 visibilities
if ($next_vis_rules <= VISIBILITY_SECRET && $parent_thread_id !== null) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

// It is not valid to set a password on anything other than these visibilities
if (
  $next_vis_rules !== VISIBILITY_CLOSED &&
  $next_vis_rules !== VISIBILITY_SECRET &&
  $new_password !== null
) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

$concrete_ancestor_thread_id = null;
if (
  $next_vis_rules === VISIBILITY_NESTED_OPEN &&
  ($old_vis_rules !== VISIBILITY_NESTED_OPEN ||
    $parent_thread_id !== null)
) {
  $concrete_ancestor_thread_id =
    fetch_concrete_ancestor_thread_id($next_parent_thread_id);
  if ($concrete_ancestor_thread_id === null) {
    async_end(array(
      'error' => 'invalid_parameters',
    ));
  }
  $changed_sql_fields['concrete_ancestor_thread_id'] =
    $concrete_ancestor_thread_id;
}

$sql_set_strings = array();
foreach ($changed_sql_fields as $field_name => $field_sql_string) {
  $sql_set_strings[] = "{$field_name} = {$field_sql_string}";
}
$sql_set_string = implode(", ", $sql_set_strings);
$conn->query("UPDATE threads SET {$sql_set_string} WHERE id = {$thread}");

// If we're switching from NESTED_OPEN to THREAD_SECRET, all of our NESTED_OPEN
// descendants need to be updated to have us as their concrete ancestor thread
if (
  $vis_rules === VISIBILITY_THREAD_SECRET &&
  $old_vis_rules === VISIBILITY_NESTED_OPEN
) {
  $all_nested_open_descendants = array();
  $current_layer = array($thread);
  $visibility_nested_open = VISIBILITY_NESTED_OPEN;
  while ($current_layer) {
    $layer_sql_string = implode(", ", $current_layer);
    $descendants_query = <<<SQL
SELECT id
FROM threads
WHERE parent_thread_id IN ({$layer_sql_string}) AND
  visibility_rules = {$visibility_nested_open}
SQL;
    $descendants_result = $conn->query($descendants_query);
    $current_layer = array();
    while ($descendants_row = $descendants_result->fetch_assoc()) {
      $descendant_id = (int)$descendants_row['id'];
      $current_layer[] = $descendant_id;
      $all_nested_open_descendants[] = $descendant_id;
    }
  }
  if ($all_nested_open_descendants) {
    $descendants_sql_string = implode(", ", $all_nested_open_descendants);
    $update_query = <<<SQL
UPDATE threads
SET concrete_ancestor_thread_id = {$thread}
WHERE id IN ({$descendants_sql_string})
SQL;
    $conn->query($update_query);
  }
}

// If we're switching from THREAD_SECRET to NESTED_OPEN, all descendants who
// have us as their concrete ancestor should switch to whatever is our parent's
// concrete ancestor
if (
  $vis_rules === VISIBILITY_NESTED_OPEN &&
  $old_vis_rules === VISIBILITY_THREAD_SECRET
) {
  // $concrete_ancestor_thread_id should be non-null
  $update_query = <<<SQL
UPDATE threads
SET concrete_ancestor_thread_id = {$concrete_ancestor_thread_id}
WHERE concrete_ancestor_thread_id = {$thread}
SQL;
  $conn->query($update_query);
}

async_end(array(
  'success' => true,
));
